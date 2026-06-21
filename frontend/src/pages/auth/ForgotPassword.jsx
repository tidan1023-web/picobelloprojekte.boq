import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import api from '../../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4 shadow-lg">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Pico Bello Projekte</h1>
          <p className="text-blue-300 mt-1 text-sm">BOQ Management System</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Check your email</h2>
              <p className="text-gray-500 text-sm">
                If <strong>{email}</strong> is registered, you'll receive a reset link shortly.
              </p>
              <Link to="/login" className="mt-6 inline-block text-primary-900 font-semibold text-sm hover:underline">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Forgot your password?</h2>
              <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send you a reset link.</p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-900 focus:border-transparent"
                    placeholder="you@company.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-900 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-primary-800 transition-colors disabled:opacity-60"
                >
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                <Link to="/login" className="text-primary-900 font-semibold hover:underline">Back to Sign In</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
