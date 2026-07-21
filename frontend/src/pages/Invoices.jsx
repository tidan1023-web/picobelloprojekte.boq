import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Eye, Download, Trash2, Loader2,
  CheckCircle, Clock, AlertCircle, XCircle, DollarSign, BadgeCheck,
} from 'lucide-react';
import api from '../services/api';
import ExcelImport from '../components/ExcelImport';
import { useToast } from '../context/ToastContext';
import { runImport, summarize } from '../utils/runImport';

const INV_IMPORT_COLUMNS = [
  { key: 'invoiceNumber', label: 'Invoice #',    type: 'string' },
  { key: 'projectName',   label: 'Project Name', type: 'string' },
  { key: 'clientName',    label: 'Client Name',  type: 'string' },
  { key: 'issueDate',     label: 'Issue Date',   type: 'date'   },
  { key: 'dueDate',       label: 'Due Date',     type: 'date'   },
  { key: 'amount',        label: 'Amount',       type: 'number' },
  { key: 'currency',      label: 'Currency',     type: 'string' },
  { key: 'status',        label: 'Status',       type: 'string' },
  { key: 'notes',         label: 'Notes',        type: 'string' },
];

const STATUS_STYLES = {
  draft:         'bg-gray-100 text-gray-600',
  sent:          'bg-blue-100 text-blue-700',
  paid:          'bg-green-100 text-green-700',
  partially_paid:'bg-yellow-100 text-yellow-700',
  overdue:       'bg-red-100 text-red-700',
};
const STATUS_ICONS = {
  draft:          Clock,
  sent:           AlertCircle,
  paid:           CheckCircle,
  partially_paid: DollarSign,
  overdue:        AlertCircle,
};

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function CreateModal({ onClose, onSaved }) {
  const [estimates, setEstimates] = useState([]);
  const [form, setForm] = useState({
    estimateId: '', projectName: '', clientName: '', dueDate: '', currency: 'NGN',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/estimates').then(({ data }) => setEstimates(data.estimates || []));
  }, []);

  const handleEstimateChange = (e) => {
    const id = e.target.value;
    const est = estimates.find((x) => x._id === id);
    setForm((f) => ({
      ...f,
      estimateId:  id,
      projectName: est?.projectName || f.projectName,
      clientName:  est?.clientName  || f.clientName,
    }));
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/invoices', form);
      onSaved(data.invoice._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create invoice');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">New Invoice</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Link to Estimate (optional)</label>
            <select value={form.estimateId} onChange={handleEstimateChange} className={inputCls}>
              <option value="">— Standalone invoice —</option>
              {estimates.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.estimateNumber} · {e.projectName} · ₦{Number(e.selectedTotal || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}
                </option>
              ))}
            </select>
            {form.estimateId && (
              <p className="text-xs text-blue-600 mt-1">Client info and a line item will be pre-filled from this estimate.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project Name *</label>
            <input required value={form.projectName} onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))} className={inputCls} placeholder="e.g. Garuba Duplex Renovation" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Client Name</label>
            <input value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} className={inputCls} placeholder="Client full name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
              <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} className={inputCls}>
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-primary-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
              {saving ? 'Creating…' : 'Create & Edit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Invoices() {
  const navigate = useNavigate();
  const toast = useToast();
  const [invoices, setInvoices]   = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate]     = useState(false);
  const [loading, setLoading]           = useState(true);
  const [pdfId, setPdfId]               = useState(null);
  const [markingId, setMarkingId]       = useState(null);
  const [importMsg, setImportMsg]       = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/invoices', { params });
      setInvoices(data.invoices || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this invoice? This cannot be undone.')) return;
    try {
      await api.delete(`/invoices/${id}`);
      toast('Invoice deleted', 'info');
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to delete invoice', 'error');
    }
  };

  const handleMarkPaid = async (inv, e) => {
    e.stopPropagation();
    if (!confirm(`Mark ${inv.invoiceNumber} as fully paid?`)) return;
    setMarkingId(inv._id);
    try {
      await api.post(`/invoices/${inv._id}/mark-paid`);
      toast(`${inv.invoiceNumber} marked as paid`);
      load();
    } catch {
      toast('Failed to mark as paid', 'error');
    } finally { setMarkingId(null); }
  };

  const handlePdf = async (inv) => {
    setPdfId(inv._id);
    try {
      const base  = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
      const res   = await fetch(`${base}/api/invoices/${inv._id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('PDF failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `invoice-${inv.invoiceNumber}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast('Failed to generate PDF', 'error');
    } finally { setPdfId(null); }
  };

  const handleImport = async (rows) => {
    const result = await runImport(rows, (row) => api.post('/invoices', row));
    setImportMsg(summarize(result, 'invoice'));
    load();
    setTimeout(() => setImportMsg(''), 8000);
  };

  const TABS = ['', 'draft', 'sent', 'paid', 'partially_paid', 'overdue'];

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
          {TABS.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all ${statusFilter === s ? 'bg-white text-primary-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {importMsg && (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">{importMsg}</span>
          )}
          <ExcelImport
            onImport={handleImport}
            columns={INV_IMPORT_COLUMNS}
            templateName="invoices-template"
          />
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-primary-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-800 shrink-0">
            <Plus size={15} /> New Invoice
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-4 py-3.5 border-b border-gray-50 flex items-center gap-4 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-24" />
              <div className="h-4 bg-gray-100 rounded flex-1" />
              <div className="h-4 bg-gray-100 rounded w-20 hidden sm:block" />
              <div className="h-5 bg-gray-100 rounded-full w-16" />
              <div className="h-4 bg-gray-100 rounded w-24 hidden sm:block" />
            </div>
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <FileText size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">No invoices yet</p>
          <p className="text-sm text-gray-400 mt-1">Create an invoice from an estimate or from scratch.</p>
          <button onClick={() => setShowCreate(true)}
            className="mt-4 bg-primary-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-800">
            Create First Invoice
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-50">
            {invoices.map((inv) => {
              const Icon = STATUS_ICONS[inv.status] || Clock;
              return (
                <div key={inv._id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{inv.projectName}</p>
                      <p className="text-xs text-gray-400 font-mono">{inv.invoiceNumber} · {inv.clientName || '—'}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_STYLES[inv.status]}`}>
                      <Icon size={10} /> {inv.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-800">
                        {inv.currency} {fmt(inv.total)}
                      </p>
                      {inv.balance > 0 && (
                        <p className="text-xs text-red-500">Balance: {inv.currency} {fmt(inv.balance)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/app/invoices/${inv._id}`)}
                        className="p-1.5 text-gray-400 hover:text-primary-900 rounded-lg hover:bg-gray-100"><Eye size={14} /></button>
                      {inv.balance > 0 && (
                        <button onClick={(e) => handleMarkPaid(inv, e)} title="Mark as paid"
                          className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50">
                          {markingId === inv._id ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />}
                        </button>
                      )}
                      <button onClick={() => handlePdf(inv)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                        {pdfId === inv._id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      </button>
                      <button onClick={() => handleDelete(inv._id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Invoice #', 'Project', 'Client', 'Status', 'Total', 'Balance', 'Due', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((inv) => {
                  const Icon = STATUS_ICONS[inv.status] || Clock;
                  return (
                    <tr key={inv._id} onClick={() => navigate(`/app/invoices/${inv._id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-primary-900">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[160px] truncate">{inv.projectName}</td>
                      <td className="px-4 py-3 text-gray-500">{inv.clientName || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status]}`}>
                          <Icon size={10} /> {inv.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{inv.currency} {fmt(inv.total)}</td>
                      <td className={`px-4 py-3 font-medium whitespace-nowrap ${inv.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {inv.currency} {fmt(inv.balance)}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {inv.balance > 0 && (
                            <button onClick={(e) => handleMarkPaid(inv, e)} title="Mark as paid"
                              className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors">
                              {markingId === inv._id ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />}
                            </button>
                          )}
                          <button onClick={() => handlePdf(inv)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors" title="Download PDF">
                            {pdfId === inv._id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                          </button>
                          <button onClick={() => handleDelete(inv._id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
      </p>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onSaved={(id) => { setShowCreate(false); navigate(`/app/invoices/${id}`); }}
        />
      )}
    </div>
  );
}
