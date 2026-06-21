'use strict';
const AuditLog = require('../models/AuditLog');
const logger = require('./logger');

function getIp(req) {
  return req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.ip;
}

async function log(action, { userId, companyId, resource, resourceId, details, req, level = 'info' } = {}) {
  try {
    await AuditLog.create({
      userId, companyId, action, resource, resourceId, details, level,
      ip: getIp(req),
      userAgent: req?.headers?.['user-agent'],
    });
  } catch (err) {
    // Never crash the main request on audit failure
    logger.error('Audit log write failed', { error: err.message, action });
  }
}

// Convenience wrappers so call-sites stay concise
const auditLogger = {
  info:  (action, opts) => log(action, { ...opts, level: 'info' }),
  warn:  (action, opts) => log(action, { ...opts, level: 'warn' }),
  error: (action, opts) => log(action, { ...opts, level: 'error' }),
  // Legacy name used in old controllers
  createAuditLog: ({ action, user, entityType, entityId, details, req }) =>
    log(action, {
      userId: user?._id,
      companyId: user?.companyId,
      resource: entityType,
      resourceId: entityId,
      details,
      req,
    }),
};

module.exports = auditLogger;
