'use strict';
const { DefectLog } = require('../models/DefectLog');
const { Product } = require('../models/Product');
const { createAuditLog } = require('../utils/auditLogger');
const {
  uploadImageToS3,
  validateImageBuffer,
  buildDefectS3Key,
} = require('../utils/s3Upload');
const { createError } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');

async function listDefects(req, res, next) {
  try {
    const { status, severity, productId, page = '1', limit = '20' } = req.query;
    const query = {};
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (productId) query.productId = productId;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [defects, total] = await Promise.all([
      DefectLog.find(query)
        .populate('productId', 'sku name')
        .populate('loggedBy', 'name employeeId')
        .populate('acknowledgedBy', 'name employeeId')
        .populate('resolvedBy', 'name employeeId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      DefectLog.countDocuments(query),
    ]);

    res.json({ defects, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
  } catch (err) {
    next(err);
  }
}

async function createDefect(req, res, next) {
  try {
    const { productId, severity, description } = req.body;

    const product = await Product.findById(productId);
    if (!product) throw createError('Product not found', 404);

    const defect = await DefectLog.create({
      productId: product._id,
      productSku: product.sku,
      severity,
      description,
      loggedBy: req.user._id,
    });

    if (severity === 'critical' || severity === 'high') {
      product.status = 'defective';
      await product.save();
    }

    await createAuditLog({
      action: 'DEFECT_LOGGED',
      entityType: 'defect',
      entityId: defect._id,
      user: req.user,
      details: { productSku: product.sku, severity, description: description.substring(0, 100) },
      req,
    });

    res.status(201).json({ message: 'Defect logged', defect });
  } catch (err) {
    next(err);
  }
}

async function uploadDefectImage(req, res, next) {
  try {
    if (!req.file) throw createError('Image file required', 400);

    const defect = await DefectLog.findById(req.params.id);
    if (!defect) throw createError('Defect log not found', 404);

    validateImageBuffer(req.file.buffer, req.file.mimetype, req.file.size);

    const s3Key = buildDefectS3Key(defect.productSku, uuidv4(), req.file.originalname);
    const { s3Url } = await uploadImageToS3(req.file.buffer, req.file.mimetype, s3Key);

    const { annotationNotes } = req.body;
    defect.images.push({ s3Key, s3Url, annotationNotes });
    await defect.save();

    res.json({ message: 'Defect image uploaded', s3Url });
  } catch (err) {
    next(err);
  }
}

async function acknowledgeDefect(req, res, next) {
  try {
    const defect = await DefectLog.findById(req.params.id);
    if (!defect) throw createError('Defect not found', 404);
    if (defect.status !== 'open') throw createError('Defect is not in open state', 400);

    defect.status = 'acknowledged';
    defect.acknowledgedBy = req.user._id;
    defect.acknowledgedAt = new Date();
    await defect.save();

    await createAuditLog({
      action: 'DEFECT_ACKNOWLEDGED',
      entityType: 'defect',
      entityId: defect._id,
      user: req.user,
      details: { productSku: defect.productSku },
      req,
    });

    res.json({ message: 'Defect acknowledged', defect });
  } catch (err) {
    next(err);
  }
}

async function resolveDefect(req, res, next) {
  try {
    const { resolution } = req.body;
    const defect = await DefectLog.findById(req.params.id);
    if (!defect) throw createError('Defect not found', 404);
    if (defect.status === 'resolved') throw createError('Defect is already resolved', 400);

    defect.status = 'resolved';
    defect.resolvedBy = req.user._id;
    defect.resolvedAt = new Date();
    defect.resolution = resolution;
    await defect.save();

    await createAuditLog({
      action: 'DEFECT_RESOLVED',
      entityType: 'defect',
      entityId: defect._id,
      user: req.user,
      details: { productSku: defect.productSku, resolution: resolution && resolution.substring(0, 100) },
      req,
    });

    res.json({ message: 'Defect resolved', defect });
  } catch (err) {
    next(err);
  }
}

module.exports = { listDefects, createDefect, uploadDefectImage, acknowledgeDefect, resolveDefect };
