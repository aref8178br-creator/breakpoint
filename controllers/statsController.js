const { db } = require('../config/database');

const statsController = {
  get(req, res) {
    try {
      const hotels = db.prepare('SELECT COUNT(*) as count FROM hotels').get().count;
      const rooms = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
      const cities = db.prepare('SELECT COUNT(DISTINCT city) as count FROM hotels').get().count;
      const countries = db.prepare('SELECT COUNT(DISTINCT country) as count FROM hotels').get().count;
      res.json({ hotels, rooms, cities, countries });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  }
};

module.exports = statsController;
