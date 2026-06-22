import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Camera, X, Search, DollarSign, TrendingUp, Calendar, Tag } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ExcelImport from '../components/ExcelImport';

const EXPENSE_IMPORT_COLUMNS = [
  { key: 'description', label: 'Description', type: 'string' },
  { key: 'category', label: 'Category', type: 'string' },
  { key: 'amount', label: 'Amount', type: 'number' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'vendor', label: 'Vendor', type: 'string' },
  { key: 'notes', label: 'Notes', type: 'string' },
];

const CATEGORIES = [
  'Labour', 'Materials', 'Equipment', 'Transport', 'Professional Fees',
  'Permits & Licenses', 'Utilities', 'Office & Admin', 'Safety & PPE', 'Other',
];

function fmt(n) {
  return Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30';

function ExpenseModal({ projects, editData, onClose, onSaved }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState(editData ? {
    ...editData,
    projectId: editData.projectId?._id || editData.projectId || '',
    date: editData.date ? new Date(editData.date).toISOString().split('T')[0] : today,
  } : {
    projectId: '', category: 'Other', description: '', amount: '', currency: 'NGN',
    date: today, notes: '', vendor: '',
  });
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) fd.append(k, v); });
      files.forEach((f) => fd.append('receipts', f));

      if (editData?._id) {
        await api.put(`/expenses/${editData._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/expenses', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-800">{editData ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
            <select value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))} className={inputCls}>
              <option value="">— No specific project —</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
            <input required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} placeholder="What was this expense for?" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount *</label>
              <input required type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className={inputCls} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
              <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} className={inputCls}>
                {['NGN', 'USD', 'EUR', 'GBP'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Vendor / Payee</label>
            <input value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} className={inputCls} placeholder="e.g. Lagos Cement Co." />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className={inputCls} placeholder="Additional details…" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Receipts / Photos</label>
            <label className="flex items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-primary-300 transition-colors">
              <Camera size={18} className="text-gray-400" />
              <span className="text-sm text-gray-500">{files.length > 0 ? `${files.length} file(s) selected` : 'Click to attach receipts or photos'}</span>
              <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-primary-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
              {saving ? 'Saving…' : editData ? 'Update' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExpenseTracker() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [lightbox, setLightbox] = useState(null);

  const canManage = ['admin', 'qs', 'project_manager'].includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (projectFilter) params.projectId = projectFilter;
      const [expRes, projRes] = await Promise.all([
        api.get('/expenses', { params }),
        api.get('/projects'),
      ]);
      setExpenses(expRes.data.expenses || []);
      setProjects(projRes.data.projects || []);
    } finally { setLoading(false); }
  }, [categoryFilter, projectFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    await api.delete(`/expenses/${id}`);
    load();
  };

  const filtered = expenses.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.description.toLowerCase().includes(q)
      || (e.vendor ?? '').toLowerCase().includes(q)
      || (e.category ?? '').toLowerCase().includes(q);
  });

  const totalByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = filtered.filter((e) => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0);
    return acc;
  }, {});
  const grandTotal = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  const CATEGORY_COLORS = {
    'Labour': 'bg-blue-50 text-blue-700',
    'Materials': 'bg-amber-50 text-amber-700',
    'Equipment': 'bg-purple-50 text-purple-700',
    'Transport': 'bg-teal-50 text-teal-700',
    'Professional Fees': 'bg-indigo-50 text-indigo-700',
    'Other': 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={15} className="text-primary-900" />
            <p className="text-xs text-gray-500">Total Expenses</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">₦{fmt(grandTotal)}</p>
          <p className="text-xs text-gray-400 mt-1">{filtered.length} entries</p>
        </div>
        {Object.entries(totalByCategory).filter(([, v]) => v > 0).slice(0, 2).map(([cat, total]) => (
          <div key={cat} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">{cat}</p>
            <p className="text-xl font-bold text-gray-800">₦{fmt(total)}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expenses…"
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-900/30">
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-900/30">
            <option value="">All Projects</option>
            {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
        </div>
        {canManage && (
          <>
            <ExcelImport
              onImport={async (rows) => {
                let count = 0;
                for (const row of rows) {
                  try { await api.post('/expenses', row); count++; } catch {}
                }
                alert(`Imported ${count} expenses`);
                load();
              }}
              columns={EXPENSE_IMPORT_COLUMNS}
              templateName="expenses"
            />
            <button onClick={() => { setEditData(null); setShowModal(true); }}
              className="flex items-center gap-2 bg-primary-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-800">
              <Plus size={16} /> Add Expense
            </button>
          </>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <DollarSign size={40} className="mx-auto mb-3 opacity-20" />
          <p>No expenses found.</p>
          {canManage && <button onClick={() => { setEditData(null); setShowModal(true); }} className="mt-3 text-primary-900 text-sm font-medium hover:underline">Add your first expense</button>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Description</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Project</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((e) => (
                <tr key={e._id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800">{e.description}</p>
                    {e.vendor && <p className="text-xs text-gray-400">{e.vendor}</p>}
                    {e.notes && <p className="text-xs text-gray-400 italic">{e.notes}</p>}
                    {e.receipts?.length > 0 && (
                      <div className="flex gap-1.5 mt-1.5">
                        {e.receipts.map((r, i) => (
                          <button key={i} onClick={() => setLightbox(r)}
                            className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 hover:opacity-80">
                            <img src={r} alt="receipt" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[e.category] || 'bg-gray-100 text-gray-600'}`}>
                      {e.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{e.projectId?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(e.date).toLocaleDateString('en-GB')}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{e.currency} {fmt(e.amount)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {canManage && (
                        <>
                          <button onClick={() => { setEditData(e); setShowModal(true); }}
                            className="text-xs text-gray-400 hover:text-primary-900 px-2 py-1 hover:bg-primary-50 rounded-lg">Edit</button>
                          <button onClick={() => handleDelete(e._id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="receipt" className="max-w-full max-h-full rounded-xl shadow-2xl" />
        </div>
      )}

      {showModal && (
        <ExpenseModal
          projects={projects}
          editData={editData}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
