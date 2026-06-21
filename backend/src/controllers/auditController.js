'use strict';
const { AuditLog } = require('../models/AuditLog');

async function listAuditLogs(req, res, next) {
  try {
    const {
      action,
      entityType,
      entityId,
      userId,
      startDate,
      endDate,
      page = '1',
      limit = '50',
    } = req.query;

    const query = {};
    if (action) query.action = action;
    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = entityId;
    if (userId) query.userId = userId;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      logs,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    next(err);
  }
}

async function getEntityAuditTrail(req, res, next) {
  try {
    const { entityType, entityId } = req.params;
    const logs = await AuditLog.find({ entityType, entityId })
      .sort({ timestamp: -1 })
      .lean();
    res.json({ logs });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAuditLogs, getEntityAuditTrail };
