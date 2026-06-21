import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sliders, RefreshCw, Save, AlertTriangle, CheckCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';

// ── Client-side engine (mirrors backend/src/utils/estimateEngine.js) ──────────
const BASE_CONDITION_MULT = { carcass: 1.00, advanced_carcass: 0.82, semi_finished: 0.55, finished: 0.18 };
const BASE_TIER_MULT      = { basic: 1.00, mid_range: 1.45, premium: 2.10 };
const REFERENCE_SIZE      = 150;
const FALLBACK_BASE_RATE  = 90000;

function sizeScale(sizeM2, exponent) {
  return Math.pow(REFERENCE_SIZE / sizeM2, exponent);
}
function inflationFactor(completedYear, rate) {
  return Math.pow(1 + rate, new Date().getFullYear() - completedYear);
}
function removeOutliers(rates) {
  if (rates.length < 4) return rates;
  const sorted = [...rates].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  return rates.filter(r => r >= q1 - 1.5 * iqr && r <= q3 + 1.5 * iqr);
}
function runSim(projects, { sizeM2, condition, inflationRate, sizeExponent, marketAdjust, yearsAhead, condMults, tierMults }) {
  const cMults = { ...BASE_CONDITION_MULT, ...condMults };
  const tMults = { ...BASE_TIER_MULT, ...tierMults };

  let baseRate = FALLBACK_BASE_RATE;
  let projectsTotal = 0, projectsUsed = 0, outliersRemoved = 0;
  let dataSource = 'fallback';

  if (projects.length > 0) {
    const allRates = projects.map(p => {
      const rawRate = p.totalCost / p.sizeM2;
      const c = cMults[p.condition] || 1;
      const t = tMults[p.tier] || 1;
      const s = sizeScale(p.sizeM2, sizeExponent);
      const y = inflationFactor(p.completedYear, inflationRate);
      return (rawRate * y) / (c * t * s);
    });
    const clean = removeOutliers(allRates);
    baseRate = clean.reduce((s, r) => s + r, 0) / clean.length;
    projectsTotal = projects.length;
    projectsUsed = clean.length;
    outliersRemoved = projects.length - clean.length;
    dataSource = 'historical';
  }

  // Forward projection (compound inflation for years ahead)
  const forwardFactor = Math.pow(1 + inflationRate, yearsAhead);
  // Market adjustment
  const marketFactor = 1 + marketAdjust / 100;
  const adjustedBase = baseRate * forwardFactor * marketFactor;

  const sMult = sizeScale(sizeM2, sizeExponent);
  const cMult = cMults[condition];

  const makeEst = (tier) => {
    const rate = adjustedBase * cMult * tMults[tier] * sMult;
    return { rate, total: rate * sizeM2 };
  };

  return {
    baseRate: adjustedBase,
    conditionMultiplier: cMult,
    sizeMultiplier: sMult,
    forwardFactor,
    marketFactor,
    projectsTotal, projectsUsed, outliersRemoved, dataSource,
    basicEstimate:     makeEst('basic'),
    midRangeEstimate:  makeEst('mid_range'),
    premiumEstimate:   makeEst('premium'),
  };
}

// ── UI helpers ─────────────────────────────────────────────────────────────────
const CONDITIONS = [
  { id: 'carcass',          label: 'Carcass',           short: 'CAR' },
  { id: 'advanced_carcass', label: 'Advanced Carcass',  short: 'ADV' },
  { id: 'semi_finished',    label: 'Semi-Finished',     short: 'S-F' },
  { id: 'finished',         label: 'Finished',          short: 'FIN' },
];
const TIERS = [
  { id: 'basic',     label: 'Basic',     color: 'bg-gray-100 text-gray-700' },
  { id: 'mid_range', label: 'Mid-Range', color: 'bg-blue-100 text-blue-700' },
  { id: 'premium',   label: 'Premium',   color: 'bg-purple-100 text-purple-700' },
];
const TIER_KEY = { basic: 'basicEstimate', mid_range: 'midRangeEstimate', premium: 'premiumEstimate' };

function fmt(n) { return Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 }); }

function SliderRow({ label, value, min, max, step, format, onChange, hint }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-gray-700">{label}</label>
        <span className="text-xs font-bold text-primary-900 tabular-nums">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary-900" />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function EstCard({ label, est, color, selected }) {
  return (
    <div className={`rounded-xl p-4 border-2 transition-all ${selected ? `border-primary-900 ${color} shadow-md` : 'border-gray-100 bg-white'}`}>
      <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-black text-gray-900">₦{fmt(est?.total)}</p>
      <p className="text-xs text-gray-500 mt-0.5">₦{fmt(est?.rate)} / m²</p>
    </div>
  );
}

const TIER_BG = { basic: 'bg-gray-50', mid_range: 'bg-blue-50', premium: 'bg-purple-50' };

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Simulator() {
  const navigate = useNavigate();

  // Project inputs
  const [sizeM2,    setSizeM2]    = useState(200);
  const [condition, setCondition] = useState('semi_finished');
  const [tier,      setTier]      = useState('mid_range');

  // Engine knobs
  const [inflationRate,  setInflationRate]  = useState(18);   // %
  const [marketAdjust,   setMarketAdjust]   = useState(0);    // %
  const [yearsAhead,     setYearsAhead]     = useState(0);    // years
  const [sizeExponent,   setSizeExponent]   = useState(10);   // ×0.01

  // Advanced multiplier overrides (shown in expandable section)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [condScale, setCondScale] = useState(100);  // % of default
  const [tierScale, setTierScale] = useState(100);  // % of default

  // Data
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/historical-projects')
      .then(({ data }) => setProjects(data.projects || []))
      .finally(() => setLoadingProjects(false));
  }, []);

  // Run simulation whenever any input changes
  const recalc = useCallback(() => {
    if (loadingProjects) return;
    const condMults = {};
    const tierMults = {};
    // Apply scale factors
    if (condScale !== 100) {
      const s = condScale / 100;
      Object.keys(BASE_CONDITION_MULT).forEach(k => { condMults[k] = BASE_CONDITION_MULT[k] * s; });
    }
    if (tierScale !== 100) {
      const s = tierScale / 100;
      Object.keys(BASE_TIER_MULT).forEach(k => { tierMults[k] = BASE_TIER_MULT[k] * s; });
    }
    const r = runSim(projects, {
      sizeM2,
      condition,
      inflationRate: inflationRate / 100,
      sizeExponent:  sizeExponent  / 100,
      marketAdjust,
      yearsAhead,
      condMults,
      tierMults,
    });
    setResult(r);
  }, [projects, loadingProjects, sizeM2, condition, inflationRate, marketAdjust, yearsAhead, sizeExponent, condScale, tierScale]);

  useEffect(() => { recalc(); }, [recalc]);

  const reset = () => {
    setSizeM2(200); setCondition('semi_finished'); setTier('mid_range');
    setInflationRate(18); setMarketAdjust(0); setYearsAhead(0);
    setSizeExponent(10); setCondScale(100); setTierScale(100);
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const { data } = await api.post('/estimates', {
        projectName: `Simulator Scenario — ${CONDITIONS.find(c => c.id === condition)?.label}, ${sizeM2}m²`,
        sizeM2, condition, tier,
        scopeAssumptions: [
          `Inflation rate: ${inflationRate}%`,
          marketAdjust !== 0 ? `Market adjustment: ${marketAdjust > 0 ? '+' : ''}${marketAdjust}%` : '',
          yearsAhead > 0 ? `Projected ${yearsAhead} year${yearsAhead !== 1 ? 's' : ''} forward` : '',
          condScale !== 100 ? `Condition scale: ${condScale}%` : '',
          tierScale !== 100 ? `Tier scale: ${tierScale}%` : '',
        ].filter(Boolean).join(' · '),
      });
      navigate(`/app/estimates/${data.estimate._id}`);
    } finally { setSaving(false); }
  };

  const selectedEst = result ? result[TIER_KEY[tier]] : null;

  return (
    <div className="max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Sliders size={18} className="text-primary-900" /> Scenario Simulator
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Adjust assumptions and see how estimates respond — without saving anything.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
            <RefreshCw size={13} /> Reset
          </button>
          <button onClick={handleSave} disabled={saving || !result}
            className="flex items-center gap-1.5 bg-primary-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-60 transition-colors">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save as Estimate
          </button>
        </div>
      </div>

      {/* No data warning */}
      {!loadingProjects && projects.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-amber-700">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          No historical projects — simulator is using industry fallback rate (₦90,000/m² base). Add past projects for accuracy.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── Controls ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Project inputs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Project</p>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Size (m²)
                <span className="ml-2 font-bold text-primary-900">{sizeM2} m²</span>
              </label>
              <input type="range" min={50} max={1000} step={10} value={sizeM2}
                onChange={e => setSizeM2(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary-900" />
              <div className="flex justify-between text-xs text-gray-300 mt-1">
                <span>50m²</span><span>500m²</span><span>1000m²</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Condition</label>
              <div className="grid grid-cols-2 gap-1.5">
                {CONDITIONS.map(c => (
                  <button key={c.id} onClick={() => setCondition(c.id)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border-2 transition-all text-left ${
                      condition === c.id ? 'border-primary-900 bg-primary-50 text-primary-900' : 'border-gray-100 text-gray-600 hover:border-gray-300'
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Tier</label>
              <div className="flex gap-1.5">
                {TIERS.map(t => (
                  <button key={t.id} onClick={() => setTier(t.id)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                      tier === t.id ? 'border-primary-900 bg-primary-50 text-primary-900' : 'border-gray-100 text-gray-600 hover:border-gray-300'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Engine knobs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Assumptions</p>

            <SliderRow label="Annual Inflation Rate" value={inflationRate} min={5} max={40} step={1}
              format={v => `${v}%`}
              hint="Adjusts how past project costs are inflated to today"
              onChange={setInflationRate} />

            <SliderRow label="Market Rate Adjustment" value={marketAdjust} min={-30} max={50} step={1}
              format={v => `${v > 0 ? '+' : ''}${v}%`}
              hint="Add a premium or discount to the calculated rate"
              onChange={setMarketAdjust} />

            <SliderRow label="Years Forward" value={yearsAhead} min={0} max={5} step={1}
              format={v => v === 0 ? 'Now' : `+${v} yr${v !== 1 ? 's' : ''}`}
              hint="Project estimate into the future at the inflation rate"
              onChange={setYearsAhead} />

            {/* Advanced toggle */}
            <button onClick={() => setShowAdvanced(v => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
              {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {showAdvanced ? 'Hide' : 'Show'} advanced multipliers
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-1 border-t border-gray-100">
                <SliderRow label="Condition Multiplier Scale" value={condScale} min={70} max={130} step={5}
                  format={v => `${v}%`}
                  hint="Scales all four condition adjustments up or down"
                  onChange={setCondScale} />
                <SliderRow label="Tier Multiplier Scale" value={tierScale} min={70} max={130} step={5}
                  format={v => `${v}%`}
                  hint="Scales the gap between Basic, Mid-Range, and Premium"
                  onChange={setTierScale} />
                <SliderRow label="Size Economies of Scale" value={sizeExponent} min={0} max={25} step={1}
                  format={v => `${(v / 100).toFixed(2)}`}
                  hint="Higher = larger projects get a bigger discount"
                  onChange={setSizeExponent} />
              </div>
            )}
          </div>
        </div>

        {/* ── Live results ──────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">

          {loadingProjects ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-900" />
            </div>
          ) : result && (
            <>
              {/* Selected tier highlight */}
              <div className={`rounded-2xl p-6 ${TIER_BG[tier]} border-2 border-primary-900`}>
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-xs font-semibold text-primary-700 uppercase tracking-widest mb-1">
                      {TIERS.find(t => t.id === tier)?.label} · {CONDITIONS.find(c => c.id === condition)?.label} · {sizeM2}m²
                    </p>
                    <p className="text-4xl font-black text-gray-900">₦{fmt(selectedEst?.total)}</p>
                    <p className="text-sm text-gray-600 mt-1">₦{fmt(selectedEst?.rate)} per m²</p>
                  </div>
                  {yearsAhead > 0 && (
                    <div className="bg-white/70 rounded-xl px-3 py-2 text-right">
                      <p className="text-xs text-gray-500">Projected {yearsAhead}yr forward</p>
                      <p className="text-sm font-bold text-primary-900">×{result.forwardFactor.toFixed(3)} inflation</p>
                    </div>
                  )}
                </div>
                {marketAdjust !== 0 && (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 bg-white/60 px-3 py-1 rounded-full">
                    Market adjustment: {marketAdjust > 0 ? '+' : ''}{marketAdjust}%
                  </div>
                )}
              </div>

              {/* All 3 tiers */}
              <div className="grid grid-cols-3 gap-3">
                <EstCard label="Basic"     est={result.basicEstimate}    color="bg-gray-50"   selected={tier === 'basic'} />
                <EstCard label="Mid-Range" est={result.midRangeEstimate} color="bg-blue-50"   selected={tier === 'mid_range'} />
                <EstCard label="Premium"   est={result.premiumEstimate}  color="bg-purple-50" selected={tier === 'premium'} />
              </div>

              {/* Breakdown */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Calculation Breakdown</p>

                {result.dataSource === 'fallback' ? (
                  <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Using industry fallback rate — add historical projects for experience-based estimates.
                  </div>
                ) : (
                  <div className="mb-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                    <CheckCircle size={12} />
                    {result.projectsUsed} of {result.projectsTotal} projects used · {result.outliersRemoved} outlier{result.outliersRemoved !== 1 ? 's' : ''} removed
                  </div>
                )}

                <div className="space-y-2">
                  {[
                    ['Base rate (carcass, basic, 150m², today)',                     `₦${fmt(result.baseRate)} /m²`],
                    [`Condition: ${CONDITIONS.find(c => c.id === condition)?.label}`,`× ${result.conditionMultiplier.toFixed(2)}`],
                    [`Tier: ${TIERS.find(t => t.id === tier)?.label}`,              `× ${(BASE_TIER_MULT[tier] * (tierScale / 100)).toFixed(2)}`],
                    [`Size scaling (${sizeM2}m²)`,                                  `× ${result.sizeMultiplier.toFixed(3)}`],
                    yearsAhead > 0 && [`Forward projection (+${yearsAhead}yr @ ${inflationRate}%)`, `× ${result.forwardFactor.toFixed(3)}`],
                    marketAdjust !== 0 && [`Market adjustment`,                     `× ${result.marketFactor.toFixed(2)}`],
                    ['Final rate per m²',                                            `₦${fmt(selectedEst?.rate)} /m²`],
                    ['Estimated total',                                              `₦${fmt(selectedEst?.total)}`],
                  ].filter(Boolean).map(([l, v]) => (
                    <div key={l} className="flex items-center justify-between gap-4 py-1 border-b border-gray-50 last:border-0">
                      <span className="text-xs text-gray-500">{l}</span>
                      <span className="text-xs font-semibold text-gray-800 whitespace-nowrap">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* All conditions at current tier */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                  {TIERS.find(t => t.id === tier)?.label} Tier — All Conditions at {sizeM2}m²
                </p>
                <div className="space-y-2">
                  {CONDITIONS.map(c => {
                    const cMult = BASE_CONDITION_MULT[c.id] * (condScale / 100);
                    const tMult = BASE_TIER_MULT[tier] * (tierScale / 100);
                    const rate  = result.baseRate * cMult * tMult * result.sizeMultiplier;
                    const total = rate * sizeM2;
                    const isActive = condition === c.id;
                    return (
                      <button key={c.id} onClick={() => setCondition(c.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left ${
                          isActive ? 'bg-primary-50 border-2 border-primary-900' : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                        }`}>
                        <span className={`text-sm font-medium ${isActive ? 'text-primary-900' : 'text-gray-700'}`}>{c.label}</span>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${isActive ? 'text-primary-900' : 'text-gray-800'}`}>₦{fmt(total)}</p>
                          <p className="text-xs text-gray-400">₦{fmt(rate)} /m²</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
