'use strict';
const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { listAuditLogs, getEntityAuditTrail } = require('../controllers/auditController');

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', listAuditLogs);
router.get('/:entityType/:entityId', getEntityAuditTrail);

module.exports = router;
