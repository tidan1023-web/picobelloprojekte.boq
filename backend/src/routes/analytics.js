const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  getProfitReport, getCostVariance, getOutstandingInvoices,
  getSupplierPriceHistory, sendPaymentReminders,
} = require('../controllers/analyticsController');

router.use(authenticate);
router.use(authorize('admin', 'qs', 'project_manager'));

router.get('/profit', getProfitReport);
router.get('/cost-variance', getCostVariance);
router.get('/outstanding', getOutstandingInvoices);
router.get('/supplier-history', getSupplierPriceHistory);
router.post('/send-reminders', sendPaymentReminders);

module.exports = router;
