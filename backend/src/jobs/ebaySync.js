'use strict';
const { syncListingStatuses, autoRelistExpired } = require('../services/ebayService');
const logger = require('../utils/logger');

// Default: sync every 30 minutes. Override with EBAY_SYNC_INTERVAL_MS env var.
const SYNC_INTERVAL_MS = parseInt(
  process.env.EBAY_SYNC_INTERVAL_MS || String(30 * 60 * 1000),
  10
);
// Initial delay after startup to allow DB connection to settle
const INITIAL_DELAY_MS = 2 * 60 * 1000;

let syncTimer = null;

async function runSync() {
  try {
    const { synced, errors, total } = await syncListingStatuses();
    if (total > 0) {
      logger.info('eBay status sync completed', { synced, errors, total });
    }
  } catch (err) {
    logger.error('eBay status sync job failed', { error: err.message });
  }

  try {
    const relisted = await autoRelistExpired();
    if (relisted > 0) {
      logger.info('eBay auto-relist completed', { relisted });
    }
  } catch (err) {
    logger.error('eBay auto-relist job failed', { error: err.message });
  }
}

function startEbaySyncJob() {
  logger.info('eBay sync job scheduled', {
    initialDelayMs: INITIAL_DELAY_MS,
    intervalMs: SYNC_INTERVAL_MS,
  });
  // First run after startup delay so the DB is definitely ready
  setTimeout(runSync, INITIAL_DELAY_MS);
  syncTimer = setInterval(runSync, SYNC_INTERVAL_MS);
}

function stopEbaySyncJob() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
    logger.info('eBay sync job stopped');
  }
}

module.exports = { startEbaySyncJob, stopEbaySyncJob, runSync };
