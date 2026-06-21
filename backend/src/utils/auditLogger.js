'use strict';
const { AuditLog } = require('../models/AuditLog');
const logger = require('./logger');

async function createAuditLog(params) {
  try {
    await AuditLog.create({
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      userId: params.user._id,
      employeeId: params.user.employeeId,
      userEmail: params.user.email,
      userName: params.user.name,
      details: params.details || {},
      ipAddress: params.req
        ? params.req.headers['x-forwarded-for'] || params.req.ip
        : undefined,
      userAgent: params.req && params.req.headers['user-agent'],
    });
  } catch (err) {
    // Audit log failure must never crash the main request
    logger.error('Failed to create audit log', { error: err.message, params });
  }
}

module.exports = { createAuditLog };
