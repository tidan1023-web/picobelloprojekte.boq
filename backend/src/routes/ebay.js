'use strict';
const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const {
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
} = require('../controllers/ebayController');

const CONDITION_VALUES = ['NEW', 'LIKE_NEW', 'USED_EXCELLENT', 'USED_GOOD', 'USED_ACCEPTABLE', 'FOR_PARTS'];

const listingBody = [
  body('price').isFloat({ min: 0.01 }).withMessage('Valid price required (min 0.01)'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('condition').optional().isIn(CONDITION_VALUES).withMessage('Invalid condition value'),
  body('categoryId').optional().trim().isLength({ max: 20 }),
  body('autoRelistAfterDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('autoRelistAfterDays must be 1–365'),
];

const router = Router();

// All eBay routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ─── OAuth ────────────────────────────────────────────────────────────────────

router.get('/auth-url', getEbayAuthUrl);
router.get('/callback', handleEbayCallback);
router.get('/status', getEbayStatus);

// ─── Listing library ──────────────────────────────────────────────────────────

router.get(
  '/listings',
  validate([
    query('status').optional().isIn(['draft', 'active', 'ended', 'sold']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ]),
  getListings
);

router.get(
  '/listings/:id',
  validate([param('id').isMongoId().withMessage('Invalid listing ID')]),
  getListing
);

router.post(
  '/listings/:id/relist',
  validate([param('id').isMongoId().withMessage('Invalid listing ID')]),
  relistListing
);

// ─── Create from inventory item ────────────────────────────────────────────────

// Primary endpoint: POST /api/v1/ebay/list-item/:id
router.post(
  '/list-item/:id',
  validate([param('id').isMongoId().withMessage('Invalid product ID'), ...listingBody]),
  createListing
);

// Legacy endpoint kept for backward compat with existing frontend sync button
router.post(
  '/products/:id/sync',
  validate([param('id').isMongoId().withMessage('Invalid product ID'), ...listingBody]),
  syncProductToEbay
);

// ─── Bulk listing ──────────────────────────────────────────────────────────────

router.post(
  '/bulk-list',
  validate([
    body('itemIds')
      .isArray({ min: 1, max: 50 })
      .withMessage('itemIds must be a non-empty array of up to 50 product IDs'),
    body('itemIds.*').isMongoId().withMessage('Each itemId must be a valid MongoDB ObjectId'),
    ...listingBody,
  ]),
  bulkList
);

// ─── Manual status sync ────────────────────────────────────────────────────────

router.post('/sync', triggerSync);

module.exports = router;
