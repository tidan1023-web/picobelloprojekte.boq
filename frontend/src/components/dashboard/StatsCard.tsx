import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  variant?: 'default' | 'warning' | 'success' | 'danger' | 'info';
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

const variantStyles = {
  default: {
    card: '',
    icon: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    value: 'text-slate-900 dark:text-white',
  },
  warning: {
    card: '',
    icon: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    value: 'text-amber-700 dark:text-amber-400',
  },
  success: {
    card: '',
    icon: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
    value: 'text-green-700 dark:text-green-400',
  },
  danger: {
    card: 'border-red-200 dark:border-red-800/50',
    icon: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    value: 'text-red-700 dark:text-red-400',
  },
  info: {
    card: '',
    icon: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    value: 'text-blue-700 dark:text-blue-400',
  },
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  className,
  onClick,
  active,
}: StatsCardProps) {
  const styles = variantStyles[variant];
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      {...(onClick ? { onClick, type: 'button' as const } : {})}
      className={clsx(
        'bg-white dark:bg-slate-800 rounded-xl border shadow-sm',
        'p-3.5 sm:p-5 flex items-start gap-3 sm:gap-4 w-full text-left',
        active
          ? 'border-brand-500 dark:border-brand-400 ring-2 ring-brand-500/20 dark:ring-brand-400/20'
          : 'border-slate-200 dark:border-slate-700',
        onClick && 'cursor-pointer hover:border-brand-400 dark:hover:border-brand-500 transition-colors',
        styles.card,
        className
      )}
    >
      <div className={clsx('p-2 sm:p-2.5 rounded-lg shrink-0', styles.icon)}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-tight">
          {title}
        </p>
        <p className={clsx('text-xl sm:text-2xl font-bold mt-0.5', styles.value)}>{value}</p>
        {trend && (
          <p
            className={clsx(
              'text-xs mt-1',
              trend.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )}
          >
            {trend.value >= 0 ? '+' : ''}
            {trend.value} {trend.label}
          </p>
        )}
      </div>
      {onClick && (
        <div className={clsx(
          'text-xs font-medium shrink-0 mt-0.5',
          active ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'
        )}>
          {active ? 'Hide ▲' : 'View ▼'}
        </div>
      )}
    </Tag>
  );
}
