import React, { useState } from 'react';
import {
  LayoutDashboard, FolderOpen, Users, BookOpen, GitCompare,
  HardHat, Package, Zap, FileText, Calculator, TrendingUp,
  GitPullRequest, ClipboardList, Receipt, BarChart2, Library,
  UserCog, Settings, History, Sliders, CheckCircle,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const GUIDES = {
  admin: [
    {
      icon: LayoutDashboard,
      title: 'Dashboard',
      desc: 'Your command centre. See live summaries of active projects, recent estimates, outstanding invoices, and team activity at a glance.',
    },
    {
      icon: FolderOpen,
      title: 'Projects',
      desc: 'Create and manage every construction project. Set budgets, timelines, client details, and status. All other modules (documents, progress, reports) link back here.',
    },
    {
      icon: Users,
      title: 'Contacts',
      desc: 'Maintain a directory of clients, subcontractors, and suppliers. Link contacts to projects and keep all communication in one place.',
    },
    {
      icon: BookOpen,
      title: 'QS Prices',
      desc: 'Your master rate library. Add, edit, and lock unit rates for every trade item. These rates feed directly into estimates and BOQs across the platform.',
    },
    {
      icon: GitCompare,
      title: 'QS Comparison',
      desc: 'Compare rate submissions from different quantity surveyors side by side. Identify discrepancies, pick the best rates, and build consensus pricing.',
    },
    {
      icon: HardHat,
      title: 'Artisan Rates',
      desc: 'Manage day-rates and piece-rates for carpenters, masons, painters, and every other trade. Used in labour cost calculations throughout the app.',
    },
    {
      icon: Package,
      title: 'Materials',
      desc: 'Maintain a live material price list — cement, reinforcement, tiles, roofing, and more. Prices here are referenced by the estimator and intelligence modules.',
    },
    {
      icon: Zap,
      title: 'Price Intelligence',
      desc: "AI-powered benchmarking that compares your rates against market data. Spot where you're over- or under-priced and adjust before it costs you a contract.",
    },
    {
      icon: Calculator,
      title: 'Project Estimator',
      desc: 'Generate detailed cost estimates in minutes. Select project type, condition, size, and build tier — the engine prices every element automatically using your rate libraries.',
    },
    {
      icon: History,
      title: 'Estimate History & Simulator',
      desc: 'Review all past estimates and run what-if scenario simulations. Change inputs (material costs, labour rates, size) and instantly see the cost impact.',
    },
    {
      icon: FileText,
      title: 'Invoices',
      desc: 'Create, send, and track invoices linked to projects. Record payments, monitor outstanding balances, and download PDFs for clients.',
    },
    {
      icon: TrendingUp,
      title: 'Progress Tracker',
      desc: 'Log and monitor construction progress by phase — substructure, superstructure, finishes, and more. Import from Excel or enter updates manually.',
    },
    {
      icon: GitPullRequest,
      title: 'Change Orders',
      desc: 'Manage scope changes formally. Team members submit change requests; you review, price, and approve or reject them. Every change is logged with a paper trail.',
    },
    {
      icon: ClipboardList,
      title: 'Site Reports',
      desc: 'Your team files daily or weekly site reports — photos, weather, manpower, and progress notes. You can review all reports and add comments.',
    },
    {
      icon: Receipt,
      title: 'Expense Tracker',
      desc: 'Capture every project expense — materials purchased, labour paid, site costs. Compare actual spend against budget and spot overruns early.',
    },
    {
      icon: BarChart2,
      title: 'Analytics',
      desc: 'Company-wide performance charts: revenue trends, project profitability, cost breakdowns by trade, and team productivity. Export to PDF or CSV.',
    },
    {
      icon: Library,
      title: 'Document Library',
      desc: 'Centralised storage for all company and project documents — contracts, permits, site plans, insurance certificates. Upload links from Drive or Dropbox and organise by folder or project.',
    },
    {
      icon: UserCog,
      title: 'Team Management',
      desc: "Invite team members and assign them roles (QS, Project Manager, Client). Each role sees only what's relevant to them. Remove or change roles at any time.",
    },
    {
      icon: Settings,
      title: 'Company Settings',
      desc: 'Configure your company profile, logo, currency, and regional settings. These appear on all estimates, invoices, and reports you generate.',
    },
  ],
  qs: [
    {
      icon: LayoutDashboard,
      title: 'Dashboard',
      desc: 'An overview of your active estimates, recent pricing updates, and any pending tasks from your admin.',
    },
    {
      icon: BookOpen,
      title: 'QS Prices',
      desc: 'Browse the master rate library set by your admin. These rates are the foundation for every estimate you build — contact your admin to update any rates.',
    },
    {
      icon: GitCompare,
      title: 'QS Comparison',
      desc: 'Compare rate submissions from multiple quantity surveyors side by side. Great for validating your own rates against the market.',
    },
    {
      icon: HardHat,
      title: 'Artisan Rates',
      desc: 'View current labour day-rates for every trade. Reference these when building estimates or checking subcontractor quotes.',
    },
    {
      icon: Package,
      title: 'Materials',
      desc: 'A live material price list you can reference while estimating. Cement, steel, finishes, and more — all in one place.',
    },
    {
      icon: Zap,
      title: 'Price Intelligence',
      desc: "See how your company's rates compare to market benchmarks. Useful when preparing bids or advising on budget.",
    },
    {
      icon: Calculator,
      title: 'Project Estimator',
      desc: 'Generate detailed cost estimates fast. Choose project type, size, condition, and build tier — the engine prices everything from your rate libraries automatically.',
    },
    {
      icon: History,
      title: 'Estimate History',
      desc: "Every estimate you've created is saved here. Review, duplicate, or export any past estimate. Great for building on previous work.",
    },
    {
      icon: Sliders,
      title: 'Scenario Simulator',
      desc: 'Run what-if simulations on any estimate. Adjust material costs, labour rates, or project size and see the cost difference immediately.',
    },
    {
      icon: FolderOpen,
      title: 'Historical Projects',
      desc: 'A database of completed project costs. Use this as a benchmark when estimating new work of similar type and scale.',
    },
    {
      icon: Library,
      title: 'Document Library',
      desc: 'Access company documents relevant to your work — BOQs, specs, site plans. Link documents to specific projects for easy retrieval.',
    },
  ],
  project_manager: [
    {
      icon: LayoutDashboard,
      title: 'Dashboard',
      desc: "A live snapshot of your projects — what's active, what's behind schedule, and what needs your attention today.",
    },
    {
      icon: FolderOpen,
      title: 'Projects',
      desc: 'Create and track all your construction projects. Update status, budgets, and timelines. Attach documents directly to each project card.',
    },
    {
      icon: Users,
      title: 'Contacts',
      desc: 'Your directory of clients, subcontractors, and suppliers. Link them to projects so everyone involved is easy to find.',
    },
    {
      icon: TrendingUp,
      title: 'Progress Tracker',
      desc: 'Log construction progress by phase. Add percentage completion, notes, and dates for each phase — substructure, superstructure, finishes, M&E, and more.',
    },
    {
      icon: GitPullRequest,
      title: 'Change Orders',
      desc: 'Submit formal change requests when scope changes. Your admin reviews and approves each one. All approved changes update the project record automatically.',
    },
    {
      icon: ClipboardList,
      title: 'Site Reports',
      desc: 'File daily or weekly site reports with photos, weather, manpower counts, and progress notes. Use the template library to get started in seconds.',
    },
    {
      icon: Receipt,
      title: 'Expense Tracker',
      desc: "Log project expenses as they happen — materials, labour, transport. Your admin sees the full cost picture; you make sure nothing is missed.",
    },
    {
      icon: Library,
      title: 'Document Library',
      desc: "Access and upload documents for your projects — permits, site plans, contracts. Organised by folder and project so nothing gets lost.",
    },
  ],
  client: [
    {
      icon: LayoutDashboard,
      title: 'Dashboard',
      desc: 'A quick overview of your projects — current status, recent activity, and any updates from the team.',
    },
    {
      icon: FolderOpen,
      title: 'Your Projects',
      desc: 'View all projects associated with your account. See budget, timeline, location, and current status at a glance.',
    },
    {
      icon: FileText,
      title: 'Estimates & Invoices',
      desc: "View and download your project cost estimates and invoices. Track what's been paid and what's outstanding. PDFs available at any time.",
    },
    {
      icon: TrendingUp,
      title: 'Progress Updates',
      desc: "See real-time progress on your project broken down by construction phase. Know exactly what stage the work is at without needing to call.",
    },
    {
      icon: ClipboardList,
      title: 'Site Reports',
      desc: "Read daily and weekly reports filed by the project team — photos, activities, and any issues flagged. Full transparency on what's happening on site.",
    },
    {
      icon: Library,
      title: 'Documents',
      desc: 'Access all documents related to your project — contracts, permits, drawings, and reports. Uploaded by your project team and always available.',
    },
  ],
};

const ROLE_LABEL = {
  admin:           'Administrator',
  qs:              'Quantity Surveyor',
  project_manager: 'Project Manager',
  client:          'Client',
};

export default function OnboardingModal() {
  const { user, setUser } = useAuth();
  const [step, setStep]         = useState(0);
  const [dismissing, setDismissing] = useState(false);

  const guides = GUIDES[user?.role] || [];
  const isLast = step === guides.length;

  const handleDone = async () => {
    setDismissing(true);
    try {
      await api.patch('/auth/me/onboarded');
      setUser((u) => ({ ...u, onboarded: true }));
    } catch {
      setUser((u) => ({ ...u, onboarded: true }));
    }
  };

  if (!user || user.onboarded || guides.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-primary-900 px-6 py-5 text-white">
          <p className="text-xs font-medium text-blue-200 uppercase tracking-wide mb-1">
            Welcome to SquareMetre
          </p>
          <h2 className="text-lg font-bold">
            {isLast ? "You're all set!" : `Getting started as ${ROLE_LABEL[user.role] || user.role}`}
          </h2>
          {!isLast && (
            <p className="text-sm text-blue-200 mt-1">
              {step + 1} of {guides.length} — here's what you can do
            </p>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-6 min-h-[200px]">
          {isLast ? (
            <div className="flex flex-col items-center text-center gap-3">
              <CheckCircle size={48} className="text-green-500" />
              <p className="text-gray-700 text-sm leading-relaxed">
                You now know the full platform. Explore the sidebar at your own pace, and reach out to your admin if you need anything unlocked or changed.
              </p>
            </div>
          ) : (
            (() => {
              const { icon: Icon, title, desc } = guides[step];
              return (
                <div className="flex gap-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                    <Icon size={22} className="text-primary-900" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1.5">{title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {/* Progress dots */}
        {!isLast && (
          <div className="flex justify-center gap-1 pb-2 flex-wrap px-6">
            {guides.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === step ? 'bg-primary-900' : 'bg-gray-200 hover:bg-gray-300'}`}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
          <button
            onClick={handleDone}
            disabled={dismissing}
            className="text-sm text-gray-400 hover:text-gray-600 disabled:opacity-40"
          >
            Skip all
          </button>
          <div className="flex gap-2">
            {step > 0 && !isLast && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Back
              </button>
            )}
            {isLast ? (
              <button
                onClick={handleDone}
                disabled={dismissing}
                className="px-5 py-2 bg-primary-900 text-white rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-60"
              >
                {dismissing ? 'Saving…' : 'Get started'}
              </button>
            ) : (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="px-5 py-2 bg-primary-900 text-white rounded-lg text-sm font-medium hover:bg-primary-800"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
