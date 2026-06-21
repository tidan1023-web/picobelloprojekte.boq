const express = require('express');
const router = express.Router();
const {
  getVersions,
  getVersion,
  createVersion,
  updateVersion,
  deleteVersion,
  addItem,
  updateItem,
  deleteItem,
} = require('../controllers/boqController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// BOQ Versions
router.get('/', authenticate, getVersions);
router.get('/:id', authenticate, getVersion);
router.post('/', authenticate, authorize('admin', 'qs', 'project_manager'), createVersion);
router.put('/:id', authenticate, authorize('admin', 'qs', 'project_manager'), updateVersion);
router.delete('/:id', authenticate, authorize('admin'), deleteVersion);

// BOQ Items
router.post('/:id/items', authenticate, authorize('admin', 'qs', 'project_manager'), addItem);
router.put('/:id/items/:itemId', authenticate, authorize('admin', 'qs', 'project_manager'), updateItem);
router.delete('/:id/items/:itemId', authenticate, authorize('admin', 'qs'), deleteItem);

module.exports = router;
