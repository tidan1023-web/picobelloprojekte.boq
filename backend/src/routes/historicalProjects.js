const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/historicalProjectController');

router.use(authenticate);

// Clients can browse past projects but not modify them
const canWrite = authorize('admin', 'qs', 'project_manager');

router.get('/',              ctrl.list);
router.post('/',             canWrite, ctrl.create);
router.put('/:id',           canWrite, ctrl.update);
router.delete('/:id',        canWrite, ctrl.remove);
router.post('/:id/document', canWrite, ctrl.uploadDocument);

module.exports = router;
