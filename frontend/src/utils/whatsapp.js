/**
 * Open a WhatsApp chat with a pre-filled message.
 * phone: international format without '+' or spaces, e.g. "2348012345678"
 */
function openWhatsApp(phone, message) {
  const clean = phone.replace(/\D/g, '');
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener');
}

/**
 * Send an invoice link via WhatsApp.
 * baseUrl: full origin, e.g. "https://your-app.onrender.com"
 */
export function sendInvoiceWhatsApp(phone, { invoiceNumber, amount, currency, invoiceId, baseUrl }) {
  const link = `${baseUrl || window.location.origin}/app/invoices/${invoiceId}`;
  const message =
    `Hello, please find your invoice *${invoiceNumber}* for *${currency} ${Number(amount).toLocaleString()}*.\n\nView & download PDF: ${link}`;
  openWhatsApp(phone, message);
}

/**
 * Send a BOQ approval request link via WhatsApp.
 */
export function sendApprovalWhatsApp(phone, { projectName, projectId, baseUrl }) {
  const link = `${baseUrl || window.location.origin}/app/client-boq?projectId=${projectId}`;
  const message =
    `Hello, please review and approve the Bill of Quantities for project *"${projectName}"*.\n\nReview link: ${link}`;
  openWhatsApp(phone, message);
}

/**
 * Send a payment reminder via WhatsApp.
 */
export function sendPaymentReminderWhatsApp(phone, { invoiceNumber, balance, currency, dueDate, baseUrl }) {
  const link = `${baseUrl || window.location.origin}/app/client-invoices`;
  const due = dueDate ? ` (due ${new Date(dueDate).toLocaleDateString('en-GB')})` : '';
  const message =
    `Reminder: Invoice *${invoiceNumber}*${due} has an outstanding balance of *${currency} ${Number(balance).toLocaleString()}*.\n\nView invoice: ${link}`;
  openWhatsApp(phone, message);
}
