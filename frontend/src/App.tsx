import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { OrderCreatePage } from './pages/OrderCreatePage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { SupervisorUpdatePage } from './pages/SupervisorUpdatePage';
import { BuyerPortalPage } from './pages/BuyerPortalPage';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import type { UserRole } from './types';

// Protected Route Guard with RBAC
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Authenticating session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If buyer tries to access merchandiser board, route to buyer portal
    if (user.role === 'BUYER') {
      return <Navigate to="/buyer" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Root index redirect based on user role
const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'BUYER') {
    return <Navigate to="/buyer" replace />;
  }

  if (user.role === 'SUPERVISOR') {
    return <DashboardPage />;
  }

  return <DashboardPage />;
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated Application Shell */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Main Production Board */}
            <Route index element={<RootRedirect />} />

            {/* Merchandiser Order Creation */}
            <Route
              path="orders/new"
              element={
                <ProtectedRoute allowedRoles={['MERCHANDISER', 'ADMIN']}>
                  <OrderCreatePage />
                </ProtectedRoute>
              }
            />

            {/* Order Detail & TNA Milestones */}
            <Route
              path="orders/:id"
              element={
                <ProtectedRoute allowedRoles={['MERCHANDISER', 'SUPERVISOR', 'ADMIN']}>
                  <OrderDetailPage />
                </ProtectedRoute>
              }
            />

            {/* Mobile-First Supervisor Floor Update */}
            <Route
              path="supervisor/update"
              element={
                <ProtectedRoute allowedRoles={['SUPERVISOR', 'ADMIN']}>
                  <SupervisorUpdatePage />
                </ProtectedRoute>
              }
            />

            {/* Buyer Read-Only Portal */}
            <Route
              path="buyer"
              element={
                <ProtectedRoute allowedRoles={['BUYER', 'ADMIN']}>
                  <BuyerPortalPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
