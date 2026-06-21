'use strict';
const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/crypto');

const { Schema } = mongoose;

// Stores one eBay OAuth token set per admin user.
// accessToken and refreshToken are stored AES-256-GCM encrypted so raw values
// are never at rest in plaintext in the database.
const ebayTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    // Stored encrypted — access via methods below, never directly
    _accessToken: { type: String, required: true },
    _refreshToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    scope: [String],
    connectedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      // Never expose raw encrypted tokens over the wire
      transform: (_doc, ret) => {
        delete ret._accessToken;
        delete ret._refreshToken;
        return ret;
      },
    },
  }
);

ebayTokenSchema.methods.setTokens = function (accessToken, refreshToken) {
  this._accessToken = encrypt(accessToken);
  this._refreshToken = encrypt(refreshToken);
};

ebayTokenSchema.methods.getAccessToken = function () {
  return decrypt(this._accessToken);
};

ebayTokenSchema.methods.getRefreshToken = function () {
  return decrypt(this._refreshToken);
};

ebayTokenSchema.methods.isExpired = function () {
  // Treat tokens as expired 5 minutes early to avoid edge-case failures
  return new Date() >= new Date(this.expiresAt.getTime() - 5 * 60 * 1000);
};

const EbayToken = mongoose.model('EbayToken', ebayTokenSchema);

module.exports = { EbayToken };
