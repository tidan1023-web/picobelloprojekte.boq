const Project = require('../models/Project');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');

const getSummary = async (req, res) => {
  const cId = req.user.companyId;
  const f = { companyId: cId };

  const [
    projectTotal, projectActive, projectPlanning, projectCompleted,
    invoiceTotal, invoicePaid, invoiceOverdue,
    invoiceTotalAmount, invoiceUnpaidAmount,
    expenseTotalAmount,
    recentProjects, recentInvoices,
  ] = await Promise.all([
    Project.countDocuments(f),
    Project.countDocuments({ ...f, status: 'active' }),
    Project.countDocuments({ ...f, status: 'planning' }),
    Project.countDocuments({ ...f, status: 'completed' }),
    Invoice.countDocuments(f),
    Invoice.countDocuments({ ...f, status: 'paid' }),
    Invoice.countDocuments({ ...f, status: 'overdue' }),
    Invoice.aggregate([{ $match: f }, { $group: { _id: null, sum: { $sum: '$total' } } }]),
    Invoice.aggregate([{ $match: { ...f, status: { $in: ['sent', 'overdue', 'partially_paid'] } } }, { $group: { _id: null, sum: { $sum: '$balance' } } }]),
    Expense.aggregate([{ $match: f }, { $group: { _id: null, sum: { $sum: '$amount' } } }]),
    Project.find(f).sort({ updatedAt: -1 }).limit(5).select('name status client updatedAt'),
    Invoice.find(f).sort({ createdAt: -1 }).limit(5).select('invoiceNumber projectName clientName status total balance currency dueDate createdAt'),
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
