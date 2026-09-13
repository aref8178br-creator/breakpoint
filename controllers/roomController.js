const Room = require('../models/room');
const Price = require('../models/price');

const roomController = {
  getById(req, res, next) {
    try {
      const room = Room.findById(req.params.id);
      if (!room) return res.status(404).json({ error: 'Room not found' });
      res.json(room);
    } catch (err) {
      next(err);
    }
  },

  getPrices(req, res, next) {
    try {
      res.json(Price.findByRoomId(req.params.id));
    } catch (err) {
      next(err);
    }
  }
};

module.exports = roomController;