import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Download, Save, ArrowLeft, Loader2, Info, Trash2, FileText, ShieldAlert } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

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

function computeTotals(baseTotal, taxPercent, overheadPercent, profitPercent) {
  const base     = Number(baseTotal || 0);
  const overhead = base * (Number(overheadPercent || 0) / 100);
  const profit   = base * (Number(profitPercent   || 0) / 100);
  const subtotal = base + overhead + profit;
  const tax      = subtotal * (Number(taxPercent  || 0) / 100);
  const grandTotal = subtotal + tax;
  return { base, overhead, profit, subtotal, tax, grandTotal };
}

export default function EstimateDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin  = ['admin', 'qs'].includes(user?.role);

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
          taxPercent:       data.estimate.taxPercent      ?? 7.5,
          overheadPercent:  data.estimate.overheadPercent ?? 0,
          profitPercent:    data.estimate.profitPercent   ?? 0,
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
      const res = await api.get(`/estimates/${id}/pdf`, { responseType: 'blob' });
      const blob = res.data;
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
  const baseTotal = r[estimate.selectedTier === 'mid_range' ? 'midRangeEstimate' : `${estimate.selectedTier || estimate.tier}Estimate`]?.total || r.totalCost || 0;
  const totals = computeTotals(baseTotal, form.taxPercent, form.overheadPercent, form.profitPercent);

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

        {isAdmin && (
          <div className="mb-3">
            {r.dataSource === 'manual' ? (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm text-blue-700">
                <ShieldAlert size={15} className="shrink-0 mt-0.5" />
                <span><strong>[Admin only]</strong> Manual base rate override applied (₦{Number(r.baseRate).toLocaleString()}/m²). Change in Company Settings.</span>
              </div>
            ) : r.dataSource === 'fallback' ? (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-700">
                <ShieldAlert size={15} className="shrink-0 mt-0.5" />
                <span><strong>[Admin only]</strong> No historical projects found — industry fallback rate applied. Add past projects to improve accuracy.</span>
              </div>
            ) : (
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm text-green-700">
                <ShieldAlert size={15} className="shrink-0 mt-0.5" />
                <span><strong>[Admin only]</strong> Based on <strong>{r.projectsUsed}</strong> of {r.projectsTotal} historical project{r.projectsTotal !== 1 ? 's' : ''}{r.outliersRemoved > 0 ? ` (${r.outliersRemoved} outlier${r.outliersRemoved !== 1 ? 's' : ''} removed)` : ''}.</span>
              </div>
            )}
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

        {/* Tax, Overhead & Profit */}
        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Pricing Adjustments</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                VAT / Tax %
                <span className="ml-1 text-gray-400 font-normal">(shown to client)</span>
              </label>
              <input
                type="number" min={0} max={100} step="0.1"
                value={form.taxPercent}
                onChange={e => set('taxPercent', e.target.value)}
                className={inputCls}
                placeholder="e.g. 7.5"
              />
            </div>
            {isAdmin && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Overhead %
                    <span className="ml-1 text-orange-500 font-normal">Admin only</span>
                  </label>
                  <input
                    type="number" min={0} max={100} step="0.1"
                    value={form.overheadPercent}
                    onChange={e => set('overheadPercent', e.target.value)}
                    className={inputCls}
                    placeholder="e.g. 15"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Profit Margin %
                    <span className="ml-1 text-orange-500 font-normal">Admin only</span>
                  </label>
                  <input
                    type="number" min={0} max={100} step="0.1"
                    value={form.profitPercent}
                    onChange={e => set('profitPercent', e.target.value)}
                    className={inputCls}
                    placeholder="e.g. 10"
                  />
                </div>
              </>
            )}
          </div>

          {/* Totals breakdown */}
          <div className="mt-4 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-2.5 text-gray-500">Base Estimate</td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-800">₦{fmt(totals.base)}</td>
                </tr>
                {isAdmin && Number(form.overheadPercent) > 0 && (
                  <tr>
                    <td className="px-4 py-2.5 text-gray-500">Overhead ({form.overheadPercent}%) <span className="text-orange-400 text-xs">— admin</span></td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-800">+ ₦{fmt(totals.overhead)}</td>
                  </tr>
                )}
                {isAdmin && Number(form.profitPercent) > 0 && (
                  <tr>
                    <td className="px-4 py-2.5 text-gray-500">Profit ({form.profitPercent}%) <span className="text-orange-400 text-xs">— admin</span></td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-800">+ ₦{fmt(totals.profit)}</td>
                  </tr>
                )}
                {Number(form.taxPercent) > 0 && (
                  <tr>
                    <td className="px-4 py-2.5 text-gray-500">VAT / Tax ({form.taxPercent}%)</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-800">+ ₦{fmt(totals.tax)}</td>
                  </tr>
                )}
                <tr className="bg-primary-900/5">
                  <td className="px-4 py-3 font-bold text-gray-900">Grand Total</td>
                  <td className="px-4 py-3 text-right font-bold text-primary-900 text-base">₦{fmt(totals.grandTotal)}</td>
                </tr>
              </tbody>
            </table>
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
