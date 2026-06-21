'use strict';
const { S3Client } = require('@aws-sdk/client-s3');
const logger = require('../utils/logger');

const S3_CONFIGURED =
  !!(process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

let s3Client = null;

if (S3_CONFIGURED) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
} else {
  logger.warn('AWS S3 credentials not set — image upload features are disabled');
}

const S3_BUCKET = process.env.S3_BUCKET_NAME || null;
const S3_PRESIGNED_EXPIRES = parseInt(process.env.S3_PRESIGNED_URL_EXPIRES || '3600', 10);

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

module.exports = { s3Client, S3_BUCKET, S3_PRESIGNED_EXPIRES, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, S3_CONFIGURED };
