const { db } = require('../config/database');
const { buildFtsQuery } = require('../utils/searchQuery');

const SORT_COLUMNS = {
  price_asc: 'base_min_price ASC',
  price_desc: 'base_min_price DESC',
  stars_desc: 'h.stars DESC, h.name ASC',
  name_asc: 'h.name ASC'
};

function nextDay(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Resolves the [from, to) date range used for stay-based pricing:
// - both dates -> [checkin, checkout)
// - checkin only -> the single checkin night
// - checkout only -> the single checkout night
// - neither -> nulls (no date filter, computed_min_price stays null)
function resolveRange(checkin, checkout) {
  let from = checkin;
  let to = checkout;
  if (!from && to) from = to;
  if (from && !to) to = nextDay(from);
  return [from, to];
}

const Hotel = {
  findAll({
    search,
    city,
    country,
    stars,
    minPrice,
    maxPrice,
    amenity,
    sortBy,
    checkin,
    checkout,
    limit,
    offset
  } = {}) {
    const params = [];
    const ftsQuery = search ? buildFtsQuery(search) : null;
    const [from, to] = resolveRange(checkin, checkout);

    let query = `
      WITH room_span AS (
        SELECT r.hotel_id AS hotel_id, r.id AS room_id,
               SUM(rp.price) AS span_cost, COUNT(*) AS span_nights
        FROM room_prices rp
        JOIN rooms r ON r.id = rp.room_id
        WHERE rp.date >= ? AND rp.date < ?
        GROUP BY r.hotel_id, r.id
      ),
      priced AS (
        SELECT r.hotel_id AS hotel_id, MIN(rp.price) AS min_price
        FROM room_prices rp
        JOIN rooms r ON r.id = rp.room_id
        GROUP BY r.hotel_id
      ),
      priced_on_date AS (
        SELECT hotel_id, MIN(CAST(span_cost AS REAL) / span_nights) AS min_price
        FROM room_span
        GROUP BY hotel_id
      )
      SELECT
        h.*,
        priced.min_price AS base_min_price,
        priced_on_date.min_price AS computed_min_price,
        (SELECT i.image_path FROM images i
         WHERE i.hotel_id = h.id AND i.is_cover = 1 AND i.room_id IS NULL
         LIMIT 1) AS cover_image,
        (SELECT i.image_path FROM images i
         WHERE i.hotel_id = h.id AND i.is_cover = 1
         LIMIT 1) AS fallback_image
        ${ftsQuery ? ', fts.rank AS relevance_rank' : ''}
      FROM hotels h
      LEFT JOIN priced ON priced.hotel_id = h.id
      LEFT JOIN priced_on_date ON priced_on_date.hotel_id = h.id
    `;
    params.push(from, to);

    if (ftsQuery) {
      query += `
        JOIN hotels_fts fts ON fts.rowid = h.id AND hotels_fts MATCH ?
      `;
      params.push(ftsQuery);
    }

    query += ` WHERE 1=1`;

    if (city) {
      query += ` AND h.city = ?`;
      params.push(city);
    }

    if (country) {
      query += ` AND h.country = ?`;
      params.push(country);
    }

    if (stars) {
      query += ` AND h.stars = ?`;
      params.push(stars);
    }

    // Price filters use the stay-based price when a date is selected,
    // otherwise the overall base price.
    const priceExpr = checkin || checkout ? 'COALESCE(priced_on_date.min_price, priced.min_price)' : 'priced.min_price';
    if (minPrice != null) {
      query += ` AND ${priceExpr} >= ?`;
      params.push(minPrice);
    }

    if (maxPrice != null) {
      query += ` AND ${priceExpr} <= ?`;
      params.push(maxPrice);
    }

    if (amenity && amenity.length > 0) {
      query += ` AND h.id IN (
        SELECT ha.hotel_id FROM hotel_room_amenities ha
        WHERE ha.hotel_id IS NOT NULL AND ha.amenity_id IN (${amenity.map(() => '?').join(',')})
        GROUP BY ha.hotel_id
        HAVING COUNT(DISTINCT ha.amenity_id) = ?
      )`;
      params.push(...amenity, amenity.length);
    }

    if (ftsQuery && !sortBy) {
      query += ` ORDER BY fts.rank`;
    } else if (sortBy === 'price_asc') {
      query += ` ORDER BY ${priceExpr} ASC`;
    } else if (sortBy === 'price_desc') {
      query += ` ORDER BY ${priceExpr} DESC`;
    } else {
      query += ` ORDER BY ${SORT_COLUMNS[sortBy] || SORT_COLUMNS.name_asc}`;
    }

    query += ` LIMIT ? OFFSET ?`;
    params.push(limit ?? 20, offset ?? 0);

    return db.prepare(query).all(...params);
  },

  count({ search, city, country, stars, minPrice, maxPrice, amenity } = {}) {
    const params = [];
    const ftsQuery = search ? buildFtsQuery(search) : null;

    let query = `
      WITH priced AS (
        SELECT r.hotel_id AS hotel_id, MIN(rp.price) AS min_price
        FROM room_prices rp
        JOIN rooms r ON r.id = rp.room_id
        GROUP BY r.hotel_id
      )
      SELECT COUNT(DISTINCT h.id) AS c
      FROM hotels h
      LEFT JOIN priced ON priced.hotel_id = h.id
    `;

    if (ftsQuery) {
      query += ` JOIN hotels_fts fts ON fts.rowid = h.id AND hotels_fts MATCH ?`;
      params.push(ftsQuery);
    }

    query += ` WHERE 1=1`;

    if (city) {
      query += ` AND h.city = ?`;
      params.push(city);
    }
    if (country) {
      query += ` AND h.country = ?`;
      params.push(country);
    }
    if (stars) {
      query += ` AND h.stars = ?`;
      params.push(stars);
    }
    if (minPrice != null) {
      query += ` AND priced.min_price >= ?`;
      params.push(minPrice);
    }
    if (maxPrice != null) {
      query += ` AND priced.min_price <= ?`;
      params.push(maxPrice);
    }
    if (amenity && amenity.length > 0) {
      query += ` AND h.id IN (
        SELECT ha.hotel_id FROM hotel_room_amenities ha
        WHERE ha.hotel_id IS NOT NULL AND ha.amenity_id IN (${amenity.map(() => '?').join(',')})
        GROUP BY ha.hotel_id
        HAVING COUNT(DISTINCT ha.amenity_id) = ?
      )`;
      params.push(...amenity, amenity.length);
    }

    return db.prepare(query).get(...params).c;
  },

  suggest(rawQuery, limit = 5) {
    const ftsQuery = buildFtsQuery(rawQuery);
    if (!ftsQuery) return [];

    return db
      .prepare(
        `
        SELECT h.id, h.name, h.city, h.country
        FROM hotels_fts fts
        JOIN hotels h ON h.id = fts.rowid
        WHERE hotels_fts MATCH ?
        ORDER BY fts.rank
        LIMIT ?
        `
      )
      .all(ftsQuery, limit);
  },

  findById(id) {
    return db.prepare('SELECT * FROM hotels WHERE id = ?').get(id);
  },

  getCities() {
    const cities = db.prepare('SELECT DISTINCT city FROM hotels ORDER BY city').all();
    return cities.map((c) => c.city);
  },

  getCountries() {
    const countries = db.prepare('SELECT DISTINCT country FROM hotels ORDER BY country').all();
    return countries.map((c) => c.country);
  },

  getAmenityList() {
    return db
      .prepare(
        `
        SELECT a.* FROM amenities a
        JOIN hotel_room_amenities ha ON ha.amenity_id = a.id
        WHERE ha.hotel_id IS NOT NULL
        GROUP BY a.id
        ORDER BY a.name
        `
      )
      .all();
  }
};

module.exports = Hotel;