'use client';

import { Bell, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="ml-10 lg:ml-0 min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {actions}
          <button
            onClick={toggleTheme}
            className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>
          <button className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <div className="h-8 w-8 rounded-full bg-brand-700 flex items-center justify-center shrink-0">
            {(user as { profilePicture?: { s3Url?: string } })?.profilePicture?.s3Url ? (
              <img
                src={(user as { profilePicture?: { s3Url?: string } }).profilePicture!.s3Url}
                alt={user?.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-white">
                {user?.name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
