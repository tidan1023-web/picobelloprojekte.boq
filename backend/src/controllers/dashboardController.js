const Project = require('../models/Project');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const { getAllowedProjectIds } = require('../utils/clientScope');

const getSummary = async (req, res) => {
  const cId = req.user.companyId;
  const f = { companyId: cId };

  // Admin sees the whole company; QS/PM see only the numbers for projects
  // they're assigned to -- each role is responsible for, and only sees,
  // their own sites' performance.
  const allowedIds = await getAllowedProjectIds(req.user);
  const pf = allowedIds !== null ? { ...f, _id: { $in: allowedIds } } : f;
  const lf = allowedIds !== null ? { ...f, projectId: { $in: allowedIds } } : f;

  const [
    projectTotal, projectActive, projectPlanning, projectCompleted,
    invoiceTotal, invoicePaid, invoiceOverdue,
    invoiceTotalAmount, invoiceUnpaidAmount,
    expenseTotalAmount,
    recentProjects, recentInvoices,
  ] = await Promise.all([
    Project.countDocuments(pf),
    Project.countDocuments({ ...pf, status: 'active' }),
    Project.countDocuments({ ...pf, status: 'planning' }),
    Project.countDocuments({ ...pf, status: 'completed' }),
    Invoice.countDocuments(lf),
    Invoice.countDocuments({ ...lf, status: 'paid' }),
    Invoice.countDocuments({ ...lf, status: 'overdue' }),
    Invoice.aggregate([{ $match: lf }, { $group: { _id: null, sum: { $sum: '$total' } } }]),
    Invoice.aggregate([{ $match: { ...lf, status: { $in: ['sent', 'overdue', 'partially_paid'] } } }, { $group: { _id: null, sum: { $sum: '$balance' } } }]),
    Expense.aggregate([{ $match: lf }, { $group: { _id: null, sum: { $sum: '$amount' } } }]),
    Project.find(pf).sort({ updatedAt: -1 }).limit(5).select('name status client updatedAt'),
    Invoice.find(lf).sort({ createdAt: -1 }).limit(5).select('invoiceNumber projectName clientName status total balance currency dueDate createdAt'),
  ]);

  res.json({
    stats: {
      projects: { total: projectTotal, active: projectActive, planning: projectPlanning, completed: projectCompleted },
      invoices: {
        total: invoiceTotal,
        paid: invoicePaid,
        overdue: invoiceOverdue,
        totalAmount: invoiceTotalAmount[0]?.sum || 0,
        unpaidAmount: invoiceUnpaidAmount[0]?.sum || 0,
      },
      expenses: {
        totalAmount: expenseTotalAmount[0]?.sum || 0,
      },
    },
    recentProjects,
    recentInvoices,
  });
};

module.exports = { getSummary };
