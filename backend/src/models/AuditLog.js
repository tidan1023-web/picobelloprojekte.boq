'use strict';
const mongoose = require('mongoose');

const { Schema } = mongoose;

const auditLogSchema = new Schema(
  {
    action: { type: String, required: true },
    entityType: {
      type: String,
      enum: ['user', 'product', 'defect', 'shipment', 'ebay_listing', 'system'],
      required: true,
    },
    entityId: { type: Schema.Types.Mixed },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    employeeId: { type: String, required: true },
    userEmail: { type: String, required: true },
    userName: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now, immutable: true },
  },
  {
    timestamps: false,
  }
);

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

// Block any attempt to update or delete audit records at the model level
auditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('Audit logs are immutable and cannot be modified');
});
auditLogSchema.pre('updateOne', function () {
  throw new Error('Audit logs are immutable and cannot be modified');
});
auditLogSchema.pre('updateMany', function () {
  throw new Error('Audit logs are immutable and cannot be modified');
});
auditLogSchema.pre('deleteOne', function () {
  throw new Error('Audit logs are immutable and cannot be modified');
});
auditLogSchema.pre('deleteMany', function () {
  throw new Error('Audit logs are immutable and cannot be modified');
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = { AuditLog };
