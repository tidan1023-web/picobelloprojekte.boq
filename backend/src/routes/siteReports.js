const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const SiteReport = require('../models/SiteReport');

router.use(authenticate);

// Clients can read reports but not create/edit/delete
const canWrite = authorize('admin', 'qs', 'project_manager');

router.get('/', async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  if (req.query.template)   filter.template  = req.query.template;
  if (req.query.status)     filter.status    = req.query.status;
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
  res.json({ report });
});

router.post('/', canWrite, async (req, res) => {
  const report = await SiteReport.create({
    ...req.body,
    companyId:  req.user.companyId,
    preparedBy: req.user._id,
  });
  res.status(201).json({ report });
});

router.put('/:id', canWrite, async (req, res) => {
  const report = await SiteReport.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { ...req.body, updatedAt: new Date() },
    { new: true, runValidators: true },
  );
  if (!report) return res.status(404).json({ message: 'Report not found' });
  res.json({ report });
});

router.delete('/:id', canWrite, async (req, res) => {
  const report = await SiteReport.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
  if (!report) return res.status(404).json({ message: 'Report not found' });
  res.json({ message: 'Deleted' });
});

module.exports = router;
