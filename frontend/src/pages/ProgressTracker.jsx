import React, { useEffect, useState, useCallback } from 'react';
import {
  Camera, Plus, Trash2, AlertTriangle, CheckCircle, TrendingUp,
  Calendar, DollarSign, Image,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const PHASES = ['foundation', 'structure', 'mep', 'finishing', 'external', 'other'];
const PHASE_COLORS = {
  foundation: 'bg-amber-100 text-amber-700',
  structure: 'bg-blue-100 text-blue-700',
  mep: 'bg-purple-100 text-purple-700',
  finishing: 'bg-green-100 text-green-700',
  external: 'bg-teal-100 text-teal-700',
  other: 'bg-gray-100 text-gray-600',
};

function fmt(n) {
  return Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function BudgetAlerts({ alerts }) {
  const flagged = alerts.filter((a) => a.nearBudget || a.overBudget);
  if (flagged.length === 0) return null;

  return (
    <div className="space-y-2">
      {flagged.map((a) => (
        <div key={a.project._id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${a.overBudget ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <AlertTriangle size={16} className={a.overBudget ? 'text-red-500 shrink-0' : 'text-yellow-500 shrink-0'} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${a.overBudget ? 'text-red-700' : 'text-yellow-700'}`}>
              {a.overBudget ? 'Over Budget' : 'Near Budget Limit'}: {a.project.name}
            </p>
            <p className="text-xs text-gray-500">
              Projected {a.project.currency} {fmt(a.projectedCost)} vs Budget {fmt(a.project.budget)}
              {' '}({(a.projectedRatio * 100).toFixed(0)}%)
            </p>
          </div>
          <div className="w-24 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${a.overBudget ? 'bg-red-500' : 'bg-yellow-500'}`}
              style={{ width: `${Math.min(100, a.projectedRatio * 100).toFixed(0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function UpdateModal({ projects, editData, onClose, onSaved }) {
  const [form, setForm] = useState(
    editData || { projectId: '', phase: 'foundation', title: '', notes: '', date: new Date().toISOString().split('T')[0], completionPercent: 0, actualCost: 0 }
  );
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v); });
      files.forEach((f) => fd.append('images', f));

      if (editData?._id) {
        await api.put(`/progress/${editData._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/progress', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-800">{editData ? 'Edit Update' : 'Add Progress Update'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Project *</label>
              <select name="projectId" value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))} required className={inputCls}>
                <option value="">Select…</option>
                {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phase *</label>
              <select value={form.phase} onChange={(e) => setForm((f) => ({ ...f, phase: e.target.value }))} className={inputCls}>
                {PHASES.map((ph) => <option key={ph} value={ph} className="capitalize">{ph.charAt(0).toUpperCase() + ph.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} className={inputCls} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Completion %</label>
              <input type="number" min={0} max={100} value={form.completionPercent} onChange={(e) => setForm((f) => ({ ...f, completionPercent: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Actual Cost</label>
              <input type="number" min={0} step="0.01" value={form.actualCost} onChange={(e) => setForm((f) => ({ ...f, actualCost: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Photos (max 10)</label>
            <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-primary-300 transition-colors">
              <Camera size={18} className="text-gray-400" />
              <span className="text-sm text-gray-500">{files.length > 0 ? `${files.length} file(s) selected` : 'Click to select images'}</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-primary-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProgressTracker() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selProjectId, setSelProjectId] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [updates, setUpdates] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [loading, setLoading] = useState(false);
  const canManage = ['admin', 'qs', 'project_manager'].includes(user?.role);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  useEffect(() => {
    api.get('/projects').then(({ data }) => setProjects(data.projects || []));
    api.get('/progress/budget-alerts').then(({ data }) => setAlerts(data.alerts || [])).catch(() => {});
  }, []);

  const loadUpdates = useCallback(async () => {
    if (!selProjectId) { setUpdates([]); return; }
    setLoading(true);
    try {
      const params = { projectId: selProjectId };
      if (phaseFilter) params.phase = phaseFilter;
      const { data } = await api.get('/progress', { params });
      setUpdates(data.updates || []);
    } finally {
      setLoading(false);
    }
  }, [selProjectId, phaseFilter]);

  useEffect(() => { loadUpdates(); }, [loadUpdates]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this update?')) return;
    await api.delete(`/progress/${id}`);
    loadUpdates();
  };

  const totalActual = updates.reduce((s, u) => s + (u.actualCost || 0), 0);
  const latestCompletion = updates.length > 0 ? updates[0].completionPercent : 0;

  return (
    <div className="space-y-5">
      {/* Budget Alerts banner */}
      <BudgetAlerts alerts={alerts} />

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <select value={selProjectId} onChange={(e) => setSelProjectId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-900/30">
            <option value="">All Projects</option>
            {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <select value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-900/30">
            <option value="">All Phases</option>
            {PHASES.map((ph) => <option key={ph} value={ph} className="capitalize">{ph.charAt(0).toUpperCase() + ph.slice(1)}</option>)}
          </select>
        </div>
        {canManage && (
          <button onClick={() => { setEditData(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-primary-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-800">
            <Plus size={16} /> Add Update
          </button>
        )}
      </div>

      {/* Stats strip */}
      {selProjectId && updates.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={15} className="text-green-500" />
              <p className="text-xs text-gray-500">Latest Completion</p>
            </div>
            <p className="text-xl font-bold text-gray-800">{latestCompletion}%</p>
            <div className="mt-2 h-2 bg-gray-100 rounded-full"><div className="h-2 bg-green-500 rounded-full" style={{ width: `${latestCompletion}%` }} /></div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={15} className="text-blue-500" />
              <p className="text-xs text-gray-500">Total Actual Spend</p>
            </div>
            <p className="text-xl font-bold text-gray-800">₦{fmt(totalActual)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={15} className="text-purple-500" />
              <p className="text-xs text-gray-500">Updates</p>
            </div>
            <p className="text-xl font-bold text-gray-800">{updates.length}</p>
          </div>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading updates…</div>
      ) : updates.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Camera size={40} className="mx-auto mb-3 opacity-20" />
          <p>{selProjectId ? 'No updates yet for this project.' : 'Select a project to view progress.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((u) => (
            <div key={u._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0 mt-0.5 ${PHASE_COLORS[u.phase]}`}>
                      {u.phase}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-800">{u.title}</p>
                      {u.notes && <p className="text-sm text-gray-500 mt-1 leading-relaxed">{u.notes}</p>}
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(u.date).toLocaleDateString('en-GB')}</span>
                        {u.actualCost > 0 && <span className="flex items-center gap-1 text-blue-600 font-medium"><DollarSign size={11} /> ₦{fmt(u.actualCost)}</span>}
                        {u.completionPercent > 0 && (
                          <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircle size={11} /> {u.completionPercent}% complete</span>
                        )}
                        <span>by {u.createdBy?.name}</span>
                      </div>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => { setEditData(u); setShowModal(true); }}
                        className="p-1.5 text-gray-400 hover:text-primary-900 rounded-lg hover:bg-primary-50 text-xs">Edit</button>
                      <button onClick={() => handleDelete(u._id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {/* Image gallery */}
              {u.images && u.images.length > 0 && (
                <div className="px-5 pb-5">
                  <div className="flex gap-2 flex-wrap">
                    {u.images.map((img, i) => (
                      <button key={i} onClick={() => setLightboxSrc(img)}
                        className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-100 hover:opacity-90 transition-opacity group">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Image size={16} className="text-white" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="" className="max-w-full max-h-full rounded-xl shadow-2xl" />
        </div>
      )}

      {showModal && (
        <UpdateModal
          projects={projects}
          editData={editData}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadUpdates(); api.get('/progress/budget-alerts').then(({ data }) => setAlerts(data.alerts || [])).catch(() => {}); }}
        />
      )}
    </div>
  );
}
