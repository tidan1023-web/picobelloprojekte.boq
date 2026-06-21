'use strict';
const mongoose = require('mongoose');

const { Schema } = mongoose;

const defectImageSchema = new Schema(
  {
    s3Key: { type: String, required: true },
    s3Url: { type: String, required: true },
    annotationNotes: { type: String, maxlength: 500 },
  },
  { _id: true }
);

const defectLogSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productSku: { type: String, required: true, uppercase: true },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
    },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    images: [defectImageSchema],
    status: {
      type: String,
      enum: ['open', 'acknowledged', 'resolved'],
      default: 'open',
    },
    loggedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    resolution: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

defectLogSchema.index({ productId: 1 });
defectLogSchema.index({ status: 1 });
defectLogSchema.index({ severity: 1 });
defectLogSchema.index({ loggedBy: 1 });
defectLogSchema.index({ createdAt: -1 });

const DefectLog = mongoose.model('DefectLog', defectLogSchema);

module.exports = { DefectLog };
