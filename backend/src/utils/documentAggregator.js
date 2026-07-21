// The Document Library is meant to be "every file, everywhere" per the app's
// own description, but historically it only showed records created via its
// own "Add Document" form. Files attached elsewhere in the app — a completed
// project's certificate, an expense receipt, a progress photo, a site report
// photo — lived only on their own record and never showed up here. This
// pulls those in as read-only entries alongside real Document records.

const HistoricalProject = require('../models/HistoricalProject');
const Expense = require('../models/Expense');
const ProgressUpdate = require('../models/ProgressUpdate');
const SiteReport = require('../models/SiteReport');

async function aggregateDocuments(companyId, projectId, scope = {}) {
  const { allowedIds = null, isClient = false } = scope;
  const results = [];

  // Historical Project attachments aren't linked to a live Project record, so
  // they can't be scoped per-project -- only shown to internal staff (who
  // already have unrestricted Historical Projects access), never to a client,
  // and only in the unfiltered ("all documents") view.
  if (!projectId && !isClient) {
    const projects = await HistoricalProject.find({ companyId, documentUrl: { $exists: true, $ne: '' } })
      .select('name documentUrl documentName createdAt')
      .lean();
    for (const hp of projects) {
      results.push({
        _id: `hp-${hp._id}`,
        name: hp.documentName || `${hp.name} — Document`,
        url: hp.documentUrl,
        folder: 'Historical Projects',
        description: '',
        projectId: null,
        createdAt: hp.createdAt,
        uploadedBy: null,
        source: 'historical-project',
        readOnly: true,
      });
    }
  }

  const expenseFilter = { companyId, receipts: { $exists: true, $not: { $size: 0 } } };
  if (projectId) expenseFilter.projectId = projectId;
  else if (allowedIds !== null) expenseFilter.projectId = { $in: allowedIds };
  const expenses = isClient ? [] : await Expense.find(expenseFilter)
    .populate('projectId', 'name')
    .select('description receipts projectId createdAt')
    .lean();
  for (const exp of expenses) {
    (exp.receipts || []).forEach((url, i) => {
      results.push({
        _id: `exp-${exp._id}-${i}`,
        name: `Receipt — ${exp.description}`,
        url,
        folder: 'Expense Receipts',
        description: '',
        projectId: exp.projectId || null,
        createdAt: exp.createdAt,
        uploadedBy: null,
        source: 'expense',
        readOnly: true,
      });
    });
  }

  const progressFilter = { companyId, images: { $exists: true, $not: { $size: 0 } } };
  if (projectId) progressFilter.projectId = projectId;
  else if (allowedIds !== null) progressFilter.projectId = { $in: allowedIds };
  if (isClient) progressFilter.sharedWithClient = true;
  const updates = await ProgressUpdate.find(progressFilter)
    .populate('projectId', 'name')
    .select('title images projectId createdAt')
    .lean();
  for (const u of updates) {
    (u.images || []).forEach((url, i) => {
      results.push({
        _id: `prog-${u._id}-${i}`,
        name: `Progress Photo — ${u.title}`,
        url,
        folder: 'Progress Photos',
        description: '',
        projectId: u.projectId || null,
        createdAt: u.createdAt,
        uploadedBy: null,
        source: 'progress-update',
        readOnly: true,
      });
    });
  }

  const reportFilter = { companyId, images: { $exists: true, $not: { $size: 0 } } };
  if (projectId) reportFilter.projectId = projectId;
  else if (allowedIds !== null) reportFilter.projectId = { $in: allowedIds };
  if (isClient) reportFilter.sharedWithClient = true;
  const reports = await SiteReport.find(reportFilter)
    .populate('projectId', 'name')
    .select('title images projectId createdAt')
    .lean();
  for (const r of reports) {
    (r.images || []).forEach((img, i) => {
      results.push({
        _id: `report-${r._id}-${i}`,
        name: img.caption || `Site Report Photo — ${r.title}`,
        url: img.url,
        folder: 'Site Report Photos',
        description: '',
        projectId: r.projectId || null,
        createdAt: r.createdAt,
        uploadedBy: null,
        source: 'site-report',
        readOnly: true,
      });
    });
  }

  return results;
}

module.exports = { aggregateDocuments };
