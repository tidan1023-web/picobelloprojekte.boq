import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, ArrowLeft, Loader2, Home, Layers, Paintbrush, Wrench } from 'lucide-react';
import api from '../services/api';

// ── Data ──────────────────────────────────────────────────────────────────────
const CONDITIONS = [
  {
    id: 'carcass',
    label: 'Carcass',
    icon: Layers,
    color: 'border-stone-300 bg-stone-50',
    activeColor: 'border-primary-900 bg-primary-50 ring-2 ring-primary-900/20',
    description: 'Structure and blockwork only. MEP, finishes, doors, windows, fittings, and fixtures all still needed.',
    scope: 'Full interior scope',
  },
  {
    id: 'advanced_carcass',
    label: 'Advanced Carcass',
    icon: Home,
    color: 'border-blue-200 bg-blue-50/40',
    activeColor: 'border-primary-900 bg-primary-50 ring-2 ring-primary-900/20',
    description: 'External shell complete — structure, external finishes, doors, and windows done. Internal finishes and MEP still needed.',
    scope: 'Internal scope only',
  },
  {
    id: 'semi_finished',
    label: 'Semi-Finished',
    icon: Wrench,
    color: 'border-yellow-200 bg-yellow-50/40',
    activeColor: 'border-primary-900 bg-primary-50 ring-2 ring-primary-900/20',
    description: 'Structure, external works, MEP piping/wiring, plaster, and ceiling are done. Needs floor finishes, paint, fittings, and final works.',
    scope: 'Finishes and fit-out',
  },
  {
    id: 'finished',
    label: 'Finished (Facelift)',
    icon: Paintbrush,
    color: 'border-green-200 bg-green-50/40',
    activeColor: 'border-primary-900 bg-primary-50 ring-2 ring-primary-900/20',
    description: 'House is complete but needs a refresh — new paint, decoration, updated fittings, and fixtures.',
    scope: 'Decoration and fittings only',
  },
];

const TIERS = [
  {
    id: 'basic',
    label: 'Basic',
    color: 'border-gray-200',
    activeColor: 'border-primary-900 bg-primary-50 ring-2 ring-primary-900/20',
    description: 'Functional and clean. Standard fittings, mid-spec tiles, basic kitchen.',
    examples: ['Standard tiles', 'Basic sanitaryware', 'Economy kitchen'],
  },
  {
    id: 'mid_range',
    label: 'Mid-Range',
    color: 'border-blue-200',
    activeColor: 'border-primary-900 bg-primary-50 ring-2 ring-primary-900/20',
    description: 'Smart and polished. Good quality fittings, imported tiles, well-equipped kitchen.',
    examples: ['Imported tiles', 'Quality sanitaryware', 'Semi-fitted kitchen'],
  },
  {
    id: 'premium',
    label: 'Premium',
    color: 'border-purple-200',
    activeColor: 'border-primary-900 bg-primary-50 ring-2 ring-primary-900/20',
    description: 'High-end and bespoke. Luxury fittings, premium finishes, custom kitchen.',
    examples: ['Porcelain / marble', 'Premium sanitaryware', 'Custom kitchen'],
  },
];

const STEPS = ['Project Details', 'Condition', 'Tier & Scope'];

function StepIndicator({ step }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              i < step  ? 'bg-primary-900 text-white' :
              i === step ? 'bg-primary-900 text-white ring-4 ring-primary-900/20' :
              'bg-gray-100 text-gray-400'
            }`}>
              {i < step ? <CheckCircle size={16} /> : i + 1}
            </div>
            <p className={`text-xs mt-1.5 font-medium whitespace-nowrap ${i === step ? 'text-primary-900' : i < step ? 'text-gray-500' : 'text-gray-300'}`}>
              {label}
            </p>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-5 transition-colors ${i < step ? 'bg-primary-900' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30';

export default function Estimator() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    projectName:     '',
    clientName:      '',
    clientPhone:     '',
    clientEmail:     '',
    location:        '',
    sizeM2:          '',
    condition:       '',
    tier:            '',
    includesFurniture: false,
    includesKitchen:   false,
    includesWardrobes: false,
    scopeAssumptions: '',
    exclusions:       '',
    validityDays:     30,
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const canNext0 = form.projectName.trim() && form.sizeM2 > 0;
  const canNext1 = !!form.condition;
  const canNext2 = !!form.tier;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const { data } = await api.post('/estimates', { ...form, sizeM2: Number(form.sizeM2) });
      navigate(`/app/estimates/${data.estimate._id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <StepIndicator step={step} />

      {/* ── Step 0: Project Details ─────────────────────────────────────── */}
      {step === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Project Details</h2>
            <p className="text-sm text-gray-500 mt-0.5">Enter the basic information about this project.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Project Name <span className="text-red-500">*</span></label>
              <input value={form.projectName} onChange={e => set('projectName', e.target.value)}
                className={inputCls} placeholder="e.g. Musa Residence, Wuse II" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Client Name</label>
              <input value={form.clientName} onChange={e => set('clientName', e.target.value)}
                className={inputCls} placeholder="Full name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Client Phone</label>
              <input value={form.clientPhone} onChange={e => set('clientPhone', e.target.value)}
                className={inputCls} placeholder="+234 800 000 0000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Client Email</label>
              <input type="email" value={form.clientEmail} onChange={e => set('clientEmail', e.target.value)}
                className={inputCls} placeholder="client@email.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)}
                className={inputCls} placeholder="e.g. Gwarinpa, Abuja" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Project Size (m²) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input type="number" min="1" value={form.sizeM2} onChange={e => set('sizeM2', e.target.value)}
                  className={inputCls + ' pr-10'} placeholder="e.g. 250" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">m²</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={() => setStep(1)} disabled={!canNext0}
              className="flex items-center gap-2 bg-primary-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-800 disabled:opacity-50 transition-colors">
              Next: Select Condition <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 1: Condition ───────────────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Current Condition</h2>
            <p className="text-sm text-gray-500 mt-0.5">What is the starting state of the property?</p>
          </div>

          <div className="space-y-3">
            {CONDITIONS.map(({ id, label, icon: Icon, color, activeColor, description, scope }) => (
              <button key={id} onClick={() => set('condition', id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${form.condition === id ? activeColor : color + ' hover:border-gray-300'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${form.condition === id ? 'bg-primary-900 text-white' : 'bg-white text-gray-500'}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 text-sm">{label}</p>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{scope}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
                  </div>
                  {form.condition === id && <CheckCircle size={18} className="text-primary-900 shrink-0 mt-0.5" />}
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(0)}
              className="flex items-center gap-2 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              <ArrowLeft size={15} /> Back
            </button>
            <button onClick={() => setStep(2)} disabled={!canNext1}
              className="flex items-center gap-2 bg-primary-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-800 disabled:opacity-50 transition-colors">
              Next: Select Tier <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Tier + Scope ────────────────────────────────────────── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Finish Tier & Scope</h2>
            <p className="text-sm text-gray-500 mt-0.5">Choose the quality level and what is included.</p>
          </div>

          {/* Tier selection */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Finish Tier</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TIERS.map(({ id, label, color, activeColor, description, examples }) => (
                <button key={id} onClick={() => set('tier', id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${form.tier === id ? activeColor : color + ' hover:border-gray-300'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-gray-800 text-sm">{label}</p>
                    {form.tier === id && <CheckCircle size={15} className="text-primary-900" />}
                  </div>
                  <p className="text-xs text-gray-500 mb-2 leading-relaxed">{description}</p>
                  <ul className="space-y-0.5">
                    {examples.map(ex => (
                      <li key={ex} className="text-xs text-gray-400 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" /> {ex}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>

          {/* Includes */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">What's Included?</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'includesFurniture', label: 'Furniture' },
                { key: 'includesKitchen',   label: 'Kitchen' },
                { key: 'includesWardrobes', label: 'Wardrobes' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => set(key, !form[key])}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    form[key] ? 'border-primary-900 bg-primary-50 text-primary-900' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  {form[key] && <CheckCircle size={13} />} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional extras */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Scope Assumptions (optional)</label>
              <textarea rows={2} value={form.scopeAssumptions} onChange={e => set('scopeAssumptions', e.target.value)}
                className={inputCls + ' resize-none'} placeholder="e.g. Assumes standard ceiling heights, no structural alterations…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Exclusions (optional)</label>
              <textarea rows={2} value={form.exclusions} onChange={e => set('exclusions', e.target.value)}
                className={inputCls + ' resize-none'} placeholder="e.g. Excludes external landscaping, security systems, generator…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Validity (days)</label>
                <input type="number" min="1" value={form.validityDays} onChange={e => set('validityDays', Number(e.target.value))}
                  className={inputCls} />
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(1)}
              className="flex items-center gap-2 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              <ArrowLeft size={15} /> Back
            </button>
            <button onClick={handleSubmit} disabled={!canNext2 || saving}
              className="flex items-center gap-2 bg-primary-900 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-800 disabled:opacity-50 transition-colors">
              {saving ? <><Loader2 size={15} className="animate-spin" /> Calculating…</> : <>Calculate Estimate <ArrowRight size={15} /></>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
