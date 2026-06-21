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

module.exports = { sendEmail, sendWelcome, sendPasswordReset };
