import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const ALL_MODULES = [
  'projects', 'contacts', 'qs-prices', 'qs-comparison', 'artisan-prices',
  'materials', 'price-intelligence', 'boq', 'estimator', 'estimates',
  'invoices', 'documents', 'progress', 'change-orders', 'site-reports',
  'expenses', 'analytics',
];

const ModulesContext = createContext({ activeModules: ALL_MODULES, reload: () => {} });

export function ModulesProvider({ children }) {
  const { user } = useAuth();
  const [activeModules, setActiveModules] = useState(ALL_MODULES);

  useEffect(() => {
    if (!user) return;
    api.get('/company/modules')
      .then(({ data }) => setActiveModules(data.activeModules ?? ALL_MODULES))
      .catch(() => setActiveModules(ALL_MODULES));
  }, [user]);

  const reload = () =>
    api.get('/company/modules')
      .then(({ data }) => setActiveModules(data.activeModules ?? ALL_MODULES))
      .catch(() => {});

  const set = (modules) => setActiveModules(modules);

  return (
    <ModulesContext.Provider value={{ activeModules, reload, set }}>
      {children}
    </ModulesContext.Provider>
  );
}

export const useModules = () => useContext(ModulesContext);
export { ALL_MODULES };
