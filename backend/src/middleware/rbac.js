'use strict';

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      // Don't expose which roles are required or what role the caller has
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

const requireAdmin = requireRole('admin');
const requireStaff = requireRole('admin', 'staff');

module.exports = { requireRole, requireAdmin, requireStaff };
