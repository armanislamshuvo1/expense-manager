import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { isPwaMode } from './utils/pwaUtils';
import Landing from './pages/Landing';
import About from './pages/About';
import HowItWorks from './pages/HowItWorks';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import More from './pages/More';
import Profile from './pages/Profile';
import AdminConsole from './pages/AdminConsole';
import IncomeCategoriesSetting from './pages/IncomeCategoriesSetting';
import ExpenseCategoriesSetting from './pages/ExpenseCategoriesSetting';
import AccountsSetting from './pages/AccountsSetting';
import SharedDashboard from './pages/SharedDashboard';
import ScrollToTop from './components/ScrollToTop';

import PublicLayout from './components/PublicLayout';

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
      <AuthProvider>
        <ThemeProvider>
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
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
