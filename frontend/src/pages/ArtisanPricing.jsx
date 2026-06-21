import React, { useEffect, useState, useCallback } from 'react';
import { Plus, X, Pencil, Trash2, Search, HardHat } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP'];
const RATE_UNITS = ['per day', 'per hour', 'per job', 'per m²', 'per unit'];

const ARTISAN_CATEGORIES = [
  'Civil & Structural', 'Masonry', 'Roofing', 'Plumbing & Sanitary',
  'Electrical', 'Finishing', 'Carpentry & Joinery', 'Steel & Fabrication',
  'Painting', 'Landscaping', 'Other',
];

const EMPTY = { category: '', service: '', rate: '', currency: 'NGN', rateUnit: 'per day', location: '' };
const inputCls = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900 focus:border-transparent';

function ArtisanModal({ open, onClose, onSaved, editing }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(editing
      ? { category: editing.category ?? '', service: editing.service, rate: editing.rate, currency: editing.currency ?? 'NGN', rateUnit: editing.rateUnit ?? 'per day', location: editing.location ?? '' }
      : EMPTY);
    setError('');
  }, [open, editing]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      editing ? await api.put(`/artisan-prices/${editing._id}`, form) : await api.post('/artisan-prices', form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save');
    } finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{editing ? 'Edit Artisan Rate' : 'New Artisan Rate'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
            <select value={form.category} onChange={set('category')} className={inputCls + ' bg-white'}>
              <option value="">Select category…</option>
              {ARTISAN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Service / Trade *</label>
            <input type="text" required value={form.service} onChange={set('service')} className={inputCls} placeholder="e.g. Bricklayer, Plasterer, Electrician" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Rate *</label>
              <input type="number" required min="0" step="0.01" value={form.rate} onChange={set('rate')} className={inputCls} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Currency</label>
              <select value={form.currency} onChange={set('currency')} className={inputCls + ' bg-white'}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Rate Unit</label>
              <select value={form.rateUnit} onChange={set('rateUnit')} className={inputCls + ' bg-white'}>
                {RATE_UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Location</label>
              <input type="text" value={form.location} onChange={set('location')} className={inputCls} placeholder="e.g. Lagos, Abuja" />
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

export default function ArtisanPricing() {
  const { user } = useAuth();
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  const canEdit = ['admin', 'qs'].includes(user?.role);

  const fetchPrices = useCallback(() => {
    const params = locationFilter ? `?location=${encodeURIComponent(locationFilter)}` : '';
    api.get(`/artisan-prices${params}`)
      .then(({ data }) => setPrices(data.prices))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [locationFilter]);

  useEffect(() => { fetchPrices(); }, [fetchPrices]);

  const categories = [...new Set(prices.map((p) => p.category).filter(Boolean))].sort();
  const locations = [...new Set(prices.map((p) => p.location).filter(Boolean))].sort();

  const filtered = prices.filter((p) => {
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return p.service.toLowerCase().includes(q) || (p.location ?? '').toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q);
  });

  const avg = filtered.length ? filtered.reduce((s, p) => s + p.rate, 0) / filtered.length : 0;
  const min = filtered.length ? Math.min(...filtered.map((p) => p.rate)) : 0;
  const max = filtered.length ? Math.max(...filtered.map((p) => p.rate)) : 0;
  const currency = filtered[0]?.currency ?? 'NGN';
  const fmt = (n) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleDelete = async (id) => {
    if (!confirm('Delete this rate?')) return;
    await api.delete(`/artisan-prices/${id}`);
    fetchPrices();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search services…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900 bg-white">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900 bg-white">
          <option value="">All locations</option>
          {locations.map((l) => <option key={l}>{l}</option>)}
        </select>
        <span className="text-sm text-gray-400 self-center hidden sm:block">{filtered.length} rates</span>
        {canEdit && (
          <button onClick={() => { setEditing(null); setModal(true); }}
            className="flex items-center gap-2 bg-primary-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 shrink-0">
            <Plus size={16} /> Add Rate
          </button>
        )}
      </div>

      {/* Average stats strip */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Min Rate', value: min, color: 'bg-green-50 border-green-200 text-green-800' },
            { label: `Avg Rate (${filtered.length} trades)`, value: avg, color: 'bg-blue-50 border-blue-200 text-blue-800' },
            { label: 'Max Rate', value: max, color: 'bg-red-50 border-red-200 text-red-800' },
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
          <HardHat size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500 text-sm">{prices.length === 0 ? 'No artisan rates yet.' : 'No results for your search.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[620px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Category', 'Service / Trade', 'Rate', 'Rate Unit', 'Location', 'Added by', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    {p.category ? <span className="bg-orange-50 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">{p.category}</span> : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.service}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{p.currency} {Number(p.rate).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500">{p.rateUnit}</td>
                  <td className="px-4 py-3 text-gray-500">{p.location || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{p.createdBy?.name ?? '—'}</td>
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

      <ArtisanModal open={modal} onClose={() => setModal(false)} onSaved={() => { setModal(false); fetchPrices(); }} editing={editing} />
    </div>
  );
}
