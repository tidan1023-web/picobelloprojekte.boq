const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  amount: { type: Number, required: true, min: 0 },
  method: {
    type: String,
    enum: ['bank_transfer', 'cash', 'cheque', 'card', 'other'],
    default: 'bank_transfer',
  },
  reference: { type: String, trim: true },
  paymentDate: { type: Date, default: Date.now },
  notes: { type: String },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
