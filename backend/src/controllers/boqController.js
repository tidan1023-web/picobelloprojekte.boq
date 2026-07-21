const BoqVersion = require('../models/BoqVersion');
const BoqItem = require('../models/BoqItem');
const QsPrice = require('../models/QsPrice');
const Project = require('../models/Project');
const User = require('../models/User');
const { checkRate } = require('../utils/rateAlerter');
const { reviewBoq } = require('../utils/boqReviewer');

// Clients only ever see BOQs for their own project(s) once a company has 2+
// client accounts -- with 0 or 1, everything behaves as before (see
// projectController/invoiceController for the same pattern).
async function clientProjectIds(req) {
  const clientCount = await User.countDocuments({ companyId: req.user.companyId, role: 'client' });
  if (clientCount <= 1) return null;
  const projects = await Project.find({ companyId: req.user.companyId, assignedClientId: req.user._id }).select('_id');
  return projects.map((p) => String(p._id));
}

async function recalculateVersionTotal(versionId) {
  const items = await BoqItem.find({ versionId });
  const total = items.reduce((sum, item) => sum + (item.totalCost || 0), 0);
  await BoqVersion.findByIdAndUpdate(versionId, {
    totalCost: parseFloat(total.toFixed(2)),
    updatedAt: Date.now(),
  });
}

// ── Versions ───────────────────────────────────────────────────────────────────────

const getVersions = async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;

  if (req.user.role === 'client') {
    const allowedIds = await clientProjectIds(req);
    if (allowedIds) {
      if (filter.projectId) {
        if (!allowedIds.includes(String(filter.projectId))) return res.json({ versions: [] });
      } else {
        filter.projectId = { $in: allowedIds };
      }
    }
  }

  const versions = await BoqVersion.find(filter)
    .populate('projectId', 'name client')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });
  res.json({ versions });
};

const getVersion = async (req, res) => {
  const version = await BoqVersion.findOne({ _id: req.params.id, companyId: req.user.companyId })
    .populate('projectId', 'name client location')
    .populate('createdBy', 'name');
  if (!version) return res.status(404).json({ message: 'BOQ version not found' });

  if (req.user.role === 'client') {
    const allowedIds = await clientProjectIds(req);
    if (allowedIds && !allowedIds.includes(String(version.projectId?._id))) {
      return res.status(404).json({ message: 'BOQ version not found' });
    }
  }

  const items = await BoqItem.find({ versionId: req.params.id }).sort({ createdAt: 1 }).lean();
  const qsPrices = await QsPrice.find({ companyId: req.user.companyId }).select('item price').lean();

  const itemsWithAlerts = items.map(item => ({ ...item, rateAlert: checkRate(item, qsPrices) }));
  const missingItems = reviewBoq(items);

  res.json({ version, items: itemsWithAlerts, missingItems });
};

const createVersion = async (req, res) => {
  const version = await BoqVersion.create({ ...req.body, companyId: req.user.companyId, createdBy: req.user._id });
  res.status(201).json({ message: 'BOQ version created', version });
};

const updateVersion = async (req, res) => {
  const version = await BoqVersion.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { ...req.body, updatedAt: Date.now() },
    { new: true, runValidators: true }
  );
  if (!version) return res.status(404).json({ message: 'BOQ version not found' });
  res.json({ message: 'BOQ version updated', version });
};

const deleteVersion = async (req, res) => {
  const version = await BoqVersion.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
  if (!version) return res.status(404).json({ message: 'BOQ version not found' });
  await BoqItem.deleteMany({ versionId: req.params.id });
  res.json({ message: 'BOQ version and all items deleted' });
};

// ── Items ────────────────────────────────────────────────────────────────────────────

const addItem = async (req, res) => {
  const version = await BoqVersion.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!version) return res.status(404).json({ message: 'BOQ version not found' });

  const item = new BoqItem({ ...req.body, versionId: req.params.id });
  await item.save();
  await recalculateVersionTotal(req.params.id);

  res.status(201).json({ message: 'Item added', item });
};

const updateItem = async (req, res) => {
  const item = await BoqItem.findById(req.params.itemId);
  if (!item) return res.status(404).json({ message: 'Item not found' });

  Object.assign(item, req.body);
  await item.save();
  await recalculateVersionTotal(item.versionId);

  res.json({ message: 'Item updated', item });
};

const deleteItem = async (req, res) => {
  const item = await BoqItem.findByIdAndDelete(req.params.itemId);
  if (!item) return res.status(404).json({ message: 'Item not found' });

  await recalculateVersionTotal(item.versionId);
  res.json({ message: 'Item deleted' });
};

module.exports = { getVersions, getVersion, createVersion, updateVersion, deleteVersion, addItem, updateItem, deleteItem };
