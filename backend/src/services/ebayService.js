'use strict';
const { EbayToken } = require('../models/EbayToken');
const { EbayListing } = require('../models/EbayListing');
const { Product } = require('../models/Product');
const {
  exchangeCodeForTokens,
  refreshAccessToken,
  ensureMerchantLocation,
  createOrUpdateInventoryItem,
  createOffer,
  publishOffer,
  getOffer,
  withRetry,
} = require('../utils/ebayClient');
const { createAuditLog } = require('../utils/auditLogger');
const { createError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// ─── Token management ────────────────────────────────────────────────────────

async function connectAccount(userId, code, user, req) {
  const tokens = await exchangeCodeForTokens(code);

  let record = await EbayToken.findOne({ userId });
  if (!record) record = new EbayToken({ userId });

  record.setTokens(tokens.accessToken, tokens.refreshToken);
  record.expiresAt = tokens.expiresAt;
  record.scope = tokens.scope || [];
  record.connectedAt = new Date();
  await record.save();

  await createAuditLog({
    action: 'EBAY_AUTH_CONNECTED',
    entityType: 'system',
    user,
    details: { expiresAt: tokens.expiresAt },
    req,
  });

  return record;
}

async function getValidToken(userId) {
  const record = await EbayToken.findOne({ userId });
  if (!record) {
    throw createError('eBay account not connected. Authorize via GET /api/v1/ebay/auth-url', 401);
  }

  if (record.isExpired()) {
    logger.info('Refreshing eBay access token', { userId });
    try {
      const refreshed = await refreshAccessToken(record.getRefreshToken());
      record.setTokens(refreshed.accessToken, record.getRefreshToken());
      record.expiresAt = refreshed.expiresAt;
      await record.save();
    } catch (err) {
      logger.error('eBay token refresh failed', { userId, error: err.message });
      throw createError('eBay token expired and could not be refreshed. Please reconnect.', 401);
    }
  }

  return record.getAccessToken();
}

async function getConnectionStatus(userId) {
  const record = await EbayToken.findOne({ userId });
  if (!record) return { connected: false };
  return {
    connected: true,
    expiresAt: record.expiresAt,
    isExpired: record.isExpired(),
    connectedAt: record.connectedAt,
  };
}

// ─── Payload builder ─────────────────────────────────────────────────────────

function buildListingPayload(product, { price, quantity = 1, condition, categoryId }) {
  const rawSpecs =
    product.specifications instanceof Map
      ? Object.fromEntries(product.specifications)
      : product.specifications || {};

  const aspects = {};
  for (const [k, v] of Object.entries(rawSpecs)) {
    aspects[k] = [String(v)];
  }

  return {
    sku: product.sku,
    title: `${product.name} — ${product.sku}`.substring(0, 80),
    description: [
      product.description || product.name,
      '',
      `SKU: ${product.sku}`,
      `Category: ${product.category}`,
    ].join('\n'),
    price: parseFloat(price),
    currency: process.env.EBAY_CURRENCY || 'USD',
    quantity: Math.max(1, parseInt(quantity, 10)),
    condition: condition || 'USED_EXCELLENT',
    imageUrls: product.images.map((img) => img.s3Url).slice(0, 12),
    categoryId: categoryId || process.env.EBAY_DEFAULT_CATEGORY_ID || '177',
    aspects,
  };
}

// ─── Single listing creation ──────────────────────────────────────────────────

async function createListing(productId, options, user, req) {
  const product = await Product.findById(productId).lean();
  if (!product) throw createError('Product not found', 404);

  if (!['verified', 'dispatched'].includes(product.status)) {
    throw createError('Only verified or dispatched products can be listed on eBay', 400);
  }

  // Check for an existing active listing on this product
  const existing = await EbayListing.findOne({ itemId: productId, status: 'active' });
  if (existing) {
    throw createError(
      `This product already has an active eBay listing (${existing.ebayListingId})`,
      409
    );
  }

  const accessToken = await getValidToken(user._id.toString());
  await ensureMerchantLocation(accessToken);
  const payload = buildListingPayload(product, options);

  const result = await withRetry(async () => {
    await createOrUpdateInventoryItem(accessToken, payload);
    const offerId = await createOffer(accessToken, payload);
    return publishOffer(accessToken, offerId);
  });

  const listing = await EbayListing.create({
    itemId: product._id,
    ebayListingId: result.listingId,
    ebayOfferId: result.offerId,
    status: 'active',
    price: payload.price,
    quantity: payload.quantity,
    condition: payload.condition,
    categoryId: payload.categoryId,
    listingUrl: result.url,
    autoRelistAfterDays: options.autoRelistAfterDays,
    lastSyncedAt: new Date(),
    failedAttempts: 0,
    createdBy: user._id,
  });

  await Product.findByIdAndUpdate(product._id, {
    ebayListingId: result.listingId,
    ebayItemId: result.itemId,
    ebaySynced: true,
    ebaySyncedAt: new Date(),
  });

  await createAuditLog({
    action: 'EBAY_LISTING_CREATED',
    entityType: 'ebay_listing',
    entityId: product._id,
    user,
    details: {
      sku: product.sku,
      listingId: result.listingId,
      offerId: result.offerId,
      price: payload.price,
      quantity: payload.quantity,
    },
    req,
  });

  logger.info('eBay listing created', { sku: product.sku, listingId: result.listingId });
  return { listing, result };
}

// ─── Relisting ───────────────────────────────────────────────────────────────

async function relistListing(listingId, user, req) {
  const listing = await EbayListing.findById(listingId).populate('itemId').lean();
  if (!listing) throw createError('Listing not found', 404);

  if (!['ended', 'sold'].includes(listing.status)) {
    throw createError('Only ended or sold listings can be relisted', 400);
  }

  const product = listing.itemId;
  if (!product) throw createError('Original product no longer exists', 404);

  const accessToken = await getValidToken(user._id.toString());
  await ensureMerchantLocation(accessToken);
  const payload = buildListingPayload(product, {
    price: listing.price,
    quantity: listing.quantity,
    condition: listing.condition,
    categoryId: listing.categoryId,
  });

  const result = await withRetry(async () => {
    await createOrUpdateInventoryItem(accessToken, payload);
    const offerId = await createOffer(accessToken, payload);
    return publishOffer(accessToken, offerId);
  });

  const updated = await EbayListing.findByIdAndUpdate(
    listingId,
    {
      ebayListingId: result.listingId,
      ebayOfferId: result.offerId,
      status: 'active',
      listingUrl: result.url,
      lastSyncedAt: new Date(),
      failedAttempts: 0,
      lastError: undefined,
    },
    { new: true }
  );

  await Product.findByIdAndUpdate(product._id, {
    ebayListingId: result.listingId,
    ebayItemId: result.itemId,
    ebaySynced: true,
    ebaySyncedAt: new Date(),
  });

  await createAuditLog({
    action: 'EBAY_LISTING_RELISTED',
    entityType: 'ebay_listing',
    entityId: product._id,
    user,
    details: {
      sku: product.sku,
      oldListingId: listing.ebayListingId,
      newListingId: result.listingId,
    },
    req,
  });

  return updated;
}

// ─── Bulk listing ─────────────────────────────────────────────────────────────

async function bulkCreateListings(productIds, commonOptions, user, req) {
  const results = { success: [], failed: [], total: productIds.length };

  for (const productId of productIds) {
    try {
      const { listing } = await createListing(productId, commonOptions, user, req);
      results.success.push({
        productId,
        listingId: listing.ebayListingId,
        listingUrl: listing.listingUrl,
      });
    } catch (err) {
      logger.error('Bulk listing failed for product', { productId, error: err.message });
      results.failed.push({ productId, error: err.message });
    }
  }

  await createAuditLog({
    action: 'EBAY_BULK_LISTING',
    entityType: 'system',
    user,
    details: {
      requested: productIds.length,
      succeeded: results.success.length,
      failed: results.failed.length,
    },
    req,
  });

  return results;
}

// ─── Status sync ──────────────────────────────────────────────────────────────

const STATUS_MAP = {
  PUBLISHED: 'active',
  ACTIVE: 'active',
  UNPUBLISHED: 'draft',
  ENDED: 'ended',
  SOLD: 'sold',
  COMPLETED: 'sold',
};

function mapEbayStatus(status) {
  return STATUS_MAP[(status || '').toUpperCase()] || 'active';
}

async function syncListingStatuses() {
  // Only sync listings not checked in the past 30 minutes
  const staleThreshold = new Date(Date.now() - 30 * 60 * 1000);

  const listings = await EbayListing.find({
    status: 'active',
    $or: [{ lastSyncedAt: null }, { lastSyncedAt: { $lt: staleThreshold } }],
  })
    .populate('createdBy', 'name email employeeId')
    .lean();

  if (!listings.length) return { synced: 0, errors: 0, total: 0 };

  logger.info(`eBay sync: checking ${listings.length} active listings`);

  let synced = 0;
  let errors = 0;

  for (const listing of listings) {
    try {
      const userId = listing.createdBy._id.toString();
      const accessToken = await getValidToken(userId);
      const offerId = listing.ebayOfferId || listing.ebayListingId;
      const offerData = await getOffer(accessToken, offerId);

      const newStatus = mapEbayStatus(offerData.status);
      const quantitySold = offerData.soldQuantity || 0;

      await EbayListing.findByIdAndUpdate(listing._id, {
        status: newStatus,
        quantitySold,
        lastSyncedAt: new Date(),
        lastError: undefined,
      });

      if (newStatus === 'sold') {
        await Product.findByIdAndUpdate(listing.itemId, { status: 'dispatched' });
        await createAuditLog({
          action: 'EBAY_ITEM_SOLD',
          entityType: 'ebay_listing',
          entityId: listing.itemId,
          user: listing.createdBy,
          details: { listingId: listing.ebayListingId, quantitySold },
          req: null,
        });
      }

      synced++;
    } catch (err) {
      logger.error('eBay sync failed for listing', {
        listingId: listing._id,
        ebayListingId: listing.ebayListingId,
        error: err.message,
      });
      await EbayListing.findOneAndUpdate(
        { _id: listing._id },
        {
          lastSyncedAt: new Date(),
          lastError: err.message,
          $inc: { failedAttempts: 1 },
        }
      );
      errors++;
    }
  }

  return { synced, errors, total: listings.length };
}

// ─── Auto-relist (bonus) ──────────────────────────────────────────────────────

async function autoRelistExpired() {
  const now = new Date();

  const candidates = await EbayListing.find({
    status: 'ended',
    autoRelistAfterDays: { $gt: 0 },
  })
    .populate('itemId')
    .populate('createdBy', 'name email employeeId')
    .lean();

  let relisted = 0;

  for (const listing of candidates) {
    const relistAfter = new Date(
      listing.updatedAt.getTime() + listing.autoRelistAfterDays * 86_400_000
    );

    if (now >= relistAfter) {
      try {
        await relistListing(listing._id.toString(), listing.createdBy, null);
        relisted++;
        logger.info('Auto-relisted expired eBay listing', {
          listingId: listing._id,
          sku: listing.itemId?.sku,
        });
      } catch (err) {
        logger.error('Auto-relist failed', { listingId: listing._id, error: err.message });
      }
    }
  }

  return relisted;
}

// ─── Listing queries ──────────────────────────────────────────────────────────

async function getListings({ status, page = 1, limit = 20 } = {}) {
  const query = {};
  if (status) query.status = status;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const [listings, total] = await Promise.all([
    EbayListing.find(query)
      .populate('itemId', 'name sku category images status')
      .populate('createdBy', 'name employeeId')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    EbayListing.countDocuments(query),
  ]);

  return {
    listings,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  };
}

async function getListingById(listingId) {
  const listing = await EbayListing.findById(listingId)
    .populate('itemId', 'name sku category images status specifications description')
    .populate('createdBy', 'name employeeId')
    .lean();
  if (!listing) throw createError('Listing not found', 404);
  return listing;
}

module.exports = {
  connectAccount,
  getValidToken,
  getConnectionStatus,
  createListing,
  relistListing,
  bulkCreateListings,
  syncListingStatuses,
  autoRelistExpired,
  getListings,
  getListingById,
};
