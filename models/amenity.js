const { db } = require('../config/database');

const Amenity = {
  findAll() {
    return db.prepare('SELECT * FROM amenities ORDER BY name').all();
  },

  findByHotelId(hotelId) {
    return db.prepare(`
      SELECT a.* FROM amenities a
      JOIN hotel_room_amenities ha ON ha.amenity_id = a.id
      WHERE ha.hotel_id = ? AND ha.room_id IS NULL
    `).all(hotelId);
  },

  findByRoomId(roomId) {
    return db.prepare(`
      SELECT a.* FROM amenities a
      JOIN hotel_room_amenities ha ON ha.amenity_id = a.id
      WHERE ha.room_id = ?
    `).all(roomId);
  }
};

module.exports = Amenity;
