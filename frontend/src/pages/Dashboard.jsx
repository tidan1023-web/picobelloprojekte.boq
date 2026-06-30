import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calculator, FolderOpen, FileText, TrendingUp,
  ChevronRight, DollarSign, AlertCircle, CheckCircle, ShieldCheck,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ROLE_LABEL = {
  admin:           'Administrator',
  qs:              'Quantity Surveyor',
  project_manager: 'Project Manager',
  client:          'Client',
};
const ROLE_COLOR = {
  admin:           'bg-blue-500/20 text-blue-200 border-blue-400/30',
  qs:              'bg-purple-500/20 text-purple-200 border-purple-400/30',
  project_manager: 'bg-green-500/20 text-green-200 border-green-400/30',
  client:          'bg-orange-500/20 text-orange-200 border-orange-400/30',
};
const INV_STATUS_STYLES = {
  draft:          'bg-gray-100 text-gray-600',
  sent:           'bg-blue-100 text-blue-700',
  paid:           'bg-green-100 text-green-700',
  partially_paid: 'bg-yellow-100 text-yellow-700',
  overdue:        'bg-red-100 text-red-700',
};
const PROJ_STATUS_COLORS = {
  planning:  'bg-yellow-100 text-yellow-700',
  active:    'bg-green-100 text-green-700',
  on_hold:   'bg-orange-100 text-orange-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
};

function fmt(n) {
  return Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

function SkeletonBlock({ className }) {
  return <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-primary-900/30 rounded-2xl p-6 h-32 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <SkeletonBlock className="w-9 h-9" />
            <SkeletonBlock className="h-7 w-16" />
            <SkeletonBlock className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonBlock className="w-8 h-8 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <SkeletonBlock className="h-3 w-40" />
              <SkeletonBlock className="h-2.5 w-24" />
            </div>
            <SkeletonBlock className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/summary')
      .then(({ data: d }) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  const { stats = {}, recentProjects = [], recentInvoices = [] } = data || {};
  const { projects = {}, invoices = {} } = stats;

  const statCards = [
    { label: 'Active Projects',  value: projects.active  ?? 0, icon: FolderOpen,   color: 'bg-green-50 text-green-600',  path: '/app/projects' },
    { label: 'Total Invoiced',   value: `₦${fmt(invoices.totalAmount)}`, icon: FileText, color: 'bg-blue-50 text-blue-600', path: '/app/invoices' },
    { label: 'Unpaid Balance',   value: `₦${fmt(invoices.unpaidAmount)}`, icon: DollarSign, color: invoices.unpaidAmount > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400', path: '/app/invoices' },
    { label: 'Overdue Invoices', value: invoices.overdue ?? 0, icon: AlertCircle,  color: invoices.overdue > 0 ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-400', path: '/app/invoices' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Welcome banner */}
      <div className="bg-primary-900 text-white rounded-2xl p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-blue-300 text-sm">Good day,</p>
            <h1 className="text-2xl font-bold mt-1">{user?.name}</h1>
            <p className="text-blue-200 text-sm mt-2">
              {projects.total ?? 0} project{projects.total !== 1 ? 's' : ''} &nbsp;&middot;&nbsp;
              {invoices.total ?? 0} invoice{invoices.total !== 1 ? 's' : ''}
              {projects.active > 0 && ` · ${projects.active} active`}
            </p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shrink-0 ${ROLE_COLOR[user?.role] ?? 'bg-white/10 text-white border-white/20'}`}>
            <ShieldCheck size={13} />
            {ROLE_LABEL[user?.role] ?? user?.role}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => navigate('/app/estimator')}
            className="flex items-center gap-2 bg-white text-primary-900 px-4 py-2 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors">
            <Calculator size={15} /> New Estimate
          </button>
          <button onClick={() => navigate('/app/projects')}
            className="flex items-center gap-2 bg-white/10 text-white border border-white/20 px-4 py-2 rounded-xl font-semibold text-sm hover:bg-white/20 transition-colors">
            <FolderOpen size={15} /> Projects
          </button>
          <button onClick={() => navigate('/app/invoices')}
            className="flex items-center gap-2 bg-white/10 text-white border border-white/20 px-4 py-2 rounded-xl font-semibold text-sm hover:bg-white/20 transition-colors">
            <FileText size={15} /> Invoices
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, path }) => (
          <div key={label} onClick={() => navigate(path)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color} mb-3`}>
              <Icon size={18} />
            </div>
            <p className="text-xl font-bold text-gray-800 leading-tight">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Two-column recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Projects */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-sm">Recent Projects</h2>
            <button onClick={() => navigate('/app/projects')}
              className="text-xs text-primary-900 font-medium hover:underline flex items-center gap-1">
              View all <ChevronRight size={12} />
            </button>
          </div>
          {recentProjects.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">
              No projects yet.
              <button onClick={() => navigate('/app/projects')} className="ml-1 text-primary-900 font-medium hover:underline">Add one</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentProjects.map((p) => (
                <div key={p._id} onClick={() => navigate('/app/projects')}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer">
                  <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                    <FolderOpen size={14} className="text-primary-900" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400 truncate">{p.client}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 capitalize ${PROJ_STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {p.status?.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-sm">Recent Invoices</h2>
            <button onClick={() => navigate('/app/invoices')}
              className="text-xs text-primary-900 font-medium hover:underline flex items-center gap-1">
              View all <ChevronRight size={12} />
            </button>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">
              No invoices yet.
              <button onClick={() => navigate('/app/invoices')} className="ml-1 text-primary-900 font-medium hover:underline">Create one</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentInvoices.map((inv) => (
                <div key={inv._id} onClick={() => navigate(`/app/invoices/${inv._id}`)}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <FileText size={14} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{inv.projectName}</p>
                    <p className="text-xs text-gray-400 font-mono">{inv.invoiceNumber}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-gray-700">{inv.currency} {fmt(inv.total)}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${INV_STATUS_STYLES[inv.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {inv.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Nudge: no projects */}
      {projects.total === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <TrendingUp size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Get started — create your first project</p>
            <p className="text-amber-700 text-xs mt-1">Track budgets, timelines, and team progress from a single place.</p>
            <button onClick={() => navigate('/app/projects')}
              className="mt-2 text-xs font-semibold text-amber-800 hover:underline flex items-center gap-1">
              Create project <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
