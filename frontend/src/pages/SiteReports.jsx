import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, X, Pencil, Trash2, Search, FileText, Printer, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, Clock, Camera, MapPin, Users, CloudSun, Tag, UserCheck,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const TEMPLATES = {
  daily:      { label: 'Daily Site Report',       color: 'bg-blue-50 text-blue-700 border-blue-200' },
  weekly:     { label: 'Weekly Progress Report',  color: 'bg-purple-50 text-purple-700 border-purple-200' },
  incident:   { label: 'Incident Report',         color: 'bg-red-50 text-red-700 border-red-200' },
  snag:       { label: 'Snag / Punch List',       color: 'bg-orange-50 text-orange-700 border-orange-200' },
  delivery:   { label: 'Material Delivery',       color: 'bg-green-50 text-green-700 border-green-200' },
  inspection: { label: 'Site Inspection',         color: 'bg-gray-50 text-gray-700 border-gray-200' },
};

const STATUS_STYLES = {
  draft:     'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  reviewed:  'bg-yellow-100 text-yellow-700',
  approved:  'bg-green-100 text-green-700',
};

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900 bg-white';
const textareaCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900 resize-none';

const EMPTY_REPORT = {
  template: 'daily', title: '', reportDate: new Date().toISOString().slice(0, 10),
  reportTag: '', siteManagerName: '', assignedTo: '',
  weatherCondition: '', temperature: '',
  siteLocation: '', zone: '', level: '', room: '',
  description: '', workCarriedOut: '', materialsUsed: '',
  workersOnSite: '', visitorsOnSite: '',
  problems: [], actionsRequired: [], images: [], status: 'draft', projectId: '',
};

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
        <span className="flex items-center gap-2 font-medium text-gray-700 text-sm">
          {Icon && <Icon size={15} className="text-primary-900" />} {title}
        </span>
        {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function ReportModal({ open, onClose, onSaved, editing, projects, teamMembers }) {
  const [form, setForm] = useState(EMPTY_REPORT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(editing ? {
      ...EMPTY_REPORT, ...editing,
      projectId: editing.projectId?._id || editing.projectId || '',
      reportDate: editing.reportDate ? new Date(editing.reportDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      assignedTo: editing.assignedTo?._id || editing.assignedTo || '',
      problems: editing.problems || [],
      actionsRequired: editing.actionsRequired || [],
      images: editing.images || [],
    } : { ...EMPTY_REPORT, reportDate: new Date().toISOString().slice(0, 10) });
    setError('');
  }, [open, editing]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addProblem = () => setForm((f) => ({ ...f, problems: [...f.problems, { description: '', severity: 'medium', status: 'open', resolution: '' }] }));
  const updateProblem = (i, k, v) => setForm((f) => ({ ...f, problems: f.problems.map((p, idx) => idx === i ? { ...p, [k]: v } : p) }));
  const removeProblem = (i) => setForm((f) => ({ ...f, problems: f.problems.filter((_, idx) => idx !== i) }));

  const addAction = () => setForm((f) => ({ ...f, actionsRequired: [...f.actionsRequired, { description: '', assignedTo: '', dueDate: '', status: 'open' }] }));
  const updateAction = (i, k, v) => setForm((f) => ({ ...f, actionsRequired: f.actionsRequired.map((a, idx) => idx === i ? { ...a, [k]: v } : a) }));
  const removeAction = (i) => setForm((f) => ({ ...f, actionsRequired: f.actionsRequired.filter((_, idx) => idx !== i) }));

  const handleImageAdd = () => {
    const url = prompt('Enter image URL:');
    if (url) setForm((f) => ({ ...f, images: [...f.images, { url, caption: '' }] }));
  };
  const updateCaption = (i, v) => setForm((f) => ({ ...f, images: f.images.map((img, idx) => idx === i ? { ...img, caption: v } : img) }));
  const removeImage = (i) => setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      editing ? await api.put(`/site-reports/${editing._id}`, form) : await api.post('/site-reports', form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save');
    } finally { setSaving(false); }
  };

  if (!open) return null;

  const tpl = TEMPLATES[form.template];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-semibold text-gray-800">{editing ? 'Edit Report' : 'New Site Report'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          {/* Core fields */}
          <Section title="Report Details" icon={FileText}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                <input required value={form.title} onChange={set('title')} className={inputCls} placeholder={`e.g. ${tpl?.label} - ${new Date().toLocaleDateString()}`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"><Tag size={11} /> Report Tag (auto)</label>
                <input value={form.reportTag} onChange={set('reportTag')} className={inputCls} placeholder="e.g. SR-001 (auto-assigned if blank)" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Report Date</label>
                <input type="date" value={form.reportDate} onChange={set('reportDate')} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Project (optional)</label>
                <select value={form.projectId} onChange={set('projectId')} className={inputCls}>
                  <option value="">— No project —</option>
                  {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={set('status')} className={inputCls}>
                  {['draft', 'submitted', 'reviewed', 'approved'].map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"><UserCheck size={11} /> Site Manager</label>
                <input value={form.siteManagerName} onChange={set('siteManagerName')} className={inputCls} placeholder="e.g. Emeka Okafor" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1"><Users size={11} /> Assigned To</label>
                {teamMembers.length > 0 ? (
                  <select value={form.assignedTo} onChange={set('assignedTo')} className={inputCls}>
                    <option value="">— Unassigned —</option>
                    {teamMembers.map((m) => <option key={m._id} value={m._id}>{m.name} ({m.role})</option>)}
                  </select>
                ) : (
                  <input value={form.assignedTo} onChange={set('assignedTo')} className={inputCls} placeholder="Name or email" />
                )}
              </div>
            </div>
          </Section>

          {/* Template picker */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Template *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(TEMPLATES).map(([key, { label, color }]) => (
                <button key={key} type="button"
                  onClick={() => setForm((f) => ({ ...f, template: key }))}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium text-left transition-all ${form.template === key ? color + ' ring-2 ring-offset-1 ring-primary-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Location within site */}
          <Section title="Site Location" icon={MapPin} defaultOpen={true}>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Site / Building</label>
                <input value={form.siteLocation} onChange={set('siteLocation')} className={inputCls} placeholder="e.g. Block A, Main Building" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Zone / Wing</label>
                <input value={form.zone} onChange={set('zone')} className={inputCls} placeholder="e.g. North Wing" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Level / Floor</label>
                <input value={form.level} onChange={set('level')} className={inputCls} placeholder="e.g. Ground Floor, Level 2" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Room / Area</label>
                <input value={form.room} onChange={set('room')} className={inputCls} placeholder="e.g. Kitchen, Master Bedroom, Lobby" />
              </div>
            </div>
          </Section>

          {/* Weather & Workers */}
          <Section title="Site Conditions" icon={CloudSun} defaultOpen={false}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Weather</label>
                <input value={form.weatherCondition} onChange={set('weatherCondition')} className={inputCls} placeholder="e.g. Sunny, Rainy" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Temperature</label>
                <input value={form.temperature} onChange={set('temperature')} className={inputCls} placeholder="e.g. 28°C" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Workers on Site</label>
                <input type="number" min="0" value={form.workersOnSite} onChange={set('workersOnSite')} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Visitors</label>
                <input type="number" min="0" value={form.visitorsOnSite} onChange={set('visitorsOnSite')} className={inputCls} />
              </div>
            </div>
          </Section>

          {/* Work description */}
          <Section title="Description" icon={FileText}>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Overview / Description</label>
                <textarea value={form.description} onChange={set('description')} rows={3} className={textareaCls} placeholder="Overall description of today's activities…" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Work Carried Out</label>
                <textarea value={form.workCarriedOut} onChange={set('workCarriedOut')} rows={3} className={textareaCls} placeholder="Detailed work completed…" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Materials Used / Delivered</label>
                <textarea value={form.materialsUsed} onChange={set('materialsUsed')} rows={2} className={textareaCls} placeholder="Materials consumed or delivered today…" />
              </div>
            </div>
          </Section>

          {/* Problem Log */}
          <Section title="Problem Log" icon={AlertTriangle} defaultOpen={false}>
            <div className="space-y-3">
              {form.problems.map((p, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50">
                  <div className="flex items-start gap-2">
                    <textarea value={p.description} onChange={(e) => updateProblem(i, 'description', e.target.value)}
                      rows={2} className={textareaCls + ' flex-1'} placeholder="Describe the problem…" />
                    <button type="button" onClick={() => removeProblem(i)} className="text-gray-400 hover:text-red-500 mt-1"><X size={14} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Severity</label>
                      <select value={p.severity} onChange={(e) => updateProblem(i, 'severity', e.target.value)} className={inputCls}>
                        {['low', 'medium', 'high', 'critical'].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Status</label>
                      <select value={p.status} onChange={(e) => updateProblem(i, 'status', e.target.value)} className={inputCls}>
                        <option value="open">Open</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </div>
                  {p.status === 'resolved' && (
                    <input value={p.resolution} onChange={(e) => updateProblem(i, 'resolution', e.target.value)}
                      className={inputCls} placeholder="Resolution details…" />
                  )}
                </div>
              ))}
              <button type="button" onClick={addProblem}
                className="flex items-center gap-1.5 text-sm text-primary-900 hover:underline">
                <Plus size={14} /> Add Problem
              </button>
            </div>
          </Section>

          {/* Actions Required */}
          <Section title="Actions Required" icon={CheckCircle} defaultOpen={false}>
            <div className="space-y-3">
              {form.actionsRequired.map((a, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50">
                  <div className="flex items-start gap-2">
                    <input value={a.description} onChange={(e) => updateAction(i, 'description', e.target.value)}
                      className={inputCls + ' flex-1'} placeholder="Action description…" />
                    <button type="button" onClick={() => removeAction(i)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Assigned To</label>
                      <input value={a.assignedTo} onChange={(e) => updateAction(i, 'assignedTo', e.target.value)} className={inputCls} placeholder="Name" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
                      <input type="date" value={a.dueDate ? a.dueDate.slice(0, 10) : ''} onChange={(e) => updateAction(i, 'dueDate', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Status</label>
                      <select value={a.status} onChange={(e) => updateAction(i, 'status', e.target.value)} className={inputCls}>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addAction}
                className="flex items-center gap-1.5 text-sm text-primary-900 hover:underline">
                <Plus size={14} /> Add Action
              </button>
            </div>
          </Section>

          {/* Images */}
          <Section title="Photos" icon={Camera} defaultOpen={false}>
            <div className="space-y-3">
              {form.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img.url} alt={img.caption || 'site photo'} className="w-full h-28 object-cover rounded-lg border border-gray-100" onError={(e) => { e.target.src = ''; e.target.alt = 'Image not found'; }} />
                      <button type="button" onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={10} />
                      </button>
                      <input value={img.caption} onChange={(e) => updateCaption(i, e.target.value)}
                        className="w-full mt-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none" placeholder="Caption…" />
                    </div>
                  ))}
                </div>
              )}
              <button type="button" onClick={handleImageAdd}
                className="flex items-center gap-2 border border-dashed border-gray-300 text-gray-500 px-4 py-3 rounded-xl hover:border-primary-900 hover:text-primary-900 text-sm w-full justify-center transition-colors">
                <Camera size={16} /> Add Photo URL
              </button>
            </div>
          </Section>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-primary-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PrintableReport({ report }) {
  if (!report) return null;
  const tpl = TEMPLATES[report.template];
  return (
    <div className="hidden print:block p-8 font-sans text-sm">
      <div className="flex justify-between items-start mb-6 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tpl?.label ?? 'Site Report'}</h1>
          <p className="text-gray-600 mt-1">{report.title}</p>
        </div>
        <div className="text-right text-gray-500 text-xs">
          <p>Tag: {report.reportTag || '—'}</p>
          <p>Date: {new Date(report.reportDate).toLocaleDateString()}</p>
          <p>Status: {report.status}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div><strong>Project:</strong> {report.projectId?.name}</div>
        <div><strong>Prepared by:</strong> {report.preparedBy?.name}</div>
        <div><strong>Site Manager:</strong> {report.siteManagerName || '—'}</div>
        <div><strong>Assigned To:</strong> {report.assignedTo?.name || report.assignedTo || '—'}</div>
        <div><strong>Location:</strong> {[report.siteLocation, report.zone, report.level, report.room].filter(Boolean).join(' › ')}</div>
        <div><strong>Weather:</strong> {report.weatherCondition} {report.temperature}</div>
        <div><strong>Workers on site:</strong> {report.workersOnSite ?? '—'}</div>
        <div><strong>Visitors:</strong> {report.visitorsOnSite ?? '—'}</div>
      </div>
      {report.description && <div className="mb-4"><strong>Description:</strong><p className="mt-1 text-gray-700">{report.description}</p></div>}
      {report.workCarriedOut && <div className="mb-4"><strong>Work Carried Out:</strong><p className="mt-1 text-gray-700">{report.workCarriedOut}</p></div>}
      {report.materialsUsed && <div className="mb-4"><strong>Materials Used/Delivered:</strong><p className="mt-1 text-gray-700">{report.materialsUsed}</p></div>}
      {report.problems?.length > 0 && (
        <div className="mb-4">
          <strong>Problem Log:</strong>
          <table className="w-full mt-2 text-xs border border-gray-200">
            <thead className="bg-gray-50"><tr><th className="p-2 text-left border-b">Description</th><th className="p-2 border-b">Severity</th><th className="p-2 border-b">Status</th></tr></thead>
            <tbody>{report.problems.map((p, i) => <tr key={i} className="border-b"><td className="p-2">{p.description}</td><td className="p-2 text-center">{p.severity}</td><td className="p-2 text-center">{p.status}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {report.actionsRequired?.length > 0 && (
        <div className="mb-4">
          <strong>Actions Required:</strong>
          <table className="w-full mt-2 text-xs border border-gray-200">
            <thead className="bg-gray-50"><tr><th className="p-2 text-left border-b">Action</th><th className="p-2 border-b">Assigned To</th><th className="p-2 border-b">Due</th><th className="p-2 border-b">Status</th></tr></thead>
            <tbody>{report.actionsRequired.map((a, i) => <tr key={i} className="border-b"><td className="p-2">{a.description}</td><td className="p-2">{a.assignedTo}</td><td className="p-2">{a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}</td><td className="p-2">{a.status}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {report.images?.length > 0 && (
        <div>
          <strong>Photos:</strong>
          <div className="grid grid-cols-3 gap-3 mt-2">
            {report.images.map((img, i) => <div key={i}><img src={img.url} alt={img.caption} className="w-full h-32 object-cover rounded border" />{img.caption && <p className="text-xs text-center mt-1 text-gray-500">{img.caption}</p>}</div>)}
          </div>
        </div>
      )}
      <div className="mt-12 grid grid-cols-2 gap-8">
        <div className="border-t border-gray-300 pt-2 text-center text-xs text-gray-400">Prepared by</div>
        <div className="border-t border-gray-300 pt-2 text-center text-xs text-gray-400">Approved by</div>
      </div>
    </div>
  );
}

export default function SiteReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [printing, setPrinting] = useState(null);
  const [search, setSearch] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  const canEdit = ['admin', 'qs', 'project_manager'].includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (projectFilter) params.projectId = projectFilter;
      if (templateFilter) params.template = templateFilter;
      const [repRes, projRes] = await Promise.all([
        api.get('/site-reports', { params }),
        api.get('/projects'),
      ]);
      setReports(repRes.data.reports || []);
      setProjects(projRes.data.projects || []);
      // Fetch team members for assign dropdown
      api.get('/auth/team').then(({ data }) => setTeamMembers(data.members || [])).catch(() => {});
    } finally { setLoading(false); }
  }, [projectFilter, templateFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this report?')) return;
    await api.delete(`/site-reports/${id}`);
    load();
  };

  const handlePrint = (report) => {
    setPrinting(report);
    setTimeout(() => { window.print(); setPrinting(null); }, 200);
  };

  const filtered = reports.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.title.toLowerCase().includes(q)
      || (r.projectId?.name ?? '').toLowerCase().includes(q)
      || (r.reportTag ?? '').toLowerCase().includes(q)
      || (r.siteManagerName ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <PrintableReport report={printing} />

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap print:hidden">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search reports, tags, managers…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900" />
        </div>
        <select value={templateFilter} onChange={(e) => setTemplateFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-900">
          <option value="">All templates</option>
          {Object.entries(TEMPLATES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-900">
          <option value="">All projects</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        {canEdit && (
          <button onClick={() => { setEditing(null); setModal(true); }}
            className="flex items-center gap-2 bg-primary-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 shrink-0">
            <Plus size={16} /> New Report
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-900" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <FileText size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500 text-sm">{reports.length === 0 ? 'No site reports yet.' : 'No reports match your filters.'}</p>
          {canEdit && <button onClick={() => { setEditing(null); setModal(true); }} className="mt-3 text-primary-900 text-sm font-medium hover:underline">Create your first report</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const tpl = TEMPLATES[r.template] ?? TEMPLATES.daily;
            const location = [r.siteLocation, r.zone, r.level, r.room].filter(Boolean).join(' › ');
            const openProblems = (r.problems || []).filter((p) => p.status === 'open').length;
            const openActions = (r.actionsRequired || []).filter((a) => a.status !== 'closed').length;
            return (
              <div key={r._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${tpl.color}`}>{tpl.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                      {r.reportTag && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono font-medium flex items-center gap-1">
                          <Tag size={9} /> {r.reportTag}
                        </span>
                      )}
                      {openProblems > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">{openProblems} open problem{openProblems > 1 ? 's' : ''}</span>}
                      {openActions > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium">{openActions} action{openActions > 1 ? 's' : ''}</span>}
                    </div>
                    <p className="font-semibold text-gray-800">{r.title}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-400">
                      <span>{r.projectId?.name}</span>
                      <span>{new Date(r.reportDate).toLocaleDateString()}</span>
                      {r.siteManagerName && <span className="flex items-center gap-1"><UserCheck size={10} />{r.siteManagerName}</span>}
                      {r.assignedTo?.name && <span className="flex items-center gap-1"><Users size={10} />→ {r.assignedTo.name}</span>}
                      {location && <span className="flex items-center gap-1"><MapPin size={10} />{location}</span>}
                      {r.workersOnSite != null && <span className="flex items-center gap-1"><Users size={10} />{r.workersOnSite} workers</span>}
                    </div>
                    {r.description && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{r.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handlePrint(r)} className="p-1.5 text-gray-400 hover:text-primary-900 hover:bg-primary-50 rounded-lg" title="Print"><Printer size={15} /></button>
                    {canEdit && <>
                      <button onClick={() => { setEditing(r); setModal(true); }} className="p-1.5 text-gray-400 hover:text-primary-900 hover:bg-primary-50 rounded-lg"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(r._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                    </>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ReportModal
        open={modal}
        onClose={() => setModal(false)}
        onSaved={() => { setModal(false); load(); }}
        editing={editing}
        projects={projects}
        teamMembers={teamMembers}
      />
      <style>{`@media print { .print\\:hidden { display:none!important; } .print\\:block { display:block!important; } }`}</style>
    </div>
  );
}
