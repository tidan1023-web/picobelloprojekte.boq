const express = require('express');
const router  = express.Router();
const { getAll, create, remove } = require('../controllers/documentController');
const { authenticate } = require('../middleware/auth');
const { authorize }    = require('../middleware/rbac');

router.get('/',       authenticate, getAll);
router.post('/',      authenticate, authorize('admin'), create);
router.delete('/:id', authenticate, authorize('admin'), remove);

module.exports = router;
