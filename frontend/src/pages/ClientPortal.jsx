import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, FileText, CheckCircle, Clock, MessageSquare } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  planning: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
};

function fmt(n) {
  return Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ClientPortal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [projRes, invRes] = await Promise.all([
          api.get('/projects'),
          api.get('/invoices'),
        ]);
        setProjects(projRes.data.projects || []);
        setInvoices(invRes.data.invoices || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-400">Loading your projects…</div>;

  const totalBalance = invoices.reduce((s, i) => s + (i.balance || 0), 0);
  const unpaidInvoices = invoices.filter((i) => i.balance > 0);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Welcome banner */}
      <div className="bg-primary-900 text-white rounded-2xl p-6">
        <p className="text-blue-300 text-sm">Welcome back</p>
        <h1 className="text-2xl font-bold mt-1">{user?.name}</h1>
        <p className="text-blue-200 text-sm mt-1">
          {projects.length} assigned project{projects.length !== 1 ? 's' : ''} · {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
        </p>
        {totalBalance > 0 && (
          <div className="mt-4 bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-2 inline-block">
            <p className="text-red-200 text-sm font-medium">Outstanding balance: <span className="text-white font-bold">₦{fmt(totalBalance)}</span></p>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <FolderOpen size={18} className="text-blue-600" />
            </div>
            <p className="text-sm text-gray-500">Projects</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{projects.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
              <FileText size={18} className="text-green-600" />
            </div>
            <p className="text-sm text-gray-500">Invoices</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{invoices.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-yellow-50 rounded-xl flex items-center justify-center">
              <Clock size={18} className="text-yellow-600" />
            </div>
            <p className="text-sm text-gray-500">Unpaid</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">{unpaidInvoices.length}</p>
        </div>
      </div>

      {/* Projects */}
      {projects.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-800">Your Projects</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {projects.map((p) => (
              <div key={p._id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                    <FolderOpen size={18} className="text-primary-900" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.location || 'No location'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || ''}`}>
                    {p.status.replace('_', ' ')}
                  </span>
                  <button onClick={() => navigate(`/app/client-boq?projectId=${p._id}`)}
                    className="text-xs text-primary-900 font-medium hover:underline">
                    View BOQ
                  </button>
                  <button onClick={() => navigate(`/app/client-invoices?projectId=${p._id}`)}
                    className="text-xs text-blue-600 font-medium hover:underline">
                    Invoices
                  </button>
                  <button onClick={() => navigate(`/app/client-comments?projectId=${p._id}`)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                    <MessageSquare size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent invoices */}
      {invoices.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-800">Recent Invoices</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {invoices.slice(0, 5).map((inv) => (
              <div key={inv._id} className="px-5 py-3 flex items-start sm:items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium font-mono text-primary-900">{inv.invoiceNumber}</p>
                  <p className="text-xs text-gray-400">{inv.projectId?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{inv.currency} {fmt(inv.total)}</p>
                  {inv.balance > 0
                    ? <p className="text-xs text-red-500">Balance: {fmt(inv.balance)}</p>
                    : <p className="text-xs text-green-600 flex items-center gap-1 justify-end"><CheckCircle size={11} /> Paid</p>
                  }
                </div>
              </div>
            ))}
          </div>
          {invoices.length > 5 && (
            <div className="px-5 py-3 text-center">
              <button onClick={() => navigate('/app/client-invoices')} className="text-sm text-primary-900 font-medium hover:underline">
                View all invoices
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
