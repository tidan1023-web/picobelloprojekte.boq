const Project = require('../models/Project');
const { clientProjectIds } = require('../utils/clientScope');

const getProjects = async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.query.status) filter.status = req.query.status;

  if (req.user.role === 'client') {
    filter._id = { $in: await clientProjectIds(req.user) };
  }

  const projects = await Project.find(filter)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({ projects });
};

const getProject = async (req, res) => {
  const filter = { _id: req.params.id, companyId: req.user.companyId };
  if (req.user.role === 'client') {
    const allowed = await clientProjectIds(req.user);
    if (!allowed.includes(req.params.id)) return res.status(404).json({ message: 'Project not found' });
  }
  const project = await Project.findOne(filter)
    .populate('createdBy', 'name email');
  if (!project) return res.status(404).json({ message: 'Project not found' });
  res.json({ project });
};

const createProject = async (req, res) => {
  const project = await Project.create({
    ...req.body,
    companyId: req.user.companyId,
    createdBy: req.user._id,
  });
  res.status(201).json({ message: 'Project created', project });
};

const updateProject = async (req, res) => {
  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { ...req.body, updatedAt: Date.now() },
    { new: true, runValidators: true }
  );
  if (!project) return res.status(404).json({ message: 'Project not found' });
  res.json({ message: 'Project updated', project });
};

const deleteProject = async (req, res) => {
  const project = await Project.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
  if (!project) return res.status(404).json({ message: 'Project not found' });
  res.json({ message: 'Project deleted' });
};

module.exports = { getProjects, getProject, createProject, updateProject, deleteProject };
