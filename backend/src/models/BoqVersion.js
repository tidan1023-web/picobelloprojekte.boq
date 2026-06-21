const mongoose = require('mongoose');

const boqVersionSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String },
  status: {
    type: String,
    enum: ['draft', 'final', 'approved'],
    default: 'draft',
  },
  currency: { type: String, default: 'NGN' },
  totalCost: { type: Number, default: 0 },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('BoqVersion', boqVersionSchema);
