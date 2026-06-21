const express = require('express');
const router = express.Router();
const { getCompany, upsertCompany, uploadAsset } = require('../controllers/companyController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { upload } = require('../config/cloudinary');

router.get('/', authenticate, getCompany);
router.put('/', authenticate, authorize('admin'), upsertCompany);
router.post('/upload/:type', authenticate, authorize('admin'), upload.single('file'), uploadAsset);

module.exports = router;
