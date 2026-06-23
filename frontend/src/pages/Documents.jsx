import React, { useEffect, useState, useCallback } from 'react';
import { Plus, X, Trash2, FolderOpen, FileText, ExternalLink, Search, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const DEFAULT_FOLDERS = [
  'Contracts', 'Receipts', 'Invoices', 'Site Plans & Drawings',
  'Permits & Approvals', 'Insurance', 'Reports', 'Other',
];

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900 focus:border-transparent';

function AddDocModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', url: '', folder: 'Contracts', description: '' });
  const [customFolder, setCustomFolder] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const effectiveFolder = form.folder === '__custom__' ? customFolder.trim() : form.folder;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!effectiveFolder) return setError('Please enter a folder name');
    setSaving(true); setError('');
    try {
      await api.post('/documents', { ...form, folder: effectiveFolder });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Add Document</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Document Name *</label>
            <input required value={form.name} onChange={set('name')} className={inputCls} placeholder="e.g. Foundation Contract — Dangote Cement" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Link / URL *</label>
            <input required type="url" value={form.url} onChange={set('url')} className={inputCls} placeholder="https://drive.google.com/..." />
            <p className="text-xs text-gray-400 mt-1">Paste a Google Drive, Dropbox, or any direct link.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Folder *</label>
            <select value={form.folder} onChange={set('folder')} className={inputCls + ' bg-white'}>
              {DEFAULT_FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}
              <option value="__custom__">+ New folder…</option>
            </select>
            {form.folder === '__custom__' && (
              <input
                value={customFolder} onChange={(e) => setCustomFolder(e.target.value)}
                className={inputCls + ' mt-2'} placeholder="Folder name" autoFocus
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <textarea rows={2} value={form.description} onChange={set('description')} className={inputCls + ' resize-none'} placeholder="Optional notes about this document" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-primary-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
              {saving ? 'Saving…' : 'Add Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Documents() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});

  const canEdit = user?.role === 'admin';

  const fetchDocs = useCallback(() => {
    api.get('/documents')
      .then(({ data }) => setDocs(data.documents))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this document?')) return;
    await api.delete(`/documents/${id}`);
    fetchDocs();
  };

  const toggleFolder = (folder) => setCollapsed((c) => ({ ...c, [folder]: !c[folder] }));

  const filtered = docs.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.folder.toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q);
  });

  const byFolder = filtered.reduce((acc, d) => {
    (acc[d.folder] = acc[d.folder] || []).push(d);
    return acc;
  }, {});

  const folders = Object.keys(byFolder).sort();

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Document Library</h1>
          <p className="text-sm text-gray-500 mt-1">Shared company documents — contracts, receipts, permits, and more.</p>
        </div>
        {canEdit && (
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-primary-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 shrink-0">
            <Plus size={16} /> Add Document
          </button>
        )}
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search documents…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-900" /></div>
      ) : folders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FolderOpen size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">{docs.length === 0 ? 'No documents yet. Add the first one above.' : 'No results for your search.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {folders.map((folder) => {
            const open = !collapsed[folder];
            const items = byFolder[folder];
            return (
              <div key={folder} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleFolder(folder)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  {open ? <ChevronDown size={15} className="text-gray-400 shrink-0" /> : <ChevronRight size={15} className="text-gray-400 shrink-0" />}
                  <FolderOpen size={16} className="text-primary-900 shrink-0" />
                  <span className="font-semibold text-gray-800 text-sm flex-1">{folder}</span>
                  <span className="text-xs text-gray-400 shrink-0">{items.length} file{items.length !== 1 ? 's' : ''}</span>
                </button>

                {open && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {items.map((doc) => (
                      <div key={doc._id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                        <FileText size={15} className="text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                          {doc.description && <p className="text-xs text-gray-400 truncate">{doc.description}</p>}
                          <p className="text-xs text-gray-400 mt-0.5">
                            Added by {doc.uploadedBy?.name || 'Admin'} · {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-primary-900 font-medium hover:underline shrink-0">
                          <ExternalLink size={13} /> Open
                        </a>
                        {canEdit && (
                          <button onClick={() => handleDelete(doc._id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && <AddDocModal onClose={() => setModal(false)} onSaved={() => { setModal(false); fetchDocs(); }} />}
    </div>
  );
}
