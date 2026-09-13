const { db } = require('../config/database');

const Hotel = {
  findAll({ search, city, country, checkin } = {}) {
    let query = `
      SELECT h.*, 
        (SELECT MIN(rp.price) FROM room_prices rp 
         JOIN rooms r ON r.id = rp.room_id 
         WHERE r.hotel_id = h.id${checkin ? " AND rp.date = '" + checkin + "'" : ''}) as computed_min_price,
        (SELECT i.image_path FROM images i 
         WHERE i.hotel_id = h.id AND i.is_cover = 1 AND i.room_id IS NULL 
         LIMIT 1) as cover_image,
        (SELECT i.image_path FROM images i 
         WHERE i.hotel_id = h.id AND i.is_cover = 1
         LIMIT 1) as fallback_image
      FROM hotels h WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (h.name LIKE ? OR h.city LIKE ? OR h.country LIKE ? OR h.description LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (city) {
      query += ` AND h.city = ?`;
      params.push(city);
    }
    if (country) {
      query += ` AND h.country = ?`;
      params.push(country);
    }

    query += ` ORDER BY h.name`;
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
  }
};

module.exports = Hotel;
