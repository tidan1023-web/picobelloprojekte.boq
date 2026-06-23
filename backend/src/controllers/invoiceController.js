const PDFDocument = require('pdfkit');
const Invoice  = require('../models/Invoice');
const Estimate = require('../models/Estimate');
const Company  = require('../models/Company');

const TIER_LABELS = { basic: 'Basic', mid_range: 'Mid-Range', premium: 'Premium' };

function fmt(n) {
  return Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function recalcTotals(invoice) {
  invoice.subtotal  = invoice.lineItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  invoice.vatAmount = parseFloat((invoice.subtotal * (invoice.vatRate || 0) / 100).toFixed(2));
  invoice.total     = parseFloat((invoice.subtotal + invoice.vatAmount).toFixed(2));
  invoice.amountPaid = invoice.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  invoice.balance   = Math.max(0, parseFloat((invoice.total - invoice.amountPaid).toFixed(2)));

  if (invoice.balance === 0 && invoice.total > 0) {
    invoice.status = 'paid';
  } else if (invoice.amountPaid > 0 && invoice.balance > 0) {
    if (invoice.status === 'paid') invoice.status = 'partially_paid';
  }
}

// ── List ────────────────────────────────────────────────────
exports.getInvoices = async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.query.status) filter.status = req.query.status;

  const invoices = await Invoice
    .find(filter)
    .sort({ createdAt: -1 })
    .populate('estimateId', 'estimateNumber')
    .lean();

  res.json({ invoices });
};

// ── Single ──────────────────────────────────────────────────────
exports.getInvoice = async (req, res) => {
  const invoice = await Invoice
    .findOne({ _id: req.params.id, companyId: req.user.companyId })
    .populate('estimateId', 'estimateNumber projectName selectedTier selectedTotal')
    .lean();

  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  res.json({ invoice });
};

// ── Create ──────────────────────────────────────────────────────
exports.createInvoice = async (req, res) => {
  const {
    estimateId, projectName, clientName, clientEmail, clientPhone,
    clientAddress, dueDate, vatRate = 0, notes, currency = 'NGN', lineItems: bodyItems,
  } = req.body;

  let prefill = {};
  let autoItems = [];

  if (estimateId) {
    const est = await Estimate.findOne({ _id: estimateId, companyId: req.user.companyId });
    if (est) {
      prefill = {
        projectName: est.projectName,
        clientName:  est.clientName,
        clientEmail: est.clientEmail,
        clientPhone: est.clientPhone,
      };
      const tierLabel = TIER_LABELS[est.selectedTier] || '';
      autoItems = [{
        description: `Construction Works — ${tierLabel} Finish (${est.sizeM2}m²)`,
        quantity: 1,
        unit:     'lot',
        unitRate: est.selectedTotal || 0,
        amount:   est.selectedTotal || 0,
      }];
    }
  }

  const lineItems = bodyItems || autoItems;
  const subtotal  = lineItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const vatAmount = parseFloat((subtotal * vatRate / 100).toFixed(2));
  const total     = parseFloat((subtotal + vatAmount).toFixed(2));

  const invoice = new Invoice({
    companyId:     req.user.companyId,
    estimateId:    estimateId || undefined,
    projectName:   projectName || prefill.projectName || 'Untitled Project',
    clientName:    clientName  || prefill.clientName  || '',
    clientEmail:   clientEmail || prefill.clientEmail || '',
    clientPhone:   clientPhone || prefill.clientPhone || '',
    clientAddress: clientAddress || '',
    dueDate:       dueDate || undefined,
    vatRate,
    currency,
    notes,
    lineItems,
    subtotal,
    vatAmount,
    total,
    balance: total,
    createdBy: req.user._id,
  });

  await invoice.save();
  res.status(201).json({ invoice });
};

// ── Update ──────────────────────────────────────────────────────
exports.updateInvoice = async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

  const fields = [
    'projectName', 'clientName', 'clientEmail', 'clientPhone', 'clientAddress',
    'dueDate', 'vatRate', 'lineItems', 'status', 'notes', 'currency',
  ];
  fields.forEach((k) => { if (req.body[k] !== undefined) invoice[k] = req.body[k]; });

  recalcTotals(invoice);
  await invoice.save();
  res.json({ invoice });
};

// ── Delete ──────────────────────────────────────────────────────
exports.deleteInvoice = async (req, res) => {
  await Invoice.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
  res.json({ message: 'Deleted' });
};

// ── Payments ─────────────────────────────────────────────────────
exports.addPayment = async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

  const { amount, method, reference, paymentDate, note } = req.body;
  invoice.payments.push({ amount: Number(amount), method, reference, paymentDate, note });
  recalcTotals(invoice);
  await invoice.save();
  res.status(201).json({ invoice });
};

exports.deletePayment = async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

  invoice.payments = invoice.payments.filter(
    (p) => p._id.toString() !== req.params.paymentId
  );
  recalcTotals(invoice);
  await invoice.save();
  res.json({ invoice });
};

// ── Mark as Paid ───────────────────────────────────────────────────
exports.markAsPaid = async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  if (invoice.balance <= 0) return res.json({ invoice });

  invoice.payments.push({
    amount: invoice.balance,
    method: req.body.method || 'cash',
    reference: req.body.reference || '',
    paymentDate: new Date(),
    note: 'Manually marked as paid',
  });
  recalcTotals(invoice);
  await invoice.save();
  res.json({ invoice });
};

// ── PDF ──────────────────────────────────────────────────────────────────────
exports.generatePDF = async (req, res) => {
  const invoice = await Invoice
    .findOne({ _id: req.params.id, companyId: req.user.companyId })
    .lean();
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

  const company = await Company.findById(req.user.companyId).lean();
  const co = company || {};

  const PRIMARY    = '#0f2d5a';
  const LIGHT_BLUE = '#dbeafe';
  const GRAY       = '#4b5563';
  const LIGHT_GRAY = '#f3f4f6';

  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
  doc.pipe(res);

  const W = doc.page.width;
  const M = 50;

  // Header band
  doc.rect(0, 0, W, 130).fill(PRIMARY);

  // Logo
  let logoLoaded = false;
  if (co.logo) {
    try {
      const buf = Buffer.from(await (await fetch(co.logo)).arrayBuffer());
      doc.image(buf, M, 22, { height: 50, fit: [60, 50] });
      logoLoaded = true;
    } catch {}
  }
  const textX = logoLoaded ? M + 68 : M;

  doc.font('Helvetica-Bold').fontSize(16).fillColor('white')
    .text(co.companyName || 'Company', textX, 30, { width: 240 });
  doc.font('Helvetica').fontSize(8.5).fillColor(LIGHT_BLUE)
    .text([co.address, co.phone, co.email].filter(Boolean).join('  ·  '), textX, 52, { width: 240 });
  if (co.cacNumber) doc.text(`CAC: ${co.cacNumber}`, textX, 64, { width: 240 });

  doc.font('Helvetica-Bold').fontSize(28).fillColor('white')
    .text('INVOICE', M, 28, { width: W - M * 2, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor(LIGHT_BLUE)
    .text(`#${invoice.invoiceNumber}`, M, 68, { width: W - M * 2, align: 'right' })
    .text(`Issued: ${fmtDate(invoice.issueDate)}`, M, 80, { width: W - M * 2, align: 'right' })
    .text(`Due: ${fmtDate(invoice.dueDate)}`, M, 92, { width: W - M * 2, align: 'right' });

  // Status badge
  const badgeColors = { draft: '#6b7280', sent: '#2563eb', paid: '#16a34a', partially_paid: '#d97706', overdue: '#dc2626' };
  doc.roundedRect(W - M - 72, 108, 72, 16, 4).fill(badgeColors[invoice.status] || '#6b7280');
  doc.font('Helvetica-Bold').fontSize(8).fillColor('white')
    .text(invoice.status.replace('_', ' ').toUpperCase(), W - M - 72, 112, { width: 72, align: 'center' });

  let y = 148;

  // Bill-to / project info
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(GRAY)
    .text('BILL TO', M, y)
    .text('PROJECT', W / 2, y);
  y += 14;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827')
    .text(invoice.clientName || '—', M, y, { width: 210 });
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827')
    .text(invoice.projectName || '—', W / 2, y, { width: 210 });
  y += 14;
  if (invoice.clientAddress) {
    doc.font('Helvetica').fontSize(8.5).fillColor(GRAY).text(invoice.clientAddress, M, y, { width: 210 });
  }
  if (invoice.clientEmail || invoice.clientPhone) {
    doc.font('Helvetica').fontSize(8.5).fillColor(GRAY)
      .text([invoice.clientEmail, invoice.clientPhone].filter(Boolean).join('  ·  '), M, y + 12, { width: 210 });
  }
  y += 36;

  // Line items table
  const colX = [M, M + 245, M + 295, M + 355, M + 415];
  const colW = [245, 50, 60, 60, W - M - 415 - M];
  const headers = ['Description', 'Unit', 'Qty', 'Rate', 'Amount'];

  doc.rect(M, y, W - M * 2, 18).fill(PRIMARY);
  doc.font('Helvetica-Bold').fontSize(8).fillColor('white');
  headers.forEach((h, i) => {
    doc.text(h, colX[i] + 3, y + 5, { width: colW[i] - 6, align: i > 0 ? 'right' : 'left' });
  });
  y += 18;

  doc.font('Helvetica').fontSize(8.5).fillColor('#111827');
  (invoice.lineItems || []).forEach((item, idx) => {
    const rowH = 20;
    if (idx % 2 === 1) doc.rect(M, y, W - M * 2, rowH).fill(LIGHT_GRAY);
    const cells = [
      item.description,
      item.unit || 'item',
      String(item.quantity),
      fmt(item.unitRate),
      fmt(item.amount),
    ];
    cells.forEach((cell, i) => {
      doc.fillColor('#111827').text(cell, colX[i] + 3, y + 5, { width: colW[i] - 6, align: i > 0 ? 'right' : 'left' });
    });
    y += rowH;
  });

  y += 10;

  // Totals block
  const totalsX = W / 2;
  const totalsW = W - M - totalsX;
  const drawRow = (label, value, bold = false) => {
    if (bold) {
      doc.rect(totalsX, y - 2, totalsW, 20).fill(PRIMARY);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('white')
        .text(label, totalsX + 5, y + 2, { width: totalsW / 2 - 5 })
        .text(`${invoice.currency} ${value}`, totalsX + totalsW / 2, y + 2, { width: totalsW / 2 - 5, align: 'right' });
      y += 20;
    } else {
      doc.font('Helvetica').fontSize(9).fillColor(GRAY).text(label, totalsX + 5, y, { width: totalsW / 2 - 5 });
      doc.fillColor('#111827').text(`${invoice.currency} ${value}`, totalsX + totalsW / 2, y, { width: totalsW / 2 - 5, align: 'right' });
      y += 16;
    }
  };
  drawRow('Subtotal', fmt(invoice.subtotal));
  if (invoice.vatRate > 0) drawRow(`VAT (${invoice.vatRate}%)`, fmt(invoice.vatAmount));
  drawRow('GRAND TOTAL', fmt(invoice.total), true);
  y += 4;
  drawRow('Amount Paid', fmt(invoice.amountPaid));
  drawRow('Balance Due', fmt(invoice.balance));

  // Bank details
  if (co.bankDetails && co.bankDetails.length > 0) {
    y += 18;
    doc.rect(M, y, W - M * 2, 1).fill(LIGHT_BLUE);
    y += 8;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(PRIMARY).text('PAYMENT DETAILS', M, y);
    y += 14;
    co.bankDetails.forEach((bank) => {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#111827').text(bank.bankName || 'Bank', M, y);
      doc.font('Helvetica').fillColor(GRAY)
        .text(`${bank.accountName}  ·  ${bank.accountNumber}${bank.sortCode ? `  ·  Sort: ${bank.sortCode}` : ''}`, M, y + 12, { width: W - M * 2 });
      y += 28;
    });
  }
  if (co.paymentInstructions) {
    doc.font('Helvetica').fontSize(8).fillColor(GRAY).text(co.paymentInstructions, M, y, { width: W - M * 2 });
    y += doc.heightOfString(co.paymentInstructions, { width: W - M * 2 }) + 8;
  }

  // Payments recorded
  if ((invoice.payments || []).length > 0) {
    y += 8;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(PRIMARY).text('PAYMENTS RECEIVED', M, y);
    y += 14;
    invoice.payments.forEach((p) => {
      const method = p.method ? p.method.replace('_', ' ') : '';
      doc.font('Helvetica').fontSize(8).fillColor('#111827')
        .text(`${fmtDate(p.paymentDate)}  ·  ${method}${p.reference ? `  ·  Ref: ${p.reference}` : ''}`, M, y, { width: 350 })
        .text(`${invoice.currency} ${fmt(p.amount)}`, M, y, { width: W - M * 2, align: 'right' });
      y += 14;
    });
  }

  if (invoice.notes) {
    y += 10;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(PRIMARY).text('NOTES', M, y);
    y += 12;
    doc.font('Helvetica').fontSize(8.5).fillColor(GRAY).text(invoice.notes, M, y, { width: W - M * 2 });
    y += doc.heightOfString(invoice.notes, { width: W - M * 2 }) + 8;
  }

  // Footer
  doc.rect(0, doc.page.height - 40, W, 40).fill(PRIMARY);
  doc.font('Helvetica').fontSize(7.5).fillColor(LIGHT_BLUE)
    .text(
      `${co.companyName || ''}  ·  ${invoice.invoiceNumber}  ·  Generated ${fmtDate(new Date())}`,
      M, doc.page.height - 24, { width: W - M * 2, align: 'center' }
    );

  doc.end();
};
