const Comment = require('../models/Comment');
const Project = require('../models/Project');

exports.getComments = async (req, res) => {
  const { projectId } = req.query;
  if (!projectId) return res.status(400).json({ message: 'projectId is required' });

  const comments = await Comment.find({ projectId })
    .populate('userId', 'name role')
    .sort({ createdAt: 1 });

  // Nest replies under their parent
  const roots = [];
  const map = {};
  comments.forEach((c) => { map[c._id.toString()] = { ...c.toObject(), replies: [] }; });
  comments.forEach((c) => {
    if (c.parentId && map[c.parentId.toString()]) {
      map[c.parentId.toString()].replies.push(map[c._id.toString()]);
    } else {
      roots.push(map[c._id.toString()]);
    }
  });

  res.json({ comments: roots });
};

exports.addComment = async (req, res) => {
  const { projectId, message, parentId } = req.body;

  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const comment = await Comment.create({
    projectId,
    userId: req.user._id,
    message: message.trim(),
    parentId: parentId || null,
  });

  await comment.populate('userId', 'name role');
  res.status(201).json({ comment });
};

exports.deleteComment = async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) return res.status(404).json({ message: 'Comment not found' });

  const isOwner = comment.userId.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  // Cascade delete replies
  await Comment.deleteMany({ parentId: comment._id });
  await comment.deleteOne();

  res.json({ message: 'Comment deleted' });
};
