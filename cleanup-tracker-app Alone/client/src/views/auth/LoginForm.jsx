import React, { useState, useEffect, useCallback } from 'react';
import { V2, v2Request } from '../../utils/v2Client';

function LoginForm({ onLogin }) {
  const [employeeId, setEmployeeId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [siteTitle, setSiteTitle] = useState('Cleanup Tracker');

  // Load settings for site title
  useEffect(() => {
    (async () => {
      try {
        const res = await V2.get('/settings');
        const title = res.data?.siteTitle || 'Cleanup Tracker';
        setSiteTitle(title);
      } catch (_) {
        // ignore, fallback title
      }
    })();
  }, []);

  const handleSubmit = useCallback(async (pinToSubmit) => {
    const pin = pinToSubmit || employeeId;
    setError('');

    if (!pin) {
      setError('Please enter your PIN');
      return;
    }

    if (!/^[0-9]{4}$/.test(pin)) {
      setError('PIN must be 4 digits');
      return;
    }

    setIsLoading(true);
    try {
      const response = await v2Request('post', '/auth/login', {
        employeeId: pin,
        pin: pin
      }, {
        timeout: 10000 // 10 second timeout to prevent 504
      });
      const session = response.data;

      if (session?.user && session?.tokens?.accessToken) {
        console.log('✅ Login successful for:', session.user.name);
        onLogin(session);
        setEmployeeId('');
        setError('');
      } else {
        setError('Invalid login response from server');
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Login failed. Please try again.';
      setError(errorMsg);
      setEmployeeId(''); // Clear on error so user can try again
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, onLogin]);

  // Add keyboard support for number entry
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (isLoading) return;

      // Number keys (0-9)
      if (e.key >= '0' && e.key <= '9') {
        if (employeeId.length < 4) {
          setEmployeeId(prev => prev + e.key);
          setError(''); // Clear error on input
        }
      }
      // Backspace or Delete
      else if (e.key === 'Backspace' || e.key === 'Delete') {
        setEmployeeId(prev => prev.slice(0, -1));
        setError('');
      }
      // Escape to clear
      else if (e.key === 'Escape') {
        setEmployeeId('');
        setError('');
      }
      // Enter to submit
      else if (e.key === 'Enter' && employeeId.length === 4) {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [employeeId, isLoading, handleSubmit]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Mobile-Optimized Main Content - Single Screen, No Scroll */}
      <div className="relative z-10 h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center justify-center">

            {/* Minimal Header - X.com Style */}
            <div className="hidden lg:block flex-1 max-w-lg">
              <div className="text-left space-y-6 animate-fade-in">
                {/* Professional Logo & Icon */}
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-2xl border border-white/10">
                      <span className="text-2xl font-black text-white tracking-wide">CT</span>
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-sm"></div>
                  </div>
                  <div>
                    <h1 className="text-4xl font-black text-white mb-1 bg-gradient-to-r from-gray-100 to-slate-200 bg-clip-text text-transparent">{siteTitle}</h1>
                    <p className="text-lg text-slate-300 dark:text-slate-400 font-medium">Precision Cleanup Intelligence</p>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-6">
                  <p className="text-xl text-gray-300 leading-relaxed">
                    Next-generation vehicle detailing management platform built for modern dealerships.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-white/8 dark:bg-white/5 backdrop-blur-lg rounded-lg border border-slate-400/20 dark:border-slate-600/20 hover:bg-white/12 dark:hover:bg-white/8 transition-all duration-300">
                      <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="text-white font-medium text-sm">Real-time Sync</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/8 dark:bg-white/5 backdrop-blur-lg rounded-lg border border-slate-400/20 dark:border-slate-600/20 hover:bg-white/12 dark:hover:bg-white/8 transition-all duration-300">
                      <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="text-white font-medium text-sm">Secure Access</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/8 dark:bg-white/5 backdrop-blur-lg rounded-lg border border-slate-400/20 dark:border-slate-600/20 hover:bg-white/12 dark:hover:bg-white/8 transition-all duration-300">
                      <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                      <span className="text-white font-medium text-sm">Smart Analytics</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/8 dark:bg-white/5 backdrop-blur-lg rounded-lg border border-slate-400/20 dark:border-slate-600/20 hover:bg-white/12 dark:hover:bg-white/8 transition-all duration-300">
                      <div className="w-3 h-3 bg-slate-400 rounded-full animate-pulse"></div>
                      <span className="text-white font-medium text-sm">Mobile Ready</span>
                    </div>
                  </div>
                </div>

                {/* Professional Trust Indicators */}
                <div className="flex items-center gap-4 pt-4 border-t border-slate-400/20 dark:border-slate-600/20">
                  <div className="flex items-center gap-2 text-slate-300 dark:text-slate-400">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.414-4.414a2 2 0 00-2.828 0L12 10.172L5.414 3.586a2 2 0 00-2.828 2.828l7 7a2 2 0 002.828 0l11-11a2 2 0 00-2.828-2.828z" />
                    </svg>
                    <span className="text-sm">Enterprise Security</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 dark:text-slate-400">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm">24/7 Uptime</span>
                  </div>
                </div>
              </div>
            </div>

            {/* X.com Style Login - Single Screen */}
            <div className="w-full max-w-md">
              <div className="relative">
                {/* Main Card - Pure Black X.com Style */}
                <div className="relative bg-black p-6 animate-scale-in">

                  {/* Site Title at Top - X.com Style */}
                  <div className="text-center mb-10">
                    {/* Logo Icon */}
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
                        <span className="text-2xl font-black text-white tracking-wide">CT</span>
                      </div>
                    </div>

                    {/* Site Title */}
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                      {siteTitle}
                    </h1>
                    <p className="text-gray-600 font-normal text-base">Enter your 4-digit PIN</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Error Message */}
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 animate-fade-in">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-red-400 font-medium text-sm">{error}</p>
                        </div>
                      </div>
                    )}

                    <div className="relative">
                      {/* Large PIN Display - X.com Style */}
                      <div className="relative mb-8">
                        <div className="relative bg-black border border-gray-800 rounded-2xl py-8 px-6">
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-4 min-h-[80px]">
                              {[0, 1, 2, 3].map((index) => (
                                <div
                                  key={index}
                                  className={`relative w-16 h-16 rounded-2xl border-2 flex items-center justify-center text-3xl font-bold transition-all duration-300 ${
                                    employeeId[index]
                                      ? 'bg-gray-900 border-gray-700 text-white shadow-xl'
                                      : 'bg-black border-gray-800 text-gray-700'
                                  }`}
                                >
                                  {employeeId[index] ? (
                                    <div className="relative">
                                      <div className="w-4 h-4 bg-black rounded-full"></div>
                                    </div>
                                  ) : (
                                    <span className="text-2xl font-bold text-gray-800">{index + 1}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Compact Professional Dial Pad */}
                      <div className="space-y-2 max-w-xs mx-auto mb-4">
                        {/* Row 1: 1, 2, 3 */}
                        <div className="flex justify-center gap-4">
                          <button
                            type="button"
                            onClick={() => {
                              if (employeeId.length < 4) {
                                const newPin = employeeId + '1';
                                setEmployeeId(newPin);
                                setError('');
                                // Auto-submit when 4 digits entered
                                if (newPin.length === 4) {
                                  setTimeout(() => handleSubmit(newPin), 300);
                                }
                              }
                            }}
                            className="relative group h-20 w-20 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border-2 border-gray-700 hover:border-gray-600 rounded-2xl text-3xl font-bold text-white transition-all duration-200 shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center"
                          >
                            <span className="text-4xl">1</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (employeeId.length < 4) {
                                const newPin = employeeId + '2';
                                setEmployeeId(newPin);
                                setError('');
                                if (newPin.length === 4) {
                                  setTimeout(() => handleSubmit(newPin), 300);
                                }
                              }
                            }}
                            className="relative group h-20 w-20 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border-2 border-gray-700 hover:border-gray-600 rounded-2xl text-3xl font-bold text-white transition-all duration-200 shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center"
                          >
                            <span className="text-4xl">2</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (employeeId.length < 4) {
                                const newPin = employeeId + '3';
                                setEmployeeId(newPin);
                                setError('');
                                if (newPin.length === 4) {
                                  setTimeout(() => handleSubmit(newPin), 300);
                                }
                              }
                            }}
                            className="relative group h-20 w-20 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border-2 border-gray-700 hover:border-gray-600 rounded-2xl text-3xl font-bold text-white transition-all duration-200 shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center"
                          >
                            <span className="text-4xl">3</span>
                          </button>
                        </div>

                        {/* Row 2: 4, 5, 6 */}
                        <div className="flex justify-center gap-4">
                          <button
                            type="button"
                            onClick={() => {
                              if (employeeId.length < 4) {
                                const newPin = employeeId + '4';
                                setEmployeeId(newPin);
                                setError('');
                                if (newPin.length === 4) setTimeout(() => handleSubmit(newPin), 300);
                              }
                            }}
                            className="h-20 w-20 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border-2 border-gray-700 hover:border-gray-600 rounded-2xl font-bold text-white transition-all duration-200 shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center"
                          >
                            <span className="text-4xl">4</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (employeeId.length < 4) {
                                const newPin = employeeId + '5';
                                setEmployeeId(newPin);
                                setError('');
                                if (newPin.length === 4) setTimeout(() => handleSubmit(newPin), 300);
                              }
                            }}
                            className="h-20 w-20 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border-2 border-gray-700 hover:border-gray-600 rounded-2xl font-bold text-white transition-all duration-200 shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center"
                          >
                            <span className="text-4xl">5</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (employeeId.length < 4) {
                                const newPin = employeeId + '6';
                                setEmployeeId(newPin);
                                setError('');
                                if (newPin.length === 4) setTimeout(() => handleSubmit(newPin), 300);
                              }
                            }}
                            className="h-20 w-20 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border-2 border-gray-700 hover:border-gray-600 rounded-2xl font-bold text-white transition-all duration-200 shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center"
                          >
                            <span className="text-4xl">6</span>
                          </button>
                        </div>

                        {/* Row 3: 7, 8, 9 */}
                        <div className="flex justify-center gap-4">
                          <button
                            type="button"
                            onClick={() => {
                              if (employeeId.length < 4) {
                                const newPin = employeeId + '7';
                                setEmployeeId(newPin);
                                setError('');
                                if (newPin.length === 4) setTimeout(() => handleSubmit(newPin), 300);
                              }
                            }}
                            className="h-20 w-20 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border-2 border-gray-700 hover:border-gray-600 rounded-2xl font-bold text-white transition-all duration-200 shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center"
                          >
                            <span className="text-4xl">7</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (employeeId.length < 4) {
                                const newPin = employeeId + '8';
                                setEmployeeId(newPin);
                                setError('');
                                if (newPin.length === 4) setTimeout(() => handleSubmit(newPin), 300);
                              }
                            }}
                            className="h-20 w-20 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border-2 border-gray-700 hover:border-gray-600 rounded-2xl font-bold text-white transition-all duration-200 shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center"
                          >
                            <span className="text-4xl">8</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (employeeId.length < 4) {
                                const newPin = employeeId + '9';
                                setEmployeeId(newPin);
                                setError('');
                                if (newPin.length === 4) setTimeout(() => handleSubmit(newPin), 300);
                              }
                            }}
                            className="h-20 w-20 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border-2 border-gray-700 hover:border-gray-600 rounded-2xl font-bold text-white transition-all duration-200 shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center"
                          >
                            <span className="text-4xl">9</span>
                          </button>
                        </div>

                        {/* Row 4: Clear, 0, Delete */}
                        <div className="flex justify-center gap-4">
                          <button
                            type="button"
                            onClick={() => {
                              setEmployeeId('');
                              setError('');
                            }}
                            className="h-20 w-20 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border-2 border-red-500 hover:border-red-400 rounded-2xl font-bold text-white transition-all duration-200 shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center"
                            title="Clear All"
                          >
                            <span className="text-4xl">✕</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (employeeId.length < 4) {
                                const newPin = employeeId + '0';
                                setEmployeeId(newPin);
                                setError('');
                                if (newPin.length === 4) setTimeout(() => handleSubmit(newPin), 300);
                              }
                            }}
                            className="h-20 w-20 bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border-2 border-gray-700 hover:border-gray-600 rounded-2xl font-bold text-white transition-all duration-200 shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center"
                          >
                            <span className="text-4xl">0</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEmployeeId(employeeId.slice(0, -1));
                              setError('');
                            }}
                            className="h-20 w-20 bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 border-2 border-orange-500 hover:border-orange-400 rounded-2xl font-bold text-white transition-all duration-200 shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center"
                            title="Delete Last"
                          >
                            <span className="text-4xl">⌫</span>
                          </button>
                        </div>
                      </div>

                      {/* Keyboard Hint */}
                      <div className="text-center mb-4">
                        <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2 font-medium">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                          <span>Use keyboard or touch for PIN entry</span>
                        </p>
                      </div>
                    </div>

                    {/* Auto-Login Status */}
                    <div className="w-full py-4">
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-3 py-4">
                          <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="text-xl font-semibold text-white">Signing In...</span>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600 text-center font-medium">
                          Auto-login enabled
                        </p>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
