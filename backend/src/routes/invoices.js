const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { zodValidate, schemas }    = require('../middleware/zodValidate');
const {
  getInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice,
  addPayment, deletePayment, generatePDF,
  getPaymentLink,
  getPublicInvoice, initPayment, verifyPayment,
} = require('../controllers/invoiceController');

// ── Public routes (no auth) ────────────────────────────────────────────────────
router.get('/public/:token',        getPublicInvoice);
router.post('/public/:token/pay',   initPayment);
router.get('/verify/:reference',    verifyPayment);

// ── Authenticated routes ───────────────────────────────────────────────────────
router.use(authenticate);

router.get('/',        getInvoices);
router.get('/:id',     getInvoice);
router.get('/:id/pdf', generatePDF);
router.get('/:id/payment-link', getPaymentLink);

router.post('/',   authorize('admin', 'qs', 'project_manager'), zodValidate(schemas.invoice), createInvoice);
router.put('/:id', authorize('admin', 'qs', 'project_manager'), zodValidate(schemas.invoice), updateInvoice);

router.delete('/:id',                     authorize('admin'), deleteInvoice);
router.post('/:id/payments',              authorize('admin', 'qs', 'project_manager'), addPayment);
router.delete('/:id/payments/:paymentId', authorize('admin'), deletePayment);

module.exports = router;
