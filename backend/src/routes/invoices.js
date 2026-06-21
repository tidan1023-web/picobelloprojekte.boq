const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { zodValidate, schemas }    = require('../middleware/zodValidate');
const {
  getInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice,
  addPayment, deletePayment, generatePDF,
} = require('../controllers/invoiceController');

router.use(authenticate);

// Clients can read invoices addressed to their company
router.get('/',        getInvoices);
router.get('/:id',     getInvoice);
router.get('/:id/pdf', generatePDF);

// QS / PM / Admin can create and edit invoices
router.post('/',   authorize('admin', 'qs', 'project_manager'), zodValidate(schemas.invoice), createInvoice);
router.put('/:id', authorize('admin', 'qs', 'project_manager'), zodValidate(schemas.invoice), updateInvoice);

// Only admin/QS can delete invoices or remove payments
router.delete('/:id',                   authorize('admin', 'qs'), deleteInvoice);
router.post('/:id/payments',            authorize('admin', 'qs', 'project_manager'), addPayment);
router.delete('/:id/payments/:paymentId', authorize('admin', 'qs'), deletePayment);

module.exports = router;
