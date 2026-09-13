const Amenity = require('../models/amenity');

const amenityController = {
  getAll(req, res) {
    try {
      const amenities = Amenity.findAll();
      res.json(amenities);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch amenities' });
    }
  }
};

module.exports = amenityController;
