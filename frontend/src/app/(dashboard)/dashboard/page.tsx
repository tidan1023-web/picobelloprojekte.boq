'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  AlertTriangle,
  Users,
  XCircle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { dashboardApi, productsApi, defectsApi, authApi } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { ProductStatusBadge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Product } from '@/types';
import Link from 'next/link';

type SectionKey = 'stats1' | 'stats2' | 'readyToShip' | 'needsAttention' | 'activity';
type PanelKey =
  | 'totalProducts'
  | 'pending'
  | 'verified'
  | 'dispatched'
  | 'imgsUploaded'
  | 'defective'
  | 'openDefects'
  | 'users';

const ALL_SECTIONS: SectionKey[] = ['stats1', 'stats2', 'readyToShip', 'needsAttention', 'activity'];
const STORAGE_KEY = 'dashboard_collapsed';

const PANEL_META: Record<PanelKey, { label: string; href: string; hrefLabel: string }> = {
  totalProducts: { label: 'All Products', href: '/inventory', hrefLabel: 'View full inventory' },
  pending:       { label: 'Pending Products', href: '/inventory?status=pending', hrefLabel: 'View all pending' },
  verified:      { label: 'Verified Products', href: '/inventory?status=verified', hrefLabel: 'View all verified' },
  dispatched:    { label: 'Dispatched Products', href: '/inventory?status=dispatched', hrefLabel: 'View all dispatched' },
  imgsUploaded:  { label: 'Images Uploaded', href: '/inventory?status=images_uploaded', hrefLabel: 'View all' },
  defective:     { label: 'Defective Products', href: '/inventory?status=defective', hrefLabel: 'View all defective' },
  openDefects:   { label: 'Open Defects', href: '/defects', hrefLabel: 'View all defects' },
  users:         { label: 'Active Users', href: '/team', hrefLabel: 'View all users' },
};

function SectionToggle({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
    >
      {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      {open ? 'Collapse' : 'Expand'}
    </button>
  );
}

function Collapsible({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

function PanelItem({ href, left, right }: { href: string; left: React.ReactNode; right: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
    >
      <div className="min-w-0 flex-1">{left}</div>
      <div className="shrink-0 flex items-center gap-2">
        {right}
        <ExternalLink className="h-3 w-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

function StatPanel({ panelKey }: { panelKey: PanelKey }) {
  const meta = PANEL_META[panelKey];

  const { data, isLoading } = useQuery({
    queryKey: ['stat-panel', panelKey],
    queryFn: async () => {
      if (panelKey === 'openDefects') {
        const r = await defectsApi.list({ limit: 10 });
        return { type: 'defects', items: r.defects ?? r };
      }
      if (panelKey === 'users') {
        const r = await authApi.listUsers();
        return { type: 'users', items: r.users ?? r };
      }
      const statusMap: Record<string, string | undefined> = {
        totalProducts: undefined,
        pending: 'pending',
        verified: 'verified',
        dispatched: 'dispatched',
        imgsUploaded: 'images_uploaded',
        defective: 'defective',
      };
      const r = await productsApi.list({ status: statusMap[panelKey], limit: 10 });
      return { type: 'products', items: r.products ?? r };
    },
    staleTime: 30_000,
  });

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{meta.label}</p>
        <Link href={meta.href} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
          {meta.hrefLabel} →
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : !data?.items?.length ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">No items found</p>
      ) : data.type === 'products' ? (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {data.items.slice(0, 10).map((p: Product) => (
            <PanelItem
              key={p._id}
              href={`/inventory/${p._id}`}
              left={
                <>
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{p.sku}</p>
                </>
              }
              right={<ProductStatusBadge status={p.status} />}
            />
          ))}
        </div>
      ) : data.type === 'defects' ? (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {data.items.slice(0, 10).map((d: { _id: string; title?: string; description?: string; severity: string; status: string; productId?: { name?: string } }) => (
            <PanelItem
              key={d._id}
              href={`/defects`}
              left={
                <>
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {d.title || d.description || 'Defect'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {d.productId?.name ?? ''} · {d.severity}
                  </p>
                </>
              }
              right={
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  d.status === 'open'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                  {d.status}
                </span>
              }
            />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {data.items.slice(0, 10).map((u: { _id: string; name: string; employeeId: string; role: string }) => (
            <PanelItem
              key={u._id}
              href={`/team/${u._id}`}
              left={
                <>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{u.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{u.employeeId}</p>
                </>
              }
              right={
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize">
                  {u.role}
                </span>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>(() => {
    if (typeof window === 'undefined')
      return Object.fromEntries(ALL_SECTIONS.map((k) => [k, false])) as Record<SectionKey, boolean>;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored
        ? JSON.parse(stored)
        : (Object.fromEntries(ALL_SECTIONS.map((k) => [k, false])) as Record<SectionKey, boolean>);
    } catch {
      return Object.fromEntries(ALL_SECTIONS.map((k) => [k, false])) as Record<SectionKey, boolean>;
    }
  });

  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed));
  }, [collapsed]);

  const toggle = (key: SectionKey) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const allCollapsed = ALL_SECTIONS.every((k) => collapsed[k]);
  const toggleAll = () => {
    const next = !allCollapsed;
    setCollapsed(Object.fromEntries(ALL_SECTIONS.map((k) => [k, next])) as Record<SectionKey, boolean>);
  };

  const handleStatClick = (key: PanelKey) => {
    setActivePanel((prev) => (prev === key ? null : key));
  };

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.getStats,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <>
        <Header title="Dashboard" />
        <div className="p-6">
          <PageLoader />
        </div>
      </>
    );
  }

  const { stats, alerts, recentActivity } = data || {};

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Real-time inventory overview"
        actions={
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
            {allCollapsed ? 'Expand All' : 'Collapse All'}
          </button>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Critical Alerts */}
        {(stats?.criticalDefects > 0 || alerts?.itemsNeedingAttention?.length > 0) && (
          <div className="flex items-start gap-3 p-3.5 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">Attention Required</p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">
                {stats?.criticalDefects > 0 && (
                  <span>{stats.criticalDefects} critical defect{stats.criticalDefects > 1 ? 's' : ''} open. </span>
                )}
                {alerts?.itemsNeedingAttention?.length > 0 && (
                  <span>{alerts.itemsNeedingAttention.length} item{alerts.itemsNeedingAttention.length > 1 ? 's' : ''} need attention.</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Stats Row 1 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Overview</p>
            <SectionToggle label="Overview" open={!collapsed.stats1} onToggle={() => toggle('stats1')} />
          </div>
          <Collapsible open={!collapsed.stats1}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pb-1">
              <StatsCard title="Total Products" value={stats?.totalProducts ?? 0} icon={Package}
                onClick={() => handleStatClick('totalProducts')} active={activePanel === 'totalProducts'} />
              <StatsCard title="Pending" value={stats?.pendingProducts ?? 0} icon={Clock} variant="warning"
                onClick={() => handleStatClick('pending')} active={activePanel === 'pending'} />
              <StatsCard title="Verified" value={stats?.verifiedProducts ?? 0} icon={CheckCircle} variant="success"
                onClick={() => handleStatClick('verified')} active={activePanel === 'verified'} />
              <StatsCard title="Dispatched" value={stats?.dispatchedProducts ?? 0} icon={Truck}
                onClick={() => handleStatClick('dispatched')} active={activePanel === 'dispatched'} />
            </div>
          </Collapsible>
        </div>

        {/* Stats Row 2 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Defects &amp; Users</p>
            <SectionToggle label="Defects & Users" open={!collapsed.stats2} onToggle={() => toggle('stats2')} />
          </div>
          <Collapsible open={!collapsed.stats2}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pb-1">
              <StatsCard title="Imgs Uploaded" value={stats?.imagesUploadedProducts ?? 0} icon={TrendingUp} variant="info"
                onClick={() => handleStatClick('imgsUploaded')} active={activePanel === 'imgsUploaded'} />
              <StatsCard title="Defective" value={stats?.defectiveProducts ?? 0} icon={XCircle} variant="danger"
                onClick={() => handleStatClick('defective')} active={activePanel === 'defective'} />
              <StatsCard title="Open Defects" value={stats?.openDefects ?? 0} icon={AlertTriangle} variant="danger"
                onClick={() => handleStatClick('openDefects')} active={activePanel === 'openDefects'} />
              <StatsCard title="Active Users" value={stats?.totalUsers ?? 0} icon={Users}
                onClick={() => handleStatClick('users')} active={activePanel === 'users'} />
            </div>
          </Collapsible>
        </div>

        {/* Expandable stat detail panel */}
        <Collapsible open={!!activePanel}>
          <div className="pb-1">
            {activePanel && <StatPanel panelKey={activePanel} />}
          </div>
        </Collapsible>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Ready to Ship */}
          <Card>
            <CardHeader
              title="Ready to Ship"
              subtitle="Verified products awaiting dispatch"
              action={
                <div className="flex items-center gap-3">
                  <Link href="/shipments" className="text-xs text-brand-600 hover:text-brand-700 font-medium">View all</Link>
                  <SectionToggle label="Ready to Ship" open={!collapsed.readyToShip} onToggle={() => toggle('readyToShip')} />
                </div>
              }
            />
            <Collapsible open={!collapsed.readyToShip}>
              <div className="pb-1">
                {alerts?.readyToShip?.length > 0 ? (
                  <div className="space-y-2">
                    {alerts.readyToShip.slice(0, 5).map((product: Product) => (
                      <Link key={product._id} href={`/inventory/${product._id}`}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{product.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{product.sku}</p>
                        </div>
                        <ProductStatusBadge status="verified" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">No products ready to ship</p>
                )}
              </div>
            </Collapsible>
          </Card>

          {/* Needs Attention */}
          <Card>
            <CardHeader
              title="Needs Attention"
              subtitle="Items with incomplete images or defects"
              action={
                <div className="flex items-center gap-3">
                  <Link href="/inventory?status=pending" className="text-xs text-brand-600 hover:text-brand-700 font-medium">View all</Link>
                  <SectionToggle label="Needs Attention" open={!collapsed.needsAttention} onToggle={() => toggle('needsAttention')} />
                </div>
              }
            />
            <Collapsible open={!collapsed.needsAttention}>
              <div className="pb-1">
                {alerts?.itemsNeedingAttention?.length > 0 ? (
                  <div className="space-y-2">
                    {alerts.itemsNeedingAttention.slice(0, 5).map((product: Product) => (
                      <Link key={product._id} href={`/inventory/${product._id}`}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${product.status === 'defective' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{product.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{product.sku}</p>
                        </div>
                        <ProductStatusBadge status={product.status} />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">No items need attention</p>
                )}
              </div>
            </Collapsible>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader
            title="Recent Activity"
            subtitle="Latest actions across the system"
            action={<SectionToggle label="Recent Activity" open={!collapsed.activity} onToggle={() => toggle('activity')} />}
          />
          <Collapsible open={!collapsed.activity}>
            <div className="pb-1">
              <ActivityFeed logs={recentActivity || []} />
            </div>
          </Collapsible>
        </Card>
      </div>
    </>
  );
}
