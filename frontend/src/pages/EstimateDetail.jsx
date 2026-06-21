import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Download, Save, ArrowLeft, Loader2, Info, Trash2, FileText } from 'lucide-react';
import api from '../services/api';

const CONDITION_LABELS = {
  carcass:          'Carcass',
  advanced_carcass: 'Advanced Carcass',
  semi_finished:    'Semi-Finished',
  finished:         'Finished (Facelift)',
};
const TIER_LABELS = { basic: 'Basic', mid_range: 'Mid-Range', premium: 'Premium' };
const STATUS_OPTIONS = ['draft', 'sent', 'accepted', 'declined'];
const STATUS_COLORS  = {
  draft:    'bg-gray-100 text-gray-700',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
};
const TIER_HIGHLIGHT = {
  basic:     'border-gray-300 bg-gray-50',
  mid_range: 'border-blue-300 bg-blue-50',
  premium:   'border-purple-300 bg-purple-50',
};

function fmt(n) {
  return Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30';

export default function EstimateDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [toast, setToast]       = useState('');
  const [form, setForm]         = useState({});
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  useEffect(() => {
    api.get(`/estimates/${id}`)
      .then(({ data }) => {
        setEstimate(data.estimate);
        setForm({
          projectName:      data.estimate.projectName,
          clientName:       data.estimate.clientName      || '',
          clientPhone:      data.estimate.clientPhone     || '',
          clientEmail:      data.estimate.clientEmail     || '',
          location:         data.estimate.location        || '',
          scopeAssumptions: data.estimate.scopeAssumptions || '',
          exclusions:       data.estimate.exclusions      || '',
          validityDays:     data.estimate.validityDays    || 30,
          status:           data.estimate.status,
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/estimates/${id}`, form);
      setEstimate(data.estimate);
      showToast('Estimate saved');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this estimate permanently?')) return;
    await api.delete(`/estimates/${id}`);
    navigate('/app/estimates');
  };

  const handleCreateInvoice = async () => {
    setCreatingInvoice(true);
    try {
      const { data } = await api.post('/invoices', { estimateId: id });
      navigate(`/app/invoices/${data.invoice._id}`);
    } catch { showToast('Failed to create invoice'); }
    finally { setCreatingInvoice(false); }
  };

  const handlePdf = async () => {
    setPdfLoading(true);
    try {
      await handleSave();
      const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
      const res = await fetch(`${base}/api/estimates/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('PDF failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `estimate-${estimate?.estimateNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { showToast('Failed to generate PDF'); }
    finally { setPdfLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-900" />
    </div>
  );
  if (!estimate) return <p className="text-gray-500">Estimate not found.</p>;

  const r = estimate.engineResult || {};

  return (
    <div className="max-w-3xl space-y-5">
      {toast && (
        <div className="fixed top-5 right-5 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 text-sm">
          <CheckCircle size={16} /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/app/estimates')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-900 transition-colors">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-bold text-gray-800 text-lg truncate">{estimate.projectName}</h1>
            <span className="font-mono text-xs text-gray-400">{estimate.estimateNumber}</span>
          </div>
          <p className="text-xs text-gray-400">{estimate.clientName} · {estimate.sizeM2}m² · {CONDITION_LABELS[estimate.condition]}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleDelete}
            className="flex items-center gap-1.5 border border-red-200 text-red-500 px-3 py-2 rounded-lg text-sm hover:bg-red-50 transition-colors">
            <Trash2 size={14} /> Delete
          </button>
          <button onClick={handleCreateInvoice} disabled={creatingInvoice}
            className="flex items-center gap-1.5 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm hover:bg-blue-50 disabled:opacity-60 transition-colors">
            {creatingInvoice ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {creatingInvoice ? 'Creating…' : 'Create Invoice'}
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

      {/* 3-tier estimate cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(['basic', 'mid_range', 'premium']).map(t => {
          const key  = t === 'mid_range' ? 'midRangeEstimate' : `${t}Estimate`;
          const data = r[key] || {};
          const isSelected = estimate.selectedTier === t;
          return (
            <div key={t} className={`rounded-2xl border-2 p-4 transition-all ${isSelected ? TIER_HIGHLIGHT[t] + ' shadow-md' : 'border-gray-100 bg-white'}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-gray-800">{TIER_LABELS[t]}</p>
                {isSelected && <span className="text-xs bg-primary-900 text-white px-2 py-0.5 rounded-full">Selected</span>}
              </div>
              <p className="text-2xl font-bold text-gray-900">₦{fmt(data.total)}</p>
              <p className="text-xs text-gray-500 mt-1">₦{fmt(data.rate)} / m²</p>
            </div>
          );
        })}
      </div>

      {/* Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info size={16} className="text-primary-900" />
          <h2 className="font-semibold text-gray-800">How This Was Calculated</h2>
        </div>

        <div className="space-y-2">
          {r.dataSource === 'fallback' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-700">
              No historical projects found — industry fallback rate applied. Add past projects to improve accuracy.
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm text-green-700">
              Based on <strong>{r.projectsUsed}</strong> of {r.projectsTotal} historical project{r.projectsTotal !== 1 ? 's' : ''}{r.outliersRemoved > 0 ? ` (${r.outliersRemoved} outlier${r.outliersRemoved !== 1 ? 's' : ''} removed)` : ''}.
            </div>
          )}

          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {[
                ['Base rate (carcass, basic, 150m², today)', `₦${fmt(r.baseRate)} /m²`],
                [`Condition: ${CONDITION_LABELS[estimate.condition]}`, `× ${(r.conditionMultiplier || 0).toFixed(2)}`],
                [`Tier: ${TIER_LABELS[estimate.selectedTier || estimate.tier]}`, `× ${(r.tierMultiplier || 0).toFixed(2)}`],
                [`Size adjustment (${estimate.sizeM2}m² vs 150m²)`, `× ${(r.sizeMultiplier || 0).toFixed(3)}`],
                ['Final rate per m²', `₦${fmt(r.finalRate)} /m²`],
                ['Estimated total', `₦${fmt(r.totalCost)}`],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td className="py-2 text-gray-500">{label}</td>
                  <td className="py-2 font-semibold text-gray-800 text-right">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review / edit fields */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Review Before Sending</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Project Name</label>
            <input value={form.projectName} onChange={e => set('projectName', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Client Name</label>
            <input value={form.clientName} onChange={e => set('clientName', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Client Phone</label>
            <input value={form.clientPhone} onChange={e => set('clientPhone', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Client Email</label>
            <input value={form.clientEmail} onChange={e => set('clientEmail', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Location</label>
            <input value={form.location} onChange={e => set('location', e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Scope Assumptions</label>
            <textarea rows={2} value={form.scopeAssumptions} onChange={e => set('scopeAssumptions', e.target.value)}
              className={inputCls + ' resize-none'} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Exclusions</label>
            <textarea rows={2} value={form.exclusions} onChange={e => set('exclusions', e.target.value)}
              className={inputCls + ' resize-none'} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Validity (days)</label>
            <input type="number" value={form.validityDays} onChange={e => set('validityDays', Number(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
          </button>
          <button onClick={handlePdf} disabled={pdfLoading}
            className="flex items-center gap-2 bg-primary-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-800 disabled:opacity-60">
            {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {pdfLoading ? 'Generating…' : 'Save & Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
