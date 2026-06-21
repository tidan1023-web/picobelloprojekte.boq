const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  getApprovals, submitItemDecision, submitVersionDecision, getPendingApprovals,
} = require('../controllers/approvalController');

router.use(authenticate);

router.get('/', getApprovals);
router.get('/pending', authorize('admin', 'qs', 'project_manager'), getPendingApprovals);
router.post('/item', authorize('client'), submitItemDecision);
router.post('/version/:boqVersionId', authorize('client'), submitVersionDecision);

module.exports = router;
