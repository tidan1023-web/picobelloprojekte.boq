import React, { useEffect, useState, useCallback } from 'react';
import { Search, CreditCard, CheckCircle, AlertCircle, Banknote } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30';

function BankSetupModal({ member, onClose, onSaved }) {
  const [banks, setBanks] = useState([]);
  const [form, setForm] = useState({
    bankCode: member.bankAccount?.bankCode || '',
    bankName: member.bankAccount?.bankName || '',
    accountNumber: member.bankAccount?.accountNumber || '',
    accountName: member.bankAccount?.accountName || '',
  });
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/paystack/banks').then(({ data }) => setBanks(data.banks || [])).catch(() => {});
  }, []);

  const verifyAccount = async () => {
    if (!form.accountNumber || !form.bankCode) return;
    setVerifying(true);
    setError('');
    try {
      const { data } = await api.get('/paystack/verify-account', {
        params: { accountNumber: form.accountNumber, bankCode: form.bankCode },
      });
      setForm((f) => ({ ...f, accountName: data.accountName }));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not verify account');
    } finally { setVerifying(false); }
  };

  const handleSave = async () => {
    if (!form.accountName) return setError('Verify account first');
    setSaving(true);
    setError('');
    try {
      await api.patch(`/paystack/users/${member._id}/bank`, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Bank Account — {member.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Bank</label>
            <select
              value={form.bankCode}
              onChange={(e) => {
                const bank = banks.find((b) => b.code === e.target.value);
                setForm((f) => ({ ...f, bankCode: e.target.value, bankName: bank?.name || '', accountName: '' }));
              }}
              className={inputCls}
            >
              <option value="">Select bank…</option>
              {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Account Number</label>
            <div className="flex gap-2">
              <input
                value={form.accountNumber}
                onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value, accountName: '' }))}
                className={inputCls}
                placeholder="10-digit account number"
                maxLength={10}
              />
              <button
                onClick={verifyAccount}
                disabled={verifying || form.accountNumber.length < 10 || !form.bankCode}
                className="shrink-0 px-3 py-2 bg-primary-900 text-white text-xs rounded-lg hover:bg-primary-800 disabled:opacity-50 transition-colors"
              >
                {verifying ? '…' : 'Verify'}
              </button>
            </div>
          </div>
          {form.accountName && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle size={14} className="text-green-600 shrink-0" />
              <p className="text-sm font-medium text-green-800">{form.accountName}</p>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.accountName} className="flex-1 bg-primary-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransferModal({ member, onClose, onDone }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!amount || Number(amount) <= 0) return setError('Enter a valid amount');
    setSending(true);
    setError('');
    try {
      await api.post('/paystack/transfer', { userId: member._id, amount: Number(amount), reason });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Transfer failed');
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Pay {member.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-3">
          {done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">Transfer initiated</h3>
              <p className="text-sm text-gray-500">NGN {Number(amount).toLocaleString()} is on its way to {member.name}.</p>
              <button onClick={onDone} className="mt-4 w-full bg-primary-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-800">Done</button>
            </div>
          ) : (
            <>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm">
                <p className="font-medium text-gray-800">{member.bankAccount?.accountName}</p>
                <p className="text-xs text-gray-500">{member.bankAccount?.bankName} · {member.bankAccount?.accountNumber}</p>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount (NGN)</label>
                <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason (optional)</label>
                <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} placeholder="e.g. Site work week 28" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSend} disabled={sending} className="flex-1 bg-primary-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
                  {sending ? 'Sending…' : 'Send Payment'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Payments() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bankModal, setBankModal] = useState(null);
  const [transferModal, setTransferModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/paystack/team');
      setMembers(data.members || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
  });

  const isAdmin = user?.role === 'admin';

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500 mt-1">Pay team members directly to their bank accounts via Paystack.</p>
      </div>

      {!process.env.PAYSTACK_SECRET_KEY && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-amber-800">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <p>Add <strong>PAYSTACK_SECRET_KEY</strong> to your Render environment variables to enable transfers.</p>
        </div>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search team members…"
        className={inputCls}
      />

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 p-6 text-center">No team members found.</p>
          ) : filtered.map((m) => {
            const hasBankAccount = !!(m.bankAccount?.accountNumber && m.bankAccount?.accountName);
            return (
              <div key={m._id} className="px-5 py-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary-900">{m.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                  <p className="text-xs text-gray-400 truncate">{m.email}</p>
                  {hasBankAccount ? (
                    <p className="text-xs text-green-600 mt-0.5">{m.bankAccount.bankName} · {m.bankAccount.accountNumber}</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5">No bank account on file</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 capitalize shrink-0">{m.role}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setBankModal(m)}
                    className="p-1.5 text-gray-400 hover:text-primary-900 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Set bank account"
                  >
                    <Banknote size={15} />
                  </button>
                  {isAdmin && hasBankAccount && (
                    <button
                      onClick={() => setTransferModal(m)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-900 text-white text-xs rounded-lg hover:bg-primary-800 transition-colors font-medium"
                    >
                      <CreditCard size={13} />
                      Pay
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {bankModal && (
        <BankSetupModal
          member={bankModal}
          onClose={() => setBankModal(null)}
          onSaved={() => { setBankModal(null); load(); }}
        />
      )}
      {transferModal && (
        <TransferModal
          member={transferModal}
          onClose={() => setTransferModal(null)}
          onDone={() => { setTransferModal(null); load(); }}
        />
      )}
    </div>
  );
}
