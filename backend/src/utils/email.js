const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Pico Bello Projekte <onboarding@resend.dev>';

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping send to', to);
    return;
  }
  await resend.emails.send({ from: FROM, to, subject, html });
};

const sendWelcome = (user) => {
  const appUrl = process.env.FRONTEND_URL || 'https://picobelloprojekte-boq.onrender.com';
  return sendEmail({
    to: user.email,
    subject: 'Welcome to Pico Bello Projekte — here\'s how to get started',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
        <!-- Header -->
        <div style="background:#1e3a8a;padding:28px">
          <h1 style="color:#fff;margin:0;font-size:20px">Welcome to Pico Bello Projekte, ${user.name}!</h1>
          <p style="color:#93c5fd;margin:8px 0 0;font-size:14px">Your BOQ management account is ready.</p>
        </div>

        <!-- Body -->
        <div style="padding:28px">
          <p style="color:#374151;margin-top:0">Here's a quick overview of what you can do and how to get the most out of the platform.</p>

          <!-- Free features -->
          <div style="background:#f9fafb;border-radius:8px;padding:16px 20px;margin-bottom:20px">
            <p style="margin:0 0 10px;font-weight:700;color:#1e3a8a;font-size:14px">✅ Available on your free account</p>
            <ul style="margin:0;padding-left:18px;color:#374151;font-size:14px;line-height:1.8">
              <li><strong>Project Estimator</strong> — generate cost estimates for any project</li>
              <li><strong>BOQ Builder</strong> — build and manage Bills of Quantities</li>
              <li><strong>Invoices</strong> — create and send professional invoices</li>
              <li><strong>Projects & Contacts</strong> — organise your clients and jobs</li>
              <li><strong>Document Library</strong> — store and share project documents</li>
            </ul>
          </div>

          <!-- Paid features -->
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;margin-bottom:20px">
            <p style="margin:0 0 10px;font-weight:700;color:#1e3a8a;font-size:14px">🔒 Unlock more with a paid plan</p>
            <ul style="margin:0;padding-left:18px;color:#374151;font-size:14px;line-height:1.8">
              <li><strong>Basic</strong> — QS & Artisan Rate Libraries, Material Prices, Estimate History</li>
              <li><strong>Premium</strong> — Analytics, Change Orders, Site Reports, Progress Tracker, Expense Tracker, Price Intelligence</li>
            </ul>
          </div>

          <!-- CTA -->
          <p style="color:#374151;font-size:14px">Ready to unlock the full platform? Book a quick call with us — we'll walk you through everything and get you set up on the right plan.</p>

          <a href="${appUrl}/app/settings"
             style="display:inline-block;margin-top:4px;padding:12px 24px;background:#1e3a8a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
            Book an Upgrade Call
          </a>

          <p style="color:#374151;font-size:14px;margin-top:24px">Or just log in and start exploring your free features:</p>
          <a href="${appUrl}/app"
             style="display:inline-block;padding:12px 24px;background:#f3f4f6;color:#1e3a8a;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;border:1px solid #e5e7eb">
            Go to Dashboard
          </a>

          <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0" />
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

function buildCalendarLink(slot) {
  try {
    const withoutDay = slot.replace(/^[A-Za-z]+,\s*/, '');
    const normalized = withoutDay.replace(' at ', ' ');
    const start = new Date(`${normalized} GMT+0100`);
    if (isNaN(start)) return null;
    const end = new Date(start.getTime() + 30 * 60 * 1000);

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
    subject: "You've been invited to Pico Bello Projekte BOQ",
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

const sendOnboardingRequest = ({ name, email, phone, plan }) =>
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
          <tr><td style="padding:8px;color:#666">Phone</td><td style="padding:8px;font-weight:600">${phone || '—'}</td></tr>
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
