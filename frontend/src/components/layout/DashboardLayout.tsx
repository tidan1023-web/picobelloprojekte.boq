'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/ui/LoadingSpinner';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <PageLoader />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
