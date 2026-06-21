const PDFDocument = require('pdfkit');
const Estimate = require('../models/Estimate');
const HistoricalProject = require('../models/HistoricalProject');
const Company = require('../models/Company');
const { runEngine } = require('../utils/estimateEngine');

const CONDITION_LABELS = {
  carcass:          'Carcass',
  advanced_carcass: 'Advanced Carcass',
  semi_finished:    'Semi-Finished',
  finished:         'Finished (Facelift)',
};
const TIER_LABELS = { basic: 'Basic', mid_range: 'Mid-Range', premium: 'Premium' };

async function nextEstimateNumber(companyId) {
  const count = await Estimate.countDocuments({ companyId });
  return `EST-${String(count + 1).padStart(4, '0')}`;
}

function tierKey(tier) {
  return tier === 'mid_range' ? 'midRangeEstimate' : `${tier}Estimate`;
}

// ── Preview (no save) ─────────────────────────────────────────────────────────
exports.calculate = async (req, res, next) => {
  try {
    const { sizeM2, condition, tier } = req.body;
    const projects = await HistoricalProject.find({ companyId: req.user.companyId }).lean();
    const result = runEngine(projects, { sizeM2: Number(sizeM2), condition, tier });
    res.json({ result });
  } catch (err) { next(err); }
};

// ── CRUD ──────────────────────────────────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const { sizeM2, condition, tier } = req.body;
    const projects = await HistoricalProject.find({ companyId: req.user.companyId }).lean();
    const engineResult = runEngine(projects, { sizeM2: Number(sizeM2), condition, tier });
    const sel = engineResult[tierKey(tier)] || engineResult.basicEstimate;

    const estimate = await Estimate.create({
      ...req.body,
      sizeM2:         Number(sizeM2),
      companyId:      req.user.companyId,
      createdBy:      req.user._id,
      estimateNumber: await nextEstimateNumber(req.user.companyId),
      engineResult,
      selectedTier:   tier,
      selectedRate:   sel.rate,
      selectedTotal:  sel.total,
    });
    res.status(201).json({ estimate });
  } catch (err) { next(err); }
};

exports.list = async (req, res, next) => {
  try {
    const estimates = await Estimate
      .find({ companyId: req.user.companyId })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name')
      .lean();
    res.json({ estimates });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const estimate = await Estimate
      .findOne({ _id: req.params.id, companyId: req.user.companyId })
      .populate('createdBy', 'name')
      .lean();
    if (!estimate) return res.status(404).json({ message: 'Not found' });
    res.json({ estimate });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const estimate = await Estimate.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      req.body,
      { new: true }
    );
    if (!estimate) return res.status(404).json({ message: 'Not found' });
    res.json({ estimate });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await Estimate.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

// ── PDF generation ────────────────────────────────────────────────────────────
exports.generatePdf = async (req, res, next) => {
  try {
    const estimate = await Estimate
      .findOne({ _id: req.params.id, companyId: req.user.companyId })
      .lean();
    if (!estimate) return res.status(404).json({ message: 'Not found' });

    const company = await Company.findById(req.user.companyId).lean();
    const fmt     = (n) => Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
    const r       = estimate.engineResult || {};

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="estimate-${estimate.estimateNumber}.pdf"`);
    doc.pipe(res);

    // ── Header ────────────────────────────────────────────────────────────────
    let headerY = 45;
    if (company?.logo) {
      try {
        const buf = Buffer.from(await (await fetch(company.logo)).arrayBuffer());
        doc.image(buf, 50, headerY, { width: 70 });
      } catch {}
    }

    doc.fontSize(18).font('Helvetica-Bold').fillColor('#0f2d5a')
      .text(company?.companyName || 'Pico Bello Projekte', 135, headerY);
    headerY += 22;
    if (company?.address) {
      doc.fontSize(8.5).font('Helvetica').fillColor('#6b7280').text(company.address, 135, headerY);
      headerY += 12;
    }
    if (company?.phone)  { doc.text(`T: ${company.phone}`, 135, headerY);  headerY += 12; }
    if (company?.email)  { doc.text(`E: ${company.email}`, 135, headerY);  headerY += 12; }

    doc.moveTo(50, 120).lineTo(545, 120).strokeColor('#0f2d5a').lineWidth(2).stroke();

    doc.fontSize(15).font('Helvetica-Bold').fillColor('#0f2d5a').text('PRELIMINARY ESTIMATE', 50, 132);
    doc.fontSize(9).font('Helvetica').fillColor('#9ca3af')
      .text('Ballpark estimate based on comparable completed projects. Not a formal quotation.', 50, 151);

    doc.moveTo(50, 168).lineTo(545, 168).strokeColor('#e5e7eb').lineWidth(0.5).stroke();

    // ── Two-column meta ───────────────────────────────────────────────────────
    const leftX = 50, rightX = 310;
    let y = 182;

    const leftRows = [
      ['Project', estimate.projectName],
      ['Client',  estimate.clientName  || '—'],
      ['Phone',   estimate.clientPhone || '—'],
      ['Email',   estimate.clientEmail || '—'],
      ['Location', estimate.location   || '—'],
    ];
    const rightRows = [
      ['Estimate No.', estimate.estimateNumber],
      ['Date', new Date(estimate.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })],
      ['Valid Until', (() => {
        const d = new Date(estimate.createdAt);
        d.setDate(d.getDate() + (estimate.validityDays || 30));
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      })()],
      ['Size', `${estimate.sizeM2} m²`],
      ['Condition', CONDITION_LABELS[estimate.condition]],
      ['Tier', TIER_LABELS[estimate.tier]],
    ];

    const tags = [
      estimate.includesFurniture && 'Furniture',
      estimate.includesKitchen   && 'Kitchen',
      estimate.includesWardrobes && 'Wardrobes',
    ].filter(Boolean);
    if (tags.length) rightRows.push(['Includes', tags.join(', ')]);

    const rowH = 15;
    leftRows.forEach(([l, v]) => {
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#6b7280').text(l + ':', leftX, y, { width: 70 });
      doc.font('Helvetica').fillColor('#111827').text(v, leftX + 72, y, { width: 185 });
      y += rowH;
    });

    let ry = 182;
    rightRows.forEach(([l, v]) => {
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#6b7280').text(l + ':', rightX, ry, { width: 75 });
      doc.font('Helvetica').fillColor('#111827').text(v, rightX + 77, ry, { width: 160 });
      ry += rowH;
    });

    y = Math.max(y, ry) + 18;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    y += 14;

    // ── Tier estimates table ──────────────────────────────────────────────────
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f2d5a').text('ESTIMATE SUMMARY', leftX, y);
    y += 18;

    // Table header
    doc.rect(50, y, 495, 20).fillColor('#0f2d5a').fill();
    doc.fontSize(9).font('Helvetica-Bold').fillColor('white')
      .text('Tier',         60,  y + 6)
      .text('Rate / m²',   250,  y + 6)
      .text('Total Cost',  390,  y + 6);
    y += 20;

    const tiers = [
      ['Basic',     r.basicEstimate,     estimate.tier === 'basic'],
      ['Mid-Range', r.midRangeEstimate,  estimate.tier === 'mid_range'],
      ['Premium',   r.premiumEstimate,   estimate.tier === 'premium'],
    ];

    tiers.forEach(([label, est, selected]) => {
      doc.rect(50, y, 495, 24).fillColor(selected ? '#dbeafe' : '#f9fafb').fill();
      doc.rect(50, y, 495, 24).strokeColor('#e5e7eb').lineWidth(0.3).stroke();
      if (selected) doc.rect(50, y, 4, 24).fillColor('#0f2d5a').fill();

      doc.fontSize(9).font(selected ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(selected ? '#1e40af' : '#374151')
        .text(label + (selected ? '  ✓ Selected' : ''), 60, y + 8)
        .text(`₦${fmt(est?.rate)} /m²`, 250, y + 8)
        .text(`₦${fmt(est?.total)}`, 390, y + 8);
      y += 24;
    });

    y += 18;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    y += 14;

    // ── Breakdown ─────────────────────────────────────────────────────────────
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f2d5a').text('HOW THIS WAS CALCULATED', leftX, y);
    y += 18;

    const dataNote = r.dataSource === 'fallback'
      ? 'No historical projects found — industry fallback rate applied'
      : `${r.projectsUsed} of ${r.projectsTotal} projects used (${r.outliersRemoved} outliers removed)`;

    const breakdownRows = [
      ['Data source',                        dataNote],
      ['Base rate (carcass, basic, 150m², today)', `₦${fmt(r.baseRate)} /m²`],
      [`Condition adjustment (${CONDITION_LABELS[estimate.condition]})`, `× ${(r.conditionMultiplier || 0).toFixed(2)}`],
      [`Tier adjustment (${TIER_LABELS[estimate.tier]})`,               `× ${(r.tierMultiplier || 0).toFixed(2)}`],
      [`Size adjustment (${estimate.sizeM2}m²)`,                        `× ${(r.sizeMultiplier || 0).toFixed(3)}`],
      ['Final rate per m²',                  `₦${fmt(r.finalRate)} /m²`],
      ['Estimated total',                    `₦${fmt(r.totalCost)}`],
    ];

    breakdownRows.forEach(([label, value]) => {
      doc.fontSize(8.5).font('Helvetica').fillColor('#6b7280').text(label, leftX, y, { width: 280 });
      doc.font('Helvetica-Bold').fillColor('#111827').text(value, 340, y, { width: 205, align: 'right' });
      y += 14;
    });

    // ── Assumptions / exclusions ──────────────────────────────────────────────
    if (estimate.scopeAssumptions || estimate.exclusions) {
      y += 8;
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      y += 12;

      if (estimate.scopeAssumptions) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text('SCOPE ASSUMPTIONS', leftX, y);
        y += 13;
        doc.fontSize(8.5).font('Helvetica').fillColor('#6b7280')
          .text(estimate.scopeAssumptions, leftX, y, { width: 495 });
        y += doc.heightOfString(estimate.scopeAssumptions, { width: 495 }) + 10;
      }

      if (estimate.exclusions) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text('EXCLUSIONS', leftX, y);
        y += 13;
        doc.fontSize(8.5).font('Helvetica').fillColor('#6b7280')
          .text(estimate.exclusions, leftX, y, { width: 495 });
        y += doc.heightOfString(estimate.exclusions, { width: 495 }) + 10;
      }
    }

    // ── Disclaimer ────────────────────────────────────────────────────────────
    y += 8;
    const disclaimer = `This is a preliminary ballpark estimate only. It is based on historical project data and is subject to change once a full survey and detailed Bill of Quantities (BOQ) has been prepared. This estimate is valid for ${estimate.validityDays || 30} days from the date of issue and does not constitute a binding contract or formal quotation.`;
    doc.rect(50, y, 495, 52).fillColor('#fffbeb').fill();
    doc.rect(50, y, 495, 52).strokeColor('#fde68a').lineWidth(0.5).stroke();
    doc.fontSize(8).font('Helvetica').fillColor('#92400e').text(disclaimer, 57, y + 9, { width: 481 });
    y += 62;

    // ── Signature ─────────────────────────────────────────────────────────────
    if (company?.signature) {
      try {
        const buf = Buffer.from(await (await fetch(company.signature)).arrayBuffer());
        doc.image(buf, 370, y, { width: 90 });
        y += 55;
      } catch { y += 40; }
    } else {
      y += 40;
    }

    doc.moveTo(360, y).lineTo(545, y).strokeColor('#374151').lineWidth(0.5).stroke();
    y += 5;
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#374151').text('Authorised Signature', 360, y);
    if (company?.companyName) {
      doc.fontSize(8).font('Helvetica').fillColor('#6b7280').text(company.companyName, 360, y + 12);
    }

    doc.end();
  } catch (err) { next(err); }
};
