import React, { useEffect, useState, useCallback } from 'react';
import { Building2, Users, CreditCard, X } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const SUPER_EMAILS = ['sadiajahleel@gmail.com'];
const PLAN_COLORS = {
  free:    'bg-gray-100 text-gray-600',
  basic:   'bg-blue-100 text-blue-700',
  premium: 'bg-purple-100 text-purple-700',
};
const TRIAL_DAYS = 7;

function trialDaysLeft(createdAt) {
  if (!createdAt) return 0;
  return Math.max(0, Math.ceil((new Date(createdAt).getTime() + TRIAL_DAYS * 86400000 - Date.now()) / 86400000));
}

function EditPlanModal({ user, onClose, onSaved }) {
  const [plan, setPlan] = useState(user.plan || 'free');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/auth/owner/users/${user._id}/plan`, { plan });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update plan.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Change Plan — {user.name}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
          {['free', 'basic', 'premium'].map((p) => (
            <label key={p} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${plan === p ? 'border-primary-900 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" name="plan" checked={plan === p} onChange={() => setPlan(p)} />
              <div>
                <p className="text-sm font-medium text-gray-800 capitalize">{p}</p>
                <p className="text-xs text-gray-500">
                  {p === 'free' && 'Estimator, BOQ, Invoices — trial features locked after 7 days'}
                  {p === 'basic' && '+ Rate Libraries, Estimate History'}
                  {p === 'premium' && '+ Analytics, Change Orders, Site Reports, all features'}
                </p>
              </div>
            </label>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-primary-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
              {saving ? 'Saving…' : 'Update Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/owner/dashboard');
      // Backend returns { users } — group by companyId into companies array
      const users = data.users || [];
      const map = {};
      users.forEach((u) => {
        const key = u.companyId?.toString() || u._id.toString();
        if (!map[key]) map[key] = { _id: key, companyName: u.companyName || u.email, members: [] };
        map[key].members.push(u);
      });
      setCompanies(Object.values(map));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!SUPER_EMAILS.includes(user?.email)) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="font-medium">Access denied</p>
      </div>
    );
  }

  const filtered = companies.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.companyName?.toLowerCase().includes(q) ||
      c.members?.some((m) => m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q))
    );
  });

  const totalUsers = companies.reduce((acc, c) => acc + (c.members?.length || 0), 0);
  const paidUsers  = companies.reduce((acc, c) => acc + (c.members?.filter((m) => m.plan !== 'free').length || 0), 0);
  const trialUsers = companies.reduce((acc, c) => acc + (c.members?.filter((m) => trialDaysLeft(m.createdAt) > 0 && m.plan === 'free').length || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Owner Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">All companies and users across the platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Companies', value: companies.length, icon: Building2 },
          { label: 'Total Users',     value: totalUsers,       icon: Users },
          { label: 'Paid Users',      value: paidUsers,        icon: CreditCard },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
              <Icon size={18} className="text-primary-900" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {trialUsers > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <strong>{trialUsers}</strong> user{trialUsers !== 1 ? 's' : ''} currently on free trial
        </div>
      )}

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search companies or users…"
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30"
      />

      {/* Company list */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400">No companies found.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((company) => (
            <div key={company._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <Building2 size={15} className="text-gray-400" />
                <span className="font-semibold text-gray-800 text-sm">{company.companyName}</span>
                <span className="text-xs text-gray-400 ml-1">· {company.members?.length || 0} member{company.members?.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {(company.members || []).map((m) => {
                  const days = trialDaysLeft(m.createdAt);
                  const inTrial = days > 0 && m.plan === 'free';
                  return (
                    <div key={m._id} className="px-5 py-3 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary-900">{m.name?.charAt(0)?.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                        <p className="text-xs text-gray-400 truncate">{m.email}</p>
                      </div>
                      <span className="text-xs text-gray-400 capitalize shrink-0">{m.role}</span>
                      {inTrial && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
                          Trial · {days}d left
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0 ${PLAN_COLORS[m.plan || 'free']}`}>
                        {m.plan || 'free'}
                      </span>
                      <button onClick={() => setEditUser(m)}
                        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg shrink-0" title="Change plan">
                        <CreditCard size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {editUser && (
        <EditPlanModal user={editUser} onClose={() => setEditUser(null)} onSaved={() => { setEditUser(null); load(); }} />
      )}
    </div>
  );
}
