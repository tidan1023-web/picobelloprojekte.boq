const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true, trim: true },
  client: { type: String, trim: true },
  location: { type: String, trim: true },
  sizeM2: { type: Number, required: true, min: 1 },
  condition: {
    type: String, required: true,
    enum: ['carcass', 'advanced_carcass', 'semi_finished', 'finished'],
  },
  tier: {
    type: String, required: true,
    enum: ['basic', 'mid_range', 'premium'],
  },
  totalCost: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'NGN' },
  completedYear: { type: Number, required: true },
  includesFurniture: { type: Boolean, default: false },
  includesKitchen: { type: Boolean, default: false },
  includesWardrobes: { type: Boolean, default: false },
  notes:        { type: String, trim: true },
  documentUrl:  { type: String },
  documentName: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('HistoricalProject', schema);
