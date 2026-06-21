'use strict';
const { Router } = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireStaff } = require('../middleware/rbac');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { multerMemoryConfig } = require('../utils/s3Upload');
const {
  listDefects,
  createDefect,
  uploadDefectImage,
  acknowledgeDefect,
  resolveDefect,
} = require('../controllers/defectController');

const router = Router();
const upload = multerMemoryConfig();

router.use(authenticate);

router.get('/', requireStaff, listDefects);

router.post(
  '/',
  requireStaff,
  validate([
    body('productId').isMongoId().withMessage('Valid product ID required'),
    body('severity')
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Severity must be low, medium, high, or critical'),
    body('description')
      .trim()
      .isLength({ min: 10, max: 2000 })
      .withMessage('Description must be 10-2000 characters'),
  ]),
  createDefect
);

router.post(
  '/:id/images',
  requireStaff,
  uploadLimiter,
  validate([param('id').isMongoId()]),
  upload.single('image'),
  uploadDefectImage
);

router.patch(
  '/:id/acknowledge',
  requireAdmin,
  validate([param('id').isMongoId()]),
  acknowledgeDefect
);

router.patch(
  '/:id/resolve',
  requireAdmin,
  validate([
    param('id').isMongoId(),
    body('resolution').trim().isLength({ min: 5, max: 2000 }).withMessage('Resolution required (5-2000 chars)'),
  ]),
  resolveDefect
);

module.exports = router;
