import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FileText, Eye, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../services/api';

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-400',
};

function fmt(n) {
  return Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ClientInvoices() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get('projectId') || '';
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = {};
        if (projectId) params.projectId = projectId;
        const { data } = await api.get('/invoices', { params });
        setInvoices(data.invoices || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  const totalDue = invoices.reduce((s, i) => s + (i.balance || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + (i.amountPaid || 0), 0);

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Summary */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Total Invoiced</p>
            <p className="text-xl font-bold text-gray-800">
              ₦{fmt(invoices.reduce((s, i) => s + i.total, 0))}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Amount Paid</p>
            <p className="text-xl font-bold text-green-600">₦{fmt(totalPaid)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Balance Due</p>
            <p className={`text-xl font-bold ${totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>₦{fmt(totalDue)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading invoices…</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No invoices yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const pct = inv.total > 0 ? Math.min(100, (inv.amountPaid / inv.total) * 100) : 0;
            return (
              <div key={inv._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono font-bold text-primary-900 text-lg">{inv.invoiceNumber}</p>
                    <p className="text-sm text-gray-500">{inv.projectId?.name} · {inv.projectId?.client}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status]}`}>
                      {inv.status}
                    </span>
                    <button onClick={() => navigate(`/app/invoices/${inv._id}`)}
                      className="p-1.5 text-gray-400 hover:text-primary-900 rounded-lg hover:bg-primary-50" title="View">
                      <Eye size={15} />
                    </button>
                    <button onClick={() => { const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, ''); window.open(`${base}/api/invoices/${inv._id}/pdf`, '_blank'); }}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50" title="Download PDF">
                      <Download size={15} />
                    </button>
                  </div>
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Total</p>
                    <p className="font-semibold text-gray-800">{inv.currency} {fmt(inv.total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Paid</p>
                    <p className="font-semibold text-green-600">{inv.currency} {fmt(inv.amountPaid)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Balance</p>
                    <p className={`font-semibold ${inv.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {inv.currency} {fmt(inv.balance)}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>

                <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                  <span>{pct.toFixed(0)}% paid</span>
                  {inv.dueDate && (
                    <span className={`flex items-center gap-1 ${inv.balance > 0 && new Date(inv.dueDate) < new Date() ? 'text-red-500' : ''}`}>
                      <Clock size={10} /> Due {new Date(inv.dueDate).toLocaleDateString('en-GB')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
