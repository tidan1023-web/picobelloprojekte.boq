'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { defectsApi, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { DefectLog } from '@/types';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { SeverityBadge, DefectStatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { ExportButton } from '@/components/ui/ExportButton';

export default function DefectsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [resolveModal, setResolveModal] = useState<DefectLog | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolving, setResolving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['defects', { status: statusFilter, severity: severityFilter }],
    queryFn: () =>
      defectsApi.list({
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
        limit: 50,
      }),
  });

  const defects: DefectLog[] = data?.defects || [];

  const handleAcknowledge = async (defect: DefectLog) => {
    try {
      await defectsApi.acknowledge(defect._id);
      toast.success('Defect acknowledged');
      queryClient.invalidateQueries({ queryKey: ['defects'] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleResolve = async () => {
    if (!resolveModal || !resolution.trim()) {
      toast.error('Enter a resolution description');
      return;
    }
    setResolving(true);
    try {
      await defectsApi.resolve(resolveModal._id, resolution);
      toast.success('Defect resolved');
      setResolveModal(null);
      setResolution('');
      queryClient.invalidateQueries({ queryKey: ['defects'] });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setResolving(false);
    }
  };

  const openCount = defects.filter((d) => d.status === 'open').length;
  const criticalCount = defects.filter((d) => d.severity === 'critical' && d.status !== 'resolved').length;

  return (
    <>
      <Header
        title="Defect Logs"
        subtitle={`${openCount} open · ${criticalCount} critical`}
      />

      <div className="p-4 sm:p-6 space-y-4">
        {criticalCount > 0 && (
          <div className="flex items-center gap-3 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              {criticalCount} critical defect{criticalCount > 1 ? 's' : ''} require immediate attention.
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <Select
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'open', label: 'Open' },
              { value: 'acknowledged', label: 'Acknowledged' },
              { value: 'resolved', label: 'Resolved' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          />
          <Select
            options={[
              { value: '', label: 'All Severities' },
              { value: 'critical', label: 'Critical' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-40"
          />
          <ExportButton
            rows={defects.map((d) => ({
              SKU: d.productSku,
              Severity: d.severity,
              Status: d.status,
              Description: d.description,
              'Logged By': `${d.loggedBy.name} (${d.loggedBy.employeeId})`,
              'Logged At': format(new Date(d.createdAt), 'yyyy-MM-dd HH:mm'),
              Resolution: d.resolution || '',
            }))}
            columns={[
              { header: 'SKU', key: 'SKU' },
              { header: 'Severity', key: 'Severity' },
              { header: 'Status', key: 'Status' },
              { header: 'Description', key: 'Description' },
              { header: 'Logged By', key: 'Logged By' },
              { header: 'Logged At', key: 'Logged At' },
              { header: 'Resolution', key: 'Resolution' },
            ]}
            baseName="defects"
            title="Defect Log Report"
          />
        </div>

        {isLoading ? (
          <PageLoader />
        ) : defects.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <CheckCircle className="h-12 w-12 text-green-300 dark:text-green-700 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No defects found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {defects.map((defect) => {
              const productRef = defect.productId as { _id: string; sku: string; name: string };
              return (
                <Card key={defect._id} padding="sm">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      defect.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/40' :
                      defect.severity === 'high' ? 'bg-orange-100 dark:bg-orange-900/40' : 'bg-amber-100 dark:bg-amber-900/40'
                    }`}>
                      <AlertTriangle className={`h-4 w-4 ${
                        defect.severity === 'critical' ? 'text-red-600 dark:text-red-400' :
                        defect.severity === 'high' ? 'text-orange-600 dark:text-orange-400' : 'text-amber-600 dark:text-amber-400'
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <SeverityBadge severity={defect.severity} />
                        <DefectStatusBadge status={defect.status} />
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {typeof productRef === 'object' ? `${productRef.sku}` : defect.productSku}
                        </span>
                      </div>
                      <p className="text-sm text-slate-800 dark:text-slate-200">{defect.description}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {defect.loggedBy.name}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {format(new Date(defect.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {defect.resolution && (
                        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-800 dark:text-green-300">
                          <strong>Resolution:</strong> {defect.resolution}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                      {typeof productRef === 'object' && (
                        <Link href={`/inventory/${productRef._id}`}>
                          <Button size="sm" variant="ghost" leftIcon={<Eye className="h-3.5 w-3.5" />}>
                            View
                          </Button>
                        </Link>
                      )}
                      {user?.role === 'admin' && defect.status === 'open' && (
                        <Button size="sm" variant="secondary" onClick={() => handleAcknowledge(defect)}>
                          Ack
                        </Button>
                      )}
                      {user?.role === 'admin' && defect.status !== 'resolved' && (
                        <Button size="sm" variant="secondary" onClick={() => setResolveModal(defect)}>
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!resolveModal}
        onClose={() => { setResolveModal(null); setResolution(''); }}
        title="Resolve Defect"
        footer={
          <>
            <Button variant="outline" onClick={() => { setResolveModal(null); setResolution(''); }}>Cancel</Button>
            <Button onClick={handleResolve} isLoading={resolving} leftIcon={<CheckCircle className="h-4 w-4" />}>
              Mark Resolved
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {resolveModal && (
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-sm text-slate-700 dark:text-slate-300">
              {resolveModal.description}
            </div>
          )}
          <Textarea
            label="Resolution"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="Describe how this defect was resolved..."
            rows={4}
            required
          />
        </div>
      </Modal>
    </>
  );
}
