const { db } = require('../config/database');

const Image = {
  findByHotelId(hotelId) {
    return db.prepare('SELECT * FROM images WHERE hotel_id = ? ORDER BY sort_order').all(hotelId);
  },

  findCoverByHotelId(hotelId) {
    return db.prepare(
      'SELECT image_path FROM images WHERE hotel_id = ? AND is_cover = 1 AND room_id IS NULL LIMIT 1'
    ).get(hotelId);
  },

  findByRoomId(roomId) {
    return db.prepare('SELECT * FROM images WHERE room_id = ? ORDER BY sort_order').all(roomId);
  }
};

module.exports = Image;
