'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ClipboardList, Shield } from 'lucide-react';
import { auditApi } from '@/lib/api';
import { AuditLog } from '@/types';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { ExportButton } from '@/components/ui/ExportButton';

const ACTION_COLORS: Record<string, string> = {
  PRODUCT_DISPATCHED: 'purple',
  PRODUCT_VERIFIED: 'green',
  DEFECT_LOGGED: 'red',
  DISPATCH_BLOCKED: 'red',
  USER_DEACTIVATED: 'red',
  EBAY_LISTING_CREATED: 'blue',
};

export default function AuditPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', { action: actionFilter, entity: entityFilter, startDate, endDate, page }],
    queryFn: () =>
      auditApi.list({
        action: actionFilter || undefined,
        entityType: entityFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit: 50,
      }),
  });

  const logs: AuditLog[] = data?.logs || [];
  const pagination = data?.pagination;

  const exportRows = logs.map((l) => ({
    Timestamp: format(new Date(l.timestamp), 'yyyy-MM-dd HH:mm:ss'),
    Action: l.action,
    'Entity Type': l.entityType,
    'Employee ID': l.employeeId,
    Name: l.userName,
    Email: l.userEmail,
    IP: l.ipAddress || '',
    Details: JSON.stringify(l.details),
  }));

  const exportCols = [
    { header: 'Timestamp', key: 'Timestamp' },
    { header: 'Action', key: 'Action' },
    { header: 'Entity Type', key: 'Entity Type' },
    { header: 'Employee ID', key: 'Employee ID' },
    { header: 'Name', key: 'Name' },
    { header: 'Email', key: 'Email' },
    { header: 'IP', key: 'IP' },
    { header: 'Details', key: 'Details' },
  ];

  return (
    <>
      <Header
        title="Audit Trail"
        subtitle="Immutable log of all system actions"
        actions={
          <ExportButton
            rows={exportRows}
            columns={exportCols}
            baseName="audit-log"
            title="Audit Trail Report"
          />
        }
      />

      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <p className="text-sm text-blue-800 dark:text-blue-300">
            All audit records are immutable — compliance-safe.
          </p>
        </div>

        <Card padding="sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Select
              options={[
                { value: '', label: 'All Actions' },
                { value: 'USER_LOGIN', label: 'Login' },
                { value: 'PRODUCT_CREATED', label: 'Product Created' },
                { value: 'IMAGE_UPLOADED', label: 'Image Uploaded' },
                { value: 'PRODUCT_VERIFIED', label: 'Verified' },
                { value: 'PRODUCT_DISPATCHED', label: 'Dispatched' },
                { value: 'DEFECT_LOGGED', label: 'Defect Logged' },
                { value: 'EBAY_LISTING_CREATED', label: 'eBay Listed' },
              ]}
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            />
            <Select
              options={[
                { value: '', label: 'All Entities' },
                { value: 'product', label: 'Product' },
                { value: 'user', label: 'User' },
                { value: 'defect', label: 'Defect' },
                { value: 'ebay_listing', label: 'eBay' },
              ]}
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
            />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            />
          </div>
        </Card>

        {isLoading ? (
          <PageLoader />
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <ClipboardList className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No audit records found</p>
          </div>
        ) : (
          <>
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                      {['Timestamp', 'Action', 'Entity', 'Employee', 'User', 'Details'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {logs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">
                          {format(new Date(log.timestamp), 'MMM d, yyyy')}
                          <br />
                          {format(new Date(log.timestamp), 'HH:mm:ss')}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={(ACTION_COLORS[log.action] as 'purple' | 'green' | 'red' | 'blue') || 'gray'}
                            size="sm"
                          >
                            {log.action.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 capitalize">
                          {log.entityType}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-700 dark:text-slate-300">
                          {log.employeeId}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                          {log.userName}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                          <span className="truncate block" title={JSON.stringify(log.details)}>
                            {Object.entries(log.details || {})
                              .slice(0, 2)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' · ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {pagination.total.toLocaleString()} total records
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button size="sm" variant="outline" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
