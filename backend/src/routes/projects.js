const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} = require('../controllers/projectController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', authenticate, getProjects);
router.get('/:id', authenticate, getProject);
router.post('/', authenticate, authorize('admin', 'project_manager', 'qs'), createProject);
router.put('/:id', authenticate, authorize('admin', 'project_manager', 'qs'), updateProject);
router.delete('/:id', authenticate, authorize('admin'), deleteProject);

module.exports = router;
