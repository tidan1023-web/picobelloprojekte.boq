const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const FROM = process.env.EMAIL_FROM || 'Pico Bello Projekte <noreply@picobello.com>';

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email not configured — skipping send to', to);
    return;
  }
  await transporter.sendMail({ from: FROM, to, subject, html });
};

const sendWelcome = (user) =>
  sendEmail({
    to: user.email,
    subject: 'Welcome to Pico Bello Projekte',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#1e3a5f">Welcome, ${user.name}!</h2>
        <p>Your account has been created. You can now log in and start managing your BOQ projects.</p>
        <a href="${process.env.FRONTEND_URL || 'https://pico-bello-boq.onrender.com'}/login"
           style="display:inline-block;margin-top:16px;padding:12px 24px;background:#1e3a5f;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Go to Dashboard
        </a>
        <p style="margin-top:24px;color:#666;font-size:13px">Pico Bello Projekte BOQ System</p>
      </div>
    `,
  });

const sendPasswordReset = (user, resetUrl) =>
  sendEmail({
    to: user.email,
    subject: 'Reset your Pico Bello password',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#1e3a5f">Password Reset</h2>
        <p>Hi ${user.name}, we received a request to reset your password.</p>
        <p>Click the button below — this link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;margin-top:16px;padding:12px 24px;background:#1e3a5f;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Reset Password
        </a>
        <p style="margin-top:24px;color:#666;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });

// Build a Google Calendar "Add to Calendar" link from a slot string like
// "Mon, 23 June 2026 at 9:00 AM"
function buildCalendarLink(slot) {
  try {
    // Parse "Mon, 23 June 2026 at 9:00 AM" → Date (WAT = UTC+1)
    const withoutDay = slot.replace(/^[A-Za-z]+,\s*/, ''); // "23 June 2026 at 9:00 AM"
    const normalized = withoutDay.replace(' at ', ' ');    // "23 June 2026 9:00 AM"
    const start = new Date(`${normalized} GMT+0100`);
    if (isNaN(start)) return null;
    const end = new Date(start.getTime() + 30 * 60 * 1000); // +30 min

    const fmt = (d) =>
      d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: 'Pico Bello Projekte — Onboarding Call',
      dates: `${fmt(start)}/${fmt(end)}`,
      details: 'Your onboarding call with the Pico Bello Projekte team. We will walk you through the platform so you can hit the ground running.',
      location: 'Garki, Abuja, Nigeria (Video / Phone)',
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  } catch {
    return null;
  }
}

const sendBookingConfirmation = (user, slot) => {
  const calLink = buildCalendarLink(slot);
  const calButton = calLink
    ? `<a href="${calLink}" style="display:inline-block;margin-top:8px;padding:10px 20px;background:#4285f4;color:#fff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">
        Add to Google Calendar
       </a>`
    : '';

  return sendEmail({
    to: user.email,
    subject: 'Your Pico Bello onboarding call is confirmed',
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
        <div style="background:#1e3a8a;padding:24px 28px">
          <img src="${process.env.FRONTEND_URL || 'https://pico-bello-boq.onrender.com'}/logo.png"
               alt="Pico Bello Projekte" height="40"
               style="display:block;margin-bottom:12px;object-fit:contain" />
          <h2 style="color:#fff;margin:0;font-size:18px">You're on the calendar!</h2>
        </div>
        <div style="padding:28px">
          <p style="color:#374151;margin-top:0">Hi ${user.name},</p>
          <p style="color:#374151">Your onboarding call with the Pico Bello team is confirmed for:</p>
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 18px;margin:16px 0">
            <p style="margin:0;color:#1e3a8a;font-weight:700;font-size:15px">📅 ${slot}</p>
            <p style="margin:4px 0 0;color:#3b82f6;font-size:13px">30-minute call · Video or phone · West Africa Time (UTC+1)</p>
          </div>
          ${calButton}
          <p style="color:#374151;margin-top:20px">
            We'll walk you through the platform so you can hit the ground running.
            If you need to reschedule, just reply to this email.
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
          <p style="color:#6b7280;font-size:13px;margin:0">
            <strong>Pico Bello Projekte</strong><br />
            Garki, Abuja, Nigeria<br />
            <a href="mailto:hello@picobelloprojekte.com" style="color:#1e3a8a">hello@picobelloprojekte.com</a>
          </p>
        </div>
      </div>
    `,
  });
};

const sendTeamInvite = async (user, inviteUrl) => {
  return sendEmail({
    to: user.email,
    subject: 'You've been invited to Pico Bello Projekte BOQ',
    html: `
      <div style="font-family:sans-serif;max-width:540px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
        <div style="background:#1e3a8a;padding:24px 28px">
          <h2 style="color:#fff;margin:0;font-size:18px">You're invited!</h2>
        </div>
        <div style="padding:28px">
          <p style="color:#374151;margin-top:0">Hi ${user.name},</p>
          <p style="color:#374151">
            You've been added to <strong>Pico Bello Projekte BOQ</strong> as
            <strong>${user.role.replace(/_/g, ' ')}</strong>.
          </p>
          <p style="color:#374151">Click the button below to set your password and sign in:</p>
          <a href="${inviteUrl}"
             style="display:inline-block;background:#1e3a8a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;margin:8px 0">
            Accept Invitation
          </a>
          <p style="color:#6b7280;font-size:13px;margin-top:20px">
            This link expires in <strong>48 hours</strong>. If you didn't expect this invitation, you can ignore this email.
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
          <p style="color:#6b7280;font-size:13px;margin:0">
            <strong>Pico Bello Projekte</strong><br />
            <a href="mailto:hello@picobelloprojekte.com" style="color:#1e3a8a">hello@picobelloprojekte.com</a>
          </p>
        </div>
      </div>
    `,
  });
};

const sendOnboardingRequest = ({ name, email, plan }) =>
  sendEmail({
    to: process.env.OWNER_EMAIL || 'tidan1023@gmail.com',
    subject: `New onboarding request — ${plan} plan`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#1e3a5f">New Onboarding Request</h2>
        <p>Someone wants to join Pico Bello Projekte.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#666;width:100px">Name</td><td style="padding:8px;font-weight:600">${name}</td></tr>
          <tr><td style="padding:8px;color:#666">Email</td><td style="padding:8px;font-weight:600">${email}</td></tr>
          <tr><td style="padding:8px;color:#666">Plan</td><td style="padding:8px;font-weight:600">${plan}</td></tr>
        </table>
        <p>Send them an invite from the Team page, or reply to this email to schedule their onboarding call.</p>
        <a href="${process.env.FRONTEND_URL || 'https://pico-bello-boq.onrender.com'}/settings/team"
           style="display:inline-block;margin-top:16px;padding:12px 24px;background:#1e3a5f;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Open Team Settings
        </a>
        <p style="margin-top:24px;color:#666;font-size:13px">Pico Bello Projekte BOQ System</p>
      </div>
    `,
  });

module.exports = { sendEmail, sendWelcome, sendPasswordReset, sendBookingConfirmation, sendTeamInvite, sendOnboardingRequest };
