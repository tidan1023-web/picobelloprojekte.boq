const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  quantity:    { type: Number, default: 1, min: 0 },
  unit:        { type: String, default: 'item', trim: true },
  unitRate:    { type: Number, required: true, min: 0 },
  amount:      { type: Number, required: true, min: 0 },
}, { _id: true });

const paymentSchema = new mongoose.Schema({
  amount:      { type: Number, required: true, min: 0 },
  paymentDate: { type: Date, default: Date.now },
  method: {
    type: String,
    enum: ['bank_transfer', 'cash', 'cheque', 'card', 'other'],
    default: 'bank_transfer',
  },
  reference: { type: String, trim: true },
  note:      { type: String, trim: true },
}, { timestamps: true });

const invoiceSchema = new mongoose.Schema({
  companyId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  invoiceNumber: { type: String, unique: true },
  estimateId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Estimate' },
  projectName:   { type: String, required: true, trim: true },
  clientName:    { type: String, trim: true },
  clientEmail:   { type: String, trim: true },
  clientPhone:   { type: String, trim: true },
  clientAddress: { type: String, trim: true },
  issueDate:     { type: Date, default: Date.now },
  dueDate:       { type: Date },
  currency:      { type: String, default: 'NGN' },
  lineItems:     [lineItemSchema],
  vatRate:       { type: Number, default: 0, min: 0, max: 100 },
  subtotal:      { type: Number, default: 0 },
  vatAmount:     { type: Number, default: 0 },
  total:         { type: Number, default: 0 },
  amountPaid:    { type: Number, default: 0 },
  balance:       { type: Number, default: 0 },
  payments:      [paymentSchema],
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'partially_paid', 'overdue'],
    default: 'draft',
  },
  notes:     { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

invoiceSchema.pre('save', async function (next) {
  if (this.isNew && !this.invoiceNumber) {
    const year  = new Date().getFullYear();
    const count = await this.constructor.countDocuments({ companyId: this.companyId });
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
