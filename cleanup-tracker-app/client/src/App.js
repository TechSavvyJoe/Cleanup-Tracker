/**
 * Enterprise Cleanup Tracker Application
 * Professional, modern UI with advanced features
 */

import React, { useState, useEffect } from 'react';
import { V2 } from './utils/v2Client';
import { MainLayout } from './components/Layout/EnterpriseLayout';
import { Alert } from './components/ui/EnterpriseComponents';
import { NotificationProvider } from './components/ui/NotificationSystem';
import ComprehensiveDashboard from './pages/ComprehensiveDashboard';
import EnterpriseJobManager from './pages/EnterpriseJobManager';
import EnterpriseSettings from './pages/EnterpriseSettings';
import './App.css';

// ============================================================================
// LOGIN PAGE
// ============================================================================

const LoginPage = ({ onLogin, isLoading, error }) => {
  const [pin, setPin] = useState('');
  const [showError, setShowError] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!pin) {
      setShowError(true);
      return;
    }
    setShowError(false);
    onLogin(pin);
    setPin('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-600 via-sky-500 to-blue-600 flex items-center justify-center p-4">
      {/* Background Design */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white rounded-full opacity-10"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white rounded-full opacity-10"></div>
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-gray-900">CleanHub</h1>
            <p className="text-gray-600">Enterprise Cleaning Management</p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="danger" title="Login Failed" icon="⚠️">
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN Code
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength="8"
                placeholder="Enter your 4-8 digit PIN"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/[^0-9]/g, ''));
                  setShowError(false);
                }}
                className={`
                  w-full px-4 py-3 text-center text-2xl tracking-widest
                  border-2 rounded-lg font-mono
                  focus:outline-none focus:ring-2 focus:ring-sky-500
                  transition-all duration-200
                  ${showError ? 'border-red-500 ring-red-100' : 'border-gray-300'}
                `}
              />
              {showError && (
                <p className="text-red-500 text-sm mt-2">Please enter your PIN</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`
                w-full py-3 px-4 rounded-lg font-semibold text-white text-lg
                transition-all duration-200 flex items-center justify-center gap-2
                ${isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-sky-600 hover:bg-sky-700 active:scale-95'
                }
              `}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  🔐 Sign In
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-600 mb-3 font-medium">Demo Credentials:</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-700 font-medium">Manager</p>
                <p className="text-gray-600">PIN: 1701</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-700 font-medium">Detailer</p>
                <p className="text-gray-600">PIN: 1709</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white text-sm mt-8">
          © 2025 CleanHub. All rights reserved.
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP
// ============================================================================

function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
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
      setCurrentPage('dashboard');
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
    setCurrentPage('dashboard');
  };

  // If not logged in, show login page
  if (!user) {
    return <LoginPage onLogin={handleLogin} isLoading={isLoading} error={loginError} />;
  }

  // Render current page
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <ComprehensiveDashboard user={user} />;
      case 'jobs':
        return <EnterpriseJobManager user={user} />;
      case 'vehicles':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold">Vehicle Management</h2>
            <p className="text-gray-600 mt-2">Coming Soon</p>
          </div>
        );
      case 'technicians':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold">Team Management</h2>
            <p className="text-gray-600 mt-2">Coming Soon</p>
          </div>
        );
      case 'reports':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold">Reports & Analytics</h2>
            <p className="text-gray-600 mt-2">Coming Soon</p>
          </div>
        );
      case 'settings':
        return <EnterpriseSettings user={user} />;
      default:
        return <ComprehensiveDashboard user={user} />;
    }
  };

  return (
    <NotificationProvider>
      <MainLayout
        user={user}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onLogout={handleLogout}
      >
        {renderPage()}
      </MainLayout>
    </NotificationProvider>
  );
}

export default App;
