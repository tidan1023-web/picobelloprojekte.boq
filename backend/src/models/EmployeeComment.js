'use strict';
const mongoose = require('mongoose');

const { Schema } = mongoose;

const commentSchema = new Schema(
  {
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    authorEmployeeId: { type: String, required: true },
    comment: { type: String, required: true, maxlength: 1000, trim: true },
    mentionedEmployeeIds: [{ type: String }],
  },
  { timestamps: true }
);

commentSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id;
    return ret;
  },
});

const EmployeeComment = mongoose.model('EmployeeComment', commentSchema);
module.exports = { EmployeeComment };
