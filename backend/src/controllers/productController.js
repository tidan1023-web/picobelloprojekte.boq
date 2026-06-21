'use strict';
const { Product } = require('../models/Product');
const { createAuditLog } = require('../utils/auditLogger');
const {
  uploadImageToS3,
  deleteImageFromS3,
  validateImageBuffer,
  buildS3Key,
} = require('../utils/s3Upload');
const { createError } = require('../middleware/errorHandler');

async function listProducts(req, res, next) {
  try {
    const { status, category, assignedTo, search, page = '1', limit = '20' } = req.query;
    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (assignedTo) query.assignedTo = assignedTo;
    if (search) {
      query.$or = [
        { sku: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('assignedTo', 'name employeeId email')
        .populate('createdBy', 'name employeeId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query),
    ]);

    res.json({
      products,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    next(err);
  }
}

async function getProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id)
      .populate('assignedTo', 'name employeeId email')
      .populate('createdBy', 'name employeeId')
      .populate('verifiedBy', 'name employeeId')
      .populate('dispatchedBy', 'name employeeId')
      .populate('images.uploadedBy', 'name employeeId');

    if (!product) throw createError('Product not found', 404);
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

async function createProduct(req, res, next) {
  try {
    const { sku, name, category, description, specifications, assignedTo, requiredViews } = req.body;

    const product = await Product.create({
      sku,
      name,
      category,
      description,
      specifications: specifications ? new Map(Object.entries(specifications)) : new Map(),
      assignedTo: assignedTo || undefined,
      requiredViews: requiredViews || ['front', 'back', 'left', 'right', 'serial_number'],
      createdBy: req.user._id,
    });

    await createAuditLog({
      action: 'PRODUCT_CREATED',
      entityType: 'product',
      entityId: product._id,
      user: req.user,
      details: { sku, name, category },
      req,
    });

    res.status(201).json({ message: 'Product created', product });
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw createError('Product not found', 404);
    if (product.status === 'dispatched') {
      throw createError('Cannot edit a dispatched product', 400);
    }

    const { name, category, description, specifications, assignedTo, requiredViews, trackingNumber } = req.body;
    const before = { name: product.name, category: product.category };

    if (name !== undefined) product.name = name;
    if (category !== undefined) product.category = category;
    if (description !== undefined) product.description = description;
    if (specifications !== undefined) {
      product.specifications = new Map(Object.entries(specifications));
    }
    if (assignedTo !== undefined) product.assignedTo = assignedTo || undefined;
    if (requiredViews !== undefined) product.requiredViews = requiredViews;
    if (trackingNumber !== undefined) product.trackingNumber = trackingNumber;

    await product.save();

    await createAuditLog({
      action: 'PRODUCT_UPDATED',
      entityType: 'product',
      entityId: product._id,
      user: req.user,
      details: { before, after: { name, category } },
      req,
    });

    res.json({ message: 'Product updated', product });
  } catch (err) {
    next(err);
  }
}

async function uploadProductImage(req, res, next) {
  try {
    if (!req.file) throw createError('Image file required', 400);

    const { viewType, notes } = req.body;
    if (!viewType) throw createError('viewType is required', 400);

    const product = await Product.findById(req.params.id);
    if (!product) throw createError('Product not found', 404);
    if (product.status === 'dispatched') {
      throw createError('Cannot add images to a dispatched product', 400);
    }

    validateImageBuffer(req.file.buffer, req.file.mimetype, req.file.size);

    const s3Key = buildS3Key(product.sku, viewType, req.file.originalname);
    const { s3Url } = await uploadImageToS3(req.file.buffer, req.file.mimetype, s3Key);

    const existingIdx = product.images.findIndex((img) => img.viewType === viewType);
    const imageEntry = {
      viewType,
      label: viewType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      s3Key,
      s3Url,
      uploadedBy: req.user._id,
      uploadedAt: new Date(),
      notes: notes || '',
    };

    if (existingIdx >= 0) {
      const oldKey = product.images[existingIdx].s3Key;
      if (oldKey) await deleteImageFromS3(oldKey).catch(() => {});
      product.images[existingIdx] = imageEntry;
    } else {
      product.images.push(imageEntry);
    }

    await product.save();

    await createAuditLog({
      action: 'IMAGE_UPLOADED',
      entityType: 'product',
      entityId: product._id,
      user: req.user,
      details: { sku: product.sku, viewType, s3Key },
      req,
    });

    res.json({
      message: 'Image uploaded',
      image: imageEntry,
      imageVerificationComplete: product.imageVerificationComplete,
      status: product.status,
    });
  } catch (err) {
    next(err);
  }
}

async function verifyProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw createError('Product not found', 404);

    if (!product.imageVerificationComplete) {
      const uploadedViews = product.images.map((i) => i.viewType);
      const missing = product.requiredViews.filter((v) => !uploadedViews.includes(v));
      throw createError(
        `Cannot verify: missing required images for views: ${missing.join(', ')}`,
        400
      );
    }

    if (product.status === 'dispatched') {
      throw createError('Product is already dispatched', 400);
    }

    product.status = 'verified';
    product.verifiedBy = req.user._id;
    product.verifiedAt = new Date();
    await product.save();

    await createAuditLog({
      action: 'PRODUCT_VERIFIED',
      entityType: 'product',
      entityId: product._id,
      user: req.user,
      details: { sku: product.sku },
      req,
    });

    res.json({ message: 'Product verified and ready to dispatch', product });
  } catch (err) {
    next(err);
  }
}

async function dispatchProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw createError('Product not found', 404);

    if (product.status !== 'verified') {
      await createAuditLog({
        action: 'DISPATCH_BLOCKED',
        entityType: 'product',
        entityId: product._id,
        user: req.user,
        details: { sku: product.sku, reason: `Status is "${product.status}", not "verified"` },
        req,
      });
      throw createError(
        `Dispatch blocked: product must be "verified" before dispatch. Current status: "${product.status}"`,
        400
      );
    }

    const { trackingNumber } = req.body;
    product.status = 'dispatched';
    product.dispatchedBy = req.user._id;
    product.dispatchedAt = new Date();
    if (trackingNumber) product.trackingNumber = trackingNumber;
    await product.save();

    await createAuditLog({
      action: 'PRODUCT_DISPATCHED',
      entityType: 'product',
      entityId: product._id,
      user: req.user,
      details: { sku: product.sku, trackingNumber },
      req,
    });

    res.json({ message: 'Product dispatched successfully', product });
  } catch (err) {
    next(err);
  }
}

async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw createError('Product not found', 404);
    if (product.status === 'dispatched') {
      throw createError('Cannot delete a dispatched product', 400);
    }

    await Promise.allSettled(product.images.map((img) => deleteImageFromS3(img.s3Key)));
    await product.deleteOne();

    await createAuditLog({
      action: 'PRODUCT_DELETED',
      entityType: 'product',
      entityId: product._id,
      user: req.user,
      details: { sku: product.sku },
      req,
    });

    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
}

async function getCategories(_req, res, next) {
  try {
    const categories = await Product.distinct('category');
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  uploadProductImage,
  verifyProduct,
  dispatchProduct,
  deleteProduct,
  getCategories,
};
