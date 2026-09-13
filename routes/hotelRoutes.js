const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotelController');

router.get('/', hotelController.getAll);
router.get('/cities', hotelController.getCities);
router.get('/countries', hotelController.getCountries);
router.get('/:id', hotelController.getById);
router.get('/:id/rooms', hotelController.getRooms);
router.get('/:id/amenities', hotelController.getAmenities);
router.get('/:id/images', hotelController.getImages);
router.get('/:id/prices', hotelController.getPrices);

module.exports = router;
