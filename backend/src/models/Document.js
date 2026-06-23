const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  url:         { type: String, required: true, trim: true },
  folder:      { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  projectId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
  companyId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('Document', documentSchema);
