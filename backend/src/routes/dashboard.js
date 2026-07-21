const express = require('express');
const router = express.Router();
const { getSummary } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// The company-wide dashboard isn't part of the client portal.
router.get('/summary', authenticate, authorize('admin', 'qs', 'project_manager'), getSummary);

module.exports = router;
