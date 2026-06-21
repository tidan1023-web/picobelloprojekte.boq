'use strict';
const { Product } = require('../models/Product');
const { DefectLog } = require('../models/DefectLog');
const { AuditLog } = require('../models/AuditLog');
const { User } = require('../models/User');

async function getDashboardStats(req, res, next) {
  try {
    const [
      totalProducts,
      pendingProducts,
      imagesUploadedProducts,
      verifiedProducts,
      dispatchedProducts,
      defectiveProducts,
      openDefects,
      criticalDefects,
      totalUsers,
      recentActivity,
    ] = await Promise.all([
      Product.countDocuments({}),
      Product.countDocuments({ status: 'pending' }),
      Product.countDocuments({ status: 'images_uploaded' }),
      Product.countDocuments({ status: 'verified' }),
      Product.countDocuments({ status: 'dispatched' }),
      Product.countDocuments({ status: 'defective' }),
      DefectLog.countDocuments({ status: { $in: ['open', 'acknowledged'] } }),
      DefectLog.countDocuments({ severity: 'critical', status: 'open' }),
      User.countDocuments({ isActive: true }),
      AuditLog.find({}).sort({ timestamp: -1 }).limit(10).lean(),
    ]);

    const itemsNeedingAttention = await Product.find({
      status: { $in: ['pending', 'defective'] },
    })
      .select('sku name status assignedTo')
      .populate('assignedTo', 'name employeeId')
      .limit(10)
      .lean();

    const readyToShip = await Product.find({ status: 'verified' })
      .select('sku name verifiedAt assignedTo')
      .populate('assignedTo', 'name employeeId')
      .limit(10)
      .lean();

    const categoryBreakdown = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dispatchActivity = await Product.aggregate([
      { $match: { status: 'dispatched', dispatchedAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$dispatchedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      stats: {
        totalProducts,
        pendingProducts,
        imagesUploadedProducts,
        verifiedProducts,
        dispatchedProducts,
        defectiveProducts,
        openDefects,
        criticalDefects,
        totalUsers,
      },
      alerts: {
        itemsNeedingAttention,
        readyToShip,
        criticalDefectsCount: criticalDefects,
      },
      charts: {
        categoryBreakdown,
        dispatchActivity,
      },
      recentActivity,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboardStats };
