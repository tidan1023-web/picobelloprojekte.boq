const express = require('express');
const router = express.Router();
const { getIntelligence } = require('../controllers/pricingController');
const { authenticate } = require('../middleware/auth');

router.get('/intelligence', authenticate, getIntelligence);

module.exports = router;
