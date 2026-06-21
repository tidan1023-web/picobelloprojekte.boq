import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export function LoadingSpinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeMap = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };
  return <Loader2 className={clsx('animate-spin text-brand-600', sizeMap[size], className)} />;
}

export function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
