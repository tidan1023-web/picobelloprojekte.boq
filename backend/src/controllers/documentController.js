const Document = require('../models/Document');

const getAll = async (req, res) => {
  const docs = await Document.find({ companyId: req.user.companyId })
    .populate('uploadedBy', 'name')
    .sort({ folder: 1, createdAt: -1 });
  res.json({ documents: docs });
};

const create = async (req, res) => {
  const { name, url, folder, description } = req.body;
  if (!name || !url || !folder) {
    return res.status(400).json({ message: 'name, url, and folder are required' });
  }
  const doc = await Document.create({
    name, url, folder, description,
    companyId: req.user.companyId,
    uploadedBy: req.user._id,
  });
  await doc.populate('uploadedBy', 'name');
  res.status(201).json({ document: doc });
};

const remove = async (req, res) => {
  const doc = await Document.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
  if (!doc) return res.status(404).json({ message: 'Document not found' });
  res.json({ message: 'Deleted' });
};

module.exports = { getAll, create, remove };
