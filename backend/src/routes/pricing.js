const express = require('express');
const router = express.Router();
const { getIntelligence } = require('../controllers/pricingController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Price Intelligence is a premium internal pricing tool -- hidden from the
// client sidebar and not used anywhere in the client portal.
router.get('/intelligence', authenticate, authorize('admin', 'qs', 'project_manager'), getIntelligence);

module.exports = router;
