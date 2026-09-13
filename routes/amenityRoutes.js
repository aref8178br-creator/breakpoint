const express = require('express');
const router = express.Router();
const amenityController = require('../controllers/amenityController');

router.get('/', amenityController.getAll);

module.exports = router;
