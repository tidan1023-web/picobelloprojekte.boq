import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, Database, FileText, TrendingUp, ChevronRight, Clock, ShieldCheck } from 'lucide-react';
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

function fmt(n) {
  return Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [estimates, setEstimates]     = useState([]);
  const [projectCount, setProjectCount] = useState(0);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/estimates'),
      api.get('/historical-projects'),
    ]).then(([estRes, projRes]) => {
      setEstimates(estRes.data.estimates || []);
      setProjectCount((projRes.data.projects || []).length);
    }).finally(() => setLoading(false));
  }, []);

  const sent     = estimates.filter(e => e.status !== 'draft').length;
  const accepted = estimates.filter(e => e.status === 'accepted').length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-900" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Welcome banner */}
      <div className="bg-primary-900 text-white rounded-2xl p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-blue-300 text-sm">Good day,</p>
            <h1 className="text-2xl font-bold mt-1">{user?.name}</h1>
            <p className="text-blue-200 text-sm mt-1">
              {projectCount} historical project{projectCount !== 1 ? 's' : ''} · {estimates.length} estimate{estimates.length !== 1 ? 's' : ''} generated
            </p>
          </div>
          {/* Role badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shrink-0 ${ROLE_COLOR[user?.role] ?? 'bg-white/10 text-white border-white/20'}`}>
            <ShieldCheck size={13} />
            {ROLE_LABEL[user?.role] ?? user?.role}
          </div>
        </div>
        <button onClick={() => navigate('/app/estimator')}
          className="mt-4 flex items-center gap-2 bg-white text-primary-900 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors">
          <Calculator size={16} /> Run New Estimate
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Historical Projects', value: projectCount,     icon: Database,   color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Estimates Generated', value: estimates.length, icon: FileText,   color: 'bg-blue-50 text-blue-600' },
          { label: 'Estimates Sent',      value: sent,             icon: TrendingUp, color: 'bg-green-50 text-green-600' },
          { label: 'Accepted',            value: accepted,         icon: Calculator, color: 'bg-purple-50 text-purple-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color} mb-3`}>
              <Icon size={18} />
            </div>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* No-data nudge */}
      {projectCount === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Database size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Add your first historical project</p>
            <p className="text-amber-700 text-xs mt-1">
              The estimator learns from your past work. Add completed projects to get accurate, experience-based estimates.
            </p>
            <button onClick={() => navigate('/app/historical-projects')}
              className="mt-2 text-xs font-semibold text-amber-800 hover:underline flex items-center gap-1">
              Add projects <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Recent estimates */}
      {estimates.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Recent Estimates</h2>
            <button onClick={() => navigate('/app/estimates')}
              className="text-xs text-primary-900 font-medium hover:underline flex items-center gap-1">
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {estimates.slice(0, 6).map((e) => (
              <div key={e._id} onClick={() => navigate(`/app/estimates/${e._id}`)}
                className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 cursor-pointer gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                    <FileText size={14} className="text-primary-900" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{e.projectName}</p>
                    <p className="text-xs text-gray-400">{e.clientName || 'No client'} · {e.sizeM2}m²</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize hidden sm:inline ${TIER_COLORS[e.selectedTier]}`}>
                    {e.selectedTier?.replace('_', '-')}
                  </span>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-gray-800">₦{fmt(e.selectedTotal)}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                      <Clock size={10} />
                      {new Date(e.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[e.status]}`}>
                    {e.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <Calculator size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500 font-medium">No estimates yet</p>
          <p className="text-gray-400 text-sm mt-1">Run your first estimate to see results here.</p>
          <button onClick={() => navigate('/app/estimator')}
            className="mt-4 bg-primary-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary-800">
            Run New Estimate
          </button>
        </div>
      )}
    </div>
  );
}
