const { db } = require('../config/database');

function nextDay(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const Room = {
  findByHotelId(hotelId) {
    return db
      .prepare(
        `
        SELECT r.*,
          (SELECT i.image_path FROM images i WHERE i.room_id = r.id AND i.is_cover = 1 LIMIT 1) AS image_path,
          (SELECT i.image_path FROM images i WHERE i.hotel_id = r.hotel_id AND i.is_cover = 1 AND i.room_id IS NULL LIMIT 1) AS hotel_image
        FROM rooms r
        WHERE r.hotel_id = ?
        ORDER BY r.id
        `
      )
      .all(hotelId);
  },

  /**
   * Returns every room of a hotel with its exact per-date prices over the
   * requested stay range [checkin, checkout), plus the cheap aggregates
   * (total, nights, avgNightly) a booking UI needs.
   *
   * - both dates -> [checkin, checkout)
   * - checkin only -> that single night
   * - checkout only -> that single night
   * - neither -> the whole price calendar
   */
  findByHotelIdWithPrices(hotelId, { checkin, checkout } = {}) {
    const bounds = db.prepare('SELECT MIN(date) AS min, MAX(date) AS max FROM room_prices').get();
    let from = checkin;
    let to = checkout;
    if (!from) from = to || bounds.min;
    if (!to) to = (checkin ? nextDay(checkin) : bounds.max ? nextDay(bounds.max) : null);

    const rows = db
      .prepare(
        `
        SELECT r.id, r.name, r.description, r.capacity,
          (SELECT i.image_path FROM images i WHERE i.room_id = r.id AND i.is_cover = 1 LIMIT 1) AS image_path,
          (SELECT i.image_path FROM images i WHERE i.hotel_id = r.hotel_id AND i.is_cover = 1 AND i.room_id IS NULL LIMIT 1) AS hotel_image,
          rp.date, rp.price
        FROM rooms r
        LEFT JOIN room_prices rp ON rp.room_id = r.id AND rp.date >= ? AND rp.date < ?
        WHERE r.hotel_id = ?
        ORDER BY r.id, rp.date
        `
      )
      .all(from, to, hotelId);

    const rooms = new Map();
    for (const row of rows) {
      if (!rooms.has(row.id)) {
        rooms.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          capacity: row.capacity,
          image_path: row.image_path || row.hotel_image,
          prices: []
        });
      }
      const room = rooms.get(row.id);
      if (row.price != null) {
        room.prices.push({ date: row.date, price: row.price });
      }
    }

    return [...rooms.values()].map((room) => {
      const total = room.prices.reduce((sum, p) => sum + p.price, 0);
      const nights = room.prices.length;
      return {
        ...room,
        total: nights > 0 ? Math.round(total * 100) / 100 : null,
        nights,
        avgNightly: nights > 0 ? Math.round((total / nights) * 100) / 100 : null
      };
    });
  },

  findById(id) {
    return db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
  }
};

module.exports = Room;