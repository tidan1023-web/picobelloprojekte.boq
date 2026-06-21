import React, { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Database, Paperclip, ExternalLink, Loader2 } from 'lucide-react';
import api from '../services/api';

const CONDITIONS = [
  { id: 'carcass',          label: 'Carcass' },
  { id: 'advanced_carcass', label: 'Advanced Carcass' },
  { id: 'semi_finished',    label: 'Semi-Finished' },
  { id: 'finished',         label: 'Finished' },
];
const TIERS = [
  { id: 'basic',     label: 'Basic' },
  { id: 'mid_range', label: 'Mid-Range' },
  { id: 'premium',   label: 'Premium' },
];
const CONDITION_COLORS = {
  carcass:          'bg-stone-100 text-stone-700',
  advanced_carcass: 'bg-blue-100 text-blue-700',
  semi_finished:    'bg-yellow-100 text-yellow-700',
  finished:         'bg-green-100 text-green-700',
};
const TIER_COLORS = {
  basic:     'bg-gray-100 text-gray-700',
  mid_range: 'bg-blue-100 text-blue-700',
  premium:   'bg-purple-100 text-purple-700',
};

const EMPTY = {
  name: '', client: '', location: '', sizeM2: '',
  condition: 'carcass', tier: 'mid_range',
  totalCost: '', currency: 'NGN', completedYear: new Date().getFullYear(),
  includesFurniture: false, includesKitchen: false, includesWardrobes: false,
  notes: '',
};

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30';

function ProjectModal({ open, onClose, onSaved, editing }) {
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [docFile, setDocFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    setForm(editing ? { ...EMPTY, ...editing } : EMPTY);
    setDocFile(null);
  }, [editing, open]);

  if (!open) return null;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, sizeM2: Number(form.sizeM2), totalCost: Number(form.totalCost) };
      let savedProject;
      if (editing) {
        const { data } = await api.put(`/historical-projects/${editing._id}`, payload);
        savedProject = data.project;
      } else {
        const { data } = await api.post('/historical-projects', payload);
        savedProject = data.project;
      }

      // Upload document if selected
      if (docFile && savedProject?._id) {
        setUploading(true);
        try {
          const fd = new FormData();
          fd.append('file', docFile);
          await api.post(`/historical-projects/${savedProject._id}/document`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch {
          // doc upload failed but project was saved — proceed
        } finally { setUploading(false); }
      }

      onSaved();
    } finally { setSaving(false); }
  };

  const busy = saving || uploading;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-bold text-gray-800">{editing ? 'Edit Project' : 'Add Historical Project'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Project Name *</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="e.g. Garuba Duplex, Maitama" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Client</label>
              <input value={form.client} onChange={e => set('client', e.target.value)} className={inputCls} placeholder="Client name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} className={inputCls} placeholder="e.g. Asokoro, Abuja" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Size (m²) *</label>
              <input required type="number" min="1" value={form.sizeM2} onChange={e => set('sizeM2', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Year Completed *</label>
              <input required type="number" min="2000" max={new Date().getFullYear()} value={form.completedYear}
                onChange={e => set('completedYear', Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Total Final Cost (₦) *</label>
              <input required type="number" min="0" value={form.totalCost} onChange={e => set('totalCost', e.target.value)} className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inputCls}>
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Starting Condition *</label>
              <select required value={form.condition} onChange={e => set('condition', e.target.value)} className={inputCls}>
                {CONDITIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Finish Tier *</label>
              <select required value={form.tier} onChange={e => set('tier', e.target.value)} className={inputCls}>
                {TIERS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Included in Scope</p>
            <div className="flex gap-3 flex-wrap">
              {[['includesFurniture','Furniture'],['includesKitchen','Kitchen'],['includesWardrobes','Wardrobes']].map(([k,l]) => (
                <label key={k} className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
                  <input type="checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)} className="rounded" />
                  {l}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
              className={inputCls + ' resize-none'} placeholder="Any special circumstances or context…" />
          </div>

          {/* Document upload */}
          <div className="border border-dashed border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-700 mb-2">Reference Document (optional)</p>
            {editing?.documentUrl && !docFile && (
              <div className="flex items-center gap-2 mb-2 text-xs text-blue-600">
                <Paperclip size={13} />
                <a href={editing.documentUrl} target="_blank" rel="noreferrer"
                  className="hover:underline truncate max-w-[220px]">
                  {editing.documentName || 'Attached document'}
                </a>
                <ExternalLink size={11} />
              </div>
            )}
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-50">
                <Paperclip size={13} />
                {docFile ? 'Change file' : (editing?.documentUrl ? 'Replace document' : 'Attach file')}
              </button>
              {docFile && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
                  <span className="truncate max-w-[180px]">{docFile.name}</span>
                  <button type="button" onClick={() => setDocFile(null)} className="text-gray-400 hover:text-red-500 shrink-0">×</button>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
              onChange={(e) => setDocFile(e.target.files[0] || null)} />
            <p className="text-xs text-gray-400 mt-1.5">PDF, JPG, PNG up to 5 MB. Attach the original estimate or invoice for this project.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="flex-1 bg-primary-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-60 flex items-center justify-center gap-2">
              {busy && <Loader2 size={14} className="animate-spin" />}
              {uploading ? 'Uploading…' : saving ? 'Saving…' : editing ? 'Update Project' : 'Add Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HistoricalProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/historical-projects')
      .then(({ data }) => setProjects(data.projects || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id) => {
    if (!confirm('Remove this project from the database?')) return;
    await api.delete(`/historical-projects/${id}`);
    load();
  };

  const openAdd  = ()  => { setEditing(null); setModal(true); };
  const openEdit = (p) => { setEditing(p);    setModal(true); };

  const avgRate = projects.length
    ? projects.reduce((s, p) => s + (p.totalCost / p.sizeM2), 0) / projects.length
    : 0;
  const years = projects.map(p => p.completedYear);

  function fmt(n) {
    return Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <ProjectModal open={modal} onClose={() => setModal(false)}
        onSaved={() => { setModal(false); load(); }} editing={editing} />

      {/* Stats strip */}
      {projects.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Projects in database', value: projects.length },
            { label: 'Avg rate / m²', value: `₦${fmt(avgRate)}` },
            { label: 'Oldest year', value: Math.min(...years) },
            { label: 'Latest year', value: Math.max(...years) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xl font-bold text-gray-800">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-gray-800">Historical Projects</h2>
          <p className="text-xs text-gray-400 mt-0.5">Your completed project database — the engine's training data.</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-primary-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-800 shrink-0">
          <Plus size={15} /> Add Project
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-900" />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <Database size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">No projects yet</p>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
            Add your completed projects here. Each project improves the accuracy of future estimates.
          </p>
          <button onClick={openAdd}
            className="mt-4 bg-primary-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-800">
            Add Your First Project
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-50">
            {projects.map(p => (
              <div key={p._id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.location || p.client || '—'} · {p.completedYear}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-primary-900 rounded-lg hover:bg-gray-100">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(p._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${CONDITION_COLORS[p.condition]}`}>
                    {CONDITIONS.find(c => c.id === p.condition)?.label}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${TIER_COLORS[p.tier]}`}>
                    {TIERS.find(t => t.id === p.tier)?.label}
                  </span>
                  <span className="text-xs text-gray-500 font-semibold ml-auto">₦{fmt(p.totalCost)}</span>
                  <span className="text-xs text-gray-400">{p.sizeM2}m² · ₦{fmt(p.totalCost / p.sizeM2)}/m²</span>
                </div>
                {p.documentUrl && (
                  <a href={p.documentUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 mt-2 text-xs text-blue-500 hover:underline">
                    <Paperclip size={11} /> {p.documentName || 'Reference document'}
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Project', 'Location', 'Year', 'Size', 'Condition', 'Tier', 'Total Cost', 'Rate/m²', 'Doc', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {projects.map(p => (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{p.name}</p>
                      {p.client && <p className="text-xs text-gray-400">{p.client}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.location || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{p.completedYear}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.sizeM2}m²</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${CONDITION_COLORS[p.condition]}`}>
                        {CONDITIONS.find(c => c.id === p.condition)?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${TIER_COLORS[p.tier]}`}>
                        {TIERS.find(t => t.id === p.tier)?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">₦{fmt(p.totalCost)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">₦{fmt(p.totalCost / p.sizeM2)}</td>
                    <td className="px-4 py-3">
                      {p.documentUrl ? (
                        <a href={p.documentUrl} target="_blank" rel="noreferrer" title={p.documentName || 'Document'}
                          className="text-blue-400 hover:text-blue-600 transition-colors">
                          <Paperclip size={14} />
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-primary-900 rounded-lg hover:bg-gray-100 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(p._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          {projects.length} project{projects.length !== 1 ? 's' : ''} · {projects.length < 5 && 'Add more projects for better estimate accuracy'}
        </p>
      )}
    </div>
  );
}
