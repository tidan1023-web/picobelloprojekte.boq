const mongoose = require('mongoose');

const materialPriceSchema = new mongoose.Schema({
  supplier: { type: String, required: true, trim: true },
  material: { type: String, required: true, trim: true },
  category: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'NGN' },
  unit: { type: String, required: true, trim: true },
  deliveryFee: { type: Number, default: 0, min: 0 },
  location: { type: String, trim: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('MaterialPrice', materialPriceSchema);
