'use strict';
const rateLimit = require('express-rate-limit');

// Login attempts: only counts failures (skipSuccessfulRequests: true)
// so a correct password never burns the budget.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Rate limit exceeded. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Upload rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limit for irreversible operations (account deletion)
const deletionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many deletion attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter, uploadLimiter, deletionLimiter };
