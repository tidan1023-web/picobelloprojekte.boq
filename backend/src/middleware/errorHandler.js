'use strict';
const Sentry = require('@sentry/node');
const logger = require('../utils/logger');

function createError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
}

function errorHandler(err, req, res, _next) {
  // Invalid MongoDB ObjectId — clean 400 instead of leaking schema info
  if (err.name === 'CastError') {
    res.status(400).json({ error: 'Invalid ID format' });
    return;
  }

  // Malformed or expired JWT handled here as a fallback (normally caught in authenticate)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Mongoose model-level validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({ error: 'Validation failed', details: err.message });
    return;
  }

  // MongoDB duplicate-key — err.code is the number 11000, not a string
  if (err.code === 11000) {
    res.status(409).json({ error: 'A record with that value already exists' });
    return;
  }

  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  logger.error('Request error', {
    requestId: req.id,
    message: err.message,
    statusCode,
    method: req.method,
    path: req.path,
    ...(isProduction ? {} : { stack: err.stack }),
  });

  if (!err.isOperational && isProduction) {
    Sentry.captureException(err);
  }

  res.status(statusCode).json({
    error: isProduction && statusCode === 500 ? 'Internal server error' : err.message,
    ...(isProduction ? {} : err.stack ? { stack: err.stack } : {}),
  });
}

function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}

module.exports = { createError, errorHandler, notFound };
