const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/historicalProjectController');

router.use(authenticate);

// Historical Projects isn't part of the client portal — nothing here
// concerns a client account.
const canWrite = authorize('admin', 'qs', 'project_manager');

router.get('/',              canWrite, ctrl.list);
router.post('/',             canWrite, ctrl.create);
router.put('/:id',           canWrite, ctrl.update);
router.delete('/:id',        canWrite, ctrl.remove);
router.post('/:id/document', canWrite, ctrl.uploadDocument);

module.exports = router;
