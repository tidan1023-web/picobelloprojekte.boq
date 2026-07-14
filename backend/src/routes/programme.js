const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const c = require('../controllers/programmeController');

router.use(authenticate);

router.get('/',         c.list);
router.get('/:id',      c.get);
router.post('/',        authorize('admin', 'qs', 'project_manager'), c.create);
router.put('/:id',      authorize('admin', 'qs', 'project_manager'), c.update);
router.delete('/:id',   authorize('admin'), c.remove);
router.post('/:id/weekly-report', authorize('admin', 'qs', 'project_manager'), c.addWeeklyReport);

module.exports = router;
