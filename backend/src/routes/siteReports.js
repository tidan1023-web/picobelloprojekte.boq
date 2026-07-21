const express = require('express');
const router  = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const SiteReport = require('../models/SiteReport');
const { clientProjectIds } = require('../utils/clientScope');

router.use(authenticate);

// A client only sees reports a PM/QS/Admin has explicitly shared, and only
// for a project they're assigned to.
const canWrite = authorize('admin', 'qs', 'project_manager');

router.get('/', async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  if (req.query.template)   filter.template  = req.query.template;
  if (req.query.status)     filter.status    = req.query.status;

  if (req.user.role === 'client') {
    filter.sharedWithClient = true;
    const allowedIds = await clientProjectIds(req.user);
    if (filter.projectId) {
      if (!allowedIds.includes(String(filter.projectId))) return res.json({ reports: [] });
    } else {
      filter.projectId = { $in: allowedIds };
    }
  }

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

  if (req.user.role === 'client') {
    const allowedIds = await clientProjectIds(req.user);
    if (!report.sharedWithClient || !allowedIds.includes(String(report.projectId?._id))) {
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
