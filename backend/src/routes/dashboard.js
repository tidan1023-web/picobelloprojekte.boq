'use strict';
const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { requireStaff } = require('../middleware/rbac');
const { getDashboardStats } = require('../controllers/dashboardController');

const router = Router();
router.get('/stats', authenticate, requireStaff, getDashboardStats);

module.exports = router;
