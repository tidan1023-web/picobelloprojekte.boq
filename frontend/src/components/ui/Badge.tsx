import { clsx } from 'clsx';
import { ProductStatus, DefectSeverity, DefectStatus } from '@/types';

type BadgeVariant = 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange' | 'amber';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  gray: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  green: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  yellow: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  red: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  orange: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
};

export function Badge({ variant = 'gray', size = 'md', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

const statusVariantMap: Record<ProductStatus, BadgeVariant> = {
  pending: 'yellow',
  images_uploaded: 'blue',
  verified: 'green',
  dispatched: 'purple',
  defective: 'red',
};

const statusLabelMap: Record<ProductStatus, string> = {
  pending: 'Pending',
  images_uploaded: 'Imgs Uploaded',
  verified: 'Verified',
  dispatched: 'Dispatched',
  defective: 'Defective',
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <Badge variant={statusVariantMap[status]}>{statusLabelMap[status]}</Badge>;
}

const severityMap: Record<DefectSeverity, BadgeVariant> = {
  low: 'blue',
  medium: 'yellow',
  high: 'orange',
  critical: 'red',
};

export function SeverityBadge({ severity }: { severity: DefectSeverity }) {
  return (
    <Badge variant={severityMap[severity]}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </Badge>
  );
}

const defectStatusMap: Record<DefectStatus, BadgeVariant> = {
  open: 'red',
  acknowledged: 'yellow',
  resolved: 'green',
};

export function DefectStatusBadge({ status }: { status: DefectStatus }) {
  return (
    <Badge variant={defectStatusMap[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function ShipReadinessBadge({ ready }: { ready: boolean }) {
  return ready ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-1 text-xs font-bold text-green-800 dark:text-green-300">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
      READY
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/40 px-2 py-1 text-xs font-bold text-red-800 dark:text-red-300">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      NOT READY
    </span>
  );
}
