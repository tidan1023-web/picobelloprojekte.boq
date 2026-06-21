import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ChevronDown } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const TIER_COLORS = {
  basic: 'bg-gray-100 text-gray-700 border-gray-200',
  standard: 'bg-blue-50 text-blue-700 border-blue-200',
  premium: 'bg-purple-50 text-purple-700 border-purple-200',
};
const STATUS_ICONS = { approved: CheckCircle, rejected: XCircle, pending: Clock };
const STATUS_COLORS = { approved: 'text-green-600', rejected: 'text-red-500', pending: 'text-yellow-500' };

function fmt(n) {
  return Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ItemRow({ item, approval, onDecide }) {
  const [open, setOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState(approval?.selectedTier || null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const hasOptions = item.options && item.options.length > 0;
  const Icon = STATUS_ICONS[approval?.status || 'pending'];

  const submit = async (status) => {
    setSaving(true);
    try {
      await onDecide({ boqItemId: item._id, status, selectedTier, note });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div
        className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${open ? 'bg-gray-50' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <Icon size={16} className={STATUS_COLORS[approval?.status || 'pending']} />
          <div>
            <p className="text-sm font-medium text-gray-800">{item.item}</p>
            {item.description && <p className="text-xs text-gray-400">{item.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {hasOptions && (
            <div className="flex gap-1">
              {item.options.map((o) => (
                <span key={o.tier} className={`text-xs px-2 py-0.5 rounded-full border ${TIER_COLORS[o.tier]}`}>
                  {o.tier.charAt(0).toUpperCase() + o.tier.slice(1)}
                </span>
              ))}
            </div>
          )}
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-700">{item.unit} × {item.quantity}</p>
            <p className="text-xs text-gray-400">Unit: ₦{fmt(item.finalUnitPrice)}</p>
          </div>
          <p className="text-sm font-bold text-gray-800">₦{fmt(item.totalCost)}</p>
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
          {/* Option pricing selection */}
          {hasOptions && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">Select an option:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {item.options.map((opt) => {
                  const overhead = 1 + (item.overheadPercent || 0) / 100;
                  const profit = 1 + (item.profitPercent || 0) / 100;
                  const unitPrice = opt.baseCost * overhead * profit;
                  const total = unitPrice * item.quantity;
                  const isSelected = selectedTier === opt.tier;
                  return (
                    <button key={opt.tier}
                      onClick={() => setSelectedTier(isSelected ? null : opt.tier)}
                      className={`border-2 rounded-xl p-3 text-left transition-all ${
                        isSelected ? `border-primary-900 ${TIER_COLORS[opt.tier]}` : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}>
                      <p className="text-xs font-bold capitalize">{opt.tier}</p>
                      {opt.label && <p className="text-xs text-gray-500 mt-0.5">{opt.label}</p>}
                      <p className="text-sm font-bold text-gray-800 mt-1">₦{fmt(total)}</p>
                      <p className="text-xs text-gray-400">Unit: ₦{fmt(unitPrice)}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Comment (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-900/30"
              placeholder="Add a note…" />
          </div>

          <div className="flex gap-2 mt-3">
            <button onClick={() => submit('approved')} disabled={saving}
              className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60">
              <CheckCircle size={14} /> Approve
            </button>
            <button onClick={() => submit('rejected')} disabled={saving}
              className="flex items-center gap-1.5 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-60">
              <XCircle size={14} /> Reject
            </button>
          </div>

          {approval?.decidedAt && (
            <p className="text-xs text-gray-400 mt-2">
              Last decision: {new Date(approval.decidedAt).toLocaleDateString('en-GB')}
              {approval.note ? ` — "${approval.note}"` : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClientBOQ() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const projectId = searchParams.get('projectId') || '';

  const [projects, setProjects] = useState([]);
  const [selProjectId, setSelProjectId] = useState(projectId);
  const [versions, setVersions] = useState([]);
  const [selVersionId, setSelVersionId] = useState('');
  const [version, setVersion] = useState(null);
  const [items, setItems] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [submittingVersion, setSubmittingVersion] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/projects').then(({ data }) => setProjects(data.projects || []));
  }, []);

  useEffect(() => {
    if (!selProjectId) return;
    api.get('/boq', { params: { projectId: selProjectId } }).then(({ data }) => {
      setVersions(data.versions || []);
      setSelVersionId('');
      setVersion(null);
      setItems([]);
    });
  }, [selProjectId]);

  const loadVersion = useCallback(async (vId) => {
    if (!vId) return;
    setLoading(true);
    try {
      const [vRes, aRes] = await Promise.all([
        api.get(`/boq/${vId}`),
        api.get('/approvals', { params: { boqVersionId: vId } }),
      ]);
      setVersion(vRes.data.version);
      setItems(vRes.data.items || []);
      setApprovals(aRes.data.approvals || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadVersion(selVersionId); }, [selVersionId, loadVersion]);

  const approvalMap = {};
  approvals.forEach((a) => { if (a.boqItemId) approvalMap[a.boqItemId._id || a.boqItemId] = a; });

  const handleDecide = async ({ boqItemId, status, selectedTier, note }) => {
    await api.post('/approvals/item', { projectId: selProjectId, boqVersionId: selVersionId, boqItemId, status, selectedTier, note });
    const { data } = await api.get('/approvals', { params: { boqVersionId: selVersionId } });
    setApprovals(data.approvals || []);
  };

  const handleVersionDecision = async (status) => {
    setSubmittingVersion(true);
    try {
      await api.post(`/approvals/version/${selVersionId}`, { projectId: selProjectId, status });
      await loadVersion(selVersionId);
    } finally {
      setSubmittingVersion(false);
    }
  };

  const versionApproval = approvals.find((a) => a.type === 'version');
  const approvedCount = items.filter((i) => approvalMap[i._id]?.status === 'approved').length;
  const rejectedCount = items.filter((i) => approvalMap[i._id]?.status === 'rejected').length;

  const selectCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-900/30';

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Selectors */}
      <div className="flex flex-wrap gap-3">
        <select value={selProjectId} onChange={(e) => setSelProjectId(e.target.value)} className={selectCls}>
          <option value="">Select project…</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
        {versions.length > 0 && (
          <select value={selVersionId} onChange={(e) => setSelVersionId(e.target.value)} className={selectCls}>
            <option value="">Select BOQ version…</option>
            {versions.map((v) => <option key={v._id} value={v._id}>{v.name} ({v.status})</option>)}
          </select>
        )}
      </div>

      {loading && <div className="text-center py-10 text-gray-400">Loading BOQ…</div>}

      {version && !loading && (
        <>
          {/* Version header */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-gray-800 text-lg">{version.name}</h2>
                {version.description && <p className="text-sm text-gray-500 mt-0.5">{version.description}</p>}
                <p className="text-sm text-gray-400 mt-1">Status: <span className="font-medium capitalize">{version.status}</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Grand Total</p>
                <p className="text-xl font-bold text-gray-800">{version.currency} {fmt(version.totalCost)}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-600"><CheckCircle size={13} /> {approvedCount} approved</span>
              <span className="flex items-center gap-1 text-red-500"><XCircle size={13} /> {rejectedCount} rejected</span>
              <span className="flex items-center gap-1 text-gray-400"><Clock size={13} /> {items.length - approvedCount - rejectedCount} pending</span>
            </div>

            {/* Version-level approval */}
            {version.status !== 'approved' && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                <p className="text-sm text-gray-600 flex-1">Ready to give overall approval for this BOQ?</p>
                {versionApproval ? (
                  <span className={`text-sm font-semibold capitalize ${STATUS_COLORS[versionApproval.status]}`}>
                    Version {versionApproval.status}
                  </span>
                ) : (
                  <>
                    <button onClick={() => handleVersionDecision('approved')} disabled={submittingVersion}
                      className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60">
                      <CheckCircle size={14} /> Approve All
                    </button>
                    <button onClick={() => handleVersionDecision('rejected')} disabled={submittingVersion}
                      className="flex items-center gap-1.5 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-60">
                      <XCircle size={14} /> Reject
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="space-y-2">
            {items.map((item) => (
              <ItemRow
                key={item._id}
                item={item}
                approval={approvalMap[item._id]}
                onDecide={handleDecide}
              />
            ))}
          </div>
        </>
      )}

      {!selProjectId && (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle size={40} className="mx-auto mb-3 opacity-20" />
          <p>Select a project to view and approve its BOQ</p>
        </div>
      )}
    </div>
  );
}
