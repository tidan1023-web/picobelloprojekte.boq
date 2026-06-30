import React, { useState } from 'react';
import { Lock, ArrowRight, X, Phone, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const PLAN_RANK = { free: 0, basic: 1, premium: 2 };

function BookCallModal({ plan, onClose }) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await axios.post('/api/auth/request-onboarding', { name, email, phone, plan });
      setDone(true);
    } catch {
      setError('Something went wrong. Please email us at hello@picobelloprojekte.com');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
          <X size={20} />
        </button>
        {done ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Request Sent!</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              We received your upgrade request for the <strong>{plan}</strong> plan.
              We'll reach out within 24 hours to schedule your call.
            </p>
            <button onClick={onClose} className="mt-6 bg-primary-900 text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-primary-800 transition-colors">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                <Phone size={18} className="text-primary-900" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Book an Upgrade Call</h3>
                <p className="text-sm text-gray-400">{plan.charAt(0).toUpperCase() + plan.slice(1)} plan</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              Leave your details and we'll reach out within 24 hours to unlock your account.
            </p>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Your Name</label>
                <input required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address</label>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone / WhatsApp</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234 800 000 0000"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900" />
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <button type="submit" disabled={submitting}
                className="w-full bg-primary-900 text-white font-semibold py-3 rounded-xl hover:bg-primary-800 transition-colors text-sm disabled:opacity-60">
                {submitting ? 'Sending…' : 'Request Upgrade Call'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function PlanGate({ required = 'basic', children }) {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const userRank = PLAN_RANK[user?.plan || 'free'];
  const requiredRank = PLAN_RANK[required];

  if (userRank >= requiredRank) return children;

  const planLabel = required.charAt(0).toUpperCase() + required.slice(1);

  return (
    <>
      {showModal && <BookCallModal plan={required} onClose={() => setShowModal(false)} />}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Lock size={28} className="text-primary-900" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{planLabel} Plan Required</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            This feature is available on the <strong>{planLabel}</strong> plan.
            Book a call with us and we'll get you set up — usually within 24 hours.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary-900 text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary-800 transition-colors mx-auto text-sm"
          >
            Book an Upgrade Call <ArrowRight size={15} />
          </button>
          <p className="text-xs text-gray-400 mt-4">Currently on free plan · No card needed until you're ready</p>
        </div>
      </div>
    </>
  );
}
