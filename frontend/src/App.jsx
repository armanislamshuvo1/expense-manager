import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { isPwaMode } from './utils/pwaUtils';
import ScrollToTop from './components/ScrollToTop';
import SyncStatusBanner from './components/SyncStatusBanner';
import NativeMobileController from './components/NativeMobileController';
import { AccountModalProvider } from './context/AccountModalContext';
import PublicLayout from './components/PublicLayout';

// Robust lazy import with automatic retry on chunk update / cache refresh
function lazyWithRetry(componentImport) {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      const refreshed = sessionStorage.getItem('pwa_chunk_refreshed');
      if (!refreshed) {
        sessionStorage.setItem('pwa_chunk_refreshed', 'true');
        window.location.reload();
        return { default: () => null };
      }
      sessionStorage.removeItem('pwa_chunk_refreshed');
      throw error;
    }
  });
}

const Landing = lazyWithRetry(() => import('./pages/Landing'));
const About = lazyWithRetry(() => import('./pages/About'));
const HowItWorks = lazyWithRetry(() => import('./pages/HowItWorks'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const Register = lazyWithRetry(() => import('./pages/Register'));
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Transactions = lazyWithRetry(() => import('./pages/Transactions'));
const Accounts = lazyWithRetry(() => import('./pages/Accounts'));
const More = lazyWithRetry(() => import('./pages/More'));
const Profile = lazyWithRetry(() => import('./pages/Profile'));
const AdminConsole = lazyWithRetry(() => import('./pages/AdminConsole'));
const IncomeCategoriesSetting = lazyWithRetry(() => import('./pages/IncomeCategoriesSetting'));
const ExpenseCategoriesSetting = lazyWithRetry(() => import('./pages/ExpenseCategoriesSetting'));
const AccountsSetting = lazyWithRetry(() => import('./pages/AccountsSetting'));
const SharedDashboard = lazyWithRetry(() => import('./pages/SharedDashboard'));
const WealthBuddy = lazyWithRetry(() => import('./pages/WealthBuddy'));

function PageLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-300">
      <div className="flex flex-col items-center gap-3">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <span className="text-xs text-base-content/60 font-medium">Loading NexusWealth...</span>
      </div>
    </div>
  );
}

function PwaSafeRoute({ element }) {
  if (isPwaMode()) {
    return <Navigate to="/dashboard" replace />;
  }
  return element;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <NativeMobileController />
      <AuthProvider>
        <ThemeProvider>
          <AccountModalProvider>
            <SyncStatusBanner />
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
              {/* Public Layout Routes (Includes Global Promo Banner & Navbar) */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<PwaSafeRoute element={<Landing />} />} />
                <Route path="/about" element={<PwaSafeRoute element={<About />} />} />
                <Route path="/how-it-works" element={<PwaSafeRoute element={<HowItWorks />} />} />
                <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            <Route path="/shared/:token" element={<SharedDashboard />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/transactions" element={
              <ProtectedRoute>
                <Transactions />
              </ProtectedRoute>
            } />

            <Route path="/accounts" element={
              <ProtectedRoute>
                <Accounts />
              </ProtectedRoute>
            } />

            <Route path="/more" element={
              <ProtectedRoute>
                <More />
              </ProtectedRoute>
            } />

            <Route path="/wealthbuddy" element={
              <ProtectedRoute>
                <WealthBuddy />
              </ProtectedRoute>
            } />


            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />

            <Route path="/settings/income-categories" element={
              <ProtectedRoute>
                <IncomeCategoriesSetting />
              </ProtectedRoute>
            } />

            <Route path="/settings/expense-categories" element={
              <ProtectedRoute>
                <ExpenseCategoriesSetting />
              </ProtectedRoute>
            } />

            <Route path="/settings/accounts" element={
              <ProtectedRoute>
                <AccountsSetting />
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminConsole />
              </ProtectedRoute>
            } />

            {/* Default fallback redirects to root landing page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </AccountModalProvider>
      </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
