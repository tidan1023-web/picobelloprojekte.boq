const Document = require('../models/Document');
const { aggregateDocuments } = require('../utils/documentAggregator');

const getAll = async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.query.projectId) filter.projectId = req.query.projectId;

  const [docs, aggregated] = await Promise.all([
    Document.find(filter)
      .populate('uploadedBy', 'name')
      .populate('projectId', 'name')
      .lean(),
    aggregateDocuments(req.user.companyId, req.query.projectId || null),
  ]);

  const manual = docs.map((d) => ({ ...d, source: 'manual', readOnly: false }));
  const combined = [...manual, ...aggregated].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  res.json({ documents: combined });
};

const create = async (req, res) => {
  const { name, url, folder, description, projectId } = req.body;
  if (!name || !url || !folder) {
    return res.status(400).json({ message: 'name, url, and folder are required' });
  }
  const doc = await Document.create({
    name, url, folder, description,
    projectId: projectId || null,
    companyId: req.user.companyId,
    uploadedBy: req.user._id,
  });
  await doc.populate('uploadedBy', 'name');
  await doc.populate('projectId', 'name');
  res.status(201).json({ document: doc });
};

const remove = async (req, res) => {
  const doc = await Document.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
  if (!doc) return res.status(404).json({ message: 'Document not found' });
  res.json({ message: 'Deleted' });
};

module.exports = { getAll, create, remove };
