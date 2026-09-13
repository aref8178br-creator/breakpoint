const { db } = require('../config/database');

const Hotel = {
  findAll({ search, city, country, stars, minPrice, maxPrice, amenity, sortBy, checkin, checkout } = {}) {
    let query = `
      SELECT h.*,
        (SELECT MIN(rp.price) FROM room_prices rp
         JOIN rooms r ON r.id = rp.room_id
         WHERE r.hotel_id = h.id) as base_min_price,
        (SELECT i.image_path FROM images i
         WHERE i.hotel_id = h.id AND i.is_cover = 1 AND i.room_id IS NULL
         LIMIT 1) as cover_image,
        (SELECT i.image_path FROM images i
         WHERE i.hotel_id = h.id AND i.is_cover = 1
         LIMIT 1) as fallback_image
      FROM hotels h
      WHERE 1=1
    `;
    const params = [];

    // Text search across name, city, country, description
    if (search) {
      query += ` AND (h.name LIKE ? OR h.city LIKE ? OR h.country LIKE ? OR h.description LIKE ? OR h.address LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    // City filter
    if (city) {
      query += ` AND h.city = ?`;
      params.push(city);
    }

    // Country filter
    if (country) {
      query += ` AND h.country = ?`;
      params.push(country);
    }

    // Star rating filter (exact match)
    if (stars) {
      query += ` AND h.stars = ?`;
      params.push(parseInt(stars));
    }

    // Price range filter (uses base min price)
    if (minPrice) {
      query += ` AND (SELECT MIN(rp.price) FROM room_prices rp JOIN rooms r ON r.id = rp.room_id WHERE r.hotel_id = h.id) >= ?`;
      params.push(parseFloat(minPrice));
    }
    if (maxPrice) {
      query += ` AND (SELECT MIN(rp.price) FROM room_prices rp JOIN rooms r ON r.id = rp.room_id WHERE r.hotel_id = h.id) <= ?`;
      params.push(parseFloat(maxPrice));
    }

    // Amenity filter (hotel-level amenities)
    if (amenity) {
      const amenityIds = amenity.split(',').map(a => parseInt(a.trim())).filter(a => !isNaN(a));
      if (amenityIds.length > 0) {
        query += ` AND h.id IN (
          SELECT ha.hotel_id FROM hotel_room_amenities ha
          WHERE ha.hotel_id IS NOT NULL AND ha.amenity_id IN (${amenityIds.map(() => '?').join(',')})
          GROUP BY ha.hotel_id
          HAVING COUNT(DISTINCT ha.amenity_id) = ?
        )`;
        params.push(...amenityIds, amenityIds.length);
      }
    }

    // Date-based price computation
    if (checkin) {
      query = query.replace(
        /SELECT h\.\*,/,
        `SELECT h.*, (SELECT MIN(rp2.price) FROM room_prices rp2 JOIN rooms r2 ON r2.id = rp2.room_id WHERE r2.hotel_id = h.id AND rp2.date = ?) as computed_min_price,`
      );
      params.unshift(checkin);
    } else {
      query = query.replace(
        /SELECT h\.\*,/,
        `SELECT h.*, NULL as computed_min_price,`
      );
    }

    // Sorting
    switch (sortBy) {
      case 'price_asc':
        query += ` ORDER BY base_min_price ASC`;
        break;
      case 'price_desc':
        query += ` ORDER BY base_min_price DESC`;
        break;
      case 'stars_desc':
        query += ` ORDER BY h.stars DESC, h.name ASC`;
        break;
      case 'name_asc':
        query += ` ORDER BY h.name ASC`;
        break;
      default:
        query += ` ORDER BY h.name ASC`;
    }

    return db.prepare(query).all(...params);
  },

  findById(id) {
    return db.prepare('SELECT * FROM hotels WHERE id = ?').get(id);
  },

  getCities() {
    const cities = db.prepare('SELECT DISTINCT city FROM hotels ORDER BY city').all();
    return cities.map(c => c.city);
  },

  getCountries() {
    const countries = db.prepare('SELECT DISTINCT country FROM hotels ORDER BY country').all();
    return countries.map(c => c.country);
  },

  getAmenityList() {
    return db.prepare(`
      SELECT a.* FROM amenities a
      JOIN hotel_room_amenities ha ON ha.amenity_id = a.id
      WHERE ha.hotel_id IS NOT NULL
      GROUP BY a.id
      ORDER BY a.name
    `).all();
  }
};

module.exports = Hotel;
