'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Package,
  Truck,
  AlertTriangle,
  BarChart3,
  Users,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Star,
  Download,
  Moon,
} from 'lucide-react';

const features = [
  {
    icon: Package,
    title: 'Inventory Management',
    description:
      'Track every product through its full lifecycle — from creation and image upload to verification and dispatch.',
  },
  {
    icon: Truck,
    title: 'Dispatch & Shipments',
    description:
      'Manage outbound shipments with tracking numbers, eBay sync, and real-time dispatch status.',
  },
  {
    icon: AlertTriangle,
    title: 'Defect Logging',
    description:
      'Log, photograph, and resolve product defects with severity levels and full audit trail.',
  },
  {
    icon: BarChart3,
    title: 'Live Dashboard',
    description:
      'Collapsible real-time overview of stock levels, open defects, pending verifications, and alerts.',
  },
  {
    icon: Users,
    title: 'Employee Tracker',
    description:
      'Monitor staff performance, rate employees, leave manager notes, and export per-employee reports.',
  },
  {
    icon: ShieldCheck,
    title: 'Audit Trail',
    description:
      'Every action is logged with user, timestamp, and context — searchable and exportable as CSV, XLSX, or PDF.',
  },
];

const faqs = [
  {
    q: 'Who is Warehouse HQ built for?',
    a: 'Warehouse HQ is designed for small-to-medium warehouse teams that need to track inventory, manage dispatches, and monitor employee performance — without complex ERP overhead.',
  },
  {
    q: 'What export formats are supported?',
    a: 'Every major list in the app — inventory, defects, shipments, employees, and audit logs — can be exported as CSV, Excel (XLSX), or PDF.',
  },
  {
    q: 'Can I manage multiple user roles?',
    a: 'Yes. Admins can create Staff and Admin accounts, assign departments, rate performance, and deactivate users. Staff have scoped access to their own workflows.',
  },
  {
    q: 'Does it integrate with eBay?',
    a: 'Yes. Verified products can be synced to your eBay store directly from the Shipments page once your eBay OAuth connection is configured.',
  },
  {
    q: 'Is dark mode supported?',
    a: 'Fully. The entire app — every page, modal, and table — supports dark mode with your system preference auto-detected on first load.',
  },
  {
    q: 'Is my data secure?',
    a: 'Authentication uses short-lived JWT access tokens and rotating refresh tokens. Product images are stored on AWS S3 with private access. All routes are protected.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
      >
        <span className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100">{q}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-4 pt-1 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <Package className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight">Warehouse HQ</span>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-xs font-semibold tracking-wide mb-5">
            <Star className="h-3 w-3" /> Warehouse operations, simplified
          </span>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white mb-5">
            Your warehouse.<br className="hidden sm:block" />
            <span className="text-brand-600"> Fully in control.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
            Warehouse HQ gives your team a single place to manage inventory, log defects, track
            shipments, monitor employee performance, and export everything — in real time.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-base font-bold shadow-lg shadow-brand-200 dark:shadow-brand-900/30 transition-colors"
            >
              Get Started — Sign In
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-base font-semibold transition-colors"
            >
              See features
              <ChevronDown className="h-4 w-4" />
            </a>
          </div>

          {/* Stat pills */}
          <div className="mt-12 flex flex-wrap justify-center gap-3 sm:gap-6">
            {[
              { label: 'Real-time dashboard', icon: BarChart3 },
              { label: 'CSV · XLSX · PDF export', icon: Download },
              { label: 'Dark mode', icon: Moon },
              { label: 'Role-based access', icon: ShieldCheck },
            ].map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-600 dark:text-slate-300 shadow-sm"
              >
                <Icon className="h-3.5 w-3.5 text-brand-500" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-3">
            Everything your warehouse needs
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
            Built for warehouse teams that move fast and need reliable, mobile-friendly tools.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group p-5 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-200 dark:hover:border-brand-700 hover:shadow-md transition-all"
            >
              <div className="h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mb-4 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/50 transition-colors">
                <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">{title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 dark:bg-slate-800/50 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-3">
            How it works
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-10 sm:mb-14 text-sm sm:text-base">
            From first login to full team visibility in minutes.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {[
              { step: '01', title: 'Sign in', body: 'Admin creates your account. Log in securely with email and password — no setup required.' },
              { step: '02', title: 'Add products', body: 'Create product records, upload images from any angle, and move them through the workflow.' },
              { step: '03', title: 'Track & export', body: 'Monitor the live dashboard, log defects, dispatch shipments, and export any report instantly.' },
            ].map(({ step, title, body }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-brand-600 text-white font-extrabold text-sm flex items-center justify-center mb-4 shadow-md shadow-brand-200 dark:shadow-brand-900/30">
                  {step}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-3">
            Frequently asked questions
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">
            Everything you need to know before you sign in.
          </p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-10 sm:py-14 text-center shadow-xl shadow-brand-200 dark:shadow-brand-900/30">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
            Ready to take control of your warehouse?
          </h2>
          <p className="text-brand-100 text-sm sm:text-base mb-7 max-w-xl mx-auto">
            Sign in now and get your team up and running with live inventory tracking, defect management, and instant reporting.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white hover:bg-brand-50 text-brand-700 font-bold text-base shadow transition-colors"
          >
            <CheckCircle className="h-5 w-5" />
            Sign In to Warehouse HQ
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 dark:border-slate-800 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-brand-600 flex items-center justify-center">
              <Package className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold text-slate-500 dark:text-slate-400">Warehouse HQ</span>
          </div>
          <p>© {new Date().getFullYear()} Warehouse HQ. All rights reserved.</p>
          <Link href="/login" className="hover:text-brand-600 transition-colors">
            Sign In
          </Link>
        </div>
      </footer>
    </div>
  );
}
