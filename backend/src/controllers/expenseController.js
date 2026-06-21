const Expense = require('../models/Expense');
const cloudinary = require('../config/cloudinary');

exports.list = async (req, res, next) => {
  try {
    const filter = { companyId: req.user.companyId };
    if (req.query.projectId) filter.projectId = req.query.projectId;
    if (req.query.category) filter.category = req.query.category;
    const expenses = await Expense.find(filter)
      .sort({ date: -1 })
      .populate('projectId', 'name')
      .populate('createdBy', 'name')
      .lean();
    res.json({ expenses });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const receipts = [];
    if (req.files?.length) {
      for (const file of req.files) {
        if (cloudinary) {
          const b64 = file.buffer.toString('base64');
          const dataUri = `data:${file.mimetype};base64,${b64}`;
          const result = await cloudinary.uploader.upload(dataUri, { folder: 'expenses' });
          receipts.push(result.secure_url);
        }
      }
    }
    const expense = await Expense.create({
      ...req.body,
      companyId: req.user.companyId,
      createdBy: req.user._id,
      receipts,
    });
    res.status(201).json({ expense });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      req.body,
      { new: true }
    );
    if (!expense) return res.status(404).json({ message: 'Not found' });
    res.json({ expense });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await Expense.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};
