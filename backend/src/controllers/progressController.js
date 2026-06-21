const ProgressUpdate = require('../models/ProgressUpdate');
const ChangeOrder = require('../models/ChangeOrder');
const BoqVersion = require('../models/BoqVersion');
const Project = require('../models/Project');

// ── Progress Updates ──────────────────────────────────────────────────────────

exports.getUpdates = async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;
  if (req.query.phase) filter.phase = req.query.phase;

  const updates = await ProgressUpdate.find(filter)
    .populate('createdBy', 'name')
    .sort({ date: -1 });

  res.json({ updates });
};

exports.createUpdate = async (req, res) => {
  const { projectId, phase, title, notes, date, completionPercent, actualCost } = req.body;
  const images = (req.files || []).map((f) => f.path);

  const update = await ProgressUpdate.create({
    projectId, phase, title, notes, images,
    date: date || new Date(),
    completionPercent: Number(completionPercent) || 0,
    actualCost: Number(actualCost) || 0,
    companyId: req.user.companyId,
    createdBy: req.user._id,
  });

  await update.populate('createdBy', 'name');
  res.status(201).json({ update });
};

exports.updateUpdate = async (req, res) => {
  const { phase, title, notes, date, completionPercent, actualCost } = req.body;
  const update = await ProgressUpdate.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!update) return res.status(404).json({ message: 'Progress update not found' });

  if (phase !== undefined) update.phase = phase;
  if (title !== undefined) update.title = title;
  if (notes !== undefined) update.notes = notes;
  if (date !== undefined) update.date = date;
  if (completionPercent !== undefined) update.completionPercent = Number(completionPercent);
  if (actualCost !== undefined) update.actualCost = Number(actualCost);
  if (req.files && req.files.length > 0) update.images.push(...req.files.map((f) => f.path));

  await update.save();
  res.json({ update });
};

exports.deleteUpdate = async (req, res) => {
  await ProgressUpdate.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
  res.json({ message: 'Deleted' });
};

// ── Budget Alert ──────────────────────────────────────────────────────────────

exports.getBudgetAlerts = async (req, res) => {
  const cId = req.user.companyId;
  const projects = await Project.find({ companyId: cId, status: { $in: ['planning', 'active', 'on_hold'] } });

  const alerts = await Promise.all(
    projects.map(async (project) => {
      if (!project.budget || project.budget === 0) return null;

      const boqVersion = await BoqVersion.findOne({
        projectId: project._id, companyId: cId,
        status: { $in: ['approved', 'final'] },
      }).sort({ updatedAt: -1 });

      const estimatedCost = boqVersion?.totalCost || 0;

      const changeDelta = await ChangeOrder.aggregate([
        { $match: { projectId: project._id, companyId: cId, status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$difference' } } },
      ]);
      const changeTotal = changeDelta[0]?.total || 0;

      const actualAgg = await ProgressUpdate.aggregate([
        { $match: { projectId: project._id, companyId: cId } },
        { $group: { _id: null, total: { $sum: '$actualCost' } } },
      ]);
      const actualCostTotal = actualAgg[0]?.total || 0;

      const projectedCost = estimatedCost + changeTotal;
      const projectedRatio = projectedCost / project.budget;
      const actualRatio = actualCostTotal / project.budget;

      return {
        project: { _id: project._id, name: project.name, client: project.client, budget: project.budget, currency: project.currency },
        estimatedCost, changeTotal, projectedCost, actualCostTotal,
        projectedRatio: parseFloat(projectedRatio.toFixed(4)),
        actualRatio: parseFloat(actualRatio.toFixed(4)),
        overBudget: projectedRatio > 1,
        nearBudget: projectedRatio >= 0.9 && projectedRatio <= 1,
      };
    })
  );

  res.json({ alerts: alerts.filter(Boolean) });
};
