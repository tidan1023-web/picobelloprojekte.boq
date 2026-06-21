const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  client: { type: String, required: true, trim: true },
  location: { type: String },
  budget: { type: Number },
  currency: { type: String, default: 'NGN' },
  startDate: { type: Date },
  endDate: { type: Date },
  status: {
    type: String,
    enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
    default: 'planning',
  },
  description: { type: String },
  assignedClientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

projectSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Project', projectSchema);
