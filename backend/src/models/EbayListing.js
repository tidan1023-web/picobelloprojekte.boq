'use strict';
const mongoose = require('mongoose');

const { Schema } = mongoose;

const ebayListingSchema = new Schema(
  {
    // Reference to the warehouse inventory item
    itemId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    ebayListingId: { type: String, required: true, trim: true, unique: true },
    ebayOfferId: { type: String, trim: true },
    status: {
      type: String,
      enum: ['draft', 'active', 'ended', 'sold'],
      default: 'active',
      index: true,
    },
    price: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: 'USD', maxlength: 3 },
    quantity: { type: Number, default: 1, min: 1 },
    quantitySold: { type: Number, default: 0, min: 0 },
    condition: {
      type: String,
      enum: ['NEW', 'LIKE_NEW', 'USED_EXCELLENT', 'USED_GOOD', 'USED_ACCEPTABLE', 'FOR_PARTS'],
    },
    categoryId: { type: String, trim: true },
    listingUrl: { type: String, trim: true },
    lastSyncedAt: { type: Date },
    // Bonus: automatically relist N days after status becomes 'ended'
    autoRelistAfterDays: { type: Number, min: 1, max: 365 },
    // Track API failures without crashing the listing flow
    failedAttempts: { type: Number, default: 0, min: 0 },
    lastError: { type: String, maxlength: 1000 },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

ebayListingSchema.index({ status: 1, lastSyncedAt: 1 });
ebayListingSchema.index({ itemId: 1, status: 1 });
ebayListingSchema.index({ createdAt: -1 });

const EbayListing = mongoose.model('EbayListing', ebayListingSchema);

module.exports = { EbayListing };
