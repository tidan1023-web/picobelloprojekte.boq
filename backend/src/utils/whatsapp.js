const logger = require('./logger');

// Sends a WhatsApp message via Twilio.
// Requires env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
// If any are missing the call is a no-op so the app still works without Twilio configured.
const sendWhatsApp = async (to, message) => {
  const sid    = process.env.TWILIO_ACCOUNT_SID;
  const token  = process.env.TWILIO_AUTH_TOKEN;
  const from   = process.env.TWILIO_WHATSAPP_FROM; // e.g. 'whatsapp:+14155238886'

  if (!sid || !token || !from) {
    logger.warn('WhatsApp not configured — skipping notification', { to });
    return;
  }

  // Normalise number: ensure it starts with 'whatsapp:+...'
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to.startsWith('+') ? to : '+' + to}`;

  const twilio = require('twilio')(sid, token);
  await twilio.messages.create({ from, to: toFormatted, body: message });
  logger.info('WhatsApp notification sent', { to: toFormatted });
};

module.exports = { sendWhatsApp };
