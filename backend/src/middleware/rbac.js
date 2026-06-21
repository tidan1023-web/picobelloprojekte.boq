'use strict';
// authorize is now the canonical version in middleware/auth.js.
// This file re-exports it for backward compatibility so any controllers
// that still import from rbac.js continue to work without changes.
const { authorize } = require('./auth');
module.exports = { authorize };
