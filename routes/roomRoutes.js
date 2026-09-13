const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { validate, idParamSchema } = require('../middleware/validate');

router.get('/:id', validate(idParamSchema, 'params'), roomController.getById);
router.get('/:id/prices', validate(idParamSchema, 'params'), roomController.getPrices);

module.exports = router;