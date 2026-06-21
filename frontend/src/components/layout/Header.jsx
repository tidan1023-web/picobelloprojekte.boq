import React, { useEffect } from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../NotificationBell';
import { registerPushSubscription } from '../../services/notifications';

export default function Header({ title, onMenuClick }) {
  const { user } = useAuth();
  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    registerPushSubscription();
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        {/* Hamburger — only visible on small screens */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-base sm:text-lg font-semibold text-gray-800 truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <span className="text-sm text-gray-500 hidden sm:block truncate max-w-[160px]">{user?.email}</span>
        <div className="w-8 h-8 bg-primary-900 text-white rounded-full flex items-center justify-center text-xs font-bold ml-1 shrink-0">
          {initials}
        </div>
      </div>
    </header>
  );
}
