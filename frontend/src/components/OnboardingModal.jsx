import React, { useState } from 'react';
import { BookOpen, HardHat, BarChart2, FileText, Users, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const GUIDES = {
  qs: [
    {
      icon: BookOpen,
      title: 'Pricing Library',
      desc: 'Browse material prices, artisan rates, and QS unit rates under Pricing Libraries in the sidebar. These are set by your admin.',
    },
    {
      icon: FileText,
      title: 'Estimator',
      desc: 'Use the Estimator to generate cost estimates for projects. Pick a condition, size, and tier — the engine calculates instantly.',
    },
    {
      icon: BarChart2,
      title: 'BOQ Builder',
      desc: 'Open BOQ Builder to build or review bills of quantities. You can add items and sections but rates are locked to admin.',
    },
  ],
  project_manager: [
    {
      icon: HardHat,
      title: 'Projects',
      desc: 'Create and manage your construction projects. Track status, budget, and progress all in one place.',
    },
    {
      icon: BarChart2,
      title: 'Progress Tracker',
      desc: 'Log site progress updates by phase. You can import from Excel or add entries manually.',
    },
    {
      icon: FileText,
      title: 'Site Reports',
      desc: 'File daily or weekly site reports with photos, notes, weather, and manpower. Use the template picker to get started quickly.',
    },
    {
      icon: Users,
      title: 'Change Orders',
      desc: 'Submit change orders for scope changes. Your admin reviews and approves or rejects them.',
    },
  ],
  client: [
    {
      icon: FileText,
      title: 'Estimates & Invoices',
      desc: 'View your project estimates and invoices under the Invoices section. Download PDFs at any time.',
    },
    {
      icon: BarChart2,
      title: 'Progress Updates',
      desc: 'See real-time progress updates for your project under Progress Tracker.',
    },
    {
      icon: HardHat,
      title: 'Site Reports',
      desc: 'Read site reports filed by the project team, including photos and daily logs.',
    },
  ],
};

const ROLE_LABEL = {
  qs: 'Quantity Surveyor',
  project_manager: 'Project Manager',
  client: 'Client',
};

export default function OnboardingModal() {
  const { user, setUser } = useAuth();
  const [step, setStep] = useState(0);
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

  if (!user || user.onboarded) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-primary-900 px-6 py-5 text-white">
          <p className="text-xs font-medium text-blue-200 uppercase tracking-wide mb-1">Welcome to Pico Bello</p>
          <h2 className="text-lg font-bold">
            {isLast ? "You're all set!" : `Getting started as ${ROLE_LABEL[user.role] || user.role}`}
          </h2>
          {!isLast && (
            <p className="text-sm text-blue-200 mt-1">
              {step + 1} of {guides.length} — quick guide
            </p>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-6 min-h-[180px]">
          {isLast ? (
            <div className="flex flex-col items-center text-center gap-3">
              <CheckCircle size={48} className="text-green-500" />
              <p className="text-gray-700 text-sm">
                You know the essentials. Explore the sidebar to get started, and reach out to your admin if you need anything changed.
              </p>
            </div>
          ) : (
            (() => {
              const { icon: Icon, title, desc } = guides[step];
              return (
                <div className="flex gap-4">
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center">
                    <Icon size={22} className="text-primary-900" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {/* Progress dots */}
        {!isLast && (
          <div className="flex justify-center gap-1.5 pb-2">
            {guides.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === step ? 'bg-primary-900' : 'bg-gray-200'}`} />
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
