const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    // Auto-create a company for legacy users who don't have one yet
    if (!user.companyId) {
      const company = await Company.create({ companyName: 'My Company', createdBy: user._id });
      user.companyId = company._id;
      await user.save();
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};

module.exports = { authenticate, authorize };
