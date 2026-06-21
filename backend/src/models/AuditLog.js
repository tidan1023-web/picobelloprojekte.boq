const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  companyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  action:     { type: String, required: true },
  resource:   { type: String },
  resourceId: { type: mongoose.Schema.Types.ObjectId },
  details:    { type: mongoose.Schema.Types.Mixed },
  ip:         { type: String },
  userAgent:  { type: String },
  level:      { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
}, { timestamps: true });

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ companyId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // 90-day TTL

module.exports = mongoose.model('AuditLog', auditLogSchema);
