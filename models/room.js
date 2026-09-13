const { db } = require('../config/database');

const Room = {
  findByHotelId(hotelId) {
    return db.prepare('SELECT * FROM rooms WHERE hotel_id = ?').all(hotelId);
  },

  findById(id) {
    return db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
  }
};

module.exports = Room;
