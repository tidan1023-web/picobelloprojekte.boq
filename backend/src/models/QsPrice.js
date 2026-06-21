const mongoose = require('mongoose');

const qsPriceSchema = new mongoose.Schema({
  category: { type: String, required: true, trim: true },
  subCategory: { type: String, trim: true },
  item: { type: String, required: true, trim: true },
  unit: { type: String, required: true, trim: true },
  source: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'NGN' },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('QsPrice', qsPriceSchema);
