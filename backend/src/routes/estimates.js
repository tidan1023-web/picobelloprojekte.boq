const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { zodValidate, schemas }    = require('../middleware/zodValidate');
const ctrl = require('../controllers/estimateController');

// All estimate routes require a valid JWT
router.use(authenticate);

// Read — every role (including client) can view estimates for their company
router.post('/calculate', ctrl.calculate);
router.get('/',           ctrl.list);
router.get('/:id',        ctrl.getOne);
router.get('/:id/pdf',    ctrl.generatePdf);

// Write — clients cannot create/edit/delete estimates
const canWrite = authorize('admin', 'qs', 'project_manager');
router.post('/',      canWrite, zodValidate(schemas.estimate), ctrl.create);
router.put('/:id',    canWrite, zodValidate(schemas.estimate), ctrl.update);
router.delete('/:id', canWrite, ctrl.remove);

module.exports = router;
