'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Warehouse, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard');
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please enter your credentials'); return; }
    setIsLoading(true);
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-brand-700 rounded-2xl shadow-lg mb-4">
            <Warehouse className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Warehouse HQ</h1>
          <p className="text-slate-400 text-sm mt-1">Inventory Management System</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Sign in</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Enter your employee credentials</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Email<span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-9 py-2.5 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="you@company.com"
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Password<span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 pl-9 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" size="lg" isLoading={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Contact your administrator for account access
        </p>
      </div>
    </div>
  );
}
