import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import OnboardingModal from '../OnboardingModal';

const TITLES = {
  '/app/dashboard':           'Dashboard',
  '/app/projects':            'Projects',
  '/app/contacts':            'Contacts',
  '/app/qs-prices':           'QS Prices',
  '/app/qs-comparison':       'QS Comparison',
  '/app/artisan-prices':      'Artisan Rates',
  '/app/materials':           'Materials',
  '/app/price-intelligence':  'Price Intelligence',
  '/app/boq':                 'BOQ Builder',
  '/app/invoices':            'Invoices',
  '/app/progress':            'Progress Tracker',
  '/app/change-orders':       'Change Orders',
  '/app/site-reports':        'Site Reports',
  '/app/analytics':           'Analytics',
  '/app/estimator':           'New Estimate',
  '/app/simulator':           'Scenario Simulator',
  '/app/estimates':           'Estimate History',
  '/app/historical-projects': 'Historical Projects',
  '/app/settings':            'Company Settings',
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const title = TITLES[pathname]
    ?? (pathname.startsWith('/app/estimates/') ? 'Estimate Detail'
      : pathname.startsWith('/app/invoices/')  ? 'Invoice Detail'
      : 'Pico Bello');

  return (
    <div className="flex h-screen overflow-hidden relative">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-auto transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-4 sm:p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>

      <OnboardingModal />
    </div>
  );
}
