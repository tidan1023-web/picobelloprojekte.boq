const mongoose = require('mongoose');

const boqItemSchema = new mongoose.Schema({
  versionId: { type: mongoose.Schema.Types.ObjectId, ref: 'BoqVersion', required: true },
  item: { type: String, required: true, trim: true },
  description: { type: String },
  unit: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  baseCost: { type: Number, required: true, min: 0 },
  overheadPercent: { type: Number, default: 0, min: 0 },
  profitPercent: { type: Number, default: 0, min: 0 },
  finalUnitPrice: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  options: [
    {
      tier: { type: String, enum: ['basic', 'standard', 'premium'] },
      label: { type: String },
      baseCost: { type: Number, min: 0 },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Auto-calculate on every save
boqItemSchema.pre('save', function (next) {
  const overhead = 1 + this.overheadPercent / 100;
  const profit = 1 + this.profitPercent / 100;
  this.finalUnitPrice = parseFloat((this.baseCost * overhead * profit).toFixed(2));
  this.totalCost = parseFloat((this.finalUnitPrice * this.quantity).toFixed(2));
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('BoqItem', boqItemSchema);
