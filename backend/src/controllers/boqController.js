const BoqVersion = require('../models/BoqVersion');
const BoqItem = require('../models/BoqItem');

async function recalculateVersionTotal(versionId) {
  const items = await BoqItem.find({ versionId });
  const total = items.reduce((sum, item) => sum + (item.totalCost || 0), 0);
  await BoqVersion.findByIdAndUpdate(versionId, {
    totalCost: parseFloat(total.toFixed(2)),
    updatedAt: Date.now(),
  });
}

// ── Versions ────────────────────────────────────────────────────────────────

const getVersions = async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;

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

  const items = await BoqItem.find({ versionId: req.params.id }).sort({ createdAt: 1 });
  res.json({ version, items });
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

// ── Items ────────────────────────────────────────────────────────────────────

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
