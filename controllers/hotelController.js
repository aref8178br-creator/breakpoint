const Hotel = require('../models/hotel');
const Room = require('../models/room');
const Amenity = require('../models/amenity');
const Image = require('../models/image');
const Price = require('../models/price');

const hotelController = {
  getAll(req, res) {
    try {
      const { city, country, search, stars, minPrice, maxPrice, amenity, sortBy, checkin, checkout } = req.query;
      const hotels = Hotel.findAll({ search, city, country, stars, minPrice, maxPrice, amenity, sortBy, checkin, checkout });
      res.json(hotels);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch hotels' });
    }
  },

  getById(req, res) {
    try {
      const hotel = Hotel.findById(req.params.id);
      if (!hotel) return res.status(404).json({ error: 'Hotel not found' });
      res.json(hotel);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch hotel' });
    }
  },

  getRooms(req, res) {
    try {
      const rooms = Room.findByHotelId(req.params.id);
      res.json(rooms);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch rooms' });
    }
  },

  getAmenities(req, res) {
    try {
      const amenities = Amenity.findByHotelId(req.params.id);
      res.json(amenities);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch amenities' });
    }
  },

  getImages(req, res) {
    try {
      const images = Image.findByHotelId(req.params.id);
      res.json(images);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch images' });
    }
  },

  getPrices(req, res) {
    try {
      const prices = Price.findByHotelId(req.params.id);
      res.json(prices);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch prices' });
    }
  },

  getCities(req, res) {
    try {
      res.json(Hotel.getCities());
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch cities' });
    }
  },

  getCountries(req, res) {
    try {
      res.json(Hotel.getCountries());
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch countries' });
    }
  },

  getAmenityList(req, res) {
    try {
      res.json(Hotel.getAmenityList());
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch amenities list' });
    }
  }
};

module.exports = hotelController;
