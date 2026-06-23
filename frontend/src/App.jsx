import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Auth
import Landing            from './pages/Landing';
import Login              from './pages/auth/Login';
import Register           from './pages/auth/Register';
import ForgotPassword     from './pages/auth/ForgotPassword';
import ResetPassword      from './pages/auth/ResetPassword';
import AcceptInvite       from './pages/auth/AcceptInvite';

// Public
import PayInvoice         from './pages/PayInvoice';

// Dashboard
import Dashboard          from './pages/Dashboard';

// Projects & Contacts
import Projects           from './pages/Projects';
import Contacts           from './pages/Contacts';

// Pricing Libraries
import QsPricing          from './pages/QsPricing';
import QsComparison       from './pages/QsComparison';
import ArtisanPricing     from './pages/ArtisanPricing';
import MaterialPricing    from './pages/MaterialPricing';
import PricingIntelligence from './pages/PricingIntelligence';

// Invoices
import Invoices           from './pages/Invoices';
import InvoiceDetail      from './pages/InvoiceDetail';

// Execution
import ProgressTracker    from './pages/ProgressTracker';
import ChangeOrders       from './pages/ChangeOrders';
import SiteReports        from './pages/SiteReports';
import Analytics          from './pages/Analytics';
import ExpenseTracker     from './pages/ExpenseTracker';

// Estimator
import Estimator          from './pages/Estimator';
import EstimateDetail     from './pages/EstimateDetail';
import EstimateHistory    from './pages/EstimateHistory';
import HistoricalProjects from './pages/HistoricalProjects';
import Simulator          from './pages/Simulator';

// Documents
import Documents          from './pages/Documents';

// Admin
import CompanySettings    from './pages/CompanySettings';
import TeamManagement     from './pages/TeamManagement';
import Profile            from './pages/Profile';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/"                        element={<Landing />} />
          <Route path="/login"                   element={<Login />} />
          <Route path="/register"                element={<Register />} />
          <Route path="/forgot-password"         element={<ForgotPassword />} />
          <Route path="/reset-password/:token"   element={<ResetPassword />} />
          <Route path="/accept-invite/:token"    element={<AcceptInvite />} />
          <Route path="/pay/:token"              element={<PayInvoice />} />

          <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index                          element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard"              element={<Dashboard />} />
            <Route path="projects"               element={<Projects />} />
            <Route path="contacts"               element={<Contacts />} />
            <Route path="qs-prices"              element={<QsPricing />} />
            <Route path="qs-comparison"          element={<QsComparison />} />
            <Route path="artisan-prices"         element={<ArtisanPricing />} />
            <Route path="materials"              element={<MaterialPricing />} />
            <Route path="price-intelligence"     element={<PricingIntelligence />} />
            <Route path="invoices"               element={<Invoices />} />
            <Route path="invoices/:id"           element={<InvoiceDetail />} />
            <Route path="progress"               element={<ProgressTracker />} />
            <Route path="change-orders"          element={<ChangeOrders />} />
            <Route path="site-reports"           element={<SiteReports />} />
            <Route path="analytics"              element={<Analytics />} />
            <Route path="expenses"               element={<ExpenseTracker />} />
            <Route path="estimator"              element={<Estimator />} />
            <Route path="estimates"              element={<EstimateHistory />} />
            <Route path="estimates/:id"          element={<EstimateDetail />} />
            <Route path="historical-projects"    element={<HistoricalProjects />} />
            <Route path="simulator"              element={<Simulator />} />
            <Route path="documents"              element={<Documents />} />
            <Route path="settings"               element={<CompanySettings />} />
            <Route path="team"                   element={<TeamManagement />} />
            <Route path="profile"                element={<Profile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
