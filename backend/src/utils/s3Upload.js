'use strict';
const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const { s3Client, S3_BUCKET, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, S3_PRESIGNED_EXPIRES, S3_CONFIGURED } = require('../config/s3');
const { createError } = require('../middleware/errorHandler');
const logger = require('./logger');

function buildS3Key(productSku, viewType, originalName) {
  const ext = (originalName.split('.').pop() || 'jpg').toLowerCase();
  const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
  return `products/${productSku.toUpperCase()}/${viewType}/${uuidv4()}.${safeExt}`;
}

function buildDefectS3Key(productSku, defectId, originalName) {
  const ext = (originalName.split('.').pop() || 'jpg').toLowerCase();
  const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
  return `defects/${productSku.toUpperCase()}/${defectId}/${uuidv4()}.${safeExt}`;
}

function validateImageBuffer(buffer, mimetype, size) {
  if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
    throw createError(`File type not allowed. Accepted: ${ALLOWED_MIME_TYPES.join(', ')}`, 400);
  }
  if (size > MAX_FILE_SIZE_BYTES) {
    throw createError(`File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`, 400);
  }
  const header = buffer.slice(0, 4);
  const isJpeg = header[0] === 0xff && header[1] === 0xd8;
  const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
  const isWebp = buffer.slice(0, 4).toString('ascii') === 'RIFF';
  if (!isJpeg && !isPng && !isWebp) {
    throw createError('File content does not match a valid image format', 400);
  }
}

async function uploadImageToS3(buffer, mimetype, s3Key) {
  if (!S3_CONFIGURED) throw createError('Image upload is not configured (AWS S3 credentials missing)', 503);
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    Body: buffer,
    ContentType: mimetype,
    ServerSideEncryption: 'AES256',
    Metadata: {
      uploadedAt: new Date().toISOString(),
      service: 'warehouse-inventory-hq',
    },
  });

  await s3Client.send(command);
  logger.info('Image uploaded to S3', { s3Key });

  const s3Url = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
  return { s3Key, s3Url };
}

async function deleteImageFromS3(s3Key) {
  if (!S3_CONFIGURED) return;
  const command = new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: s3Key });
  await s3Client.send(command);
  logger.info('Image deleted from S3', { s3Key });
}

async function getPresignedUrl(s3Key) {
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key });
  return getSignedUrl(s3Client, command, { expiresIn: S3_PRESIGNED_EXPIRES });
}

function multerMemoryConfig() {
  const multer = require('multer');
  const storage = multer.memoryStorage();
  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 6 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP are accepted.'), false);
      }
    },
  });
}

module.exports = {
  buildS3Key,
  buildDefectS3Key,
  validateImageBuffer,
  uploadImageToS3,
  deleteImageFromS3,
  getPresignedUrl,
  multerMemoryConfig,
};
