import React, { useState } from 'react';
import { Search, TrendingUp, TrendingDown, BarChart2, Star, AlertCircle, FlaskConical, RotateCcw } from 'lucide-react';
import api from '../services/api';

const SOURCE_COLORS = {
  'QS Library': 'bg-blue-50 text-blue-700 border-blue-200',
  'Artisan': 'bg-orange-50 text-orange-700 border-orange-200',
  'Material Supplier': 'bg-green-50 text-green-700 border-green-200',
};

const TYPE_OPTS = [
  { value: '', label: 'All sources' },
  { value: 'qs', label: 'QS Library only' },
  { value: 'artisan', label: 'Artisan rates only' },
  { value: 'material', label: 'Material suppliers only' },
];

function StatCard({ label, value, currency, icon: Icon, color, sub }) {
  return (
    <div className={`rounded-xl p-4 border ${color}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
        <Icon size={15} className="opacity-60" />
      </div>
      <p className="text-xl font-bold">{currency} {Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

const DEFAULT_SIM = { materialFactor: 0, laborFactor: 0, overhead: 0, profit: 0 };

export default function PricingIntelligence() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [showSim, setShowSim] = useState(false);
  const [sim, setSim] = useState(DEFAULT_SIM);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(''); setData(null); setSearched(true);
    try {
      const params = new URLSearchParams({ query: query.trim() });
      if (type) params.set('type', type);
      const { data: res } = await api.get(`/pricing/intelligence?${params}`);
      setData(res);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Search failed');
    } finally { setLoading(false); }
  };

  const setSim_ = (k) => (e) => setSim((s) => ({ ...s, [k]: Number(e.target.value) }));

  // Apply simulation factors to a price based on source type
  const simulate = (r) => {
    let p = r.price;
    if (r.source === 'Material Supplier') p *= (1 + sim.materialFactor / 100);
    if (r.source === 'Artisan') p *= (1 + sim.laborFactor / 100);
    p *= (1 + sim.overhead / 100);
    p *= (1 + sim.profit / 100);
    return p;
  };

  const simActive = Object.values(sim).some((v) => v !== 0);
  const currency = data?.results?.[0]?.currency ?? 'NGN';

  const simResults = data?.results?.map((r) => ({ ...r, simPrice: simulate(r) })) ?? [];
  const simAvg = simResults.length ? simResults.reduce((s, r) => s + r.simPrice, 0) / simResults.length : 0;
  const simMin = simResults.length ? Math.min(...simResults.map((r) => r.simPrice)) : 0;
  const simMax = simResults.length ? Math.max(...simResults.map((r) => r.simPrice)) : 0;

  const sliderCls = 'w-full accent-primary-900';

  return (
    <div className="max-w-4xl space-y-5">
      {/* Search bar */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-800 mb-1">Search Pricing Data</h2>
        <p className="text-sm text-gray-500 mb-4">Search across QS library, artisan rates, and material suppliers for intelligent price recommendations.</p>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Cement, Bricklayer, Reinforced Concrete…"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900" />
          </div>
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-900">
            {TYPE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button type="submit" disabled={loading || !query.trim()}
            className="flex items-center gap-2 bg-primary-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-60 shrink-0">
            <Search size={15} /> {loading ? 'Searching…' : 'Search'}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading && <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-900" /></div>}

      {searched && !loading && data?.results?.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <BarChart2 size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500">No pricing data found for <strong>"{query}"</strong>.</p>
          <p className="text-sm text-gray-400 mt-1">Try adding entries in QS Prices, Artisan Rates, or Materials.</p>
        </div>
      )}

      {data?.results?.length > 0 && (
        <>
          {/* Base intelligence cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Minimum" value={data.intelligence.min} currency={currency} icon={TrendingDown} color="bg-green-50 border-green-200 text-green-800" />
            <StatCard label="Maximum" value={data.intelligence.max} currency={currency} icon={TrendingUp} color="bg-red-50 border-red-200 text-red-800" />
            <StatCard label="Average" value={data.intelligence.average} currency={currency} icon={BarChart2} color="bg-blue-50 border-blue-200 text-blue-800" />
            <div className="rounded-xl p-4 border bg-primary-900 border-primary-800 text-white">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Recommended</p>
                <Star size={15} className="opacity-60" />
              </div>
              <p className="text-xl font-bold">{currency} {Number(data.intelligence.recommended).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-xs opacity-60 mt-0.5">avg + 10% buffer</p>
            </div>
          </div>

          {/* Scenario Simulator toggle */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button onClick={() => setShowSim((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2">
                <FlaskConical size={17} className="text-primary-900" />
                <span className="font-semibold text-gray-800 text-sm">Scenario Simulator</span>
                {simActive && <span className="bg-primary-900 text-white text-xs px-2 py-0.5 rounded-full">Active</span>}
              </div>
              <span className="text-xs text-gray-400">{showSim ? 'Hide' : 'Show'}</span>
            </button>

            {showSim && (
              <div className="px-5 pb-5 border-t border-gray-100">
                <p className="text-xs text-gray-500 mt-3 mb-4">Adjust factors to simulate price scenarios — see the impact on the table below in real time.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {[
                    { key: 'materialFactor', label: 'Material Cost Adjustment', color: 'text-green-700' },
                    { key: 'laborFactor', label: 'Labour Rate Adjustment', color: 'text-orange-700' },
                    { key: 'overhead', label: 'Overhead (%)', color: 'text-blue-700' },
                    { key: 'profit', label: 'Profit Margin (%)', color: 'text-purple-700' },
                  ].map(({ key, label, color }) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-700">{label}</label>
                        <span className={`text-sm font-bold ${color}`}>
                          {sim[key] > 0 ? '+' : ''}{sim[key]}%
                        </span>
                      </div>
                      <input type="range" min="-50" max="100" step="1" value={sim[key]}
                        onChange={setSim_(key)} className={sliderCls} />
                      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                        <span>-50%</span><span>0</span><span>+100%</span>
                      </div>
                    </div>
                  ))}
                </div>

                {simActive && (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-800">
                      <p className="text-xs font-semibold uppercase opacity-70 mb-1">Sim Min</p>
                      <p className="text-base font-bold">{currency} {simMin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-800">
                      <p className="text-xs font-semibold uppercase opacity-70 mb-1">Sim Avg</p>
                      <p className="text-base font-bold">{currency} {simAvg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-800">
                      <p className="text-xs font-semibold uppercase opacity-70 mb-1">Sim Max</p>
                      <p className="text-base font-bold">{currency} {simMax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                )}

                <button onClick={() => setSim(DEFAULT_SIM)}
                  className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600">
                  <RotateCcw size={12} /> Reset all factors
                </button>
              </div>
            )}
          </div>

          {/* Source breakdown table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">
                Price Sources <span className="text-gray-400 font-normal text-sm ml-1">({data.results.length} found)</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Source', 'Name', 'Base Price', simActive && 'Simulated', 'Unit', 'Location'].filter(Boolean).map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {simResults.map((r, i) => {
                    const diff = r.simPrice - r.price;
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SOURCE_COLORS[r.source] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {r.source}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{r.currency} {Number(r.price).toLocaleString()}</td>
                        {simActive && (
                          <td className="px-4 py-3">
                            <span className="font-semibold text-primary-900">{r.currency} {r.simPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span className={`ml-2 text-xs font-medium ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                              {diff > 0 ? '+' : ''}{diff.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-gray-500">{r.unit}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{r.location || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!searched && (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <BarChart2 size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500">Enter a search term above to analyse pricing data.</p>
          <p className="text-sm text-gray-400 mt-1">Results are pulled from all three pricing libraries.</p>
        </div>
      )}
    </div>
  );
}
