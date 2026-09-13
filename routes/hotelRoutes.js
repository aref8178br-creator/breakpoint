const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotelController');
const { validate, idParamSchema, hotelSearchSchema, suggestSchema, dateRangeSchema } = require('../middleware/validate');
const { searchLimiter } = require('../middleware/rateLimit');

router.get('/', searchLimiter, validate(hotelSearchSchema, 'query'), hotelController.getAll);

router.get('/suggest', searchLimiter, validate(suggestSchema, 'query'), hotelController.suggest);

router.get('/cities', hotelController.getCities);
router.get('/countries', hotelController.getCountries);
router.get('/amenities', hotelController.getAmenityList);

router.get('/:id', validate(idParamSchema, 'params'), hotelController.getById);
router.get('/:id/rooms', validate(idParamSchema, 'params'), hotelController.getRooms);
router.get('/:id/rooms-with-prices', validate(idParamSchema, 'params'), validate(dateRangeSchema, 'query'), hotelController.getRoomsWithPrices);
router.get('/:id/amenities', validate(idParamSchema, 'params'), hotelController.getAmenities);
router.get('/:id/images', validate(idParamSchema, 'params'), hotelController.getImages);
router.get('/:id/prices', validate(idParamSchema, 'params'), hotelController.getPrices);

module.exports = router;
