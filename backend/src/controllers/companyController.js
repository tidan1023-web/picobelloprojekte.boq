const Company = require('../models/Company');

const getCompany = async (req, res) => {
  const company = await Company.findById(req.user.companyId).populate('updatedBy', 'name email');
  if (!company) {
    return res.status(404).json({ message: 'Company settings not configured yet' });
  }
  res.json({ company });
};

const upsertCompany = async (req, res) => {
  const data = { ...req.body, updatedBy: req.user._id, updatedAt: Date.now() };

  if (typeof data.bankDetails === 'string') {
    try {
      data.bankDetails = JSON.parse(data.bankDetails);
    } catch {
      data.bankDetails = [];
    }
  }

  const company = await Company.findByIdAndUpdate(
    req.user.companyId,
    data,
    { new: true, runValidators: true }
  );

  res.json({ message: 'Company settings saved', company });
};

const uploadAsset = async (req, res) => {
  const { type } = req.params;
  const allowed = ['logo', 'signature', 'stamp'];

  if (!allowed.includes(type)) {
    return res.status(400).json({ message: 'Invalid asset type' });
  }
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const company = await Company.findByIdAndUpdate(
    req.user.companyId,
    { [type]: req.file.path },
    { new: true }
  );

  res.json({ message: `${type} uploaded successfully`, url: req.file.path, company });
};

const ALL_MODULES = [
  'projects', 'contacts', 'qs-prices', 'qs-comparison', 'artisan-prices',
  'materials', 'price-intelligence', 'boq', 'estimator', 'estimates',
  'invoices', 'documents', 'progress', 'change-orders', 'site-reports',
  'expenses', 'analytics',
];

const getModules = async (req, res) => {
  const company = await Company.findById(req.user.companyId).select('activeModules');
  const active = company?.activeModules ?? ALL_MODULES;
  res.json({ activeModules: active });
};

const updateModules = async (req, res) => {
  const { activeModules } = req.body;
  if (!Array.isArray(activeModules)) {
    return res.status(400).json({ message: 'activeModules must be an array' });
  }
  const valid = activeModules.filter((m) => ALL_MODULES.includes(m));
  const company = await Company.findByIdAndUpdate(
    req.user.companyId,
    { $set: { activeModules: valid, updatedBy: req.user._id, updatedAt: Date.now() } },
    { new: true, upsert: true }
  );
  res.json({ activeModules: company.activeModules });
};

module.exports = { getCompany, upsertCompany, uploadAsset, getModules, updateModules };
