const Hotel = require('../models/hotel');
const Room = require('../models/room');
const Amenity = require('../models/amenity');
const Image = require('../models/image');
const Price = require('../models/price');

const hotelController = {
  getAll(req, res, next) {
    try {
      const { search, city, country, stars, minPrice, maxPrice, amenity, sortBy, checkin, page, pageSize } =
        req.query;

      const filters = { search, city, country, stars, minPrice, maxPrice, amenity, sortBy, checkin };
      const offset = (page - 1) * pageSize;

      const hotels = Hotel.findAll({ ...filters, limit: pageSize, offset });
      const total = Hotel.count(filters);

      res.json({
        data: hotels,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize))
        }
      });
    } catch (err) {
      next(err);
    }
  },

  suggest(req, res, next) {
    try {
      const { q, limit } = req.query;
      res.json(Hotel.suggest(q, limit));
    } catch (err) {
      next(err);
    }
  },

  getById(req, res, next) {
    try {
      const hotel = Hotel.findById(req.params.id);
      if (!hotel) return res.status(404).json({ error: 'Hotel not found' });
      res.json(hotel);
    } catch (err) {
      next(err);
    }
  },

  getRooms(req, res, next) {
    try {
      res.json(Room.findByHotelId(req.params.id));
    } catch (err) {
      next(err);
    }
  },

  getRoomsWithPrices(req, res, next) {
    try {
      res.json(Room.findByHotelIdWithPrices(req.params.id, req.query));
    } catch (err) {
      next(err);
    }
  },

  getAmenities(req, res, next) {
    try {
      res.json(Amenity.findByHotelId(req.params.id));
    } catch (err) {
      next(err);
    }
  },

  getImages(req, res, next) {
    try {
      res.json(Image.findByHotelId(req.params.id));
    } catch (err) {
      next(err);
    }
  },

  getPrices(req, res, next) {
    try {
      res.json(Price.findByHotelId(req.params.id));
    } catch (err) {
      next(err);
    }
  },

  getCities(req, res, next) {
    try {
      res.json(Hotel.getCities());
    } catch (err) {
      next(err);
    }
  },

  getCountries(req, res, next) {
    try {
      res.json(Hotel.getCountries());
    } catch (err) {
      next(err);
    }
  },

  getAmenityList(req, res, next) {
    try {
      res.json(Hotel.getAmenityList());
    } catch (err) {
      next(err);
    }
  }
};

module.exports = hotelController;
