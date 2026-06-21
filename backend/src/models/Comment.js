const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);
