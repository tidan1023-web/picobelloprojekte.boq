'use strict';
const { v4: uuidv4 } = require('uuid');
const ebayService = require('../services/ebayService');
const { runSync } = require('../jobs/ebaySync');
const { getAuthorizationUrl } = require('../utils/ebayClient');
const { createError } = require('../middleware/errorHandler');

// ─── OAuth ───────────────────────────────────────────────────────────────────

function getEbayAuthUrl(req, res) {
  const state = uuidv4();
  const url = getAuthorizationUrl(state);
  res.json({ authUrl: url, state });
}

async function handleEbayCallback(req, res, next) {
  try {
    const { code } = req.query;
    if (!code) throw createError('Authorization code missing from eBay callback', 400);

    const record = await ebayService.connectAccount(
      req.user._id.toString(),
      code,
      req.user,
      req
    );

    res.json({
      message: 'eBay account connected successfully',
      expiresAt: record.expiresAt,
      connectedAt: record.connectedAt,
    });
  } catch (err) {
    next(err);
  }
}

async function getEbayStatus(req, res, next) {
  try {
    const status = await ebayService.getConnectionStatus(req.user._id.toString());
    res.json(status);
  } catch (err) {
    next(err);
  }
}

// ─── Single listing ───────────────────────────────────────────────────────────

async function createListing(req, res, next) {
  try {
    const { listing, result } = await ebayService.createListing(
      req.params.id,
      req.body,
      req.user,
      req
    );
    res.status(201).json({ message: 'Product listed on eBay', listing, result });
  } catch (err) {
    next(err);
  }
}

// Legacy endpoint — kept for backward compat with the existing frontend
async function syncProductToEbay(req, res, next) {
  try {
    const { listing, result } = await ebayService.createListing(
      req.params.id,
      req.body,
      req.user,
      req
    );
    res.json({ message: 'Product listed on eBay', result, listing });
  } catch (err) {
    next(err);
  }
}

// ─── Listing library ──────────────────────────────────────────────────────────

async function getListings(req, res, next) {
  try {
    const { status, page, limit } = req.query;
    const data = await ebayService.getListings({ status, page, limit });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getListing(req, res, next) {
  try {
    const listing = await ebayService.getListingById(req.params.id);
    res.json({ listing });
  } catch (err) {
    next(err);
  }
}

async function relistListing(req, res, next) {
  try {
    const listing = await ebayService.relistListing(req.params.id, req.user, req);
    res.json({ message: 'Listing relisted successfully', listing });
  } catch (err) {
    next(err);
  }
}

// ─── Bulk listing ─────────────────────────────────────────────────────────────

async function bulkList(req, res, next) {
  try {
    const { itemIds, price, quantity, condition, categoryId, autoRelistAfterDays } = req.body;
    const results = await ebayService.bulkCreateListings(
      itemIds,
      { price, quantity, condition, categoryId, autoRelistAfterDays },
      req.user,
      req
    );
    const httpStatus = results.failed.length === results.total ? 422 : 200;
    res.status(httpStatus).json(results);
  } catch (err) {
    next(err);
  }
}

// ─── Manual sync trigger ──────────────────────────────────────────────────────

async function triggerSync(req, res, next) {
  try {
    // Run in background — don't wait for completion
    runSync().catch((err) =>
      require('../utils/logger').error('Manual sync error', { error: err.message })
    );
    res.json({ message: 'Status sync triggered. Results will be applied in the background.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getEbayAuthUrl,
  handleEbayCallback,
  getEbayStatus,
  createListing,
  syncProductToEbay,
  getListings,
  getListing,
  relistListing,
  bulkList,
  triggerSync,
};
