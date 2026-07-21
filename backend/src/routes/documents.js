const express = require('express');
const router  = express.Router();
const { getAll, create, uploadFile, remove } = require('../controllers/documentController');
const { authenticate } = require('../middleware/auth');
const { authorize }    = require('../middleware/rbac');
const { uploadDocument } = require('../config/cloudinaryDocuments');

router.get('/',       authenticate, getAll);
router.post('/',      authenticate, authorize('admin'), create);
router.post('/upload', authenticate, authorize('admin'), uploadDocument.single('file'), uploadFile);
router.delete('/:id', authenticate, authorize('admin'), remove);

module.exports = router;
