import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingMap = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };

export function Card({ children, className, padding = 'md' }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm',
        paddingMap[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </div>
  );
}
