/**
 * Enterprise Cleanup Tracker Application
 * Professional, modern UI with advanced features
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { V2 } from './utils/v2Client';
import { MainLayout } from './components/Layout/EnterpriseLayout';
import { NotificationProvider } from './components/ui/NotificationSystem';
import ComprehensiveDashboard from './pages/ComprehensiveDashboard';
import EnterpriseJobManager from './pages/EnterpriseJobManager';
import EnterpriseSettings from './pages/EnterpriseSettings';
import VehicleManagement from './pages/VehicleManagement';
import TeamManagement from './pages/TeamManagement';
import ReportsAnalytics from './pages/ReportsAnalytics';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import PrivateRoute from './components/private-route/PrivateRoute';
import './App.css';

// ============================================================================
// MAIN APP
// ============================================================================

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
        V2.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (err) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = async (pin) => {
    try {
      setIsLoading(true);
      setLoginError(null);
      const response = await V2.post('/auth/login', { pin });
      const { user: userData, tokens } = response.data;

      // Store tokens and user data
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));

      // Set auth header
      V2.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;

      setUser(userData);
    } catch (error) {
      setLoginError(error.response?.data?.error || 'Login failed. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    delete V2.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <NotificationProvider>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={
              <LoginRoute
                user={user}
                onLogin={handleLogin}
                isLoading={isLoading}
                error={loginError}
              />
            }
          />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <MainApp user={user} onLogout={handleLogout} />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </NotificationProvider>
  );
}

const MainApp = ({ user, onLogout }) => {
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState(location.pathname.substring(1) || 'dashboard');

  useEffect(() => {
    setCurrentPage(location.pathname.substring(1) || 'dashboard');
  }, [location]);

  return (
    <MainLayout
      user={user}
      currentPage={currentPage}
      onLogout={onLogout}
    >
      <Routes>
        <Route path="/" element={<ComprehensiveDashboard user={user} />} />
        <Route path="/dashboard" element={<ComprehensiveDashboard user={user} />} />
        <Route path="/jobs" element={<EnterpriseJobManager user={user} />} />
        <Route path="/settings" element={<EnterpriseSettings user={user} />} />
        <Route path="/vehicles" element={<VehicleManagement user={user} />} />
        <Route path="/technicians" element={<TeamManagement user={user} />} />
        <Route path="/reports" element={<ReportsAnalytics user={user} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MainLayout>
  );
};

const LoginRoute = ({ user, onLogin, isLoading, error }) => {
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <LoginPage onLogin={onLogin} isLoading={isLoading} error={error} />;
};

export default App;
