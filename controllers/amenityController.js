const Amenity = require('../models/amenity');

const amenityController = {
  getAll(req, res, next) {
    try {
      const amenities = Amenity.findAll();
      res.json(amenities);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = amenityController;
