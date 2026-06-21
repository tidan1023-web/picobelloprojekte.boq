const mongoose = require('mongoose');

const artisanPriceSchema = new mongoose.Schema({
  service: { type: String, required: true, trim: true },
  category: { type: String, trim: true },
  rate: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'NGN' },
  rateUnit: {
    type: String,
    enum: ['per day', 'per hour', 'per job', 'per m²', 'per unit'],
    default: 'per day',
  },
  location: { type: String, trim: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ArtisanPrice', artisanPriceSchema);
