import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard, FolderOpen, Users,
  BookOpen, GitCompare, HardHat, Package, Zap,
  FileText, Calculator,
  TrendingUp, GitPullRequest, ClipboardList, BarChart2,
  Settings, LogOut, Moon, Sun, ShieldCheck,
  Receipt, UserCog, Library,
} from 'lucide-react';
import Logo from '../Logo';

const NAV_GROUPS = [
  {
    items: [
      { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/app/projects',  icon: FolderOpen,      label: 'Projects' },
      { to: '/app/contacts',  icon: Users,           label: 'Contacts' },
    ],
  },
  {
    heading: 'Pricing Libraries',
    clientHidden: true,
    items: [
      { to: '/app/qs-prices',          icon: BookOpen,       label: 'QS Prices' },
      { to: '/app/qs-comparison',      icon: GitCompare,     label: 'QS Comparison' },
      { to: '/app/artisan-prices',     icon: HardHat,        label: 'Artisan Rates' },
      { to: '/app/materials',          icon: Package,        label: 'Materials' },
      { to: '/app/price-intelligence', icon: Zap,            label: 'Price Intelligence' },
    ],
  },
  {
    heading: 'BOQ & Invoices',
    items: [
      { to: '/app/estimator', icon: Calculator, label: 'Project Estimator' },
      { to: '/app/invoices',  icon: FileText,   label: 'Invoices' },
    ],
  },
  {
    heading: 'Documents',
    items: [
      { to: '/app/documents', icon: Library, label: 'Document Library' },
    ],
  },
  {
    heading: 'Execution',
    items: [
      { to: '/app/progress',       icon: TrendingUp,     label: 'Progress Tracker' },
      { to: '/app/change-orders',  icon: GitPullRequest, label: 'Change Orders' },
      { to: '/app/site-reports',   icon: ClipboardList,  label: 'Site Reports' },
      { to: '/app/expenses',       icon: Receipt,        label: 'Expense Tracker', clientHidden: true },
      { to: '/app/analytics',      icon: BarChart2,      label: 'Analytics',       clientHidden: true },
    ],
  },
  {
    heading: 'Admin',
    items: [
      { to: '/app/team',     icon: UserCog,  label: 'Team Management', adminOnly: true },
      { to: '/app/settings', icon: Settings, label: 'Company Settings' },
    ],
  },
];

const ROLE_LABEL = {
  admin:           'Administrator',
  qs:              'Quantity Surveyor',
  project_manager: 'Project Manager',
  client:          'Client',
};

const ROLE_COLOR = {
  admin:           'bg-blue-500',
  qs:              'bg-purple-500',
  project_manager: 'bg-green-500',
  client:          'bg-orange-500',
};

const linkCls = (isActive) =>
  `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive ? 'bg-blue-600 text-white' : 'text-blue-200 hover:bg-primary-800 hover:text-white'
  }`;

export default function Sidebar({ onClose }) {
  const { user, logout }             = useAuth();
  const { dark, toggle: toggleDark } = useTheme();
  const navigate                     = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); onClose?.(); };

  return (
    <aside className="w-64 h-screen bg-primary-900 text-white flex flex-col">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-primary-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <Logo size={36} />
          <div className="leading-tight">
            <p className="text-sm font-bold leading-tight">Pico Bello Projekte</p>
            <p className="text-xs text-blue-300">Construction Management</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto min-h-0 space-y-4">
        {NAV_GROUPS.map((group, gi) => {
          const isClient = user?.role === 'client';
          if (group.clientHidden && isClient) return null;
          const visibleItems = group.items.filter((item) => {
            if (item.adminOnly && user?.role !== 'admin') return false;
            if (item.clientHidden && isClient) return false;
            return true;
          });
          if (visibleItems.length === 0) return null;
          return (
            <div key={gi}>
              {group.heading && (
                <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-blue-400 select-none">
                  {group.heading}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map(({ to, icon: Icon, label }) => (
                  <NavLink key={to} to={to} onClick={onClose}
                    className={({ isActive }) => linkCls(isActive)}>
                    <Icon size={15} className="shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-primary-800 shrink-0">
        <div className="px-2 py-2 mb-1.5 flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-full ${ROLE_COLOR[user?.role] ?? 'bg-gray-500'} flex items-center justify-center shrink-0 text-white font-bold text-sm`}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <div className="flex items-center gap-1">
              <ShieldCheck size={10} className="text-blue-400 shrink-0" />
              <p className="text-xs text-blue-300 truncate">{ROLE_LABEL[user?.role] ?? user?.role}</p>
            </div>
          </div>
        </div>

        <button onClick={toggleDark}
          className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-sm text-blue-200 hover:bg-primary-800 hover:text-white transition-colors mb-0.5">
          {dark ? <Sun size={15} /> : <Moon size={15} />}
          {dark ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-sm text-blue-200 hover:bg-primary-800 hover:text-white transition-colors">
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </aside>
  );
}
