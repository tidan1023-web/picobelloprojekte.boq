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
const { sendWhatsApp } = require('../utils/whatsapp');
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

// ── register ──────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    logger.warn('Registration attempt for already-registered email', { email, ip: getIp(req) });
    return res.status(409).json({ message: 'Email already registered' });
  }

  const company = await Company.create({ companyName: req.body.companyName || 'My Company' });
  const user    = await User.create({ name, email, password, role: 'admin', companyId: company._id, onboarded: false, callBooked: false, callCompleted: false });
  company.createdBy = user._id;
  await company.save();

  logger.info('New user registered', { userId: user._id, email, ip: getIp(req) });

  const token = generateToken(user._id);
  sendWelcome(user).catch((e) => logger.warn('Welcome email failed', { error: e.message }));
  res.status(201).json({ message: 'Registration successful', token, user });
};

// ── login ─────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;
  const ip = getIp(req);

  const user = await User.findOne({ email });

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

// ── getMe ─────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  res.json({ user: req.user });
};

// ── googleAuth ────────────────────────────────────────────────────────────────
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
    const randomPw = crypto.randomBytes(24).toString('hex');
    user = await User.create({ name, email, password: randomPw, role: 'admin', companyId: company._id, avatar: picture, onboarded: false, callBooked: false, callCompleted: false });
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

// ── forgotPassword ────────────────────────────────────────────────────────────
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.json({ message: 'If that email is registered, a reset link has been sent.' });

  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken   = token;
  user.resetPasswordExpires = Date.now() + 3600000;
  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL || 'https://pico-bello-boq.onrender.com'}/reset-password/${token}`;
  await sendPasswordReset(user, resetUrl);

  logger.info('Password reset requested', { userId: user._id, ip: getIp(req) });
  res.json({ message: 'If that email is registered, a reset link has been sent.' });
};

// ── resetPassword ─────────────────────────────────────────────────────────────
const resetPassword = async (req, res) => {
  const { token }    = req.params;
  const { password } = req.body;

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

// ── deleteAccount ─────────────────────────────────────────────────────────────
const deleteAccount = async (req, res) => {
  const { _id: userId, companyId } = req.user;
  const ip = getIp(req);

  logger.warn('Account deletion initiated', { userId, companyId, ip });

  await Promise.all([
    Estimate.deleteMany({ companyId }),
    Invoice.deleteMany({ companyId }),
    SiteReport.deleteMany({ companyId }),
    HistoricalProject.deleteMany({ companyId }),
    User.deleteMany({ companyId, _id: { $ne: userId } }),
  ]);

  await Company.findByIdAndDelete(companyId);
  await User.findByIdAndDelete(userId);

  logger.warn('Account and all company data deleted', { userId, companyId, ip });
  res.json({ message: 'Account and all associated data have been permanently deleted.' });
};

// ── Team Management ───────────────────────────────────────────────────────────

const listTeam = async (req, res) => {
  const members = await User.find({ companyId: req.user.companyId, isActive: true })
    .select('name email role createdAt')
    .sort({ createdAt: 1 })
    .lean();
  res.json({ members });
};

const inviteMember = async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  if (!['qs', 'project_manager', 'client'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role. Choose qs, project_manager, or client.' });
  }
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ message: 'Email already registered' });

  const user = await User.create({ name, email, password, role, companyId: req.user.companyId, onboarded: false });
  logger.info('Team member invited', { invitedBy: req.user._id, newUserId: user._id, role });

  if (phone) {
    const appUrl = process.env.FRONTEND_URL || 'https://pico-bello-boq.onrender.com';
    const msg =
      `Hello ${name}! 👋\n\n` +
      `You have been added to *Pico Bello Projekte BOQ* as *${role.replace('_', ' ')}*.\n\n` +
      `Your login details:\n` +
      `🌐 ${appUrl}\n` +
      `📧 Email: ${email}\n` +
      `🔑 Password: ${password}\n\n` +
      `Please log in and change your password after your first sign-in.`;
    sendWhatsApp(phone, msg).catch((e) =>
      logger.warn('WhatsApp invite notification failed', { error: e.message }),
    );
  }

  res.status(201).json({ message: 'Member added successfully', user });
};

const updateMemberRole = async (req, res) => {
  const { role } = req.body;
  if (!['qs', 'project_manager', 'client'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ message: 'Cannot change your own role' });
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
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ message: 'Cannot remove yourself' });
  }
  const member = await User.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
  if (!member) return res.status(404).json({ message: 'Member not found' });
  res.json({ message: 'Member removed' });
};

// ── Onboarding ────────────────────────────────────────────────────────────────

const markOnboarded = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { onboarded: true });
  res.json({ message: 'Onboarded' });
};

// ── Call Booking ──────────────────────────────────────────────────────────────

const bookCall = async (req, res) => {
  const { slot } = req.body;
  if (!slot) return res.status(400).json({ message: 'slot is required' });
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { callBooked: true, callBookedSlot: slot },
    { new: true },
  );
  res.json({ message: 'Call booked', user });
};

const completeCall = async (req, res) => {
  const secret = req.headers['x-unlock-secret'];
  if (!secret || secret !== process.env.UNLOCK_SECRET) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const user = await User.findOneAndUpdate(
    { _id: req.params.id },
    { callCompleted: true },
    { new: true },
  );
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'Call marked complete', user });
};

module.exports = {
  register, login, getMe, googleAuth,
  forgotPassword, resetPassword, deleteAccount,
  listTeam, inviteMember, updateMemberRole, removeMember,
  markOnboarded, bookCall, completeCall,
};
