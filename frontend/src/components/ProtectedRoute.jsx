import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        navigate('/login', { replace: true });
      } else if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, loading, user, allowedRoles, navigate]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-300 text-base-content">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
          <p className="text-sm opacity-80">Securing Session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
