const Project = require('../models/Project');

// Resolves which projects a user is allowed to see, project-linked data
// (BOQ, invoices, change orders, programme, progress, site reports, expenses,
// documents, comments) included. Returns null for unrestricted access
// (admin), otherwise a string[] of allowed Project ids -- always explicit,
// never a fallback: nothing shows up for a client or QS/PM until someone
// specifically assigns them to the project.
async function getAllowedProjectIds(user) {
  if (user.role === 'admin') return null;

  if (user.role === 'client') {
    const projects = await Project.find({ companyId: user.companyId, assignedClientId: user._id }).select('_id');
    return projects.map((p) => String(p._id));
  }

  // qs / project_manager
  const projects = await Project.find({ companyId: user.companyId, assignedTeamIds: user._id }).select('_id');
  return projects.map((p) => String(p._id));
}

// Backwards-compatible alias used by a few controllers written before staff
// scoping existed -- same rules, just named for the client-specific case.
async function clientProjectIds(user) {
  if (user.role !== 'client') return getAllowedProjectIds(user);
  const projects = await Project.find({ companyId: user.companyId, assignedClientId: user._id }).select('_id');
  return projects.map((p) => String(p._id));
}

// Applies scoping to a Mongo filter in place. `allowedIds` is the result of
// getAllowedProjectIds (null = unrestricted, skip entirely). Returns false
// if the caller should short-circuit with an empty result (a specific
// projectId was requested that isn't in the allowed set).
function scopeToProjects(filter, allowedIds, field = 'projectId') {
  if (allowedIds === null) return true;
  if (filter[field]) {
    return allowedIds.includes(String(filter[field]));
  }
  filter[field] = { $in: allowedIds };
  return true;
}

module.exports = { getAllowedProjectIds, clientProjectIds, scopeToProjects };
