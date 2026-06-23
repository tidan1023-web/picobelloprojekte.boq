import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Calculator, Database, FileText, ArrowRight,
  CheckCircle, TrendingUp, Shield, Clock, ChevronRight,
} from 'lucide-react';

const HOW_IT_WORKS = [
  {
    n: '01',
    title: 'Add Your Past Projects',
    desc: 'Enter completed residential projects — size, condition, tier, and final cost. Each project becomes a data point that improves your estimates.',
  },
  {
    n: '02',
    title: 'Enter the New Project',
    desc: 'Input the project size in m², select the current condition of the property, and choose the desired finish tier.',
  },
  {
    n: '03',
    title: 'The Engine Calculates',
    desc: 'The system normalises past projects, removes outliers, adjusts for inflation and size, and produces a reliable ballpark cost.',
  },
  {
    n: '04',
    title: 'Review, Adjust & Send PDF',
    desc: 'Review the three-tier breakdown, edit client details and scope notes, then download a professional PDF on company letterhead.',
  },
];

const CONDITIONS = [
  { label: 'Carcass',          desc: 'Structure only — full interior scope ahead' },
  { label: 'Advanced Carcass', desc: 'External shell done — internal scope ahead' },
  { label: 'Semi-Finished',    desc: 'MEP rough-in done — finishes and fit-out ahead' },
  { label: 'Finished',         desc: 'Complete house needing a facelift' },
];

const TIERS = [
  { label: 'Basic',     color: 'bg-gray-100 text-gray-700',    desc: 'Functional and clean' },
  { label: 'Mid-Range', color: 'bg-blue-100 text-blue-700',    desc: 'Smart and polished' },
  { label: 'Premium',   color: 'bg-purple-100 text-purple-700', desc: 'High-end and bespoke' },
];

const FEATURES = [
  {
    icon: Database,
    color: 'bg-indigo-50 text-indigo-600',
    title: 'Learns from Your History',
    desc: "Every completed project you add makes the next estimate more accurate. The engine uses your own data, not industry averages.",
  },
  {
    icon: TrendingUp,
    color: 'bg-green-50 text-green-600',
    title: 'Outlier Removal',
    desc: "Unusual projects — too cheap or too expensive — are automatically detected and excluded so they don't skew your figures.",
  },
  {
    icon: Calculator,
    color: 'bg-blue-50 text-blue-600',
    title: 'Transparent Breakdown',
    desc: 'Every estimate shows exactly how the number was reached: base rate, condition adjustment, tier adjustment, and size scaling.',
  },
  {
    icon: FileText,
    color: 'bg-orange-50 text-orange-600',
    title: 'PDF on Letterhead',
    desc: 'Download a clean, professional preliminary estimate on your company letterhead with your logo, signature, and disclaimer.',
  },
  {
    icon: Clock,
    color: 'bg-yellow-50 text-yellow-600',
    title: 'Estimate History',
    desc: 'Every estimate is saved — who it was sent to, what assumptions were used, what rate was applied, and its current status.',
  },
  {
    icon: Shield,
    color: 'bg-red-50 text-red-600',
    title: 'Economies of Scale',
    desc: 'Larger projects automatically get a lower rate per m². Smaller projects get a higher rate. The size adjustment is baked in.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary-900 rounded-xl flex items-center justify-center shrink-0">
              <Building2 size={16} className="text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-primary-900 leading-tight">Pico Bello Projekte</p>
              <p className="text-xs text-gray-400 hidden sm:block">Residential Estimator</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-primary-900 transition-colors px-2 py-1">
              Sign In
            </Link>
            <Link to="/register"
              className="bg-primary-900 text-white text-sm font-medium px-3 sm:px-4 py-2 rounded-lg hover:bg-primary-800 transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-primary-900 text-white pt-12 pb-16 sm:pt-20 sm:pb-28 px-4 sm:px-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-400" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-blue-300" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative">
          <span className="inline-block bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold px-3 py-1 rounded-full mb-5 tracking-widest uppercase">
            Residential Construction · Abuja
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4 sm:mb-6">
            Ballpark Estimates<br />
            <span className="text-blue-300">Based on Your Own Projects</span>
          </h1>
          <p className="text-base sm:text-lg text-blue-200 max-w-2xl mx-auto mb-7 sm:mb-10 leading-relaxed">
            Before a full BOQ, you need a fast, credible number to share with a client.
            This tool uses your completed project history to produce a realistic cost estimate —
            adjusted for condition, finish tier, size, and inflation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register"
              className="flex items-center justify-center gap-2 bg-white text-primary-900 font-semibold px-6 py-3 sm:px-7 sm:py-3.5 rounded-xl hover:bg-blue-50 transition-colors shadow-lg">
              Start Estimating <ArrowRight size={17} />
            </Link>
            <Link to="/login"
              className="flex items-center justify-center gap-2 border border-blue-400/40 text-white font-medium px-6 py-3 sm:px-7 sm:py-3.5 rounded-xl hover:bg-primary-800 transition-colors">
              Sign In
            </Link>
          </div>
          <div className="flex flex-wrap gap-3 sm:gap-6 justify-center mt-8 sm:mt-12 text-blue-300 text-xs sm:text-sm">
            {['Experience-based', 'Outlier-resistant', 'PDF on letterhead', 'Full audit trail'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle size={13} className="text-blue-400" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-14 sm:py-24 px-4 sm:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">How It Works</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base">From opening the tool to sending a PDF — in under two minutes.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
            {HOW_IT_WORKS.map(({ n, title, desc }) => (
              <div key={n} className="flex gap-4">
                <div className="text-4xl sm:text-5xl font-black text-primary-100 leading-none shrink-0 w-10 sm:w-12 select-none">{n}</div>
                <div className="pt-1">
                  <h3 className="font-semibold text-gray-800 mb-1.5 text-sm sm:text-base">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONDITION + TIER GRID */}
      <section className="py-14 sm:py-24 px-4 sm:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Four Conditions, Three Tiers</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base">
              Select where the property starts and the quality of finish the client wants.
              The engine handles the rest.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Starting Condition</p>
              <div className="space-y-2.5">
                {CONDITIONS.map(({ label, desc }) => (
                  <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                    <ChevronRight size={14} className="text-primary-900 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Finish Tier</p>
              <div className="space-y-2.5">
                {TIERS.map(({ label, color, desc }) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${color}`}>{label}</span>
                    <p className="text-sm text-gray-600">{desc}</p>
                  </div>
                ))}
                <div className="mt-3 p-3 bg-primary-50 rounded-xl border border-primary-100">
                  <p className="text-xs text-primary-700 font-medium leading-relaxed">
                    The tool calculates all three tiers simultaneously, so you can present the client with options in a single document.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SAMPLE ESTIMATE */}
      <section className="py-14 sm:py-24 px-4 sm:px-8 bg-primary-900 text-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Sample Output</h2>
            <p className="text-blue-300 text-sm">250m² · Semi-Finished condition · Based on 8 historical projects</p>
          </div>
          <div className="bg-primary-800 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { tier: 'Basic',     rate: '₦78,400',  total: '₦19,600,000', selected: false },
                { tier: 'Mid-Range', rate: '₦113,700', total: '₦28,420,000', selected: true  },
                { tier: 'Premium',   rate: '₦164,600', total: '₦41,160,000', selected: false },
              ].map(({ tier, rate, total, selected }) => (
                <div key={tier} className={`rounded-xl p-4 ${selected ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-primary-700'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold">{tier}</p>
                    {selected && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Selected</span>}
                  </div>
                  <p className="text-xl font-black">{total}</p>
                  <p className="text-xs text-blue-300 mt-0.5">{rate} / m²</p>
                </div>
              ))}
            </div>
            <div className="bg-primary-700 rounded-xl p-4">
              <p className="text-xs text-blue-300 font-semibold uppercase tracking-wide mb-3">Breakdown</p>
              <div className="space-y-2">
                {[
                  ['Historical projects used',          '8 of 11 (3 outliers removed)'],
                  ['Base rate (carcass, basic, 150m²)', '₦96,200 /m²'],
                  ['Condition (semi-finished)',          '× 0.55'],
                  ['Tier (mid-range)',                  '× 1.45'],
                  ['Size adjustment (250m²)',           '× 0.930'],
                  ['Final rate per m²',                '₦113,700 /m²'],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-start justify-between gap-2 text-blue-200">
                    <span className="text-xs">{l}</span>
                    <span className="text-xs font-semibold text-white whitespace-nowrap">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-14 sm:py-24 px-4 sm:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Everything Built In</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base">No spreadsheets, no manual calculations. The system does the heavy lifting.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="bg-gray-50 rounded-2xl p-5 sm:p-6 border border-gray-100 hover:border-primary-200 transition-colors">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${color} mb-3 sm:mb-4`}>
                  <Icon size={18} />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1.5 text-sm sm:text-base">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-14 sm:py-24 px-4 sm:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Simple, Transparent Pricing</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base">
              One tool for your whole team. No hidden fees, no per-seat charges.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 items-start">

            {/* Basic */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7 flex flex-col">
              <div className="mb-5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Basic</span>
                <div className="mt-3 flex items-end gap-1.5">
                  <span className="text-4xl font-black text-gray-900">₦50,000</span>
                  <span className="text-gray-400 text-sm mb-1">/month</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">For teams getting started with digital estimating.</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {[
                  'Project Estimator',
                  'Estimate History (last 12 months)',
                  'Up to 3 team members',
                  'QS & Material Price Libraries',
                  'Invoices',
                  'Document Library',
                  'PDF downloads',
                  'Email support',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <CheckCircle size={15} className="text-green-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
                {[
                  'Analytics & Reporting',
                  'Price Intelligence',
                  'Scenario Simulator',
                  'Unlimited team members',
                  'Change Orders & Site Reports',
                  'Expense Tracker',
                  'Priority support',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-400 line-through decoration-gray-300">
                    <div className="w-3.5 h-3.5 mt-0.5 shrink-0 rounded-full border border-gray-200" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link to="/register"
                className="w-full flex items-center justify-center gap-2 border border-primary-900 text-primary-900 font-semibold py-3 rounded-xl hover:bg-primary-50 transition-colors text-sm">
                Get Started <ArrowRight size={15} />
              </Link>
            </div>

            {/* Premium */}
            <div className="bg-primary-900 rounded-2xl shadow-xl p-7 flex flex-col relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-blue-500/20 pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-blue-400/10 pointer-events-none" />

              <div className="mb-5 relative">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-blue-300 uppercase tracking-widest">Premium</span>
                  <span className="text-xs bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full font-semibold">Best Value</span>
                </div>
                <div className="mt-3 flex items-end gap-1.5">
                  <span className="text-4xl font-black text-white">₦300,000</span>
                  <span className="text-blue-300 text-sm mb-1">/year</span>
                </div>
                <p className="text-sm text-blue-300 mt-2">
                  Everything in Basic, plus the full platform — unlocked.
                  <span className="block mt-1 text-blue-400 text-xs">~₦25,000/month — save 50% vs Basic annual</span>
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1 relative">
                {[
                  'Everything in Basic',
                  'Unlimited team members',
                  'Full Analytics & Reporting',
                  'Price Intelligence (AI benchmarking)',
                  'Scenario Simulator',
                  'Change Orders & Approvals',
                  'Site Reports with photos',
                  'Expense Tracker',
                  'Progress Tracker',
                  'Contacts & CRM',
                  'Unlimited estimate history',
                  'Priority onboarding & support',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-blue-100">
                    <CheckCircle size={15} className="text-blue-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link to="/register"
                className="w-full flex items-center justify-center gap-2 bg-white text-primary-900 font-bold py-3 rounded-xl hover:bg-blue-50 transition-colors text-sm relative shadow-md">
                Get Full Access <ArrowRight size={15} />
              </Link>
            </div>

          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Prices in Nigerian Naira. All plans include a personal onboarding call. No contracts — cancel anytime.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-24 px-4 sm:px-8 bg-white text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Ready to Run Your First Estimate?</h2>
          <p className="text-gray-500 mb-7 leading-relaxed text-sm sm:text-base">
            Create your account, add a few past projects, and you'll have a credible ballpark in your client's inbox within minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register"
              className="flex items-center justify-center gap-2 bg-primary-900 text-white font-semibold px-7 py-3 rounded-xl hover:bg-primary-800 transition-colors shadow-md">
              Create Account <ArrowRight size={17} />
            </Link>
            <Link to="/login"
              className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 font-medium px-7 py-3 rounded-xl hover:bg-white transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 py-6 sm:py-8 px-4 sm:px-8 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-primary-900 rounded-lg flex items-center justify-center">
              <Building2 size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Pico Bello Projekte Limited</span>
          </div>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} Pico Bello Projekte. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
