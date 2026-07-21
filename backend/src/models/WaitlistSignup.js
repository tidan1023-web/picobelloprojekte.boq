const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true },
  role: {
    type: String,
    required: true,
    enum: [
      'quantity_surveyor', 'project_manager', 'contractor', 'architect',
      'civil_structural_engineer', 'mep_engineer', 'site_supervisor',
      'developer_client', 'consultant', 'supplier_vendor', 'student', 'other',
    ],
  },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  notifiedAt: { type: Date, default: null },
}, { timestamps: true });

schema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('WaitlistSignup', schema);
