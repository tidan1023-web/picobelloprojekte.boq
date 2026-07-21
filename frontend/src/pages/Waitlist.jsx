import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Download, Phone, Mail } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SUPER_EMAILS, DEV_EMAIL } from '../constants';

const OWNER_EMAILS = [...SUPER_EMAILS, DEV_EMAIL];

function toCsv(signups, roleLabels) {
  const header = ['Name', 'Role', 'Email', 'Phone', 'Joined'];
  const rows = signups.map((s) => [
    s.name,
    roleLabels[s.role] || s.role,
    s.email,
    s.phone || '',
    new Date(s.createdAt).toLocaleDateString(),
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export default function Waitlist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [signups, setSignups] = useState([]);
  const [roleLabels, setRoleLabels] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/waitlist');
      setSignups(data.signups || []);
      setRoleLabels(data.roleLabels || {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (user && !OWNER_EMAILS.includes(user.email)) {
    navigate('/app/dashboard', { replace: true });
    return null;
  }

  const filtered = signups.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (roleLabels[s.role] || s.role).toLowerCase().includes(q);
  });

  const handleExport = () => {
    const csv = toCsv(filtered, roleLabels);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Launch Waitlist</h1>
          <p className="text-sm text-gray-500 mt-1">Everyone who signed up on the landing page to be notified at launch.</p>
        </div>
        <button onClick={handleExport} disabled={!filtered.length}
          className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors">
          <Download size={15} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xl font-bold text-gray-800">{signups.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total signups</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search name, email, role…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-900" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <Users size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500 text-sm">{signups.length === 0 ? 'No signups yet.' : 'No results for your search.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Name', 'Role', 'Contact', 'Joined'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{roleLabels[s.role] || s.role}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Mail size={12} className="text-gray-400 shrink-0" />
                      <a href={`mailto:${s.email}`} className="hover:underline truncate">{s.email}</a>
                    </div>
                    {s.phone && (
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
                        <Phone size={11} className="shrink-0" /> {s.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(s.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
