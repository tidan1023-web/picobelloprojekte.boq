const express    = require('express');
const router     = express.Router();
const {
  register, login, getMe, googleAuth,
  forgotPassword, resetPassword, deleteAccount,
  listTeam, inviteMember, updateMemberRole, removeMember,
  markOnboarded, bookCall, completeCall,
  updateProfile, changePassword,
} = require('../controllers/authController');
const { multerMemoryConfig } = require('../utils/s3Upload');
const upload = multerMemoryConfig();
const { authenticate, authorize } = require('../middleware/auth');
const { authLimiter }           = require('../middleware/rateLimiter');
const { zodValidate, schemas }  = require('../middleware/zodValidate');

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

router.get('/me', authenticate, getMe);

// Team management — list visible to all authenticated users, mutations admin-only
router.get('/team',            authenticate, listTeam);
router.post('/invite',         authenticate, authorize('admin'), inviteMember);
router.patch('/team/:id/role', authenticate, authorize('admin'), updateMemberRole);
router.delete('/team/:id',     authenticate, authorize('admin'), removeMember);

router.patch('/me/profile', authenticate, upload.single('avatar'), updateProfile);
router.patch('/me/password', authenticate, changePassword);
router.patch('/me/onboarded',           authenticate, markOnboarded);
router.patch('/me/book-call',           authenticate, bookCall);
router.patch('/team/:id/complete-call', completeCall);
router.delete('/me', authenticate, deleteAccount);

module.exports = router;
