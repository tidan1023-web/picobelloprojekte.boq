import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';
import Logo from '../../components/Logo';
import { useAuth } from '../../context/AuthContext';

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [show, setShow] = useState({ password: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const toggle = (k) => setShow((s) => ({ ...s, [k]: !s[k] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    setLoading(true);
    try {
      const { data } = await api.post(`/auth/accept-invite/${token}`, { password: form.password });
      localStorage.setItem('token', data.token);
      if (setUser) setUser(data.user);
      setDone(true);
      setTimeout(() => navigate('/app/dashboard'), 2000);
    } catch (err) {
      setError(err.response?.data?.message ?? 'This invite link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Logo size={64} />
          </div>
          <h1 className="text-2xl font-bold text-white">Pico Bello Projekte</h1>
          <p className="text-blue-300 mt-1 text-sm">BOQ Management System</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          {done ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Account activated!</h2>
              <p className="text-gray-500 text-sm">Taking you to the dashboard…</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Accept your invitation</h2>
              <p className="text-sm text-gray-500 mb-6">Set a password to activate your account.</p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {['password', 'confirm'].map((k) => (
                  <div key={k}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {k === 'password' ? 'New Password' : 'Confirm Password'}
                    </label>
                    <div className="relative">
                      <input
                        type={show[k] ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={form[k]}
                        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900 focus:border-transparent pr-10"
                        placeholder={k === 'password' ? 'Minimum 6 characters' : 'Repeat password'}
                      />
                      <button type="button" onClick={() => toggle(k)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {show[k] ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-900 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-primary-800 transition-colors disabled:opacity-60"
                >
                  {loading ? 'Activating…' : 'Activate Account'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
