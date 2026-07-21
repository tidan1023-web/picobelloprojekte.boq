const WaitlistSignup = require('../models/WaitlistSignup');
const { sendWaitlistNotification } = require('../utils/email');
const { SUPER_EMAILS } = require('./authController');
const logger = require('../utils/logger');

// Waitlist signups aren't scoped to any one company, so this is platform-owner
// territory (same as ownerDashboard) — plus whoever receives the notification
// email below, since they're the ones who'll actually be doing the launch outreach.
const OWNER_EMAILS = [...SUPER_EMAILS, process.env.OWNER_EMAIL || 'tidan1023@gmail.com'];

const ROLE_LABELS = {
  quantity_surveyor: 'Quantity Surveyor',
  project_manager: 'Project Manager',
  contractor: 'Contractor / Builder',
  architect: 'Architect',
  civil_structural_engineer: 'Civil / Structural Engineer',
  mep_engineer: 'MEP Engineer',
  site_supervisor: 'Site Supervisor / Foreman',
  developer_client: 'Developer / Client',
  consultant: 'Consultant',
  supplier_vendor: 'Supplier / Vendor',
  student: 'Student',
  other: 'Other',
};

// Public — no auth. Rate-limited at the route level.
const create = async (req, res) => {
  const { name, role, email, phone } = req.body;

  const existing = await WaitlistSignup.findOne({ email });
  if (existing) {
    return res.json({ message: "You're already on the list — we'll email you when new features launch." });
  }

  const signup = await WaitlistSignup.create({ name, role, email, phone });

  sendWaitlistNotification({ name, email, phone, role: ROLE_LABELS[role] || role }).catch((e) =>
    logger.warn('Waitlist notification email failed', { error: e.message }),
  );

  res.status(201).json({ message: "You're on the list! We'll email you when new features launch.", signup: { _id: signup._id } });
};

// Platform owner only — this list isn't scoped to any one company.
const list = async (req, res) => {
  if (!OWNER_EMAILS.includes(req.user.email)) {
    return res.status(403).json({ message: 'Not authorised.' });
  }
  const signups = await WaitlistSignup.find().sort({ createdAt: -1 }).lean();
  res.json({ signups, roleLabels: ROLE_LABELS });
};

module.exports = { create, list, ROLE_LABELS };
