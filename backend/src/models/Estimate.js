const mongoose = require('mongoose');

const tierEstimateSchema = new mongoose.Schema({
  rate: Number,
  total: Number,
}, { _id: false });

const engineResultSchema = new mongoose.Schema({
  projectsTotal: Number,
  projectsUsed: Number,
  outliersRemoved: Number,
  baseRate: Number,
  conditionMultiplier: Number,
  tierMultiplier: Number,
  sizeMultiplier: Number,
  finalRate: Number,
  totalCost: Number,
  basicEstimate: tierEstimateSchema,
  midRangeEstimate: tierEstimateSchema,
  premiumEstimate: tierEstimateSchema,
  dataSource: { type: String, enum: ['historical', 'fallback'], default: 'historical' },
}, { _id: false });

const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  estimateNumber: { type: String, required: true },
  projectName: { type: String, required: true, trim: true },
  clientName: { type: String, trim: true },
  clientEmail: { type: String, trim: true },
  clientPhone: { type: String, trim: true },
  location: { type: String, trim: true },
  sizeM2: { type: Number, required: true },
  condition: {
    type: String, required: true,
    enum: ['carcass', 'advanced_carcass', 'semi_finished', 'finished'],
  },
  tier: {
    type: String, required: true,
    enum: ['basic', 'mid_range', 'premium'],
  },
  includesFurniture: { type: Boolean, default: false },
  includesKitchen: { type: Boolean, default: false },
  includesWardrobes: { type: Boolean, default: false },
  scopeAssumptions: { type: String, trim: true },
  exclusions: { type: String, trim: true },
  validityDays: { type: Number, default: 30 },
  currency: { type: String, default: 'NGN' },
  engineResult: engineResultSchema,
  selectedTier: { type: String, enum: ['basic', 'mid_range', 'premium'] },
  selectedRate: Number,
  selectedTotal: Number,
  status: {
    type: String,
    enum: ['draft', 'sent', 'accepted', 'declined'],
    default: 'draft',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Estimate', schema);
