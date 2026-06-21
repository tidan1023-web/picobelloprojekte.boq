const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: String,
  caption: String,
}, { _id: false });

const actionSchema = new mongoose.Schema({
  description: { type: String, required: true },
  assignedTo: String,
  dueDate: Date,
  status: { type: String, enum: ['open', 'in_progress', 'closed'], default: 'open' },
}, { _id: true });

const problemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  resolution: String,
}, { _id: true });

const siteReportSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  template: {
    type: String,
    enum: ['daily', 'weekly', 'incident', 'snag', 'delivery', 'inspection'],
    default: 'daily',
  },
  reportDate: { type: Date, default: Date.now },
  reportNumber: String,
  weatherCondition: String,
  temperature: String,

  // Location within site
  siteLocation: String,
  zone: String,
  level: String,
  room: String,

  title: { type: String, required: true },
  description: String,
  workCarriedOut: String,
  materialsUsed: String,
  workersOnSite: Number,
  visitorsOnSite: Number,

  problems: [problemSchema],
  actionsRequired: [actionSchema],
  images: [imageSchema],

  status: {
    type: String,
    enum: ['draft', 'submitted', 'reviewed', 'approved'],
    default: 'draft',
  },

  preparedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

siteReportSchema.pre('save', function (next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.model('SiteReport', siteReportSchema);
