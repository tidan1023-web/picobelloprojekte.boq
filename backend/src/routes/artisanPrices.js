const express = require('express');
const router = express.Router();
const { getAll, create, update, remove } = require('../controllers/artisanPriceController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', authenticate, getAll);
router.post('/', authenticate, authorize('admin', 'qs'), create);
router.put('/:id', authenticate, authorize('admin', 'qs'), update);
router.delete('/:id', authenticate, authorize('admin', 'qs'), remove);

module.exports = router;
