const Approval = require('../models/Approval');
const BoqItem = require('../models/BoqItem');
const BoqVersion = require('../models/BoqVersion');
const Notification = require('../models/Notification');

// ── Client: get approvals for a version ────────────────────────────────────────
exports.getApprovals = async (req, res) => {
  const filter = {};
  if (req.query.projectId) filter.projectId = req.query.projectId;
  if (req.query.boqVersionId) filter.boqVersionId = req.query.boqVersionId;

  // Clients only see their own approvals
  if (req.user.role === 'client') filter.clientId = req.user._id;

  const approvals = await Approval.find(filter)
    .populate('boqItemId', 'item unit quantity baseCost options')
    .populate('clientId', 'name email')
    .sort({ updatedAt: -1 });

  res.json({ approvals });
};

// ── Client: submit item decision ────────────────────────────────────────────────
exports.submitItemDecision = async (req, res) => {
  const { projectId, boqVersionId, boqItemId, status, selectedTier, note } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be approved or rejected' });
  }

  const item = await BoqItem.findById(boqItemId);
  if (!item) return res.status(404).json({ message: 'BOQ item not found' });

  // selectedTier must match an existing option if provided
  if (selectedTier && item.options && item.options.length > 0) {
    const valid = item.options.some((o) => o.tier === selectedTier);
    if (!valid) return res.status(400).json({ message: 'Invalid tier selection' });
  }

  const approval = await Approval.findOneAndUpdate(
    { boqVersionId, boqItemId, clientId: req.user._id },
    {
      projectId,
      boqVersionId,
      boqItemId,
      clientId: req.user._id,
      type: 'item',
      status,
      selectedTier: selectedTier || null,
      note: note || '',
      decidedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  res.json({ approval });
};

// ── Client: approve/reject entire BOQ version ──────────────────────────────────
exports.submitVersionDecision = async (req, res) => {
  const { boqVersionId } = req.params;
  const { projectId, status, note } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be approved or rejected' });
  }

  const version = await BoqVersion.findById(boqVersionId);
  if (!version) return res.status(404).json({ message: 'BOQ version not found' });

  const approval = await Approval.findOneAndUpdate(
    { boqVersionId, boqItemId: null, clientId: req.user._id, type: 'version' },
    {
      projectId,
      boqVersionId,
      boqItemId: null,
      clientId: req.user._id,
      type: 'version',
      status,
      note: note || '',
      decidedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  // Notify QS/Admin of client decision
  if (status === 'approved') {
    version.status = 'approved';
    await version.save();
  }

  await Notification.create({
    userId: version.createdBy,
    title: `BOQ Version ${status === 'approved' ? 'Approved' : 'Rejected'} by Client`,
    message: `Client ${req.user.name} has ${status} the BOQ version "${version.name}".`,
    type: status === 'approved' ? 'success' : 'warning',
  });

  res.json({ approval });
};

// ── Admin/QS: get pending approvals across all versions ────────────────────────
exports.getPendingApprovals = async (req, res) => {
  const approvals = await Approval.find({ status: 'pending' })
    .populate('boqVersionId', 'name')
    .populate('boqItemId', 'item')
    .populate('clientId', 'name email')
    .populate('projectId', 'name')
    .sort({ createdAt: -1 });

  res.json({ approvals });
};
