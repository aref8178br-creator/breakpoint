const Room = require('../models/room');
const Price = require('../models/price');

const roomController = {
  getById(req, res) {
    try {
      const room = Room.findById(req.params.id);
      if (!room) return res.status(404).json({ error: 'Room not found' });
      res.json(room);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch room' });
    }
  },

  getPrices(req, res) {
    try {
      const prices = Price.findByRoomId(req.params.id);
      res.json(prices);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch room prices' });
    }
  }
};

module.exports = roomController;
