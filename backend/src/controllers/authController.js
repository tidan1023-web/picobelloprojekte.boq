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
  const user    = await User.create({ name, email, password, role: 'admin', companyId: company._id });
  company.createdBy = user._id;
  await company.save();

  logger.info('New user registered', { userId: user._id, email, ip: getIp(req) });

  const token = generateToken(user._id);
  sendWelcome(user).catch((e) => logger.warn('Welcome email failed', { error: e.message }));
  res.status(201).json({ message: 'Registration successful', token, user });
};

// ── login ───────────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;
  const ip = getIp(req);

  const user = await User.findOne({ email });

  // Use same response whether email or password is wrong (prevents user enumeration)
  if (!user || !(await user.comparePassword(password))) {
    logger.warn('Failed login attempt', { email, ip });
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  if (!user.isActive) {
    logger.warn('Login attempt on deactivated account', { userId: user._id, ip });
    return res.status(403).json({ message: 'Account has been deactivated' });
  }

  logger.info('Successful login', { userId: user._id, email, ip });

  const token = generateToken(user._id);
  res.json({ message: 'Login successful', token, user });
};

// ── getMe ────────────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  res.json({ user: req.user });
};

// ── googleAuth ────────────────────────────────────────────────────────────────────────
const googleAuth = async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ message: 'Google credential required' });

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const { name, email, picture } = ticket.getPayload();
  const ip = getIp(req);

  let user = await User.findOne({ email });
  if (!user) {
    const company  = await Company.create({ companyName: 'My Company' });
    const randomPw = crypto.randomBytes(24).toString('hex'); // never used — Google auth only
    user = await User.create({ name, email, password: randomPw, role: 'admin', companyId: company._id, avatar: picture });
    company.createdBy = user._id;
    await company.save();
    logger.info('New user via Google OAuth', { userId: user._id, email, ip });
  }

  if (!user.isActive) {
    logger.warn('Google login on deactivated account', { userId: user._id, ip });
    return res.status(403).json({ message: 'Account deactivated' });
  }

  logger.info('Google login successful', { userId: user._id, email, ip });

  const token = generateToken(user._id);
  res.json({ message: 'Google login successful', token, user });
};

// ── forgotPassword ──────────────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Always respond the same way — don't reveal whether the email is registered
  if (!user) return res.json({ message: 'If that email is registered, a reset link has been sent.' });

  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken   = token;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL || 'https://pico-bello-boq.onrender.com'}/reset-password/${token}`;
  await sendPasswordReset(user, resetUrl);

  logger.info('Password reset requested', { userId: user._id, ip: getIp(req) });
  res.json({ message: 'If that email is registered, a reset link has been sent.' });
};

// ── resetPassword ───────────────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  const { token }    = req.params;
  const { password } = req.body; // Zod already validated length/complexity

  const user = await User.findOne({
    resetPasswordToken:   token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ message: 'Reset link is invalid or has expired.' });

  user.password             = password;
  user.resetPasswordToken   = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  logger.info('Password reset successful', { userId: user._id, ip: getIp(req) });
  res.json({ message: 'Password reset successful. You can now log in.' });
};

// ── deleteAccount ───────────────────────────────────────────────────────────────────
// App Store / GDPR: permanently erases the user and ALL their company's data.
// Called by authenticated user — they can only delete their own account.
const deleteAccount = async (req, res) => {
  const { _id: userId, companyId } = req.user;
  const ip = getIp(req);

  logger.warn('Account deletion initiated', { userId, companyId, ip });

  // Delete all data scoped to the company
  await Promise.all([
    Estimate.deleteMany({ companyId }),
    Invoice.deleteMany({ companyId }),
    SiteReport.deleteMany({ companyId }),
    HistoricalProject.deleteMany({ companyId }),
    // Delete all other users in the company first
    User.deleteMany({ companyId, _id: { $ne: userId } }),
  ]);

  // Delete the company itself, then the user
  await Company.findByIdAndDelete(companyId);
  await User.findByIdAndDelete(userId);

  logger.warn('Account and all company data deleted', { userId, companyId, ip });
  res.json({ message: 'Account and all associated data have been permanently deleted.' });
};

// ── Team Management (admin only) ──────────────────────────────────────────────────

const listTeam = async (req, res) => {
  const members = await User.find({ companyId: req.user.companyId })
    .select('name email role isActive createdAt')
    .sort({ createdAt: 1 })
    .lean();
  res.json({ members });
};

const inviteMember = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const { name, email, password, role } = req.body;
  if (!['qs', 'project_manager', 'client'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role. Choose qs, project_manager, or client.' });
  }
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ message: 'Email already registered' });
  const user = await User.create({ name, email, password, role, companyId: req.user.companyId });
  logger.info('Team member invited', { invitedBy: req.user._id, newUserId: user._id, role });
  res.status(201).json({ message: 'Member added successfully', user });
};

const updateMemberRole = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  const { role } = req.body;
  if (!['qs', 'project_manager', 'client'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  const member = await User.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { role },
    { new: true }
  );
  if (!member) return res.status(404).json({ message: 'Member not found' });
  res.json({ message: 'Role updated', user: member });
};

const removeMember = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ message: 'Cannot remove yourself' });
  }
  const member = await User.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
  if (!member) return res.status(404).json({ message: 'Member not found' });
  res.json({ message: 'Member removed' });
};

module.exports = {
  register, login, getMe, googleAuth, forgotPassword, resetPassword, deleteAccount,
  listTeam, inviteMember, updateMemberRole, removeMember,
};
