import React, { useEffect, useState, useCallback } from 'react';
import { Plus, X, Pencil, Trash2, FolderOpen, Search } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

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

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name ?? '',
        client: editing.client ?? '',
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
      if (editing) {
        await api.put(`/projects/${editing._id}`, form);
      } else {
        await api.post('/projects', form);
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
    await api.delete(`/projects/${id}`);
    fetchProjects();
  };

  const handleSaved = () => {
    setModal(false);
    fetchProjects();
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
      {/* Toolbar */}
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
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-primary-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors shrink-0"
          >
            <Plus size={16} />
            New Project
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-900" />
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

              {canEdit && (
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
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
