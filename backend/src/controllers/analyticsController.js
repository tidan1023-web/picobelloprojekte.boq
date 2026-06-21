const Invoice = require('../models/Invoice');
const BoqVersion = require('../models/BoqVersion');
const Project = require('../models/Project');
const ProgressUpdate = require('../models/ProgressUpdate');
const ChangeOrder = require('../models/ChangeOrder');
const MaterialPrice = require('../models/MaterialPrice');

function fmt2(n) { return parseFloat(Number(n || 0).toFixed(2)); }

// ── 1. Profit Report ──────────────────────────────────────────────────────────
exports.getProfitReport = async (req, res) => {
  const cId = req.user.companyId;
  const projects = await Project.find({ companyId: cId }).sort({ createdAt: -1 });

  const rows = await Promise.all(
    projects.map(async (p) => {
      const invoices = await Invoice.find({ projectId: p._id, companyId: cId, status: { $ne: 'cancelled' } });
      const paidInvoices = invoices.filter((i) => i.status === 'paid');

      const totalInvoiced = fmt2(invoices.reduce((s, i) => s + i.total, 0));
      const totalRevenue = fmt2(paidInvoices.reduce((s, i) => s + i.total, 0));
      const totalCollected = fmt2(invoices.reduce((s, i) => s + i.amountPaid, 0));
      const totalOutstanding = fmt2(invoices.reduce((s, i) => s + i.balance, 0));

      const latestVersion = await BoqVersion.findOne({
        projectId: p._id,
        status: { $in: ['approved', 'final'] },
      }).sort({ updatedAt: -1 });
      const estimatedCost = fmt2(latestVersion?.totalCost || 0);

      const approvedChanges = await ChangeOrder.aggregate([
        { $match: { projectId: p._id, status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$difference' } } },
      ]);
      const changesCost = fmt2(approvedChanges[0]?.total || 0);

      const totalCost = fmt2(estimatedCost + changesCost);
      const grossProfit = fmt2(totalRevenue - totalCost);
      const margin = totalRevenue > 0 ? fmt2((grossProfit / totalRevenue) * 100) : 0;

      return {
        project: { _id: p._id, name: p.name, client: p.client, status: p.status, currency: p.currency },
        totalInvoiced,
        totalRevenue,
        totalCollected,
        totalOutstanding,
        estimatedCost,
        changesCost,
        totalCost,
        grossProfit,
        margin,
      };
    })
  );

  const totals = rows.reduce(
    (acc, r) => ({
      totalInvoiced: fmt2(acc.totalInvoiced + r.totalInvoiced),
      totalRevenue: fmt2(acc.totalRevenue + r.totalRevenue),
      totalCost: fmt2(acc.totalCost + r.totalCost),
      grossProfit: fmt2(acc.grossProfit + r.grossProfit),
    }),
    { totalInvoiced: 0, totalRevenue: 0, totalCost: 0, grossProfit: 0 }
  );

  res.json({ rows, totals });
};

// ── 2. Cost Variance ──────────────────────────────────────────────────────────
exports.getCostVariance = async (req, res) => {
  const cId = req.user.companyId;
  const projects = await Project.find({ companyId: cId, status: { $in: ['active', 'on_hold', 'completed'] } });

  const rows = await Promise.all(
    projects.map(async (p) => {
      const latestVersion = await BoqVersion.findOne({ projectId: p._id }).sort({ updatedAt: -1 });
      const estimatedCost = fmt2(latestVersion?.totalCost || 0);

      const [actualAgg, changeAgg] = await Promise.all([
        ProgressUpdate.aggregate([
          { $match: { projectId: p._id } },
          { $group: { _id: null, total: { $sum: '$actualCost' } } },
        ]),
        ChangeOrder.aggregate([
          { $match: { projectId: p._id, status: 'approved' } },
          { $group: { _id: null, total: { $sum: '$difference' } } },
        ]),
      ]);

      const actualSpend = fmt2(actualAgg[0]?.total || 0);
      const approvedChanges = fmt2(changeAgg[0]?.total || 0);
      const projectedFinal = fmt2(estimatedCost + approvedChanges);
      const variance = fmt2(actualSpend - estimatedCost);
      const variancePct = estimatedCost > 0 ? fmt2((variance / estimatedCost) * 100) : 0;

      return {
        project: { _id: p._id, name: p.name, client: p.client, budget: p.budget, currency: p.currency },
        estimatedCost,
        actualSpend,
        approvedChanges,
        projectedFinal,
        variance,
        variancePct,
        overBudget: p.budget > 0 && projectedFinal > p.budget,
      };
    })
  );

  res.json({ rows });
};

// ── 3. Outstanding Invoices ────────────────────────────────────────────────────
exports.getOutstandingInvoices = async (req, res) => {
  const invoices = await Invoice.find({ companyId: req.user.companyId, balance: { $gt: 0 }, status: { $nin: ['cancelled', 'paid'] } })
    .populate('projectId', 'name client')
    .sort({ dueDate: 1 });

  const now = Date.now();
  const bucket = (inv) => {
    if (!inv.dueDate || new Date(inv.dueDate) > now) return 'current';
    const days = Math.floor((now - new Date(inv.dueDate)) / 86400000);
    if (days <= 30) return '1-30';
    if (days <= 60) return '31-60';
    if (days <= 90) return '61-90';
    return '90+';
  };

  const buckets = { current: [], '1-30': [], '31-60': [], '61-90': [], '90+': [] };
  invoices.forEach((inv) => buckets[bucket(inv)].push(inv));

  const summary = Object.entries(buckets).map(([label, items]) => ({
    label,
    count: items.length,
    total: fmt2(items.reduce((s, i) => s + i.balance, 0)),
    items: items.map((i) => ({
      _id: i._id,
      invoiceNumber: i.invoiceNumber,
      project: i.projectId?.name,
      client: i.projectId?.client,
      balance: i.balance,
      dueDate: i.dueDate,
      currency: i.currency,
    })),
  }));

  const grandTotal = fmt2(invoices.reduce((s, i) => s + i.balance, 0));
  res.json({ summary, grandTotal, count: invoices.length });
};

// ── 4. Supplier Price History ─────────────────────────────────────────────────
exports.getSupplierPriceHistory = async (req, res) => {
  const material = req.query.material || '';

  const match = { companyId: req.user.companyId };
  if (material) match.material = { $regex: material, $options: 'i' };

  const records = await MaterialPrice.find(match)
    .sort({ material: 1, createdAt: 1 })
    .select('supplier material price currency unit deliveryFee createdAt');

  // Group by material name
  const grouped = {};
  records.forEach((r) => {
    const key = r.material.toLowerCase();
    if (!grouped[key]) grouped[key] = { material: r.material, records: [] };
    grouped[key].records.push({
      supplier: r.supplier,
      price: r.price,
      deliveryFee: r.deliveryFee,
      total: r.price + (r.deliveryFee || 0),
      currency: r.currency,
      unit: r.unit,
      date: r.createdAt,
    });
  });

  const result = Object.values(grouped).map((g) => {
    const prices = g.records.map((r) => r.total);
    return {
      ...g,
      min: fmt2(Math.min(...prices)),
      max: fmt2(Math.max(...prices)),
      avg: fmt2(prices.reduce((s, p) => s + p, 0) / prices.length),
    };
  });

  res.json({ materials: result });
};

// ── 5. Payment Reminders (overdue check + create notifications) ───────────────
exports.sendPaymentReminders = async (req, res) => {
  const Notification = require('../models/Notification');
  const now = new Date();

  const overdueInvoices = await Invoice.find({
    balance: { $gt: 0 },
    dueDate: { $lt: now },
    status: { $nin: ['cancelled', 'paid'] },
  }).populate('projectId', 'name assignedClientId');

  let created = 0;
  for (const inv of overdueInvoices) {
    const clientId = inv.projectId?.assignedClientId;
    if (clientId) {
      await Notification.create({
        userId: clientId,
        title: 'Payment Reminder',
        message: `Invoice ${inv.invoiceNumber} for project "${inv.projectId?.name}" is overdue. Balance: ${inv.currency} ${inv.balance.toLocaleString()}.`,
        type: 'warning',
        link: `/app/client-invoices?projectId=${inv.projectId?._id}`,
      });
      created++;
    }

    // Mark overdue
    if (inv.status === 'sent') {
      inv.status = 'overdue';
      await inv.save();
    }
  }

  res.json({ sent: created, overdue: overdueInvoices.length });
};
