const { db } = require('../config/database');

const Price = {
  findByRoomId(roomId) {
    return db.prepare('SELECT * FROM room_prices WHERE room_id = ? ORDER BY date').all(roomId);
  },

  findByHotelId(hotelId) {
    return db.prepare(`
      SELECT rp.date, MIN(rp.price) as min_price, MAX(rp.price) as max_price, AVG(rp.price) as avg_price
      FROM room_prices rp
      JOIN rooms r ON r.id = rp.room_id
      WHERE r.hotel_id = ?
      GROUP BY rp.date
      ORDER BY rp.date
    `).all(hotelId);
  }
};

module.exports = Price;
