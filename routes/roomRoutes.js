const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

router.get('/:id', roomController.getById);
router.get('/:id/prices', roomController.getPrices);

module.exports = router;
