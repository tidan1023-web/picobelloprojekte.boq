const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  category: {
    type: String,
    enum: ['Labour', 'Materials', 'Equipment', 'Transport', 'Professional Fees',
           'Permits & Licenses', 'Utilities', 'Office & Admin', 'Safety & PPE', 'Other'],
    default: 'Other',
  },
  description: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'NGN' },
  date: { type: Date, default: Date.now },
  vendor: { type: String, trim: true },
  notes: { type: String, trim: true },
  receipts: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
