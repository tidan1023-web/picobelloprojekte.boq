import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Mail, ShieldCheck, X, Users, Edit2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { value: 'qs',              label: 'Quantity Surveyor',  desc: 'Can view pricing library and use estimator; cannot edit rates or manage team' },
  { value: 'project_manager', label: 'Project Manager',    desc: 'Can manage projects, progress, change orders, and site reports' },
  { value: 'client',          label: 'Client',             desc: 'Read-only view of estimates, invoices, progress, and site reports' },
];

const ROLE_COLORS = {
  admin:           'bg-blue-100 text-blue-700',
  qs:              'bg-purple-100 text-purple-700',
  project_manager: 'bg-green-100 text-green-700',
  client:          'bg-orange-100 text-orange-700',
};

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30';

function InviteModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'qs' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/auth/invite', form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to invite member');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Invite Team Member</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Jane Smith" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
            <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="jane@company.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Temporary Password *</label>
            <input required type="password" minLength={6} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className={inputCls} placeholder="Minimum 6 characters" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <label key={r.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.role === r.value ? 'border-primary-900 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input type="radio" name="role" value={r.value} checked={form.role === r.value} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.label}</p>
                    <p className="text-xs text-gray-500">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700">
            The invited member will be added to your company account with the selected role. Share the login credentials with them directly.
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-primary-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
              {saving ? 'Inviting…' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditRoleModal({ member, onClose, onSaved }) {
  const [role, setRole] = useState(member.role);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/auth/team/${member._id}/role`, { role });
      onSaved();
    } catch { } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Change Role — {member.name}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          {ROLES.map((r) => (
            <label key={r.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${role === r.value ? 'border-primary-900 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={(e) => setRole(e.target.value)} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-800">{r.label}</p>
                <p className="text-xs text-gray-500">{r.desc}</p>
              </div>
            </label>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-primary-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
              {saving ? 'Saving…' : 'Update Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TeamManagement() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editMember, setEditMember] = useState(null);

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-20 text-gray-400">
        <ShieldCheck size={48} className="mx-auto mb-3 opacity-20" />
        <p className="font-medium">Admin access required</p>
        <p className="text-sm">Only administrators can manage team members.</p>
      </div>
    );
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/team');
      setMembers(data.members || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (id) => {
    if (!confirm('Remove this team member from your company?')) return;
    try {
      await api.delete(`/auth/team/${id}`);
      load();
    } catch { }
  };

  const roleLabel = (r) => {
    const found = ROLES.find((x) => x.value === r);
    return found?.label || (r === 'admin' ? 'Administrator' : r);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Team Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage who has access to your company's BOQ system.</p>
        </div>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-primary-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-800">
          <Plus size={16} /> Add Member
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ROLES.map((r) => (
          <div key={r.value} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-2 ${ROLE_COLORS[r.value]}`}>{r.label}</span>
            <p className="text-xs text-gray-500">{r.desc}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading team…</div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-20" />
          <p>No team members yet. Add your first member above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </div>
          <div className="divide-y divide-gray-50">
            {members.map((m) => (
              <div key={m._id} className="px-5 py-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full ${ROLE_COLORS[m.role]?.replace('text-', 'bg-').replace('-100', '-500') || 'bg-gray-400'} flex items-center justify-center shrink-0 text-white font-bold`}>
                  {m.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800 truncate">{m.name}</p>
                    {m._id === user._id && <span className="text-xs text-gray-400">(you)</span>}
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1"><Mail size={11} /> {m.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ROLE_COLORS[m.role] || 'bg-gray-100 text-gray-600'}`}>
                  {roleLabel(m.role)}
                </span>
                {m._id !== user._id && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setEditMember(m)}
                      className="p-1.5 text-gray-400 hover:text-primary-900 hover:bg-primary-50 rounded-lg" title="Change role">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleRemove(m._id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Remove">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} onSaved={() => { setShowInvite(false); load(); }} />
      )}
      {editMember && (
        <EditRoleModal member={editMember} onClose={() => setEditMember(null)} onSaved={() => { setEditMember(null); load(); }} />
      )}
    </div>
  );
}
