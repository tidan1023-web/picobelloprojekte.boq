const crypto = require('crypto');
const jwt    = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User     = require('../models/User');
const Company  = require('../models/Company');
const Estimate = require('../models/Estimate');
const Invoice  = require('../models/Invoice');
const SiteReport = require('../models/SiteReport');
const HistoricalProject = require('../models/HistoricalProject');
const { sendWelcome, sendPasswordReset } = require('../utils/email');
const logger = require('../utils/logger');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ── Helpers ───────────────────────────────────────────────────────────────────

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
}

// ── register ────────────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  // req.body already validated + sanitised by Zod middleware
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    logger.warn('Registration attempt for already-registered email', { email, ip: getIp(req) });
    return res.status(409).json({ message: 'Email already registered' });
  }

  const company = await Company.create({ companyName: req.body.companyName || 'My Company' });
  const user    = await User.create({ name, email, password, role: 'admin', companyId: company._id, onboarded: true });
  company.createdBy = user._id;
  await company.save();

  logger.info('New user registered', { userId: user._id, email, ip: getIp(req) });

  const token = generateToken(user._id);
  sendWelcome(user).catch((e) => logger.warn('Welcome email failed', { error: e.message }));
  res.status(201).json({ message: 'Registration successful', token, user });
};
