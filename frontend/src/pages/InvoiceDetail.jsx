import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Download, Trash2, Plus, X, Loader2,
  CheckCircle, Send, XCircle, DollarSign, Link, Copy,
} from 'lucide-react';
import api from '../services/api';

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30';

const STATUS_COLORS = {
  draft:          'bg-gray-100 text-gray-600',
  sent:           'bg-blue-100 text-blue-700',
  paid:           'bg-green-100 text-green-700',
  partially_paid: 'bg-yellow-100 text-yellow-700',
  overdue:        'bg-red-100 text-red-700',
};

const METHOD_LABELS = {
  bank_transfer: 'Bank Transfer', cash: 'Cash', cheque: 'Cheque', card: 'Card', other: 'Other',
};

function fmt(n) {
  return Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function PaymentModal({ invoiceId, currency, onClose, onSaved }) {
  const [form, setForm] = useState({
    amount: '', method: 'bank_transfer', reference: '',
    paymentDate: new Date().toISOString().split('T')[0], note: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post(`/invoices/${invoiceId}/payments`, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record payment');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Record Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount ({currency}) *</label>
            <input type="number" min={0} step="0.01" required
              value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Method</label>
            <select value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))} className={inputCls}>
              {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reference</label>
            <input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} className={inputCls} placeholder="Transaction ref / cheque no." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" value={form.paymentDate} onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
            <input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} className={inputCls} placeholder="Optional note" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-primary-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
              {saving ? 'Saving…' : 'Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentLinkModal({ invoice, onClose }) {
  const [copied, setCopied] = useState(false);
  const url = invoice?.publicToken
    ? `${window.location.origin}/invoice/pay/${invoice.publicToken}`
    : null;

  const copy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Client Payment Link</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-4">
          {!url ? (
            <p className="text-sm text-red-600">This invoice has no payment link. Re-save it to generate one.</p>
          ) : (
            <>
              <p className="text-sm text-gray-500">Share this link with your client. They can view the invoice and pay online without logging in.</p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-600 break-all select-all">
                {url}
              </div>
              <button
                onClick={copy}
                className="w-full flex items-center justify-center gap-2 bg-primary-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
              >
                {copied ? <><CheckCircle size={14} /> Copied!</> : <><Copy size={14} /> Copy Link</>}
              </button>
              <p className="text-xs text-gray-400 text-center">
                Permanent link — share via WhatsApp, email, or SMS.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showPaymentLink, setShowPaymentLink] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/invoices/${id}`);
      setInvoice(data.invoice);
      setForm({
        projectName:   data.invoice.projectName || '',
        clientName:    data.invoice.clientName  || '',
        clientEmail:   data.invoice.clientEmail || '',
        clientPhone:   data.invoice.clientPhone || '',
        clientAddress: data.invoice.clientAddress || '',
        dueDate:       data.invoice.dueDate ? new Date(data.invoice.dueDate).toISOString().split('T')[0] : '',
        vatRate:       data.invoice.vatRate || 0,
        currency:      data.invoice.currency || 'NGN',
        status:        data.invoice.status || 'draft',
        notes:         data.invoice.notes || '',
        lineItems:     (data.invoice.lineItems || []).map((i) => ({ ...i })),
      });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const subtotal  = (form?.lineItems || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const vatAmount = subtotal * (Number(form?.vatRate) || 0) / 100;
  const total     = subtotal + vatAmount;

  const updateItem = (idx, key, val) => {
    setForm((f) => {
      const items = f.lineItems.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [key]: val };
        if (key === 'quantity' || key === 'unitRate') {
          updated.amount = parseFloat(((Number(updated.quantity) || 0) * (Number(updated.unitRate) || 0)).toFixed(2));
        }
        return updated;
      });
      return { ...f, lineItems: items };
    });
  };

  const addItem = () => setForm((f) => ({
    ...f,
    lineItems: [...f.lineItems, { description: '', quantity: 1, unit: 'item', unitRate: 0, amount: 0 }],
  }));

  const removeItem = (idx) => setForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/invoices/${id}`, form);
      setInvoice(data.invoice);
      showToast('Invoice saved');
    } catch (err) {
      showToast(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this invoice permanently?')) return;
    await api.delete(`/invoices/${id}`);
    navigate('/app/invoices');
  };

  const handlePdf = async () => {
    setPdfLoading(true);
    try {
      await handleSave();
      const base  = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
      const res   = await fetch(`${base}/api/invoices/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('PDF failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `invoice-${invoice?.invoiceNumber}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { showToast('PDF generation failed'); }
    finally { setPdfLoading(false); }
  };

  const deletePayment = async (pid) => {
    if (!confirm('Remove this payment record?')) return;
    const { data } = await api.delete(`/invoices/${id}/payments/${pid}`);
    setInvoice(data.invoice);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-900" />
    </div>
  );
  if (!invoice || !form) return <p className="text-gray-500">Invoice not found.</p>;

  const pct = invoice.total > 0 ? Math.min(100, (invoice.amountPaid / invoice.total) * 100) : 0;

  return (
    <div className="max-w-5xl space-y-5">
      {toast && (
        <div className="fixed top-5 right-5 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 text-sm">
          <CheckCircle size={16} /> {toast}
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate('/app/invoices')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-900 transition-colors">
          <ArrowLeft size={15} /> Invoices
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleDelete}
            className="flex items-center gap-1.5 border border-red-200 text-red-500 px-3 py-2 rounded-lg text-sm hover:bg-red-50">
            <Trash2 size={14} /> Delete
          </button>
          <button onClick={() => setShowPaymentLink(true)}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
            <Link size={14} /> Payment Link
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
          <button onClick={handlePdf} disabled={pdfLoading}
            className="flex items-center gap-1.5 bg-primary-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
            {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {pdfLoading ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Payment progress header */}
      <div className="bg-primary-900 text-white rounded-2xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide mb-0.5">Invoice</p>
            <p className="text-xl font-bold font-mono">{invoice.invoiceNumber}</p>
            <p className="text-blue-200 text-sm mt-0.5">{invoice.projectName}</p>
          </div>
          <div className="text-right">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[invoice.status]}`}>
              {invoice.status.replace('_', ' ')}
            </span>
            <p className="text-blue-300 text-xs mt-2">Issued: {fmtDate(invoice.issueDate)}</p>
            {invoice.dueDate && <p className="text-blue-300 text-xs">Due: {fmtDate(invoice.dueDate)}</p>}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-blue-400 text-xs mb-0.5">Total</p>
            <p className="font-bold text-lg">{invoice.currency} {fmt(invoice.total)}</p>
          </div>
          <div>
            <p className="text-blue-400 text-xs mb-0.5">Paid</p>
            <p className="font-bold text-lg text-green-300">{invoice.currency} {fmt(invoice.amountPaid)}</p>
          </div>
          <div>
            <p className="text-blue-400 text-xs mb-0.5">Balance</p>
            <p className={`font-bold text-lg ${invoice.balance > 0 ? 'text-red-300' : 'text-green-300'}`}>
              {invoice.currency} {fmt(invoice.balance)}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-2 bg-primary-800 rounded-full overflow-hidden">
            <div className="h-2 bg-green-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-blue-300 text-xs mt-1">{pct.toFixed(0)}% paid</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left col */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">Invoice Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Project Name</label>
                <input value={form.projectName} onChange={(e) => set('projectName', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client Name</label>
                <input value={form.clientName} onChange={(e) => set('clientName', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client Phone</label>
                <input value={form.clientPhone} onChange={(e) => set('clientPhone', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client Email <span className="text-blue-500">(required for online payment)</span></label>
                <input value={form.clientEmail} onChange={(e) => set('clientEmail', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client Address</label>
                <input value={form.clientAddress} onChange={(e) => set('clientAddress', e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm">Line Items</h3>
              <button onClick={addItem}
                className="flex items-center gap-1 text-xs text-primary-900 font-medium hover:underline">
                <Plus size={13} /> Add Row
              </button>
            </div>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-2.5">Description</th>
                    <th className="text-right px-3 py-2.5 w-20">Unit</th>
                    <th className="text-right px-3 py-2.5 w-16">Qty</th>
                    <th className="text-right px-3 py-2.5 w-28">Unit Rate</th>
                    <th className="text-right px-3 py-2.5 w-28">Amount</th>
                    <th className="w-8 px-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {form.lineItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2">
                        <input value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-900/30" placeholder="Item description" />
                      </td>
                      <td className="px-3 py-2">
                        <input value={item.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary-900/30" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="0" step="any" value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary-900/30" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="0" step="any" value={item.unitRate}
                          onChange={(e) => updateItem(idx, 'unitRate', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary-900/30" />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-700 tabular-nums">
                        {fmt(item.amount)}
                      </td>
                      <td className="px-2 py-2">
                        <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500"><X size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {form.lineItems.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-6">No items yet — click Add Row to start.</p>
              )}
            </div>

            <div className="sm:hidden divide-y divide-gray-50">
              {form.lineItems.map((item, idx) => (
                <div key={idx} className="p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <input value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      className={inputCls + ' flex-1'} placeholder="Item description" />
                    <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 mt-2"><X size={14} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-gray-400 mb-0.5 block">Unit</label>
                      <input value={item.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-0.5 block">Qty</label>
                      <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-0.5 block">Rate</label>
                      <input type="number" value={item.unitRate} onChange={(e) => updateItem(idx, 'unitRate', e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <p className="text-right text-sm font-semibold text-gray-700">= {form.currency} {fmt(item.amount)}</p>
                </div>
              ))}
              {form.lineItems.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-6">No items — tap Add Row above.</p>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium tabular-nums">{form.currency} {fmt(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span>VAT</span>
                  <input type="number" min="0" max="100" step="0.5"
                    value={form.vatRate}
                    onChange={(e) => set('vatRate', Number(e.target.value))}
                    className="w-14 px-2 py-0.5 border border-gray-200 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary-900/30" />
                  <span className="text-xs text-gray-400">%</span>
                </div>
                <span className="tabular-nums">{form.currency} {fmt(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-800 pt-1 border-t border-gray-200">
                <span>Grand Total</span>
                <span className="tabular-nums">{form.currency} {fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right col */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">Settings</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
                {['draft', 'sent', 'paid', 'partially_paid', 'overdue'].map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
              <input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
              <select value={form.currency} onChange={(e) => set('currency', e.target.value)} className={inputCls}>
                <option value="NGN">NGN (&#8358;)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (&pound;)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)}
                className={inputCls + ' resize-none'} placeholder="Any notes for the client…" />
            </div>
          </div>

          {/* Payments */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 text-sm">Payments</h3>
              {invoice.status !== 'paid' && (
                <button onClick={() => setShowPayment(true)}
                  className="flex items-center gap-1 text-xs text-primary-900 font-medium hover:underline">
                  <Plus size={13} /> Record
                </button>
              )}
            </div>
            <div className="p-5">
              {(invoice.payments || []).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">No payments recorded</p>
              ) : (
                <div className="space-y-3">
                  {invoice.payments.map((p) => (
                    <div key={p._id} className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{invoice.currency} {fmt(p.amount)}</p>
                        <p className="text-xs text-gray-400">{METHOD_LABELS[p.method] || p.method} · {fmtDate(p.paymentDate)}</p>
                        {p.reference && <p className="text-xs text-gray-400">Ref: {p.reference}</p>}
                        {p.note && <p className="text-xs text-gray-400">{p.note}</p>}
                      </div>
                      <button onClick={() => deletePayment(p._id)} className="text-gray-300 hover:text-red-500 shrink-0">
                        <XCircle size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-primary-900 text-white py-3 rounded-xl text-sm font-semibold hover:bg-primary-800 disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          invoiceId={id}
          currency={invoice.currency}
          onClose={() => setShowPayment(false)}
          onSaved={() => { setShowPayment(false); load(); }}
        />
      )}
      {showPaymentLink && (
        <PaymentLinkModal
          invoice={invoice}
          onClose={() => setShowPaymentLink(false)}
        />
      )}
    </div>
  );
}
