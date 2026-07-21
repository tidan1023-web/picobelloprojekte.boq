import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, X, Trash2, FolderOpen, FileText, ExternalLink,
  Search, ChevronDown, ChevronRight, FolderKanban, Building2, UploadCloud, Link2,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const DEFAULT_FOLDERS = [
  'Contracts', 'Receipts', 'Invoices', 'Site Plans & Drawings',
  'Permits & Approvals', 'Insurance', 'Reports', 'Other',
];

// Auto-aggregated entries (files attached elsewhere in the app) are read-only here.
const SOURCE_LABELS = {
  'historical-project': 'Historical Projects',
  'expense': 'Expense Tracker',
  'progress-update': 'Progress Tracker',
  'site-report': 'Site Reports',
};

const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900 focus:border-transparent';

function AddDocModal({ onClose, onSaved, projects, presetProjectId }) {
  const [mode, setMode] = useState('upload'); // 'upload' | 'link'
  const [form, setForm] = useState({
    name: '', url: '', folder: 'Contracts', description: '',
    projectId: presetProjectId || '',
  });
  const [file, setFile] = useState(null);
  const fileRef = useRef();
  const [customFolder, setCustomFolder] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const effectiveFolder = form.folder === '__custom__' ? customFolder.trim() : form.folder;

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (!form.name) setForm((s) => ({ ...s, name: f.name.replace(/\.[^.]+$/, '') }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!effectiveFolder) return setError('Please enter a folder name');
    if (mode === 'upload' && !file) return setError('Please choose a file');
    if (mode === 'link' && !form.url) return setError('Please paste a link');
    setSaving(true); setError('');
    try {
      if (mode === 'upload') {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('name', form.name);
        fd.append('folder', effectiveFolder);
        fd.append('description', form.description);
        if (form.projectId) fd.append('projectId', form.projectId);
        await api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/documents', { ...form, folder: effectiveFolder });
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[95vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-semibold text-gray-800">Add Document</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            <button type="button" onClick={() => setMode('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'upload' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
              <UploadCloud size={14} /> Upload a file
            </button>
            <button type="button" onClick={() => setMode('link')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'link' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
              <Link2 size={14} /> Paste a link
            </button>
          </div>

          {mode === 'upload' ? (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">File *</label>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full flex items-center gap-2 border border-dashed border-gray-300 text-gray-500 px-4 py-3 rounded-xl hover:border-primary-900 hover:text-primary-900 text-sm justify-center transition-colors">
                <UploadCloud size={16} /> {file ? file.name : 'Choose a file (PDF, image, Word, Excel, CSV, zip)'}
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,image/*" />
              <p className="text-xs text-gray-400 mt-1">Up to 20 MB.</p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Link / URL *</label>
              <input required={mode === 'link'} type="url" value={form.url} onChange={set('url')} className={inputCls} placeholder="https://drive.google.com/..." />
              <p className="text-xs text-gray-400 mt-1">Paste a Google Drive, Dropbox, or any direct link.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Document Name {mode === 'link' && '*'}</label>
            <input required={mode === 'link'} value={form.name} onChange={set('name')} className={inputCls} placeholder="e.g. Foundation Contract — Dangote Cement" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Folder *</label>
            <select value={form.folder} onChange={set('folder')} className={inputCls + ' bg-white'}>
              {DEFAULT_FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}
              <option value="__custom__">+ New folder…</option>
            </select>
            {form.folder === '__custom__' && (
              <input value={customFolder} onChange={(e) => setCustomFolder(e.target.value)}
                className={inputCls + ' mt-2'} placeholder="Folder name" autoFocus />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Project <span className="text-gray-400 font-normal">(optional — link to a project)</span>
            </label>
            <select value={form.projectId} onChange={set('projectId')} className={inputCls + ' bg-white'}>
              <option value="">— Company-wide (no project) —</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <textarea rows={2} value={form.description} onChange={set('description')} className={inputCls + ' resize-none'} placeholder="Optional notes about this document" />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 bg-primary-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
            {saving ? 'Saving…' : 'Add Document'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DocList({ docs, canEdit, onDelete }) {
  const [collapsed, setCollapsed] = useState({});
  const toggle = (key) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  const byFolder = docs.reduce((acc, d) => {
    (acc[d.folder] = acc[d.folder] || []).push(d);
    return acc;
  }, {});
  const folders = Object.keys(byFolder).sort();

  if (folders.length === 0) return null;

  return (
    <div className="space-y-3">
      {folders.map((folder) => {
        const open = !collapsed[folder];
        const items = byFolder[folder];
        return (
          <div key={folder} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button onClick={() => toggle(folder)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                        {doc.projectId && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full shrink-0">
                            {doc.projectId.name}
                          </span>
                        )}
                      </div>
                      {doc.description && <p className="text-xs text-gray-400 truncate">{doc.description}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {doc.readOnly
                          ? `Auto-added from ${SOURCE_LABELS[doc.source] || 'another page'}`
                          : `Added by ${doc.uploadedBy?.name || 'Admin'}`} · {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary-900 font-medium hover:underline shrink-0">
                      <ExternalLink size={13} /> Open
                    </a>
                    {canEdit && !doc.readOnly && (
                      <button onClick={() => onDelete(doc._id)}
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
  );
}

export default function Documents() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('folder');   // 'folder' | 'project'
  const [filterProject, setFilterProject] = useState('');
  const [expandedProject, setExpandedProject] = useState({});

  const canEdit = user?.role === 'admin';

  const fetchDocs = useCallback(() => {
    api.get('/documents')
      .then(({ data }) => setDocs(data.documents))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fetchProjects = useCallback(() => {
    api.get('/projects').then(({ data }) => setProjects(data.projects || [])).catch(() => {});
  }, []);

  useEffect(() => { fetchDocs(); fetchProjects(); }, [fetchDocs, fetchProjects]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      fetchDocs();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete document');
    }
  };

  const filtered = docs.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      d.name.toLowerCase().includes(q) ||
      d.folder.toLowerCase().includes(q) ||
      (d.description || '').toLowerCase().includes(q) ||
      (d.projectId?.name || '').toLowerCase().includes(q);
    const matchProject = !filterProject ||
      (filterProject === '__none__' ? !d.projectId : d.projectId?._id === filterProject);
    return matchSearch && matchProject;
  });

  // group by project for project view
  const byProject = filtered.reduce((acc, d) => {
    const key = d.projectId?._id || '__none__';
    (acc[key] = acc[key] || { label: d.projectId?.name || 'Company-wide', docs: [] }).docs.push(d);
    return acc;
  }, {});

  const projectGroups = Object.entries(byProject).sort(([a], [b]) =>
    a === '__none__' ? 1 : b === '__none__' ? -1 : 0
  );

  const toggleProject = (key) => setExpandedProject((c) => ({ ...c, [key]: !c[key] }));

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
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

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search documents…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900" />
        </div>
        <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-900 sm:w-52">
          <option value="">All projects</option>
          <option value="__none__">Company-wide only</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setView('folder')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'folder' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
          <FolderOpen size={14} /> By Folder
        </button>
        <button onClick={() => setView('project')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'project' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
          <FolderKanban size={14} /> By Project
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-900" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FolderOpen size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">{docs.length === 0 ? 'No documents yet. Add the first one above.' : 'No results for your search.'}</p>
        </div>
      ) : view === 'folder' ? (
        <DocList docs={filtered} canEdit={canEdit} onDelete={handleDelete} />
      ) : (
        <div className="space-y-3">
          {projectGroups.map(([key, { label, docs: pdocs }]) => {
            const open = expandedProject[key] !== false;
            return (
              <div key={key} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <button onClick={() => toggleProject(key)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                  {open ? <ChevronDown size={15} className="text-gray-400 shrink-0" /> : <ChevronRight size={15} className="text-gray-400 shrink-0" />}
                  {key === '__none__'
                    ? <Building2 size={16} className="text-gray-400 shrink-0" />
                    : <FolderKanban size={16} className="text-blue-600 shrink-0" />}
                  <span className="font-semibold text-gray-800 text-sm flex-1">{label}</span>
                  <span className="text-xs text-gray-400 shrink-0">{pdocs.length} file{pdocs.length !== 1 ? 's' : ''}</span>
                </button>
                {open && (
                  <div className="border-t border-gray-100">
                    <DocList docs={pdocs} canEdit={canEdit} onDelete={handleDelete} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <AddDocModal
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); fetchDocs(); }}
          projects={projects}
          presetProjectId=""
        />
      )}
    </div>
  );
}
