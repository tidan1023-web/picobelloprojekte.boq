'use strict';
const { Router } = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireStaff } = require('../middleware/rbac');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { multerMemoryConfig } = require('../utils/s3Upload');
const {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  uploadProductImage,
  verifyProduct,
  dispatchProduct,
  deleteProduct,
  getCategories,
} = require('../controllers/productController');

const router = Router();
const upload = multerMemoryConfig();

const productIdParam = [
  param('id').isMongoId().withMessage('Invalid product ID'),
];

router.use(authenticate);

router.get('/', requireStaff, listProducts);
router.get('/categories', requireStaff, getCategories);
router.get('/:id', requireStaff, validate(productIdParam), getProduct);

router.post(
  '/',
  requireAdmin,
  validate([
    body('sku')
      .matches(/^[A-Z0-9-_]{3,50}$/i)
      .withMessage('SKU must be 3-50 alphanumeric characters (hyphens/underscores allowed)'),
    body('name').trim().isLength({ min: 2, max: 200 }).withMessage('Name must be 2-200 characters'),
    body('category').trim().isLength({ min: 1, max: 100 }).withMessage('Category required'),
    body('description').optional().isLength({ max: 2000 }),
    body('requiredViews').optional().isArray().withMessage('requiredViews must be an array'),
  ]),
  createProduct
);

router.patch(
  '/:id',
  requireAdmin,
  validate([
    ...productIdParam,
    body('name').optional().trim().isLength({ min: 2, max: 200 }),
    body('category').optional().trim().isLength({ min: 1, max: 100 }),
  ]),
  updateProduct
);

router.post(
  '/:id/images',
  requireStaff,
  uploadLimiter,
  validate(productIdParam),
  upload.single('image'),
  uploadProductImage
);

router.post('/:id/verify', requireAdmin, validate(productIdParam), verifyProduct);

router.post(
  '/:id/dispatch',
  requireAdmin,
  validate([
    ...productIdParam,
    body('trackingNumber').optional().isLength({ max: 100 }),
  ]),
  dispatchProduct
);

router.delete('/:id', requireAdmin, validate(productIdParam), deleteProduct);

module.exports = router;
