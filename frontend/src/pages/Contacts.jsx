import React, { useEffect, useState, useCallback } from 'react';
import { Plus, X, Pencil, Trash2, Search, Phone, Mail, Users, Building2, MessageSquare } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['client', 'contractor', 'subcontractor', 'supplier', 'consultant', 'architect', 'engineer', 'other'];
const CAT_COLORS = {
  client: 'bg-blue-50 text-blue-700 border-blue-200',
  contractor: 'bg-purple-50 text-purple-700 border-purple-200',
  subcontractor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  supplier: 'bg-green-50 text-green-700 border-green-200',
  consultant: 'bg-orange-50 text-orange-700 border-orange-200',
  architect: 'bg-pink-50 text-pink-700 border-pink-200',
  engineer: 'bg-teal-50 text-teal-700 border-teal-200',
  other: 'bg-gray-100 text-gray-600 border-gray-200',
};

const EMPTY = { name: '', role: '', company: '', email: '', phone: '', phone2: '', whatsapp: '', address: '', notes: '', category: 'other', projectIds: [] };
const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900';

function ContactModal({ open, onClose, onSaved, editing, projects }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(editing ? {
      ...EMPTY, ...editing,
      projectIds: (editing.projectIds || []).map((p) => p._id || p),
    } : EMPTY);
    setError('');
  }, [open, editing]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleProject = (id) => setForm((f) => ({
    ...f,
    projectIds: f.projectIds.includes(id) ? f.projectIds.filter((x) => x !== id) : [...f.projectIds, id],
  }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      editing ? await api.put(`/contacts/${editing._id}`, form) : await api.post('/contacts', form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save');
    } finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-semibold text-gray-800">{editing ? 'Edit Contact' : 'New Contact'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
              <input required value={form.name} onChange={set('name')} className={inputCls} placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role / Title</label>
              <input value={form.role} onChange={set('role')} className={inputCls} placeholder="e.g. Site Manager, Architect" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Company / Firm</label>
              <input value={form.company} onChange={set('company')} className={inputCls} placeholder="Company name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category} onChange={set('category')} className={inputCls + ' bg-white'}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={set('email')} className={inputCls} placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone (Primary)</label>
              <input value={form.phone} onChange={set('phone')} className={inputCls} placeholder="+234 800 000 0000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone (Secondary)</label>
              <input value={form.phone2} onChange={set('phone2')} className={inputCls} placeholder="+234 800 000 0000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">WhatsApp</label>
              <input value={form.whatsapp} onChange={set('whatsapp')} className={inputCls} placeholder="+234 800 000 0000" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
              <input value={form.address} onChange={set('address')} className={inputCls} placeholder="Office / Site address" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={set('notes')} rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900 resize-none" placeholder="Any notes about this contact…" />
            </div>
          </div>

          {projects.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Associated Projects</label>
              <div className="flex flex-wrap gap-2">
                {projects.map((p) => (
                  <button key={p._id} type="button" onClick={() => toggleProject(p._id)}
                    className={`px-3 py-1 rounded-full text-xs border font-medium transition-colors ${form.projectIds.includes(p._id) ? 'bg-primary-900 text-white border-primary-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-primary-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Update' : 'Save Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Contacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const canEdit = ['admin', 'project_manager', 'qs'].includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (search) params.search = search;
      const [cRes, pRes] = await Promise.all([
        api.get('/contacts', { params }),
        api.get('/projects'),
      ]);
      setContacts(cRes.data.contacts || []);
      setProjects(pRes.data.projects || []);
    } finally { setLoading(false); }
  }, [categoryFilter, search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this contact?')) return;
    await api.delete(`/contacts/${id}`);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by name, company, phone…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-900">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <span className="text-sm text-gray-400 self-center hidden sm:block">{contacts.length} contacts</span>
        {canEdit && (
          <button onClick={() => { setEditing(null); setModal(true); }}
            className="flex items-center gap-2 bg-primary-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 shrink-0">
            <Plus size={16} /> Add Contact
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-900" /></div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <Users size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500 text-sm">No contacts yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {contacts.map((c) => (
            <div key={c._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary-900 text-white flex items-center justify-center font-semibold text-sm shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 truncate">{c.role || c.company || '—'}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${CAT_COLORS[c.category] ?? CAT_COLORS.other}`}>
                  {c.category}
                </span>
              </div>

              <div className="space-y-1.5 text-sm">
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-primary-900">
                    <Phone size={13} className="text-gray-400 shrink-0" /> {c.phone}
                  </a>
                )}
                {c.phone2 && (
                  <a href={`tel:${c.phone2}`} className="flex items-center gap-2 text-gray-600 hover:text-primary-900">
                    <Phone size={13} className="text-gray-400 shrink-0" /> {c.phone2}
                  </a>
                )}
                {c.whatsapp && (
                  <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-green-600 hover:text-green-700">
                    <MessageSquare size={13} className="shrink-0" /> WhatsApp
                  </a>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-gray-600 hover:text-primary-900 truncate">
                    <Mail size={13} className="text-gray-400 shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </a>
                )}
                {c.company && (
                  <p className="flex items-center gap-2 text-gray-500">
                    <Building2 size={13} className="text-gray-400 shrink-0" /> {c.company}
                  </p>
                )}
              </div>

              {c.projectIds?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {c.projectIds.map((p) => (
                    <span key={p._id || p} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.name || p}</span>
                  ))}
                </div>
              )}

              {canEdit && (
                <div className="mt-3 flex gap-2 pt-3 border-t border-gray-50">
                  <button onClick={() => { setEditing(c); setModal(true); }} className="flex-1 text-xs text-gray-500 hover:text-primary-900 flex items-center justify-center gap-1 py-1 rounded hover:bg-primary-50 transition-colors">
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={() => handleDelete(c._id)} className="flex-1 text-xs text-gray-500 hover:text-red-500 flex items-center justify-center gap-1 py-1 rounded hover:bg-red-50 transition-colors">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ContactModal open={modal} onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }} editing={editing} projects={projects} />
    </div>
  );
}
