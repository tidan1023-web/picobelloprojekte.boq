import React, { useEffect, useState, useCallback } from 'react';
import { Plus, X, Pencil, Trash2, Search, BookOpen, ChevronDown } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP'];

const QS_CATEGORIES = [
  'Preliminaries', 'Earthworks & Drainage', 'Concrete Works', 'Masonry & Blockwork',
  'Structural Steel', 'Roofing & Waterproofing', 'Plastering & Screeding',
  'Tiling & Flooring', 'Painting & Decorating', 'Doors & Windows',
  'Mechanical & Plumbing', 'Electrical', 'External Works', 'Other',
];

const QS_SUBCATEGORIES = {
  'Concrete Works': ['Foundations', 'Columns', 'Beams', 'Slabs', 'Retaining Walls'],
  'Masonry & Blockwork': ['Block Laying', 'Brick Laying', 'Stone Masonry'],
  'Mechanical & Plumbing': ['Water Supply', 'Drainage', 'HVAC', 'Fire Fighting'],
  'Electrical': ['Power', 'Lighting', 'Data & Communication', 'Security'],
  'Roofing & Waterproofing': ['Metal Roofing', 'Concrete Roof', 'Waterproofing Membrane'],
  'Tiling & Flooring': ['Ceramic Tiles', 'Porcelain Tiles', 'Marble', 'Granite', 'Timber Floor'],
};

const EMPTY = { category: '', subCategory: '', item: '', unit: '', source: '', price: '', currency: 'NGN' };
const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900 focus:border-transparent';

function CategorySelect({ value, onChange, className }) {
  const [custom, setCustom] = useState(false);
  useEffect(() => {
    if (value && !QS_CATEGORIES.includes(value)) setCustom(true);
  }, [value]);

  if (custom) {
    return (
      <div className="flex gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value)} className={className} placeholder="Enter category" />
        <button type="button" onClick={() => { setCustom(false); onChange(''); }}
          className="text-gray-400 hover:text-gray-600 px-2"><X size={14} /></button>
      </div>
    );
  }
  return (
    <select value={value} onChange={(e) => { if (e.target.value === '__custom__') { setCustom(true); onChange(''); } else onChange(e.target.value); }}
      className={className + ' bg-white'}>
      <option value="">Select category…</option>
      {QS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      <option value="__custom__">+ Custom category…</option>
    </select>
  );
}

function PriceModal({ open, onClose, onSaved, editing }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(editing
      ? { category: editing.category, subCategory: editing.subCategory ?? '', item: editing.item, unit: editing.unit, source: editing.source ?? '', price: editing.price, currency: editing.currency ?? 'NGN' }
      : EMPTY);
    setError('');
  }, [open, editing]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      editing ? await api.put(`/qs-prices/${editing._id}`, form) : await api.post('/qs-prices', form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save');
    } finally { setSaving(false); }
  };

  const suggestedSubs = QS_SUBCATEGORIES[form.category] || [];

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{editing ? 'Edit Entry' : 'New QS Price Entry'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Category *</label>
            <CategorySelect value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v, subCategory: '' }))} className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Sub-category</label>
            {suggestedSubs.length > 0 ? (
              <select value={form.subCategory} onChange={set('subCategory')} className={inputCls + ' bg-white'}>
                <option value="">None</option>
                {suggestedSubs.map((s) => <option key={s} value={s}>{s}</option>)}
                <option value="__other__">Other…</option>
              </select>
            ) : (
              <input value={form.subCategory} onChange={set('subCategory')} className={inputCls} placeholder="e.g. Reinforced, Mass Fill…" list="sub-suggestions" />
            )}
            <datalist id="sub-suggestions">
              {suggestedSubs.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>

          {[
            { label: 'Item *', key: 'item', placeholder: 'e.g. Reinforced Concrete' },
            { label: 'Unit *', key: 'unit', placeholder: 'e.g. m³, kg, m²' },
            { label: 'Source', key: 'source', placeholder: 'e.g. NIQS 2024, Market Survey' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>
              <input type="text" required={label.includes('*')} value={form[key]} onChange={set(key)} className={inputCls} placeholder={placeholder} />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Price *</label>
              <input type="number" required min="0" step="0.01" value={form.price} onChange={set('price')} className={inputCls} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Currency</label>
              <select value={form.currency} onChange={set('currency')} className={inputCls + ' bg-white'}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

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

export default function QsPricing() {
  const { user } = useAuth();
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subCategoryFilter, setSubCategoryFilter] = useState('');

  const canEdit = ['admin', 'qs'].includes(user?.role);

  const fetchPrices = useCallback(() => {
    const params = categoryFilter ? `?category=${encodeURIComponent(categoryFilter)}` : '';
    api.get(`/qs-prices${params}`)
      .then(({ data }) => setPrices(data.prices))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [categoryFilter]);

  useEffect(() => { fetchPrices(); }, [fetchPrices]);

  const categories = [...new Set(prices.map((p) => p.category))].sort();
  const subCategories = [...new Set(prices.filter((p) => !categoryFilter || p.category === categoryFilter).map((p) => p.subCategory).filter(Boolean))].sort();

  const filtered = prices.filter((p) => {
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (subCategoryFilter && p.subCategory !== subCategoryFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return p.item.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || (p.source ?? '').toLowerCase().includes(q);
  });

  const avg = filtered.length ? filtered.reduce((s, p) => s + p.price, 0) / filtered.length : 0;
  const min = filtered.length ? Math.min(...filtered.map((p) => p.price)) : 0;
  const max = filtered.length ? Math.max(...filtered.map((p) => p.price)) : 0;
  const currency = filtered[0]?.currency ?? 'NGN';
  const fmt = (n) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleDelete = async (id) => {
    if (!confirm('Delete this entry?')) return;
    await api.delete(`/qs-prices/${id}`);
    fetchPrices();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900" />
        </div>
        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setSubCategoryFilter(''); }}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900 bg-white">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        {subCategories.length > 0 && (
          <select value={subCategoryFilter} onChange={(e) => setSubCategoryFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900 bg-white">
            <option value="">All sub-categories</option>
            {subCategories.map((s) => <option key={s}>{s}</option>)}
          </select>
        )}
        <span className="text-sm text-gray-400 self-center hidden sm:block">{filtered.length} entries</span>
        {canEdit && (
          <button onClick={() => { setEditing(null); setModal(true); }}
            className="flex items-center gap-2 bg-primary-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 shrink-0">
            <Plus size={16} /> Add Entry
          </button>
        )}
      </div>

      {/* Average stats strip */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Min Price', value: min, color: 'bg-green-50 border-green-200 text-green-800' },
            { label: `Avg Price (${filtered.length} items)`, value: avg, color: 'bg-blue-50 border-blue-200 text-blue-800' },
            { label: 'Max Price', value: max, color: 'bg-red-50 border-red-200 text-red-800' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl border p-4 ${color}`}>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">{label}</p>
              <p className="text-lg font-bold">{currency} {fmt(value)}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-900" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500 text-sm">{prices.length === 0 ? 'No price entries yet.' : 'No results for your search.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Category', 'Sub-category', 'Item', 'Unit', 'Source', 'Price', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3"><span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{p.category}</span></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{p.subCategory || '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.item}</td>
                  <td className="px-4 py-3 text-gray-500">{p.unit}</td>
                  <td className="px-4 py-3 text-gray-500">{p.source || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{p.currency} {Number(p.price).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {canEdit && (
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => { setEditing(p); setModal(true); }} className="text-gray-400 hover:text-primary-900 transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(p._id)} className="text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PriceModal open={modal} onClose={() => setModal(false)} onSaved={() => { setModal(false); fetchPrices(); }} editing={editing} />
    </div>
  );
}
