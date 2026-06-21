const mongoose = require('mongoose');

const progressUpdateSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  phase: {
    type: String,
    enum: ['foundation', 'structure', 'mep', 'finishing', 'external', 'other'],
    required: true,
  },
  title: { type: String, required: true, trim: true },
  notes: { type: String },
  images: [{ type: String }],
  date: { type: Date, default: Date.now },
  completionPercent: { type: Number, min: 0, max: 100, default: 0 },
  actualCost: { type: Number, default: 0, min: 0 },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('ProgressUpdate', progressUpdateSchema);
