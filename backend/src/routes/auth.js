'use strict';
const { Router } = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { authLimiter, deletionLimiter } = require('../middleware/rateLimiter');
const {
  login,
  refreshToken,
  getMe,
  updateProfile,
  changePassword,
  createUser,
  listUsers,
  getUserById,
  getUserStats,
  updatePerformanceRating,
  addComment,
  getComments,
  deactivateUser,
  exportMyData,
  deleteAccount,
  deleteUser,
} = require('../controllers/authController');

const router = Router();

// ---- Public ----

router.post(
  '/login',
  authLimiter,
  validate([
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ]),
  login
);

router.post(
  '/refresh',
  validate([body('refreshToken').notEmpty().withMessage('Refresh token required')]),
  refreshToken
);

// ---- Authenticated ----

router.get('/me', authenticate, getMe);

// GDPR: download everything stored about yourself
router.get('/me/export', authenticate, exportMyData);

router.patch(
  '/profile',
  authenticate,
  validate([
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('department').optional().trim().isLength({ max: 100 }),
    body('about').optional().trim().isLength({ max: 500 }),
  ]),
  updateProfile
);

router.patch(
  '/profile/password',
  authenticate,
  validate([
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and a number'),
  ]),
  changePassword
);

// App Store / GDPR: delete own account (requires password + confirmation phrase)
router.delete(
  '/account',
  authenticate,
  deletionLimiter,
  validate([
    body('password').notEmpty().withMessage('Password required'),
    body('confirmPhrase')
      .equals('DELETE MY ACCOUNT')
      .withMessage('Confirmation phrase must be "DELETE MY ACCOUNT"'),
  ]),
  deleteAccount
);

// ---- Admin only ----

router.post(
  '/users',
  authenticate,
  requireAdmin,
  validate([
    body('employeeId')
      .matches(/^[A-Z0-9-]{3,20}$/i)
      .withMessage('Employee ID must be 3-20 alphanumeric characters'),
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and a number'),
    body('role').isIn(['admin', 'staff']).withMessage('Role must be admin or staff'),
  ]),
  createUser
);

router.get('/users', authenticate, requireAdmin, listUsers);

router.get(
  '/users/:id',
  authenticate,
  requireAdmin,
  validate([param('id').isMongoId().withMessage('Invalid user ID')]),
  getUserById
);

router.patch(
  '/users/:id/deactivate',
  authenticate,
  requireAdmin,
  validate([param('id').isMongoId().withMessage('Invalid user ID')]),
  deactivateUser
);

// Admin deletes a user's account entirely (irreversible)
router.delete(
  '/users/:id',
  authenticate,
  requireAdmin,
  deletionLimiter,
  validate([param('id').isMongoId().withMessage('Invalid user ID')]),
  deleteUser
);

router.get(
  '/users/:id/stats',
  authenticate,
  validate([param('id').isMongoId().withMessage('Invalid user ID')]),
  getUserStats
);

router.patch(
  '/users/:id/rating',
  authenticate,
  requireAdmin,
  validate([
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('rating').isFloat({ min: 0, max: 5 }).withMessage('Rating must be 0–5'),
  ]),
  updatePerformanceRating
);

router.post(
  '/users/:id/comments',
  authenticate,
  requireAdmin,
  validate([
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('comment').trim().notEmpty().isLength({ max: 1000 }).withMessage('Comment required, max 1000 chars'),
  ]),
  addComment
);

router.get(
  '/users/:id/comments',
  authenticate,
  requireAdmin,
  validate([param('id').isMongoId().withMessage('Invalid user ID')]),
  getComments
);

module.exports = router;
