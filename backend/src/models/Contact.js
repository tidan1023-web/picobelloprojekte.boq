const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  projectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  name: { type: String, required: true, trim: true },
  role: { type: String, trim: true },
  company: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  phone2: { type: String, trim: true },
  whatsapp: { type: String, trim: true },
  address: { type: String, trim: true },
  notes: { type: String, trim: true },
  category: {
    type: String,
    enum: ['client', 'contractor', 'subcontractor', 'supplier', 'consultant', 'architect', 'engineer', 'other'],
    default: 'other',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

contactSchema.pre('save', function (next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.model('Contact', contactSchema);
