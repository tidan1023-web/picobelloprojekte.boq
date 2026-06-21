import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Trash2, Search, Loader2, Eye } from 'lucide-react';
import api from '../services/api';

const STATUS_COLORS = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
};
const TIER_COLORS = {
  basic:     'bg-gray-100 text-gray-700',
  mid_range: 'bg-blue-100 text-blue-700',
  premium:   'bg-purple-100 text-purple-700',
};
const CONDITION_SHORT = {
  carcass: 'Carcass', advanced_carcass: 'Adv. Carcass',
  semi_finished: 'Semi-Finished', finished: 'Finished',
};

function fmt(n) {
  return Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

export default function EstimateHistory() {
  const navigate = useNavigate();
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('all');
  const [pdfId, setPdfId]         = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/estimates')
      .then(({ data }) => setEstimates(data.estimates || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this estimate?')) return;
    await api.delete(`/estimates/${id}`);
    load();
  };

  const handlePdf = async (e) => {
    e.stopPropagation();
    setPdfId(e.currentTarget.dataset.id);
    try {
      const id   = e.currentTarget.dataset.id;
      const num  = e.currentTarget.dataset.num;
      const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
      const res  = await fetch(`${base}/api/estimates/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url; a.download = `estimate-${num}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } finally { setPdfId(null); }
  };

  const filtered = estimates.filter(e => {
    const matchStatus = filter === 'all' || e.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      e.projectName?.toLowerCase().includes(q) ||
      e.clientName?.toLowerCase().includes(q) ||
      e.estimateNumber?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search project, client, number…"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30" />
        </div>
        <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
          {['all', 'draft', 'sent', 'accepted', 'declined'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filter === s ? 'bg-white text-primary-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={() => navigate('/app/estimator')}
          className="flex items-center gap-2 bg-primary-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-800 shrink-0">
          + New Estimate
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-900" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-20" />
          <p>{estimates.length === 0 ? 'No estimates yet.' : 'No results.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Mobile: cards */}
          <div className="sm:hidden divide-y divide-gray-50">
            {filtered.map(e => (
              <div key={e._id} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1" onClick={() => navigate(`/app/estimates/${e._id}`)}>
                    <p className="font-semibold text-gray-800 text-sm truncate">{e.projectName}</p>
                    <p className="text-xs text-gray-400">{e.estimateNumber} · {e.clientName || '—'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize shrink-0 ${STATUS_COLORS[e.status]}`}>{e.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2" onClick={() => navigate(`/app/estimates/${e._id}`)}>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${TIER_COLORS[e.selectedTier]}`}>
                      {e.selectedTier?.replace('_', '-')}
                    </span>
                    <span className="text-xs text-gray-400">{e.sizeM2}m²</span>
                    <p className="text-sm font-bold text-gray-800">₦{fmt(e.selectedTotal)}</p>
                  </div>
                  <div className="flex items-center gap-1" onClick={ev => ev.stopPropagation()}>
                    <button onClick={() => navigate(`/app/estimates/${e._id}`)}
                      className="p-1.5 text-gray-400 hover:text-primary-900 rounded-lg hover:bg-gray-100">
                      <Eye size={13} />
                    </button>
                    <button data-id={e._id} data-num={e.estimateNumber} onClick={handlePdf}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                      {pdfId === e._id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    </button>
                    <button onClick={() => handleDelete(e._id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['No.', 'Project', 'Client', 'Size', 'Condition', 'Tier', 'Total', 'Status', 'Date', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(e => (
                  <tr key={e._id} onClick={() => navigate(`/app/estimates/${e._id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.estimateNumber}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[160px] truncate">{e.projectName}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{e.clientName || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{e.sizeM2}m²</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{CONDITION_SHORT[e.condition]}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${TIER_COLORS[e.selectedTier]}`}>
                        {e.selectedTier?.replace('_', '-')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">₦{fmt(e.selectedTotal)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[e.status]}`}>{e.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2" onClick={ev => ev.stopPropagation()}>
                        <button data-id={e._id} data-num={e.estimateNumber} onClick={handlePdf}
                          className="text-gray-400 hover:text-primary-900 transition-colors">
                          {pdfId === e._id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        </button>
                        <button onClick={() => handleDelete(e._id)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">{filtered.length} of {estimates.length} estimate{estimates.length !== 1 ? 's' : ''}</p>
    </div>
  );
}
