const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const SiteReport = require('../models/SiteReport');
const Project = require('../models/Project');
const { getAllowedProjectIds, scopeToProjects } = require('../utils/clientScope');
const { createNotification } = require('../controllers/notificationController');

async function notifyClientOfShare(projectId, { title, message, link }) {
  if (!projectId) return;
  const project = await Project.findById(projectId).select('assignedClientId');
  if (!project?.assignedClientId) return;
  await createNotification({ userId: project.assignedClientId, title, message, type: 'info', link });
}

router.use(authenticate);

// A client only sees reports a PM/QS/Admin has explicitly shared, and only
// for a project they're assigned to.
const canWrite = authorize('admin', 'qs', 'project_manager');

router.get('/', async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  if (req.query.template)   filter.template  = req.query.template;
  if (req.query.status)     filter.status    = req.query.status;

  if (req.user.role === 'client') filter.sharedWithClient = true;

  const allowedIds = await getAllowedProjectIds(req.user);
  if (allowedIds !== null && !scopeToProjects(filter, allowedIds)) return res.json({ reports: [] });

  const reports = await SiteReport.find(filter)
    .populate('projectId', 'name')
    .populate('preparedBy', 'name')
    .sort({ reportDate: -1 });
  res.json({ reports });
});

router.get('/:id', async (req, res) => {
  const report = await SiteReport.findOne({ _id: req.params.id, companyId: req.user.companyId })
    .populate('projectId', 'name')
    .populate('preparedBy', 'name')
    .populate('reviewedBy', 'name');
  if (!report) return res.status(404).json({ message: 'Report not found' });

  const allowedIds = await getAllowedProjectIds(req.user);
  if (allowedIds !== null) {
    const isClient = req.user.role === 'client';
    if ((isClient && !report.sharedWithClient) || !allowedIds.includes(String(report.projectId?._id))) {
      return res.status(404).json({ message: 'Report not found' });
    }
  }

  res.json({ report });
});

router.post('/', canWrite, async (req, res) => {
  const report = await SiteReport.create({
    ...req.body,
    companyId:  req.user.companyId,
    preparedBy: req.user._id,
  });

  if (report.sharedWithClient) {
    await notifyClientOfShare(report.projectId, {
      title: 'New site report shared',
      message: `"${report.title}" is now available in your portal.`,
      link: '/app/client-portal',
    });
  }

  res.status(201).json({ report });
});

router.put('/:id', canWrite, async (req, res) => {
  const before = await SiteReport.findOne({ _id: req.params.id, companyId: req.user.companyId }).select('sharedWithClient');
  const report = await SiteReport.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { ...req.body, updatedAt: new Date() },
    { new: true, runValidators: true },
  );
  if (!report) return res.status(404).json({ message: 'Report not found' });

  if (!before?.sharedWithClient && report.sharedWithClient) {
    await notifyClientOfShare(report.projectId, {
      title: 'New site report shared',
      message: `"${report.title}" is now available in your portal.`,
      link: '/app/client-portal',
    });
  }

  res.json({ report });
});

router.delete('/:id', canWrite, async (req, res) => {
  const report = await SiteReport.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
  if (!report) return res.status(404).json({ message: 'Report not found' });
  res.json({ message: 'Deleted' });
});

module.exports = router;
