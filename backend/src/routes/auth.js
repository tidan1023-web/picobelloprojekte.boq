const express    = require('express');
const router     = express.Router();
const {
  register, login, getMe, googleAuth,
  forgotPassword, resetPassword, deleteAccount,
} = require('../controllers/authController');
const { authenticate }          = require('../middleware/auth');
const { authLimiter }           = require('../middleware/rateLimiter');
const { zodValidate, schemas }  = require('../middleware/zodValidate');

// Strict rate limit on all auth mutation endpoints to prevent brute-force
router.post('/register',
  authLimiter,
  zodValidate(schemas.register),
  register,
);

router.post('/login',
  authLimiter,
  zodValidate(schemas.login),
  login,
);

// Google OAuth — rate-limited but no Zod schema (token comes from Google)
router.post('/google', authLimiter, googleAuth);

router.post('/forgot-password',
  authLimiter,
  zodValidate(schemas.forgotPassword),
  forgotPassword,
);

router.post('/reset-password/:token',
  authLimiter,
  zodValidate(schemas.resetPassword),
  resetPassword,
);

// Authenticated routes — no tight rate limit needed (JWT already gates them)
router.get('/me', authenticate, getMe);

// App Store / GDPR compliance — permanently delete the caller's account + all data
router.delete('/me', authenticate, deleteAccount);

module.exports = router;
