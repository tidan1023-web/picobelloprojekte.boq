import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown, Minus, Printer, X } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ExcelImport from '../components/ExcelImport';
import { useToast } from '../context/ToastContext';

const CO_IMPORT_COLUMNS = [
  { key: 'title', label: 'Title', type: 'string' },
  { key: 'description', label: 'Description', type: 'string' },
  { key: 'amount', label: 'Amount', type: 'number' },
  { key: 'status', label: 'Status', type: 'string' },
  { key: 'reason', label: 'Reason', type: 'string' },
];

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  cancelled: 'bg-gray-100 text-gray-500',
};
const STATUS_ICONS = { pending: Clock, approved: CheckCircle, rejected: XCircle, cancelled: Minus };

function fmt(n) {
  return Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function OrderModal({ projects, editData, onClose, onSaved }) {
  const [form, setForm] = useState(
    editData
      ? { ...editData, projectId: editData.projectId?._id || editData.projectId }
      : { projectId: '', title: '', description: '', reason: '', originalCost: '', newCost: '' }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30';

  const diff = Number(form.newCost || 0) - Number(form.originalCost || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editData?._id) {
        await api.put(`/change-orders/${editData._id}`, form);
      } else {
        await api.post('/change-orders', form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">{editData ? 'Edit Change Order' : 'New Change Order'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project *</label>
            <select value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))} required className={inputCls}>
              <option value="">Select project…</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
            <input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} className={inputCls} placeholder="e.g. Design change, Site condition" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Original Cost *</label>
              <input type="number" min={0} step="0.01" value={form.originalCost} onChange={(e) => setForm((f) => ({ ...f, originalCost: e.target.value }))} required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">New Cost *</label>
              <input type="number" min={0} step="0.01" value={form.newCost} onChange={(e) => setForm((f) => ({ ...f, newCost: e.target.value }))} required className={inputCls} />
            </div>
          </div>
          {form.originalCost && form.newCost && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${diff > 0 ? 'bg-red-50 text-red-700' : diff < 0 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>
              {diff > 0 ? <TrendingUp size={15} /> : diff < 0 ? <TrendingDown size={15} /> : <Minus size={15} />}
              Difference: {diff >= 0 ? '+' : ''}₦{fmt(diff)}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-primary-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChangeOrderDocument({ order, onClose }) {
  const printRef = useRef();

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Change Order - ${order.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #111; font-size: 13px; }
          h1 { font-size: 20px; color: #0f2d5a; margin-bottom: 4px; }
          .subtitle { color: #6b7280; font-size: 11px; margin-bottom: 24px; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 6px; letter-spacing: 0.05em; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .field { margin-bottom: 12px; }
          .label { font-size: 10px; color: #6b7280; margin-bottom: 2px; }
          .value { font-size: 13px; font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #0f2d5a; color: white; padding: 8px 12px; text-align: left; font-size: 11px; }
          td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
          .total-row td { font-weight: bold; background: #f3f4f6; }
          .status { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-approved { background: #d1fae5; color: #065f46; }
          .status-rejected { background: #fee2e2; color: #991b1b; }
          .diff-positive { color: #dc2626; font-weight: bold; }
          .diff-negative { color: #16a34a; font-weight: bold; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; }
          .sig-line { border-top: 1px solid #374151; padding-top: 6px; text-align: center; font-size: 11px; color: #6b7280; }
          .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const diff = (order.difference ?? (Number(order.newCost || 0) - Number(order.originalCost || 0)));
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-gray-800">Change Order Document</h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-2 bg-primary-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-800">
              <Printer size={15} /> Print / Download
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          <div ref={printRef}>
            <h1>CHANGE ORDER</h1>
            <p className="subtitle">Pico Bello Projekte · BOQ Management System</p>

            <div className="section">
              <div className="section-title">Change Order Details</div>
              <div className="grid">
                <div className="field">
                  <div className="label">Change Order #</div>
                  <div className="value">{order._id?.slice(-8).toUpperCase()}</div>
                </div>
                <div className="field">
                  <div className="label">Date Issued</div>
                  <div className="value">{dateStr}</div>
                </div>
                <div className="field">
                  <div className="label">Project</div>
                  <div className="value">{order.projectId?.name || '—'}</div>
                </div>
                <div className="field">
                  <div className="label">Status</div>
                  <div className="value">
                    <span className={`status status-${order.status}`}>{order.status?.toUpperCase()}</span>
                  </div>
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <div className="label">Title</div>
                  <div className="value" style={{ fontSize: 15, fontWeight: 'bold' }}>{order.title}</div>
                </div>
              </div>
            </div>

            {order.description && (
              <div className="section">
                <div className="section-title">Description</div>
                <p style={{ color: '#374151', lineHeight: 1.6 }}>{order.description}</p>
              </div>
            )}

            {order.reason && (
              <div className="section">
                <div className="section-title">Reason for Change</div>
                <p style={{ color: '#374151', lineHeight: 1.6 }}>{order.reason}</p>
              </div>
            )}

            <div className="section">
              <div className="section-title">Cost Summary</div>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount (₦)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Original Contract Value</td>
                    <td style={{ textAlign: 'right' }}>₦{fmt(order.originalCost)}</td>
                  </tr>
                  <tr>
                    <td>Revised Contract Value</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>₦{fmt(order.newCost)}</td>
                  </tr>
                  <tr className="total-row">
                    <td>Net Change</td>
                    <td style={{ textAlign: 'right' }} className={diff > 0 ? 'diff-positive' : 'diff-negative'}>
                      {diff >= 0 ? '+' : ''}₦{fmt(diff)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="signatures">
              <div className="sig-line">Requested By / Contractor</div>
              <div className="sig-line">Approved By / Client</div>
            </div>

            <div className="footer">
              This change order is subject to the terms and conditions of the original contract.
              Pico Bello Projekte · Generated {dateStr}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChangeOrders() {
  const { user } = useAuth();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [docOrder, setDocOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const canManage = ['admin', 'qs', 'project_manager'].includes(user?.role);
  const canDecide = user?.role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (projectFilter) params.projectId = projectFilter;
      if (statusFilter) params.status = statusFilter;
      const [ordRes, projRes] = await Promise.all([
        api.get('/change-orders', { params }),
        api.get('/projects'),
      ]);
      setOrders(ordRes.data.orders || []);
      setProjects(projRes.data.projects || []);
    } finally {
      setLoading(false);
    }
  }, [projectFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const decide = async (id, decision) => {
    await api.patch(`/change-orders/${id}/decide`, { decision });
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this change order?')) return;
    await api.delete(`/change-orders/${id}`);
    load();
  };

  const totalApprovedDiff = orders
    .filter((o) => o.status === 'approved')
    .reduce((s, o) => s + (o.difference || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['cancelled', 'Cancelled']].map(([st, label]) => {
          const count = orders.filter((o) => o.status === st).length;
          return (
            <div key={st} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:border-primary-200"
              onClick={() => setStatusFilter(st === statusFilter ? '' : st)}>
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="text-2xl font-bold text-gray-800">{count}</p>
            </div>
          );
        })}
      </div>

      {totalApprovedDiff !== 0 && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold ${totalApprovedDiff > 0 ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
          {totalApprovedDiff > 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
          Approved change orders have {totalApprovedDiff > 0 ? 'increased' : 'decreased'} costs by ₦{fmt(Math.abs(totalApprovedDiff))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-900/30">
            <option value="">All Projects</option>
            {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-900/30">
            <option value="">All Statuses</option>
            {['pending', 'approved', 'rejected', 'cancelled'].map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
        {canManage && (
          <>
            <ExcelImport
              onImport={async (rows) => {
                let count = 0;
                for (const row of rows) {
                  try { await api.post('/change-orders', row); count++; } catch {}
                }
                alert(`Imported ${count} change orders`);
                load();
              }}
              columns={CO_IMPORT_COLUMNS}
              templateName="change-orders"
            />
            <button onClick={() => { setEditData(null); setShowModal(true); }}
              className="flex items-center gap-2 bg-primary-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-800">
              <Plus size={16} /> New Change Order
            </button>
          </>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-5 py-4 border-b border-gray-50 flex gap-3 animate-pulse">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-48" />
                <div className="h-3 bg-gray-100 rounded w-32" />
              </div>
              <div className="h-5 bg-gray-100 rounded-full w-20" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No change orders found.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-50">
            {orders.map((o) => {
              const Icon = STATUS_ICONS[o.status] || Clock;
              return (
                <div key={o._id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{o.title}</p>
                      <p className="text-xs text-gray-400">{o.projectId?.name} · {o.requestedBy?.name}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_STYLES[o.status]}`}>
                      <Icon size={10} /> {o.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Diff: <span className={`font-semibold ${o.difference > 0 ? 'text-red-600' : o.difference < 0 ? 'text-green-600' : 'text-gray-400'}`}>{o.difference > 0 ? '+' : ''}₦{fmt(o.difference)}</span></span>
                    <div className="flex gap-1">
                      <button onClick={() => setDocOrder(o)} className="text-xs text-gray-400 hover:text-primary-900 px-2 py-1 hover:bg-primary-50 rounded-lg flex items-center gap-1">
                        <Printer size={12} /> Doc
                      </button>
                      {canDecide && o.status === 'pending' && (
                        <>
                          <button onClick={() => decide(o._id, 'approved')} className="text-xs bg-green-600 text-white px-2 py-1 rounded-lg hover:bg-green-700">Approve</button>
                          <button onClick={() => decide(o._id, 'rejected')} className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600">Reject</button>
                        </>
                      )}
                      {canManage && o.status === 'pending' && (
                        <button onClick={() => { setEditData(o); setShowModal(true); }} className="text-xs text-gray-400 hover:text-primary-900 px-2 py-1 hover:bg-primary-50 rounded-lg">Edit</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Title / Project</th>
                <th className="text-right px-4 py-3">Original</th>
                <th className="text-right px-4 py-3">New Cost</th>
                <th className="text-right px-4 py-3">Difference</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o) => {
                const Icon = STATUS_ICONS[o.status] || Clock;
                return (
                  <tr key={o._id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{o.title}</p>
                      <p className="text-xs text-gray-400">{o.projectId?.name} · {o.requestedBy?.name}</p>
                      {o.reason && <p className="text-xs text-gray-400 italic">{o.reason}</p>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">₦{fmt(o.originalCost)}</td>
                    <td className="px-4 py-3 text-right font-medium">₦{fmt(o.newCost)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${o.difference > 0 ? 'text-red-600' : o.difference < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {o.difference > 0 ? '+' : ''}₦{fmt(o.difference)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[o.status]}`}>
                        <Icon size={11} /> {o.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setDocOrder(o)}
                          className="text-xs text-gray-400 hover:text-primary-900 px-2 py-1 hover:bg-primary-50 rounded-lg flex items-center gap-1">
                          <Printer size={12} /> Doc
                        </button>
                        {canDecide && o.status === 'pending' && (
                          <>
                            <button onClick={() => decide(o._id, 'approved')}
                              className="text-xs bg-green-600 text-white px-2.5 py-1 rounded-lg hover:bg-green-700">Approve</button>
                            <button onClick={() => decide(o._id, 'rejected')}
                              className="text-xs bg-red-500 text-white px-2.5 py-1 rounded-lg hover:bg-red-600">Reject</button>
                          </>
                        )}
                        {canManage && o.status === 'pending' && (
                          <button onClick={() => { setEditData(o); setShowModal(true); }}
                            className="text-xs text-gray-400 hover:text-primary-900 px-2 py-1 hover:bg-primary-50 rounded-lg">Edit</button>
                        )}
                        {(canManage && o.status === 'pending' || user?.role === 'admin') && (
                          <button onClick={() => handleDelete(o._id)}
                            className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 hover:bg-red-50 rounded-lg">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {showModal && (
        <OrderModal
          projects={projects}
          editData={editData}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); toast(editData ? 'Change order updated' : 'Change order created'); }}
        />
      )}

      {docOrder && (
        <ChangeOrderDocument order={docOrder} onClose={() => setDocOrder(null)} />
      )}
    </div>
  );
}
