const express = require('express');
const router = express.Router();
const { create, list } = require('../controllers/waitlistController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { zodValidate, schemas } = require('../middleware/zodValidate');

// Public — landing page signup form
router.post('/', authLimiter, zodValidate(schemas.waitlist), create);

// Platform owner only (checked in the controller) — not scoped to a company
router.get('/', authenticate, list);

module.exports = router;
