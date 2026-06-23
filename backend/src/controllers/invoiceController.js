const crypto     = require('crypto');
const PDFDocument = require('pdfkit');
const Invoice  = require('../models/Invoice');
const Estimate = require('../models/Estimate');
const Company  = require('../models/Company');
const logger   = require('../utils/logger');

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

// ── List ──────────────────────────────────────────────────────────────────────────────
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

// ── Single ───────────────────────────────────────────────────────────────────────────────
exports.getInvoice = async (req, res) => {
  const invoice = await Invoice
    .findOne({ _id: req.params.id, companyId: req.user.companyId })
    .populate('estimateId', 'estimateNumber projectName selectedTier selectedTotal')
    .lean();

  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  res.json({ invoice });
};

// ── Create ──────────────────────────────────────────────────────────────────────────────
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

// ── Update ──────────────────────────────────────────────────────────────────────────────
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

// ── Delete ──────────────────────────────────────────────────────────────────────────────
exports.deleteInvoice = async (req, res) => {
  await Invoice.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
  res.json({ message: 'Deleted' });
};

// ── Payments ───────────────────────────────────────────────────────────────────────────
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

// ── Payment link (authenticated) ───────────────────────────────────────────────────────
exports.getPaymentLink = async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

  if (!invoice.publicToken) {
    invoice.publicToken = crypto.randomBytes(32).toString('hex');
    await invoice.save();
  }

  const url = `${process.env.FRONTEND_URL || 'https://pico-bello-boq.onrender.com'}/pay/${invoice.publicToken}`;
  res.json({ url, publicToken: invoice.publicToken });
};

// ── Public invoice view (no auth) ─────────────────────────────────────────────────────
exports.getPublicInvoice = async (req, res) => {
  const invoice = await Invoice
    .findOne({ publicToken: req.params.token })
    .populate('companyId', 'companyName address phone email logo bankDetails paymentInstructions')
    .lean();
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  res.json({ invoice });
};

// ── Initialise Paystack payment (no auth) ─────────────────────────────────────────────
exports.initPayment = async (req, res) => {
  const invoice = await Invoice.findOne({ publicToken: req.params.token });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  if (invoice.balance <= 0) return res.status(400).json({ message: 'This invoice is already fully paid.' });
  if (invoice.currency !== 'NGN') return res.status(400).json({ message: 'Online payment is only available for NGN invoices.' });

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return res.status(503).json({ message: 'Payment gateway not configured. Please pay via bank transfer.' });

  const email = invoice.clientEmail || process.env.PAYSTACK_FALLBACK_EMAIL;
  if (!email) return res.status(400).json({ message: 'Client email is required for online payment. Please ask your contractor to add it to the invoice.' });

  const reference = `PB-${invoice._id}-${Date.now()}`;
  const callbackUrl = `${process.env.FRONTEND_URL || 'https://pico-bello-boq.onrender.com'}/pay/${req.params.token}?ref=${reference}`;

  const resp = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: Math.round(invoice.balance * 100),
      reference,
      callback_url: callbackUrl,
      metadata: {
        invoice_id: invoice._id.toString(),
        invoice_number: invoice.invoiceNumber,
        public_token: req.params.token,
      },
    }),
  });

  const data = await resp.json();
  if (!data.status) {
    logger.error('Paystack init failed', { data });
    return res.status(502).json({ message: 'Payment initialization failed. Please try again.' });
  }

  res.json({ authorizationUrl: data.data.authorization_url, reference });
};

// ── Verify payment after Paystack callback ─────────────────────────────────────────────
exports.verifyPayment = async (req, res) => {
  const { reference } = req.params;
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return res.status(503).json({ message: 'Not configured' });

  const resp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const data = await resp.json();
  if (!data.status || data.data.status !== 'success') {
    return res.status(400).json({ message: 'Payment not confirmed yet.' });
  }

  const invoiceId = data.data.metadata?.invoice_id;
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

  const already = invoice.payments.some((p) => p.reference === reference);
  if (!already) {
    invoice.payments.push({
      amount: data.data.amount / 100,
      method: 'card',
      reference,
      paymentDate: new Date(),
      note: 'Paid online via Paystack',
    });
    recalcTotals(invoice);
    await invoice.save();
  }

  res.json({ paid: true, invoice });
};

// ── Paystack webhook (raw body, verified by HMAC) ─────────────────────────────────────
exports.paystackWebhook = async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return res.sendStatus(200);

  const sig  = req.headers['x-paystack-signature'];
  const hash = crypto.createHmac('sha512', secret).update(req.body).digest('hex');
  if (hash !== sig) {
    logger.warn('Paystack webhook: invalid signature');
    return res.status(400).send('Invalid signature');
  }

  let event;
  try { event = JSON.parse(req.body.toString()); } catch { return res.sendStatus(200); }

  if (event.event !== 'charge.success') return res.sendStatus(200);

  const { reference, amount, metadata } = event.data;
  const invoiceId = metadata?.invoice_id;
  if (!invoiceId) return res.sendStatus(200);

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return res.sendStatus(200);

  const already = invoice.payments.some((p) => p.reference === reference);
  if (!already) {
    invoice.payments.push({
      amount: amount / 100,
      method: 'card',
      reference,
      paymentDate: new Date(),
      note: 'Paid online via Paystack',
    });
    recalcTotals(invoice);
    await invoice.save();
    logger.info('Paystack payment recorded', { invoiceId, reference, amount: amount / 100 });
  }

  res.sendStatus(200);
};

// ── PDF ─────────────────────────────────────────────────────────────────────────────────
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

  doc.rect(0, 0, W, 130).fill(PRIMARY);

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

  const badgeColors = { draft: '#6b7280', sent: '#2563eb', paid: '#16a34a', partially_paid: '#d97706', overdue: '#dc2626' };
  doc.roundedRect(W - M - 72, 108, 72, 16, 4).fill(badgeColors[invoice.status] || '#6b7280');
  doc.font('Helvetica-Bold').fontSize(8).fillColor('white')
    .text(invoice.status.replace('_', ' ').toUpperCase(), W - M - 72, 112, { width: 72, align: 'center' });

  let y = 148;

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

  doc.rect(0, doc.page.height - 40, W, 40).fill(PRIMARY);
  doc.font('Helvetica').fontSize(7.5).fillColor(LIGHT_BLUE)
    .text(
      `${co.companyName || ''}  ·  ${invoice.invoiceNumber}  ·  Generated ${fmtDate(new Date())}`,
      M, doc.page.height - 24, { width: W - M * 2, align: 'center' }
    );

  doc.end();
};
