import React, { useEffect, useState, useCallback } from 'react';
import { Plus, X, Pencil, Trash2, FolderOpen, Search, FileText, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ExcelImport from '../components/ExcelImport';
import { runImport, summarize } from '../utils/runImport';
import { useToast } from '../context/ToastContext';

const DEFAULT_FOLDERS = [
  'Contracts', 'Receipts', 'Invoices', 'Site Plans & Drawings',
  'Permits & Approvals', 'Insurance', 'Reports', 'Other',
];
const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900';

function ProjectDocs({ project, canEdit }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', folder: 'Contracts', description: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!open) return;
    setLoadingDocs(true);
    api.get(`/documents?projectId=${project._id}`)
      .then(({ data }) => setDocs(data.documents))
      .catch(() => {})
      .finally(() => setLoadingDocs(false));
  }, [open, project._id]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name || !form.url) return;
    setSaving(true);
    try {
      await api.post('/documents', { ...form, projectId: project._id });
      setForm({ name: '', url: '', folder: 'Contracts', description: '' });
      setShowAdd(false);
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to add document', 'error');
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to delete document', 'error');
    }
  };

  return (
    <div className="border-t border-gray-100 pt-2 mt-2">
      <button onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-900 transition-colors w-full">
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <FileText size={12} />
        <span>Documents{docs.length > 0 ? ` (${docs.length})` : ''}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-1.5">
          {loadingDocs ? (
            <p className="text-xs text-gray-400 px-1">Loading…</p>
          ) : docs.length === 0 ? (
            <p className="text-xs text-gray-400 px-1">No documents linked to this project yet.</p>
          ) : docs.map((d) => (
            <div key={d._id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
              <FileText size={11} className="text-gray-400 shrink-0" />
              <span className="text-xs text-gray-700 flex-1 truncate">{d.name}</span>
              <a href={d.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary-900 hover:underline shrink-0 flex items-center gap-0.5">
                <ExternalLink size={10} /> Open
              </a>
              {canEdit && (
                <button onClick={() => handleDelete(d._id)}
                  className="text-gray-300 hover:text-red-500 shrink-0">
                  <X size={11} />
                </button>
              )}
            </div>
          ))}

          {canEdit && !showAdd && (
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1 text-xs text-primary-900 hover:underline px-1">
              <Plus size={11} /> Add document
            </button>
          )}

          {canEdit && showAdd && (
            <form onSubmit={handleAdd} className="space-y-1.5 bg-blue-50 rounded-lg p-2">
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputCls} placeholder="Document name" />
              <input required type="url" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                className={inputCls} placeholder="https://drive.google.com/..." />
              <select value={form.folder} onChange={(e) => setForm((f) => ({ ...f, folder: e.target.value }))}
                className={inputCls + ' bg-white'}>
                {DEFAULT_FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 border border-gray-300 rounded-lg py-1.5 text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-primary-900 text-white rounded-lg py-1.5 text-xs font-medium hover:bg-primary-800 disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

const PROJECT_IMPORT_COLUMNS = [
  { key: 'name', label: 'Project Name', type: 'string', required: true },
  { key: 'client', label: 'Client', type: 'string', required: true },
  { key: 'status', label: 'Status (planning/active/on_hold/completed/cancelled)', type: 'string',
    enumValues: ['planning', 'active', 'on_hold', 'completed', 'cancelled'] },
  { key: 'currency', label: 'Currency', type: 'string' },
  { key: 'budget', label: 'Budget', type: 'number' },
  { key: 'location', label: 'Location', type: 'string' },
  { key: 'startDate', label: 'Start Date', type: 'date' },
  { key: 'endDate', label: 'End Date', type: 'date' },
  { key: 'description', label: 'Description', type: 'string' },
];

const STATUSES = ['planning', 'active', 'on_hold', 'completed', 'cancelled'];
const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP', 'ZAR'];

const STATUS_COLORS = {
  planning: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  on_hold: 'bg-orange-100 text-orange-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
};

const EMPTY = {
  name: '',
  client: '',
  assignedClientId: '',
  location: '',
  budget: '',
  currency: 'NGN',
  startDate: '',
  endDate: '',
  status: 'planning',
  description: '',
};

function ProjectModal({ open, onClose, onSaved, editing }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [clientUsers, setClientUsers] = useState([]);

  useEffect(() => {
    if (!open) return;
    api.get('/auth/team').then(({ data }) => {
      setClientUsers((data.members || []).filter((m) => m.role === 'client'));
    }).catch(() => {});
    if (editing) {
      setForm({
        name: editing.name ?? '',
        client: editing.client ?? '',
        assignedClientId: editing.assignedClientId ?? '',
        location: editing.location ?? '',
        budget: editing.budget ?? '',
        currency: editing.currency ?? 'NGN',
        startDate: editing.startDate ? editing.startDate.slice(0, 10) : '',
        endDate: editing.endDate ? editing.endDate.slice(0, 10) : '',
        status: editing.status ?? 'planning',
        description: editing.description ?? '',
      });
    } else {
      setForm(EMPTY);
    }
    setError('');
  }, [open, editing]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, assignedClientId: form.assignedClientId || null };
      if (editing) {
        await api.put(`/projects/${editing._id}`, payload);
      } else {
        await api.post('/projects', payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const inputCls =
    'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900 focus:border-transparent';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-800">
            {editing ? 'Edit Project' : 'New Project'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input type="text" required value={form.name} onChange={set('name')} className={inputCls} placeholder="e.g. Office Block A Renovation" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Client <span className="text-red-500">*</span>
            </label>
            <input type="text" required value={form.client} onChange={set('client')} className={inputCls} placeholder="Client name or company" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Client Login <span className="text-gray-400 font-normal">(optional — links this project to a client's portal account)</span>
            </label>
            <select value={form.assignedClientId} onChange={set('assignedClientId')} className={inputCls + ' bg-white'}>
              <option value="">— Not linked to a client login —</option>
              {clientUsers.map((c) => (
                <option key={c._id} value={c._id}>{c.name} ({c.email})</option>
              ))}
            </select>
            {clientUsers.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">No client accounts yet — invite one from Team Management first.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
            <input type="text" value={form.location} onChange={set('location')} className={inputCls} placeholder="City, State" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Budget</label>
              <input type="number" min="0" value={form.budget} onChange={set('budget')} className={inputCls} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
              <select value={form.currency} onChange={set('currency')} className={inputCls + ' bg-white'}>
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
              <input type="date" value={form.startDate} onChange={set('startDate')} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
              <input type="date" value={form.endDate} onChange={set('endDate')} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <select value={form.status} onChange={set('status')} className={inputCls + ' bg-white capitalize'}>
              {STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={set('description')}
              className={inputCls + ' resize-none'}
              placeholder="Brief project description…"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-primary-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : editing ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const { user } = useAuth();
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const canEdit = ['admin', 'project_manager', 'qs'].includes(user?.role);
  const canDelete = user?.role === 'admin';

  const fetchProjects = useCallback(() => {
    const params = filterStatus ? `?status=${filterStatus}` : '';
    api
      .get(`/projects${params}`)
      .then(({ data }) => setProjects(data.projects))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterStatus]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const openNew = () => {
    setEditing(null);
    setModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    try {
      await api.delete(`/projects/${id}`);
      fetchProjects();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to delete project', 'error');
    }
  };

  const handleSaved = () => {
    setModal(false);
    fetchProjects();
    toast(editing ? 'Project updated' : 'Project created');
  };

  const filtered = projects.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.client.toLowerCase().includes(q) ||
      (p.location ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900 focus:border-transparent"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900 bg-white"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>

        <span className="text-sm text-gray-400 self-center hidden sm:block">
          {filtered.length} project{filtered.length !== 1 ? 's' : ''}
        </span>

        {canEdit && (
          <>
            <ExcelImport
              onImport={async (rows) => {
                const result = await runImport(rows, (row) => row._id ? api.put(`/projects/${row._id}`, row) : api.post('/projects', row));
                alert(summarize(result, 'project'));
                fetchProjects();
              }}
              matchKey="name"
              existingRecords={projects}
              columns={PROJECT_IMPORT_COLUMNS}
              templateName="projects"
            />
            <button
              onClick={openNew}
              className="flex items-center gap-2 bg-primary-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors shrink-0"
            >
              <Plus size={16} />
              New Project
            </button>
          </>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 animate-pulse space-y-3">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-100 rounded w-40" />
                <div className="h-5 bg-gray-100 rounded-full w-16" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded w-32" />
                <div className="h-3 bg-gray-100 rounded w-24" />
                <div className="h-3 bg-gray-100 rounded w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500">
            {projects.length === 0 ? 'No projects yet.' : 'No projects match your search.'}
          </p>
          {canEdit && projects.length === 0 && (
            <button
              onClick={openNew}
              className="mt-2 text-primary-900 font-medium hover:underline text-sm"
            >
              Create your first project
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div
              key={p._id}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold text-gray-800 leading-tight text-sm">{p.name}</h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap capitalize shrink-0 ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {p.status.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-1 text-xs text-gray-500 mb-4">
                <p>
                  <span className="text-gray-400">Client:</span>{' '}
                  <span className="text-gray-700 font-medium">{p.client}</span>
                </p>
                {p.location && (
                  <p>
                    <span className="text-gray-400">Location:</span>{' '}
                    <span className="text-gray-700">{p.location}</span>
                  </p>
                )}
                {p.budget ? (
                  <p>
                    <span className="text-gray-400">Budget:</span>{' '}
                    <span className="text-gray-700 font-medium">
                      {p.currency} {Number(p.budget).toLocaleString()}
                    </span>
                  </p>
                ) : null}
                {(p.startDate || p.endDate) && (
                  <p>
                    <span className="text-gray-400">Timeline:</span>{' '}
                    <span className="text-gray-700">
                      {p.startDate ? new Date(p.startDate).toLocaleDateString() : '—'} →{' '}
                      {p.endDate ? new Date(p.endDate).toLocaleDateString() : '—'}
                    </span>
                  </p>
                )}
              </div>

              <ProjectDocs project={p} canEdit={canEdit} />

              {canEdit && (
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100 mt-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-900 transition-colors"
                  >
                    <Pencil size={13} />
                    Edit
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(p._id)}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors ml-auto"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ProjectModal
        open={modal}
        onClose={() => setModal(false)}
        onSaved={handleSaved}
        editing={editing}
      />
    </div>
  );
}
