// Separate multer/Cloudinary setup for the general Document Library upload,
// kept apart from config/cloudinary.js (used for images and the single
// Historical Project attachment) so broadening the allowed file types here
// can't affect those other, narrower upload flows.
const { cloudinary } = require('./cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'squaremetre-boq/documents',
    resource_type: 'auto',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'zip'],
  },
});

const uploadDocument = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

module.exports = { uploadDocument };
