const Project = require('../models/Project');

// A client only ever sees data for a project they've been explicitly assigned
// to (Project.assignedClientId) -- no fallback, no "only one client so show
// everything" leniency. Nothing reaches a client account by default.
async function clientProjectIds(user) {
  const projects = await Project.find({ companyId: user.companyId, assignedClientId: user._id }).select('_id');
  return projects.map((p) => String(p._id));
}

module.exports = { clientProjectIds };
