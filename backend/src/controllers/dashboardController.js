const Project = require('../models/Project');

const getSummary = async (req, res) => {
  const cId = req.user.companyId;
  const f = { companyId: cId };

  const [total, active, planning, completed, onHold, cancelled] = await Promise.all([
    Project.countDocuments(f),
    Project.countDocuments({ ...f, status: 'active' }),
    Project.countDocuments({ ...f, status: 'planning' }),
    Project.countDocuments({ ...f, status: 'completed' }),
    Project.countDocuments({ ...f, status: 'on_hold' }),
    Project.countDocuments({ ...f, status: 'cancelled' }),
  ]);

  const recentProjects = await Project.find(f)
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('createdBy', 'name');

  res.json({
    stats: { total, active, planning, completed, onHold, cancelled, pendingApprovals: 0, invoices: { total: 0, pending: 0, paid: 0 } },
    recentProjects,
  });
};

module.exports = { getSummary };
