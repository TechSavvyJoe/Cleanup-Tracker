import React, { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import VinScanner from '../components/VinScanner';
import { useToast } from '../components/Toast';
import { V2, v2Request } from '../utils/v2Client';

// 🎨 Modern Design System

// ⚙️ Settings Panel
import SettingsPanel from '../components/SettingsPanel';
import SimpleReports from '../components/SimpleReports';
import {
  GlassCard,
  ProgressRing,
  SkeletonLoader,
  CommandPalette
} from '../components/PremiumUI';
import {
  PerformanceChart,
  DonutChart,
  Sparkline
} from '../components/DataVisualization';
import EnterpriseInventory from '../components/EnterpriseInventory';

// Professional error logging and performance monitoring
const Logger = {
  error: (message, error, context = {}) => {
    console.error(`[CleanupTracker Error] ${message}:`, {
      error: error?.message || error,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      context
    });

    if (process.env.NODE_ENV === 'production') {
      // Hook up to external monitoring service if available
    }
  },

  warn: (message, context = {}) => {
    console.warn(`[CleanupTracker Warning] ${message}:`, {
      timestamp: new Date().toISOString(),
      context
    });
  },

  info: (message, context = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[CleanupTracker Info] ${message}:`, {
        timestamp: new Date().toISOString(),
        context
      });
    }
  },

  perf: (label, fn) => {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      if (duration > 100) {
        Logger.warn(`Slow operation: ${label}`, { duration: `${duration.toFixed(2)}ms` });
      }
      return result;
    } catch (error) {
      Logger.error(`Performance tracking failed for ${label}`, error);
      throw error;
    }
  }
};

// Security helpers keep user-provided data safe
const Security = {
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>]/g, '').trim().slice(0, 1000);
  },

  sanitizeHtml: (html) => {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  },

  validateVin: (vin) => {
    if (!vin || typeof vin !== 'string') return false;
    return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin);
  }
};

// Utility functions for date/time handling with Eastern Time support
const DateUtils = {
  getLocalDateString: (date = new Date()) => {
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
  },

  isToday: (date) => {
    if (!date) return false;
    const inputDate = new Date(date);
    if (isNaN(inputDate.getTime())) return false;
    return DateUtils.getLocalDateString(inputDate) === DateUtils.getLocalDateString();
  },

  isThisWeek: (date) => {
    if (!date) return false;
    const inputDate = new Date(date);
    if (isNaN(inputDate.getTime())) return false;
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000));
    return inputDate >= weekStart && inputDate < weekEnd;
  },

  isThisMonth: (date) => {
    if (!date) return false;
    const inputDate = new Date(date);
    if (isNaN(inputDate.getTime())) return false;
    const now = new Date();
    return inputDate.getMonth() === now.getMonth() && inputDate.getFullYear() === now.getFullYear();
  },

  formatDate: (date, options = {}) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      ...options
    });
  },

  formatDuration: (minutes) => {
    if (!minutes || minutes < 0) return 'N/A';
    const cappedMinutes = Math.min(minutes, 24 * 60);
    const hours = Math.floor(cappedMinutes / 60);
    const mins = Math.round(cappedMinutes % 60);
    if (hours === 0) return `${mins}min`;
    return `${hours}h ${mins}m`;
  },

  calculateDuration: (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return Math.max(0, Math.min(diffMins, 24 * 60));
  },

  isValidDate: (date) => {
    if (!date) return false;
    const d = new Date(date);
    return !isNaN(d.getTime());
  },

  formatDateTime: (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  },

  getValidDate: (date) => {
    if (!date) return null;
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  }
};

function UsersView({ users, onDeleteUser, onRefresh }) {
  const [newUser, setNewUser] = useState({ name: '', pin: '', role: 'detailer', phoneNumber: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');

  const allUsers = useMemo(() => (
    Object.values(users || {}).sort((a, b) => {
      const roleOrder = { manager: 0, detailer: 1, salesperson: 2 };
      const roleCompare = (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3);
      if (roleCompare !== 0) return roleCompare;
      return a.name.localeCompare(b.name);
    })
  ), [users]);

  const filteredUsers = useMemo(() => (
    roleFilter === 'all' ? allUsers : allUsers.filter(user => user.role === roleFilter)
  ), [allUsers, roleFilter]);

  const countsByRole = useMemo(() => (
    allUsers.reduce((acc, user) => {
      const roleKey = user.role || 'detailer';
      acc[roleKey] = (acc[roleKey] || 0) + 1;
      return acc;
    }, {})
  ), [allUsers]);

  const handleAddTeamMember = async (e) => {
    e.preventDefault();
    if (!newUser.name.trim()) {
      return alert('Name is required');
    }
    if (!newUser.pin.trim() || newUser.pin.trim().length !== 4) {
      return alert('PIN must be exactly 4 digits');
    }

    setIsAdding(true);
    try {
      await V2.post('/users', {
        name: newUser.name.trim(),
        pin: newUser.pin.trim(),
        role: newUser.role,
        phoneNumber: newUser.phoneNumber?.trim() || undefined
      });
      alert('Team member added.');
      setNewUser({ name: '', pin: '', role: 'detailer', phoneNumber: '' });
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      alert('Failed to add user: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsAdding(false);
    }
  };

  const roleLabels = {
    manager: 'Manager',
    detailer: 'Detailer',
    salesperson: 'Salesperson'
  };

  return (
    <div className="space-y-6">
      <section className="bg-black rounded-2xl border border-gray-800 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="text-white text-lg font-semibold">Team Snapshot</h3>
            <p className="text-[11px] uppercase tracking-widest text-gray-500">Managers {countsByRole.manager || 0} · Detailers {countsByRole.detailer || 0} · Sales {countsByRole.salesperson || 0}</p>
          </div>
          <div className="flex gap-2 bg-gray-950 border border-gray-800 rounded-full p-1">
            {['all', 'manager', 'detailer', 'salesperson'].map(filter => (
              <button
                key={filter}
                onClick={() => setRoleFilter(filter)}
                className={`px-3 py-1.5 text-xs rounded-full transition-colors ${roleFilter === filter ? 'bg-white text-black font-semibold' : 'text-gray-400 hover:text-white'}`}
                type="button"
              >
                {filter === 'all' ? 'All' : roleLabels[filter]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <form onSubmit={handleAddTeamMember} className="col-span-1 bg-gray-950/80 border border-gray-900 rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Full Name</label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-black text-white border border-gray-800 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-gray-600 placeholder-gray-600"
                placeholder="Jordan Carver"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">4-Digit PIN</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={newUser.pin}
                  onChange={(e) => setNewUser(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))}
                  className="w-full bg-black text-white border border-gray-800 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="1701"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-black text-white border border-gray-800 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="detailer">Detailer</option>
                  <option value="salesperson">Salesperson</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Phone Number</label>
              <input
                type="tel"
                value={newUser.phoneNumber}
                onChange={(e) => setNewUser(prev => ({ ...prev, phoneNumber: e.target.value }))}
                className="w-full bg-black text-white border border-gray-800 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-gray-600 placeholder-gray-600"
                placeholder="555-123-4567"
              />
            </div>
            <button
              type="submit"
              disabled={isAdding}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-white text-black font-semibold py-2.5 transition-colors disabled:opacity-50"
            >
              {isAdding ? 'Adding…' : 'Add Team Member'}
            </button>
          </form>

          <div className="col-span-1 xl:col-span-2 space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="border border-dashed border-gray-800 rounded-2xl p-10 text-center text-gray-500">
                No team members in this view yet.
              </div>
            ) : (
              filteredUsers.map(user => (
                <div key={user.id} className="bg-gray-950/80 border border-gray-900 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-white text-base font-semibold">{user.name}</h4>
                      <span className="px-3 py-1 text-[11px] uppercase tracking-wide rounded-full bg-white/10 text-white">{roleLabels[user.role] || 'Team'}</span>
                      {user.isActive === false && (
                        <span className="px-2 py-1 text-[10px] uppercase tracking-widest rounded-full bg-red-500/10 text-red-400 border border-red-500/40">Inactive</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-400">
                      <span className="font-mono text-xs">PIN {user.pin || '----'}</span>
                      {user.employeeNumber && <span>Employee #{user.employeeNumber}</span>}
                      {user.phoneNumber && (
                        <button
                          type="button"
                          className="underline decoration-dotted hover:text-white"
                          onClick={() => {
                            const smsMessage = `Hi ${user.name}, you have a new job assignment. Please check CleanUP Tracker for details.`;
                            window.open(`sms:${user.phoneNumber}?body=${encodeURIComponent(smsMessage)}`, '_blank');
                          }}
                        >
                          SMS {user.phoneNumber}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onDeleteUser(user.id)}
                      className="inline-flex items-center justify-center rounded-full border border-red-500/40 bg-red-500/10 text-red-300 px-4 py-2 text-sm font-semibold hover:text-red-100"
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
// Enhanced Live Timer Component with error handling
function LiveTimer({ startTime, className = "text-lg font-mono" }) {
  const [elapsed, setElapsed] = useState(0);
  const [isValid, setIsValid] = useState(true);
  
  useEffect(() => {
    if (!startTime || !DateUtils.isValidDate(startTime)) {
      setIsValid(false);
      setElapsed(0);
      return;
    }
    
    setIsValid(true);
    const start = new Date(startTime).getTime();
    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - start) / 1000));
      // Cap at 24 hours to prevent display issues
      setElapsed(Math.min(diff, 24 * 60 * 60));
    };
    
    update();
    const interval = setInterval(update, 1000);
    
    return () => clearInterval(interval);
  }, [startTime]);
  
  const formatTime = (seconds) => {
    if (!isValid || seconds === 0) return '--:--:--';
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };
  
  if (!isValid) {
    return <span className={className}>--:--:--</span>;
  }
  
  return <span className={className}>{formatTime(elapsed)}</span>;
}

const TOKEN_STORAGE_KEY = 'cleanupTracker.session';
const UNAUTHORIZED_EVENT = 'cleanup-tracker:unauthorized';

let refreshTokenValue = null;
let refreshRequest = null;

function setSessionTokens(tokens) {
  if (tokens?.accessToken) {
    V2.defaults.headers.common.Authorization = `Bearer ${tokens.accessToken}`;
  } else {
    delete V2.defaults.headers.common.Authorization;
  }
  refreshTokenValue = tokens?.refreshToken || null;
}

function clearSessionTokens() {
  delete V2.defaults.headers.common.Authorization;
  refreshTokenValue = null;
}

function persistSession(session) {
  if (typeof window === 'undefined') return;
  if (!session) {
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(session));
}

function loadStoredSession() {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse stored session, clearing it.', err);
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    return null;
  }
}

function emitUnauthorizedLogout() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
}

V2.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    if (originalRequest.__skipAuthRefresh) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh');

    if (status === 401 && refreshTokenValue && !originalRequest.__isRetryRequest && !isAuthEndpoint) {
      if (!refreshRequest) {
        refreshRequest = V2.post(
          '/auth/refresh',
          { refreshToken: refreshTokenValue },
          { __skipAuthRefresh: true }
        )
          .then((res) => {
            const tokens = {
              accessToken: res.data?.accessToken,
              refreshToken: res.data?.refreshToken
            };
            setSessionTokens(tokens);

            const stored = loadStoredSession();
            if (stored?.user) {
              persistSession({
                ...stored,
                tokens: {
                  ...stored.tokens,
                  ...tokens
                }
              });
            }
            return tokens;
          })
          .catch((refreshErr) => {
            clearSessionTokens();
            persistSession(null);
            emitUnauthorizedLogout();
            throw refreshErr;
          })
          .finally(() => {
            refreshRequest = null;
          });
      }

      try {
        await refreshRequest;
        originalRequest.__isRetryRequest = true;
        originalRequest.headers = originalRequest.headers || {};
        if (V2.defaults.headers.common.Authorization) {
          originalRequest.headers.Authorization = V2.defaults.headers.common.Authorization;
        } else {
          delete originalRequest.headers.Authorization;
        }
        return V2(originalRequest);
      } catch (refreshErr) {
        return Promise.reject(refreshErr);
      }
    }

    if (status === 401 && !refreshTokenValue && !isAuthEndpoint) {
      clearSessionTokens();
      persistSession(null);
      emitUnauthorizedLogout();
    }

    return Promise.reject(error);
  }
);

// 🎨 BILLION DOLLAR TECH COMPANY LOGIN - ULTRA PREMIUM DESIGN
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

// Main App Component with Mobile-First Design
function MainApp({ user, onLogout, onError, showCommandPalette, setShowCommandPalette }) {
  const [view, setView] = useState('dashboard');
  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [settings, setSettings] = useState({
    siteTitle: 'CleanUP Tracker',
    inventoryCsvUrl: '',
    serviceExpectations: {}
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [componentError, setComponentError] = useState(null);
  // Sidebar visibility: default hidden on mobile, shown on large screens
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1024;
  });
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setIsSidebarOpen(prev => !prev), []);
  
  // 🎨 Force Dark Mode - X.com/Twitter Styling
  const [theme] = useState('dark'); // Locked to dark mode
  const [showSettings, setShowSettings] = useState(false);
  const siteTitle = useMemo(() => (
    settings?.siteTitle && settings.siteTitle.trim() ? settings.siteTitle.trim() : 'Cleanup Tracker'
  ), [settings?.siteTitle]);
  const corporateMark = useMemo(() => {
    const words = siteTitle.split(' ').filter(Boolean);
    if (words.length === 0) {
      return { lead: 'Cleanup', tail: 'Tracker' };
    }
    if (words.length === 1) {
      return { lead: words[0], tail: '' };
    }
    return {
      lead: words[0],
      tail: words.slice(1).join(' ')
    };
  }, [siteTitle]);
  const viewTitle = useMemo(() => {
    const mapping = {
      dashboard: 'Dashboard',
      jobs: (user.role === 'detailer' || user.role === 'technician') ? 'New Job' : 'Job Management',
      qc: 'Quality Control',
      reports: 'Analytics',
      users: 'Team',
      settings: 'System Settings',
      me: 'Profile'
    };
    const label = mapping[view];
    if (label) return label;
    if (view) return view.charAt(0).toUpperCase() + view.slice(1);
    return 'Overview';
  }, [view, user.role]);
  const previousViewRef = useRef(view);
  useEffect(() => {
    if (previousViewRef.current !== view) {
      previousViewRef.current = view;
      closeSidebar();
    }
  }, [view, closeSidebar]);
  const sidebarDisplayClass = useMemo(() => (
    isSidebarOpen
      ? 'translate-x-0 opacity-100 pointer-events-auto'
      : '-translate-x-full opacity-0 pointer-events-none'
  ), [isSidebarOpen]);
  
  // Apply dark theme permanently
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
    localStorage.setItem('app-theme', 'dark');
    // Apply X.com black background
    document.body.className = 'dark bg-black';
    document.body.style.backgroundColor = '#000000';
  }, []);

  // Adjust sidebar visibility when resizing to mobile widths
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        closeSidebar();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [closeSidebar]);

  // Close sidebar with Escape key
  useEffect(() => {
    if (!isSidebarOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeSidebar();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSidebarOpen, closeSidebar]);

  // Enhanced toast toast system
  const toast = useToast();

  // Global error handler with proper error boundary
  const handleError = useCallback((error, errorInfo) => {
    console.error('Component error:', error, errorInfo);
    setComponentError(error.message);
    toast.error('Something went wrong. Please refresh the page.');
  }, [toast]);

  // Error boundary effect
  useEffect(() => {
    const handleUnhandledError = (event) => {
      handleError(event.error, { componentStack: event.filename });
    };

    const handleUnhandledRejection = (event) => {
      handleError(event.reason, { componentStack: 'Promise rejection' });
    };

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [handleError]);

  // Load initial data with useCallback to prevent re-renders
  const loadInitialData = useCallback(async () => {
    // Authentication check - prevent API calls without valid user
    if (!user || !user.id) {
      Logger.warn('LoadInitialData called without authenticated user - aborting');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      Logger.info('Loading initial data');
      
      // Performance monitoring for data loading
      const startTime = performance.now();
      
      // Enhanced error handling with retries for network failures
      const fetchWithRetry = async (url, retries = 2) => {
        for (let i = 0; i <= retries; i++) {
          try {
            return await V2.get(url);
          } catch (error) {
            if (i === retries) throw error;
            Logger.warn(`Retry ${i + 1} for ${url}`, { error: error.message });
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
          }
        }
      };

      const [jobsRes, usersRes, settingsRes, serviceExpectationsRes] = await Promise.all([
        fetchWithRetry('/jobs'),
        fetchWithRetry('/users'),
        fetchWithRetry('/settings').catch(() => {
          Logger.warn('Settings endpoint failed, using defaults');
          return { data: { siteTitle: 'CleanUP Tracker' } };
        }),
        fetchWithRetry('/service-expectations').catch(() => {
          Logger.warn('Service expectations endpoint failed, using defaults');
          return { data: {} };
        })
      ]);
      
      // Data validation and sanitization
      const jobs = Array.isArray(jobsRes.data) ? jobsRes.data : [];
      const usersArray = Array.isArray(usersRes.data) ? usersRes.data : [];
  const settings = settingsRes.data || { siteTitle: 'CleanUP Tracker' };
  const rawServiceExpectations = settings.serviceExpectations || serviceExpectationsRes.data || {};

      // Performance optimization: batch state updates
      setJobs(jobs);
      
      // Enhanced user data processing with validation
      const usersObj = {};
      usersArray.forEach(user => {
        if (user && user.id) {
          // Sanitize user data
          usersObj[user.id] = {
            ...user,
            name: Security.sanitizeInput(user.name || 'Unknown'),
            role: user.role || 'detailer'
          };
        }
      });
      setUsers(usersObj);
      
      // Sanitize settings
      const sanitizedSettings = {
        ...settings,
  siteTitle: Security.sanitizeInput(settings.siteTitle || 'CleanUP Tracker'),
        theme: settings.theme || 'light',
        inventoryCsvUrl: settings.inventoryCsvUrl ? Security.sanitizeInput(settings.inventoryCsvUrl) : '',
        serviceExpectations: Object.entries(rawServiceExpectations).reduce((acc, [key, value]) => {
          const safeKey = Security.sanitizeInput(key);
          if (!safeKey) return acc;
          acc[safeKey] = {
            duration: Number(value?.duration) || 0,
            description: Security.sanitizeInput(value?.description || '')
          };
          return acc;
        }, {})
      };
      setSettings(sanitizedSettings);

      // Theme is locked to dark mode - ignore saved theme preferences
      
      setError(null);
      
      // Performance logging
      const loadTime = performance.now() - startTime;
      Logger.info('Data loading completed', {
        loadTime: `${loadTime.toFixed(2)}ms`,
        jobCount: jobs.length,
        userCount: usersArray.length
      });
      
      if (loadTime > 2000) {
        Logger.warn('Slow data loading detected', { loadTime: `${loadTime.toFixed(2)}ms` });
      }
      
    } catch (err) {
      Logger.error('Failed to load initial data', err, {
        userId: user?.id,
        retryCount: 1
      });
      
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load data';
      setError(errorMessage);
      // Use try-catch for toast to prevent further errors
      try {
        toast.error('Failed to load data. Please try again.');
      } catch (toastError) {
        Logger.warn('Failed to show toast', toastError);
      }

      // Report to parent component if provided
      if (onError) {
        try {
          onError(errorMessage, err);
        } catch (callbackError) {
          Logger.warn('Failed to call onError callback', callbackError);
        }
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependencies to prevent infinite loops

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Connection lost - working offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Load data on mount and set up auto-refresh with authentication check
  useEffect(() => {
    // Add a small delay to ensure authentication state is stable
    const timer = setTimeout(() => {
      if (user && user.id) {
        Logger.info('Starting initial data load for authenticated user', { userId: user.id });
        loadInitialData();
      } else {
        Logger.warn('Skipping initial data load - user not authenticated');
      }
    }, 100); // 100ms delay to ensure authentication is stable

    // Set up auto-refresh every 30 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      if (!loading && user && user.id) {
        loadInitialData();
      }
    }, 30000);

    return () => {
      clearTimeout(timer);
      clearInterval(refreshInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Only depend on user to prevent infinite loops

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Only handle shortcuts if not typing in an input
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'r':
            event.preventDefault();
            loadInitialData();
            toast.success('Data refreshed');
            break;
          case '1':
            event.preventDefault();
            setView('dashboard');
            closeSidebar();
            break;
          case '2':
            event.preventDefault();
            if (user.role !== 'detailer') setView('jobs');
            else setView('jobs');
            closeSidebar();
            break;
          case '3':
            event.preventDefault();
            if (user.role === 'manager') setView('users');
            closeSidebar();
            break;
          case '4':
            event.preventDefault();
            if (user.role === 'manager') setView('reports');
            closeSidebar();
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.role, closeSidebar]); // Removed loadInitialData and toast to prevent loops

    // One-time inventory warm-up: if first search returns empty and not yet warmed, trigger refresh
    useEffect(() => {
      (async () => {
        try {
          // quick diag call to see if vehicles exist
          const d = await V2.get('/diag');
          if (d.data && typeof d.data.vehicles === 'number' && d.data.vehicles === 0) {
            await V2.post('/vehicles/refresh');
          }
    // no-op
        } catch (_) {
          // ignore warm-up errors; user can still search or manual refresh
    // no-op
        }
      })();
    }, []);



  // Allow detailers to freely navigate; no forced redirect.

  // Search functionality
  // Enhanced search functionality with comprehensive validation and error handling
  const handleSearch = useCallback(async (term) => {
    try {
      // Input validation and sanitization
      if (!term || typeof term !== 'string') {
        Logger.warn('Invalid search term provided', { term });
        return;
      }
      
      const sanitizedTerm = Security.sanitizeInput(term.trim());
      if (!sanitizedTerm) {
        toast.warning('Please enter a search term');
        return;
      }
      
      // Length validation for performance
      if (sanitizedTerm.length > 50) {
        toast.warning('Search term too long. Please enter a shorter term.');
        return;
      }
      
      Logger.info('Vehicle search initiated', { 
        searchTerm: sanitizedTerm,
        length: sanitizedTerm.length,
        userId: user.id
      });
      
      setIsSearching(true);
      
      // Performance monitoring for search operations
      const results = await Logger.perf(`vehicle-search-${sanitizedTerm}`, async () => {
        try {
          const response = await V2.get(`/vehicles/search?q=${encodeURIComponent(sanitizedTerm)}`);
          return Array.isArray(response.data) ? response.data : [];
        } catch (error) {
          // Enhanced error handling with specific error types
          if (error.response?.status === 429) {
            throw new Error('Search rate limit exceeded. Please wait a moment and try again.');
          } else if (error.response?.status >= 500) {
            throw new Error('Server error occurred. Please try again later.');
          } else if (!navigator.onLine) {
            throw new Error('No internet connection. Please check your connection and try again.');
          } else {
            throw new Error(error.response?.data?.error || error.message || 'Search failed');
          }
        }
      });
      
      setSearchResults(results);
      setHasSearched(true);
      
      // User feedback based on results
      if (results.length === 0) {
        toast.info(`No vehicles found for "${sanitizedTerm}". Try a different search term.`);
        Logger.info('Search returned no results', { searchTerm: sanitizedTerm });
      } else {
        toast.success(`Found ${results.length} vehicle(s)`);
        Logger.info('Search completed successfully', { 
          searchTerm: sanitizedTerm,
          resultCount: results.length 
        });
      }
      
    } catch (error) {
      Logger.error('Search operation failed', error, { 
        searchTerm: term,
        userId: user.id 
      });
      
      setSearchResults([]);
      setHasSearched(true);
      toast.error(error.message || 'Search failed. Please try again.');
      
    } finally {
      setIsSearching(false);
    }
  }, [user.id, toast]);

  // Enhanced debounced auto-search with professional error handling and performance optimization
  useEffect(() => {
    const sanitizedTerm = Security.sanitizeInput(searchTerm.trim());
    
    if (!sanitizedTerm) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    
    // Intelligent search trigger logic - immediate for VINs, debounced for others
    const isVinLength = sanitizedTerm.length === 17;
    const isValidVin = Security.validateVin(sanitizedTerm);
    const shouldSearch = isVinLength || sanitizedTerm.length >= 3;
    
    if (!shouldSearch) return;
    
    const controller = new AbortController();
    
    // Shorter delay for VINs, longer for regular searches to reduce server load
    const searchDelay = (isVinLength && isValidVin) ? 100 : 600;
    
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      
      try {
        Logger.info('Auto-search triggered', { 
          searchTerm: sanitizedTerm, 
          isVin: isValidVin,
          userId: user.id 
        });
        
        const response = await Logger.perf(`auto-search-${sanitizedTerm}`, async () => {
          return await V2.get(`/vehicles/search?q=${encodeURIComponent(sanitizedTerm)}`, { 
            signal: controller.signal,
            timeout: 10000 // 10 second timeout for auto-search
          });
        });
        
        const results = Array.isArray(response.data) ? response.data : [];
        setSearchResults(results);
        setHasSearched(true);
        
        Logger.info('Auto-search completed', { 
          searchTerm: sanitizedTerm,
          resultCount: results.length
        });
        
      } catch (error) {
        if (error.name === 'CanceledError') {
          Logger.info('Auto-search cancelled', { searchTerm: sanitizedTerm });
          return;
        }
        
        Logger.warn('Auto-search failed', error, { 
          searchTerm: sanitizedTerm,
          userId: user.id 
        });
        
        setSearchResults([]);
        setHasSearched(true);
        
        // Don't show toasts for auto-search failures to avoid spam
        if (error.response?.status >= 500) {
          toast.warning('Server temporarily unavailable');
        }
      } finally {
        setIsSearching(false);
      }
    }, searchDelay);
    
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchTerm, user.id, toast]);

  // Scan success handler
  // Enhanced VIN scanner success handler with comprehensive validation
  const handleScanSuccess = useCallback(async (scannedVin) => {
    setShowScanner(false);
    
    try {
      // Input validation and sanitization
      if (!scannedVin) {
        throw new Error('No VIN provided');
      }
      
      const vin = Security.sanitizeInput(scannedVin.toString().toUpperCase().trim());
      
      // Professional VIN validation
      if (!Security.validateVin(vin)) {
        Logger.warn('Invalid VIN scanned', { vin, userId: user.id });
        toast.warning('Invalid VIN format. Please scan again or enter manually.');
        return;
      }
      
      Logger.info('VIN scan successful', { vin, userId: user.id });
      
      // Performance monitoring for VIN operations
      await Logger.perf(`join-by-vin-${vin}`, async () => {
        try {
          // Try to join an in-progress job by VIN
          await V2.put('/vehicles/join-by-vin', { 
            vin, 
            userId: user.id,
            timestamp: new Date().toISOString()
          });
          
          await loadInitialData();
          setSearchTerm(vin);
          setView('dashboard');
          closeSidebar();
          toast.success('Successfully joined existing job!');
          
        } catch (joinError) {
          // Graceful fallback to vehicle search
          Logger.info('No existing job found, searching vehicles', { vin });
          
          try {
            const searchResponse = await Logger.perf(`vehicle-search-${vin}`, async () => {
              return await V2.get(`/vehicles/search?q=${encodeURIComponent(vin)}`);
            });
            
            const results = Array.isArray(searchResponse.data) ? searchResponse.data : [];
            setSearchResults(results);
            setSearchTerm(vin);
            setHasSearched(true);
            setView('jobs');
            closeSidebar();
            
            if (results.length === 0) {
              toast.warning('No vehicles found with this VIN. Please verify and try again.');
            } else {
              toast.success(`Found ${results.length} vehicle(s)`);
            }
            
          } catch (searchError) {
            throw new Error(`Vehicle lookup failed: ${searchError.response?.data?.error || searchError.message}`);
          }
        }
      });
      
    } catch (error) {
      Logger.error('VIN scan processing failed', error, { 
        vin: scannedVin, 
        userId: user.id 
      });
      
      const errorMessage = error.message || 'VIN processing failed';
      toast.error(errorMessage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]); // Removed loadInitialData and toast to prevent loops

  // Stop work handler
  const handleStopWork = async () => {
    try {
      const activeJob = jobs.find(j => j.status === 'In Progress' && (
        j.assignedTechnicianIds?.includes(user.id) || 
        j.technicianId === user.id ||
        j.technicianId === user.pin
      ));
      if (!activeJob) return;
      
      // Stop timer and mark as complete with proper timing
      await V2.put(`/jobs/${activeJob.id}/complete`, { 
        userId: user.id,
        completedAt: new Date().toISOString() 
      });
      
      await loadInitialData(); // Reload data
      toast.success('Job completed successfully! 🎉');
    } catch (err) {
      toast.error('Failed to complete job: ' + (err.response?.data?.error || err.message));
    }
  };

  // Delete user handler
  const deleteUser = async (userId) => {
    if (!window.confirm('Remove this team member? Their access will be revoked.')) return;
    
    try {
      await V2.delete(`/users/${userId}`);
      await loadInitialData(); // Reload data
      alert('Team member removed.');
    } catch (err) {
      alert('Failed to remove team member: ' + (err.response?.data?.error || err.message));
    }
  };

  // Enhanced computed values with performance optimizations
  // Treat QC returns and pause states as active so detailers can resume work without hunting for jobs in other lists
  const ACTIVE_JOB_STATUSES = useMemo(() => new Set(['In Progress', 'QC Required', 'Paused']), []);
  const COMPLETED_JOB_STATUSES = useMemo(() => new Set(['Completed', 'QC Approved']), []);

  const activeJobs = useMemo(() => 
    jobs.filter(j => ACTIVE_JOB_STATUSES.has(j.status)), 
    [jobs, ACTIVE_JOB_STATUSES]
  );
  
  const completedJobs = useMemo(() => 
    jobs.filter(j => COMPLETED_JOB_STATUSES.has(j.status)), 
    [jobs, COMPLETED_JOB_STATUSES]
  );
  
  const userActiveJob = useMemo(() => 
    activeJobs.find(j => 
      j.assignedTechnicianIds?.includes(user.id) || 
      j.technicianId === user.id ||
      j.technicianId === user.pin
    ), 
    [activeJobs, user.id, user.pin]
  );

  // Performance dashboard stats with advanced analytics
  const dashboardStats = useMemo(() => {
    const now = new Date();
    const today = now.toDateString();
    const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    
    const todayJobs = completedJobs.filter(job => 
      job.completedAt && new Date(job.completedAt).toDateString() === today
    );
    
    const weekJobs = completedJobs.filter(job => 
      job.completedAt && new Date(job.completedAt) >= thisWeekStart
    );

    // Calculate efficiency metrics
    const calculateAverageTime = (jobList) => {
      if (jobList.length === 0) return 0;
      const totalTime = jobList.reduce((sum, job) => {
        if (job.startedAt && job.completedAt) {
          return sum + (new Date(job.completedAt) - new Date(job.startedAt));
        }
        return sum;
      }, 0);
      return Math.round(totalTime / jobList.length / (1000 * 60)); // Convert to minutes
    };

    return {
      totalActive: activeJobs.length,
      totalCompleted: completedJobs.length,
      todayCompleted: todayJobs.length,
      weekCompleted: weekJobs.length,
      averageTimeToday: calculateAverageTime(todayJobs),
      averageTimeWeek: calculateAverageTime(weekJobs),
      efficiency: weekJobs.length > 0 ? Math.round((todayJobs.length / (weekJobs.length / 7)) * 100) : 0,
      qcRequired: jobs.filter(job => job.status === 'QC Required').length
    };
  }, [activeJobs, completedJobs, jobs]);
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
        {/* Enterprise Loading State */}
        <div className="w-72 bg-black shadow-2xl border-r border-gray-800">
          {/* Sidebar Skeleton */}
          <div className="p-6 border-b border-gray-800">
            <SkeletonLoader className="h-12 w-12 rounded-2xl mb-3" />
            <SkeletonLoader className="h-6 w-32 mb-2" />
            <SkeletonLoader className="h-4 w-24" />
          </div>
          <div className="p-5 space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-3">
                <SkeletonLoader className="h-10 w-10 rounded-xl" />
                <div className="flex-1">
                  <SkeletonLoader className="h-4 w-24 mb-1" />
                  <SkeletonLoader className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Main Content Skeleton */}
        <div className="flex-1 p-8">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <SkeletonLoader className="h-16 w-16 rounded-3xl" />
              <div>
                <SkeletonLoader className="h-8 w-48 mb-2" />
                <SkeletonLoader className="h-5 w-32" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1,2].map(i => (
                <div key={i} className="bg-black rounded-3xl p-8 shadow-2xl">
                  <div className="flex items-center gap-4 mb-4">
                    <SkeletonLoader className="h-14 w-14 rounded-2xl" />
                    <div>
                      <SkeletonLoader className="h-4 w-24 mb-2" />
                      <SkeletonLoader className="h-8 w-16" />
                    </div>
                  </div>
                  <SkeletonLoader className="h-20 w-full rounded-2xl" />
                </div>
              ))}
            </div>
            
            <div className="bg-black rounded-3xl p-8 shadow-2xl">
              <SkeletonLoader className="h-6 w-48 mb-6" />
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50">
                    <SkeletonLoader className="h-12 w-12 rounded-xl" />
                    <div className="flex-1">
                      <SkeletonLoader className="h-5 w-64 mb-2" />
                      <SkeletonLoader className="h-4 w-48" />
                    </div>
                    <SkeletonLoader className="h-8 w-20 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Loading Animation Overlay */}
          <div className="fixed bottom-8 right-8">
            <div className="bg-black rounded-2xl p-4 shadow-2xl border border-gray-800 flex items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <div>
                <p className="font-semibold text-white">Loading Dashboard</p>
                <p className="text-sm text-gray-600">Preparing your workspace...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-black rounded-xl p-6 border border-red-200 shadow-lg max-w-md">
          <h2 className="text-red-800 font-semibold text-lg mb-2">Error</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button 
            onClick={loadInitialData}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Error boundary wrapper
  if (componentError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-black rounded-xl p-8 shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Oops! Something went wrong</h3>
          <p className="text-gray-600 mb-4">{componentError}</p>
          <button 
            onClick={() => {
              setComponentError(null);
              window.location.reload();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Network Status Indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white px-4 py-2 text-center text-sm font-medium z-50">
          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636L5.636 18.364M12 2.05v19.9M2.05 12h19.9" />
          </svg>
          No internet connection - working offline
        </div>
      )}

      {/* X.com-Style Overlay - clicks close sidebar */}
      <div
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeSidebar}
      />

      {/* Sidebar - X.com style, slides in from left */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-black border-r border-gray-800 flex flex-col transform transition-all duration-200 ease-out will-change-transform ${sidebarDisplayClass}`}
      >
        {/* Logo & Brand - X.com compact header */}
        <div className="p-4 border-b border-gray-800 bg-black flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl ring-1 ring-white/10 shadow-lg shadow-blue-500/30 bg-black">
              <img src="/brand.svg" alt="Cleanup Tracker" className="w-11 h-11 rounded-2xl hidden sm:block" onError={(e)=>{e.currentTarget.style.display='none';}}/>
              <div className="sm:hidden flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7.5c-1.2-2.1-3.4-3.5-6-3.5-3.9 0-7 3.1-7 7s3.1 7 7 7c2.6 0 4.8-1.4 6-3.5" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 7v10" />
                </svg>
              </div>
            </div>
            <div className="leading-tight">
              <span className="block text-lg font-semibold text-white leading-tight">
                {corporateMark.lead}
                {corporateMark.tail && <span className="text-gray-400"> {corporateMark.tail}</span>}
              </span>
              <span className="block text-[9px] uppercase tracking-[0.38em] text-sky-400">Operations Hub</span>
            </div>
          </div>
          <button
            onClick={closeSidebar}
            className="p-2 rounded-full hover:bg-gray-900 text-gray-400 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* User Profile - X.com compact */}
        <div className="px-4 py-3 border-b border-gray-800 bg-black flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{user.name}</p>
            <p className="text-xs text-gray-500">{user.role}</p>
          </div>
        </div>

        {/* Navigation Menu - X.com minimalist */}
        <nav className="flex-1 px-2 py-2">
          <button 
            onClick={() => { setView('dashboard'); closeSidebar(); }} 
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-colors ${
              view === 'dashboard' 
                ? 'bg-gray-900 text-white' 
                : 'text-gray-300 hover:bg-gray-900 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            </svg>
            <span>Dashboard</span>
          </button>
          
          {(user.role === 'detailer' || user.role === 'technician') ? (
            <>
              <button 
                onClick={() => { setView('jobs'); closeSidebar(); }} 
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${
                  view === 'jobs' 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-300 hover:bg-gray-900 hover:text-white'
                }`}
              >
                <div>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm">New Job</div>
                </div>
              </button>
              <button 
                onClick={() => { setView('me'); closeSidebar(); }} 
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${
                  view === 'me' 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-300 hover:bg-gray-900 hover:text-white'
                }`}
              >
                <div>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm">Profile</div>
                </div>
              </button>
            </>
          ) : user.role === 'salesperson' ? (
            <>
              <button 
                onClick={() => { setView('me'); closeSidebar(); }} 
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${
                  view === 'me' 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-300 hover:bg-gray-900 hover:text-white'
                }`}
              >
                <div>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm">Profile</div>
                </div>
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => { setView('jobs'); closeSidebar(); }} 
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${
                  view === 'jobs' 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-300 hover:bg-gray-900 hover:text-white'
                }`}
              >
                <div>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm">Job Management</div>
                </div>
              </button>
              <button 
                onClick={() => { setView('qc'); closeSidebar(); }} 
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${
                  view === 'qc' 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-300 hover:bg-gray-900 hover:text-white'
                }`}
              >
                <div>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm">Quality Control</div>
                </div>
              </button>
              <button 
                onClick={() => { setView('reports'); closeSidebar(); }} 
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${
                  view === 'reports' 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-300 hover:bg-gray-900 hover:text-white'
                }`}
              >
                <div>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold">Analytics</div>
                </div>
              </button>
              <button 
                onClick={() => { setView('inventory'); closeSidebar(); }} 
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${
                  view === 'inventory' 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-300 hover:bg-gray-900 hover:text-white'
                }`}
              >
                <div>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M3 12h18M3 17h18" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm">Inventory</div>
                </div>
              </button>
              <button 
                onClick={() => { setView('users'); closeSidebar(); }} 
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${
                  view === 'users' 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-300 hover:bg-gray-900 hover:text-white'
                }`}
              >
                <div>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm">Team Management</div>
                </div>
              </button>
              <button 
                onClick={() => { setView('settings'); closeSidebar(); }} 
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${
                  view === 'settings' 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-300 hover:bg-gray-900 hover:text-white'
                }`}
              >
                <div>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm">System Settings</div>
                </div>
              </button>
              <button 
                onClick={() => { setView('me'); closeSidebar(); }} 
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 ${
                  view === 'me' 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-300 hover:bg-gray-900 hover:text-white'
                }`}
              >
                <div>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm">Profile</div>
                </div>
              </button>
            </>
          )}
        </nav>

        {/* Bottom Section - Settings & Logout */}
        <div className="p-5 border-t border-gray-800 space-y-1">
          <button
            onClick={() => {
              closeSidebar();
              setShowSettings(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 text-gray-300 hover:bg-gray-900 hover:text-white"
          >
            <div>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </div>
            <span className="font-semibold text-sm">Preferences</span>
          </button>
          
          <button 
            onClick={() => {
              closeSidebar();
              onLogout();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-full transition-all duration-200 text-gray-300 hover:bg-gray-900 hover:text-white"
          >
            <div>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <span className="font-semibold text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentTheme={theme}
        onThemeChange={() => {}} // Theme locked to dark mode
        userRole={user.role}
      />

      {/* Main App Container */}
      <div className="min-h-screen bg-black flex flex-1">
        {/* Main Content Area - X.com Style */}
        <div className="flex-1 bg-black overflow-y-auto">
          {/* Top Header Bar - X.com minimalist */}
          <div className="bg-black border-b border-gray-800 px-4 py-3 sticky top-0 z-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  className="p-2 rounded-full hover:bg-gray-900 text-gray-400 hover:text-white"
                  onClick={toggleSidebar}
                  aria-label="Menu"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-2xl ring-1 ring-white/10 shadow-lg shadow-blue-500/30 bg-black">
                    <img src="/brand.svg" alt="Cleanup Tracker" className="w-10 h-10 rounded-2xl hidden sm:block" onError={(e)=>{e.currentTarget.style.display='none';}}/>
                    <div className="sm:hidden flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7.5c-1.2-2.1-3.4-3.5-6-3.5-3.9 0-7 3.1-7 7s3.1 7 7 7c2.6 0 4.8-1.4 6-3.5" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 7v10" />
                      </svg>
                    </div>
                  </div>
                  <div className="leading-tight">
                    <span className="text-sm font-semibold text-white">
                      {corporateMark.lead}
                      {corporateMark.tail && <span className="text-gray-400"> {corporateMark.tail}</span>}
                    </span>
                  </div>
                </div>
                <div className="hidden sm:block h-8 w-px bg-gray-800" />
                <div className="leading-tight">
                  <span className="text-[9px] uppercase tracking-[0.28em] text-gray-500">Current View</span>
                  <h2 className="text-lg font-semibold text-white">{viewTitle}</h2>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-gray-800 bg-black/40 px-3 py-1 text-[11px] uppercase tracking-wide text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {user.role}
                </span>
                <div className="text-xs text-gray-500 font-mono hidden sm:block">
                  {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>

          {/* Content Container - reduced padding for more space */}
          <div className="p-3 sm:p-4">
          {/* Detailer Views */}
          {(user.role === 'detailer' || user.role === 'technician') && (
            <>
              {view === 'dashboard' && <DetailerDashboard user={user} jobs={activeJobs} completedJobs={completedJobs} userActiveJob={userActiveJob} onStopWork={handleStopWork} onOpenScanner={() => setShowScanner(true)} onGoToNewJob={() => { setView('jobs'); closeSidebar(); }} />}
              {view === 'jobs' && <DetailerNewJob user={user} onSearch={handleSearch} searchResults={searchResults} isSearching={isSearching} searchTerm={searchTerm} setSearchTerm={setSearchTerm} showScanner={showScanner} setShowScanner={setShowScanner} onScanSuccess={handleScanSuccess} hasSearched={hasSearched} onJobCreated={async () => { await loadInitialData(); setView('dashboard'); closeSidebar(); }} />}
              {view === 'me' && <MySettingsView user={user} />}
            </>
          )}

          {/* Manager Views */}
          {user.role === 'manager' && (
            <>
              {view === 'dashboard' && <ManagerDashboard jobs={jobs} users={users} currentUser={user} onRefresh={loadInitialData} dashboardStats={dashboardStats} />}
              {view === 'jobs' && <JobsView jobs={jobs} users={users} currentUser={user} onRefresh={loadInitialData} />}
              {view === 'qc' && <QCView jobs={jobs} users={users} currentUser={user} onRefresh={loadInitialData} />}
              {view === 'users' && <UsersView users={users} onDeleteUser={deleteUser} onRefresh={loadInitialData} />}
              {view === 'reports' && <SimpleReports jobs={jobs} users={users} theme={theme} />}
              {view === 'inventory' && <EnterpriseInventory theme={theme} />}
              {view === 'settings' && <SettingsView settings={settings} onSettingsChange={setSettings} />}
              {view === 'me' && <MySettingsView user={user} />}
            </>
          )}

          {/* Salesperson Views */}
          {user.role === 'salesperson' && (
            <>
              {view === 'dashboard' && <SalespersonDashboard user={user} jobs={jobs} />}
              {view === 'me' && <MySettingsView user={user} />}
            </>
          )}
        </div>
        </div>
      </div>

      {/* 🚀 Enterprise Command Palette */}
      {showCommandPalette && (
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          onSelect={(action) => {
            setShowCommandPalette(false);
            closeSidebar();
            if (action.view) setView(action.view);
            if (action.handler) action.handler();
          }}
          items={[
            { id: 'dashboard', label: 'Go to Dashboard', view: 'dashboard', icon: '🏠' },
            { id: 'jobs', label: 'View Jobs', view: 'jobs', icon: '📋' },
            { id: 'reports', label: 'View Reports', view: 'reports', icon: '📊' },
            { id: 'users', label: 'Manage Users', view: 'users', icon: '👥' },
            { id: 'settings', label: 'Settings', view: 'settings', icon: '⚙️' },
            { id: 'scanner', label: 'Open VIN Scanner', handler: () => setShowScanner(true), icon: '📱' },
            { id: 'refresh', label: 'Refresh Data', handler: loadInitialData, icon: '🔄' },
            { id: 'logout', label: 'Sign Out', handler: onLogout, icon: '🚪', destructive: true }
          ].filter(item => {
            // Filter based on user role
            if (user.role === 'detailer' && ['users', 'reports'].includes(item.id)) return false;
            if (user.role === 'salesperson' && ['users', 'jobs', 'reports'].includes(item.id)) return false;
            return true;
          })}
        />
      )}
    </>
  );
}

// Enhanced Enterprise Detailer Dashboard Component
function DetailerDashboard({ user, jobs, completedJobs, userActiveJob, onStopWork, onOpenScanner, onGoToNewJob }) {
  const [showStats, setShowStats] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterServiceType, setFilterServiceType] = useState('');
  
  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    if (!completedJobs || !Array.isArray(completedJobs)) return {
      todayJobs: 0,
      weekJobs: 0,
      monthJobs: 0,
      avgTime: 0,
      efficiency: 0
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const myJobs = completedJobs.filter(j => 
      j.assignedTechnicianIds?.includes(user.id) || 
      j.technicianId === user.id ||
      j.technicianId === user.pin
    );

    const todayJobs = myJobs.filter(j => {
      const jobDate = new Date(j.date || j.completedAt || j.startTime || j.createdAt);
      return jobDate >= today;
    });

    const weekJobs = myJobs.filter(j => {
      const jobDate = new Date(j.date || j.completedAt || j.startTime || j.createdAt);
      return jobDate >= weekAgo;
    });

    const monthJobs = myJobs.filter(j => {
      const jobDate = new Date(j.date || j.completedAt || j.startTime || j.createdAt);
      return jobDate >= monthAgo;
    });

    const totalTime = todayJobs.reduce((sum, job) => sum + (job.duration || 0), 0);
    const avgTime = todayJobs.length > 0 ? Math.round(totalTime / todayJobs.length) : 0;
    
    // Calculate efficiency (jobs per hour)
    const efficiency = todayJobs.length > 0 && totalTime > 0 ? 
      Math.round((todayJobs.length / (totalTime / 60)) * 10) / 10 : 0;

    return {
      todayJobs: todayJobs.length,
      weekJobs: weekJobs.length,
      monthJobs: monthJobs.length,
      avgTime,
      efficiency,
      recentJobs: todayJobs.slice(-5).reverse()
    };
  }, [completedJobs, user.id, user.pin]);

  // Extract today's job count for easy access
  const myJobsToday = performanceMetrics.todayJobs;

  const [details, setDetails] = useState(null);
  const [elapsed, setElapsed] = useState(0); // seconds

  const completeJob = async (status) => {
    try {
      const jobId = userActiveJob?.id || userActiveJob?._id;
      if (!jobId) {
        alert('Cannot update status: missing job id');
        return;
      }

      const nextStatus = status === 'qc_required' ? 'QC Required' : 'Completed';
      await V2.put(`/jobs/${jobId}/status`, { status: nextStatus });
      onStopWork(); // This will refresh the data
    } catch (error) {
      console.error('Failed to complete job:', error);
      alert('Failed to complete job: ' + (error.response?.data?.error || error.message));
    }
  };
  
  // Job details modal state
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);

  // Job action handler
  const handleJobAction = async (action) => {
    try {
      const jobId = userActiveJob?.id || userActiveJob?._id;
      if (!jobId) return alert('No active job found');

      switch (action) {
        case 'pause':
          await V2.post(`/jobs/${jobId}/pause`);
          alert('Job paused successfully');
          break;
        case 'addTechnician':
          const techId = prompt('Enter technician ID or scan their badge:');
          if (techId) {
            await V2.post(`/jobs/${jobId}/add-technician`, { technicianId: techId });
            alert('Technician added successfully');
          }
          break;
        case 'message':
          const message = prompt('Enter your message:');
          if (message) {
            await V2.post(`/jobs/${jobId}/message`, { 
              message, 
              fromUserId: user.id, 
              fromUserName: user.name 
            });
            alert('Message sent successfully');
          }
          break;
        default:
          break;
      }
    } catch (err) {
      alert('Action failed: ' + (err.response?.data?.error || err.message));
    }
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Open job details handler
  const openJobDetails = async (job) => {
    setSelectedJob(job);
    setLoading(true);
    setError('');
    setJobDetails(null);
    try {
      const jobId = job.id || job._id;
      if (!jobId) {
        setError('Job ID not found');
        return;
      }
      const res = await V2.get(`/jobs/${jobId}`);
      if (res.data) {
        setJobDetails(res.data);
      } else {
        setError('Job details not found');
      }
    } catch (err) {
      console.error('Job details error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const closeJobDetails = () => {
    setSelectedJob(null);
    setJobDetails(null);
    setError('');
  };

  // Handle priority change
  const handlePriorityChange = async (newPriority) => {
    if (!jobDetails?.job?.id) return;
    try {
      await V2.patch(`/jobs/${jobDetails.job.id}`, { priority: newPriority });
      setJobDetails(prev => ({
        ...prev,
        job: { ...prev.job, priority: newPriority }
      }));
    } catch (err) {
      console.error('Failed to update priority:', err);
    }
  };

  // Handle sales person change
  const handleSalesPersonChange = async (newSalesPerson) => {
    if (!jobDetails?.job?.id) return;
    try {
      await V2.patch(`/jobs/${jobDetails.job.id}`, { salesPerson: newSalesPerson });
      setJobDetails(prev => ({
        ...prev,
        job: { ...prev.job, salesPerson: newSalesPerson }
      }));
    } catch (err) {
      console.error('Failed to update sales person:', err);
    }
  };

  // Fetch details for active job and run timer
  useEffect(() => {
    let interval;
    const fetchAndStart = async () => {
      if (!userActiveJob) { 
        setDetails(null); 
        setElapsed(0); 
        return; 
      }
      
      try {
        const res = await V2.get(`/jobs/${userActiveJob.id}`);
        setDetails(res.data);
        
        // Get start time from multiple possible sources
        const startTime = userActiveJob.startTime || userActiveJob.startedAt || 
                         res.data?.job?.startTime || res.data?.job?.startedAt ||
                         res.data?.job?.createdAt;
        
        let startTs;
        if (startTime && DateUtils.isValidDate(startTime)) {
          startTs = new Date(startTime).getTime();
        } else {
          // Fallback to events
          const startEvent = (res.data?.events || []).find(e => 
            e.type?.toLowerCase().includes('start') || e.type?.toLowerCase().includes('created')
          ) || (res.data?.events || [])[0];
          
          if (startEvent && DateUtils.isValidDate(startEvent.timestamp)) {
            startTs = new Date(startEvent.timestamp).getTime();
          } else {
            startTs = Date.now(); // Ultimate fallback
          }
        }
        
        const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - startTs) / 1000)));
        update();
        interval = setInterval(update, 1000);
      } catch (err) {
        console.error('Failed to fetch job details:', err);
        // Fallback timer using job start time
        if (userActiveJob.startTime && DateUtils.isValidDate(userActiveJob.startTime)) {
          const startTs = new Date(userActiveJob.startTime).getTime();
          const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - startTs) / 1000)));
          update();
          interval = setInterval(update, 1000);
        }
      }
    };
    fetchAndStart();
    return () => { if (interval) clearInterval(interval); };
  }, [userActiveJob]);

  // Add error handling for the dashboard after all hooks
  if (!user) {
    return <div className="text-white p-4">Error: No user data found</div>;
  }

  console.log('DetailerDashboard render:', { user, jobs: jobs?.length, completedJobs: completedJobs?.length }); // Debug

  const fmt = (s) => {
    const h = Math.floor(s / 3600).toString().padStart(2,'0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2,'0');
    const sec = (s % 60).toString().padStart(2,'0');
    return `${h}:${m}:${sec}`;
  };

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Current Job Status - X.com Dark Style */}
        {userActiveJob ? (
          <div className="bg-black rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center border border-gray-800">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Active Job</h3>
                  <p className="text-sm text-gray-500">{userActiveJob.serviceType}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-mono font-bold text-white">{fmt(elapsed)}</p>
                <p className="text-xs text-gray-500">Time elapsed</p>
              </div>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-800">
              <h4 className="text-xl font-bold text-white mb-2">{userActiveJob.vehicleDescription}</h4>
              <div className="flex gap-3 text-sm">
                <span className="text-gray-400">Stock: <span className="text-white font-medium">{userActiveJob.stockNumber}</span></span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-400">VIN: <span className="text-white font-mono text-xs">{userActiveJob.vin?.slice(-8)}</span></span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button 
                onClick={() => handleJobAction('pause')}
                className="bg-gray-900 hover:bg-gray-800 text-gray-300 font-medium py-2.5 px-3 rounded-lg transition-colors border border-gray-800 text-sm"
              >
                ⏸️ Pause
              </button>
              <button 
                onClick={() => handleJobAction('addTechnician')}
                className="bg-gray-900 hover:bg-gray-800 text-gray-300 font-medium py-2.5 px-3 rounded-lg transition-colors border border-gray-800 text-sm"
              >
                👥 Helper
              </button>
              <button 
                onClick={() => handleJobAction('message')}
                className="bg-gray-900 hover:bg-gray-800 text-gray-300 font-medium py-2.5 px-3 rounded-lg transition-colors border border-gray-800 text-sm"
              >
                💬 Note
              </button>
            </div>
            
            <button 
              onClick={() => completeJob('qc_required')}
              className="w-full bg-white hover:bg-gray-200 text-black font-bold py-3 px-4 rounded-full transition-all duration-200"
            >
              ✅ Complete Detail
            </button>
            
            {details && (
              <button 
                onClick={() => setShowTimeline(!showTimeline)} 
                className="w-full mt-2 px-4 py-2 bg-black hover:bg-gray-900 text-gray-400 hover:text-gray-300 font-medium rounded-lg transition-colors text-sm border border-gray-800"
              >
                {showTimeline ? '▲ Hide' : '▼ Show'} Timeline
              </button>
            )}
            
            {showTimeline && details && (
              <div className="mt-4 bg-black rounded-lg p-4 border border-gray-800">
                <h5 className="font-semibold text-white mb-3 text-sm">Job Timeline</h5>
                <ul className="space-y-2 max-h-32 overflow-auto">
                  {(details.events || []).map((ev, idx) => (
                    <li key={idx} className="flex items-center gap-2 p-2 bg-gray-900 rounded-lg">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                      <div>
                        <span className="font-medium text-white text-xs">{ev.type}</span>
                        <p className="text-gray-500 text-xs">{DateUtils.formatDate(ev.timestamp)} {ev.userName ? `• ${ev.userName}` : ''}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-black rounded-xl p-4 border border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-white">Start a New Job</h3>
              <button
                onClick={async () => { try { await V2.post('/vehicles/refresh'); alert('Inventory refreshed. Try your search again.'); } catch (e) { alert('Refresh failed: ' + (e.response?.data?.error || e.message)); } }}
                className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-gray-300 font-medium rounded-full transition-colors text-xs border border-gray-800"
              >
                🔄 Refresh
              </button>
            </div>
            
            <p className="text-gray-500 mb-3 text-sm">Scan a VIN or search by VIN/Stock to begin working.</p>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={onOpenScanner}
                className="group bg-gray-900 hover:bg-gray-800 text-white font-medium py-4 px-4 rounded-lg transition-colors border border-gray-800 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Scan VIN
              </button>
              <button 
                onClick={onGoToNewJob}
                className="group bg-white hover:bg-gray-200 text-black font-bold py-4 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </button>
            </div>
          </div>
        )}

        {/* Today's Stats - X Style */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center border border-gray-800">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Today</p>
                <p className="text-2xl font-bold text-white">{myJobsToday}</p>
              </div>
            </div>
            <p className="text-gray-500 text-xs">Completed jobs</p>
          </div>
          
          <div className="bg-black rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                userActiveJob 
                  ? 'bg-gray-900 border-gray-700' 
                  : 'bg-gray-900 border-gray-800'
              }`}>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {userActiveJob ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  )}
                </svg>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Active</p>
                <p className="text-2xl font-bold text-white">{userActiveJob ? 1 : 0}</p>
              </div>
            </div>
            <p className="text-gray-500 text-xs">{userActiveJob ? 'In progress' : 'Ready to start'}</p>
          </div>
        </div>

        {/* 🚀 Enterprise Personal Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Efficiency Ring */}
          <GlassCard className="p-3 text-center">
            <h4 className="text-sm font-semibold text-white mb-2 flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Personal Efficiency
            </h4>
            <ProgressRing 
              progress={Math.min(100, (performanceMetrics.efficiency || 0) * 10)} 
              size={120} 
              color="#1DA1F2"
              label={`${performanceMetrics.efficiency || 0}/10 Score`}
            />
            <p className="text-sm text-gray-500 mt-2">Based on avg completion time</p>
          </GlassCard>

          {/* Weekly Performance Trend */}
          <GlassCard className="p-3">
            <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              7-Day Trend
            </h4>
            <Sparkline
              data={(() => {
                // Generate personal performance data for the last 7 days
                const last7Days = Array.from({length: 7}, (_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - (6 - i));
                  const dayJobs = completedJobs.filter(job => {
                    if (!job.completedAt && !job.date) return false;
                    const jobDate = new Date(job.completedAt || job.date);
                    const isMyJob = job.assignedTechnicianIds?.includes(user.id) || 
                                   job.technicianId === user.id ||
                                   job.technicianId === user.pin;
                    return isMyJob && jobDate.toDateString() === date.toDateString();
                  });
                  return dayJobs.length;
                });
                return last7Days;
              })()}
              width={180}
              height={60}
              color="#1DA1F2"
            />
            <div className="mt-2 text-center">
              <p className="text-sm text-gray-500">Jobs completed per day</p>
            </div>
          </GlassCard>

          {/* Achievement Badge */}
          <GlassCard className="p-3">
            <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Achievement
            </h4>
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-900 border border-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h5 className="font-bold text-white">
                {myJobsToday >= 5 ? 'Productivity Star' : 
                 myJobsToday >= 3 ? 'Consistent Performer' : 
                 myJobsToday >= 1 ? 'Getting Started' : 'Ready to Begin'}
              </h5>
              <p className="text-sm text-gray-500 mt-1">
                {myJobsToday >= 5 ? 'Excellent job today!' : 
                 myJobsToday >= 3 ? 'Great consistency!' : 
                 myJobsToday >= 1 ? 'Keep up the momentum!' : 'Your first job awaits!'}
              </p>
            </div>
          </GlassCard>
        </div>

        {/* My Job History */}
        <div className="bg-black rounded-3xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white">My Job History & Analytics</h3>
            </div>
            <button
              onClick={() => setShowStats(!showStats)}
              className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-full font-medium border border-gray-800 transition-colors text-sm"
            >
              {showStats ? 'Hide Stats' : 'Show Stats'}
            </button>
          </div>

          {/* Stats Panel */}
          {showStats && (
            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-black border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Completed</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {completedJobs.filter(job => 
                    job.technicianId === user.id || 
                    job.technicianName === user.name || 
                    (job.assignedTechnicianIds && job.assignedTechnicianIds.includes(user.id))
                  ).length}
                </p>
              </div>
              <div className="bg-black border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Time / Job</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {(() => {
                    const myJobs = completedJobs.filter(job => 
                      (job.technicianId === user.id || job.technicianName === user.name) && 
                      job.duration
                    );
                    if (myJobs.length === 0) return 'N/A';
                    const avgMs = myJobs.reduce((sum, job) => sum + job.duration, 0) / myJobs.length;
                    const hours = Math.floor(avgMs / (1000 * 60 * 60));
                    const minutes = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60));
                    return `${hours}h ${minutes}m`;
                  })()}
                </p>
              </div>
              <div className="bg-black border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide">This Week</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {completedJobs.filter(job => {
                    if (!job.completedAt) return false;
                    const jobDate = new Date(job.completedAt);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return jobDate > weekAgo && (job.technicianId === user.id || job.technicianName === user.name);
                  }).length}
                </p>
              </div>
            </div>
          )}

          {/* Filters - Compact */}
          <div className="mb-4 flex flex-wrap gap-3 items-end">
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded-lg py-1.5 px-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="w-44">
              <label className="block text-xs font-medium text-gray-600 mb-1">Service Type</label>
              <select
                value={filterServiceType}
                onChange={(e) => setFilterServiceType(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded-lg py-1.5 px-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Services</option>
                <option value="Detail">Detail</option>
                <option value="Delivery">Delivery</option>
                <option value="Rewash">Rewash</option>
                <option value="Lot Car">Lot Car</option>
                <option value="FCTP">FCTP</option>
                <option value="Cleanup">Cleanup</option>
                <option value="Showroom">Showroom</option>
              </select>
            </div>
            {(filterDate || filterServiceType) && (
              <button
                onClick={() => {
                  setFilterDate('');
                  setFilterServiceType('');
                }}
                className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-800"
              >
                Clear
              </button>
            )}
          </div>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {completedJobs
              .filter(job => {
                // Filter by technician
                const isMyJob = job.technicianId === user.id || 
                               job.technicianName === user.name || 
                               (job.assignedTechnicianIds && job.assignedTechnicianIds.includes(user.id));
                if (!isMyJob) return false;
                
                // Filter by date
                if (filterDate) {
                  const jobDate = job.completedAt ? new Date(job.completedAt).toISOString().split('T')[0] : 
                                 job.date ? job.date : null;
                  if (jobDate !== filterDate) return false;
                }
                
                // Filter by service type
                if (filterServiceType && job.serviceType !== filterServiceType) return false;
                
                return true;
              })
              .slice(0, 10)
              .map(job => (
                <button
                  key={job.id}
                  onClick={() => openJobDetails(job)}
                  className="w-full text-left bg-black hover:bg-gray-900 rounded-2xl p-6 border border-gray-800 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.01]"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="text-white font-semibold text-lg">{job.vehicleDescription}</h4>
                        {job.color && (
                          <span className="px-2.5 py-0.5 border border-gray-700 text-gray-300 text-xs rounded-full font-medium">
                            {job.color}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div className="bg-black rounded-xl p-3">
                          <p className="text-gray-500 font-medium mb-1">Stock Number</p>
                          <p className="text-white font-bold">{job.stockNumber}</p>
                        </div>
                        <div className="bg-black rounded-xl p-3">
                          <p className="text-gray-500 font-medium mb-1">VIN</p>
                          <p className="font-mono text-white font-bold text-sm">{job.vin?.slice(-6) || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs mb-3">
                        <span className="px-2.5 py-0.5 border border-gray-700 text-gray-300 rounded-full font-medium uppercase tracking-wide">{job.serviceType}</span>
                        {job.priority && job.priority !== 'Normal' && (
                          <span className={`px-2.5 py-0.5 rounded-full font-medium uppercase tracking-wide border ${
                            job.priority === 'Urgent' ? 'border-red-500 text-red-400' :
                            job.priority === 'High' ? 'border-amber-500 text-amber-400' :
                            'border-gray-700 text-gray-400'
                          }`}>
                            {job.priority}
                          </span>
                        )}
                      </div>
                      {job.salesPerson && (
                        <p className="text-gray-400 text-xs mb-2">Sales: {job.salesPerson}</p>
                      )}
                      <div className="text-xs text-gray-500 space-y-1">
                        {job.startTime && (
                          <p>Started: {DateUtils.formatDateTime(job.startTime)}</p>
                        )}
                        {job.completedAt && (
                          <p>Completed: {DateUtils.formatDateTime(job.completedAt)}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-6 flex flex-col items-end">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold mb-3 border ${
                        job.status === 'In Progress'
                          ? 'border-amber-500 text-amber-400'
                          : job.status === 'QC Required'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-gray-600 text-gray-300'
                      }`}>
                        {job.status}
                      </span>
                      {job.completedAt && (job.startTime || job.startedAt) && (
                        <div className="bg-black border border-gray-800 rounded-xl p-3 text-center">
                          <p className="text-white font-mono text-sm">
                            {DateUtils.formatDuration(
                              DateUtils.calculateDuration(
                                job.startTime || job.startedAt, 
                                job.completedAt
                              )
                            )}
                          </p>
                          <p className="text-gray-500 text-xs mt-1">Total Time</p>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            {completedJobs.filter(job => 
              job.assignedTechnicianIds?.includes(user.id) || 
              job.technicianId === user.id ||
              job.technicianId === user.pin
            ).length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-900 border border-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-white font-semibold">No jobs completed yet</p>
                <p className="text-gray-500 text-xs mt-1">Your completed jobs will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Job Details Modal */}
        {selectedJob && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-black rounded-xl p-4 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-800">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-white font-semibold text-base">Job Details</h4>
                <button 
                  onClick={closeJobDetails} 
                  className="w-8 h-8 bg-gray-900 hover:bg-gray-800 rounded-full flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {loading && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <p className="text-gray-600 font-semibold">Loading job details…</p>
                </div>
              )}
              {error && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <p className="text-red-600 font-semibold">{error}</p>
                </div>
              )}
            
            {jobDetails && (
              <div className="space-y-3">
                {/* Compact Vehicle & Job Information */}
                <div className="bg-black rounded-xl p-3 border border-gray-800">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <h5 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Vehicle
                      </h5>
                      <p className="text-white font-semibold text-base mb-2">{selectedJob.vehicleDescription}</p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <div className="flex items-center gap-1"><span className="text-gray-500">VIN:</span><span className="font-mono text-white">{jobDetails.job?.vin}</span></div>
                        <div className="flex items-center gap-1"><span className="text-gray-500">Stock:</span><span className="text-white">{jobDetails.job?.stockNumber}</span></div>
                        {jobDetails.job?.color && <div className="flex items-center gap-1"><span className="text-gray-500">Color:</span><span className="text-white">{jobDetails.job.color}</span></div>}
                        <div className="flex items-center gap-1"><span className="text-gray-500">Service:</span><span className="text-blue-400">{jobDetails.job?.serviceType}</span></div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600">Priority:</span>
                          <select 
                            value={jobDetails.job?.priority || 'Normal'} 
                            onChange={(e) => handlePriorityChange(e.target.value)}
                            className="bg-black text-white border border-gray-700 rounded px-1.5 py-0.5 text-xs font-medium"
                          >
                            <option value="Low">Low</option>
                            <option value="Normal">Normal</option>
                            <option value="High">High</option>
                            <option value="Urgent">Urgent</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600">Salesperson:</span>
                          <input 
                            type="text"
                            value={jobDetails.job?.salesPerson || ''}
                            onChange={(e) => handleSalesPersonChange(e.target.value)}
                            placeholder="Name"
                            className="bg-black text-white border border-gray-700 rounded px-1.5 py-0.5 text-xs flex-1"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="bg-black rounded-lg p-3 border border-gray-800">
                      <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-1">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Timing
                      </h5>
                      <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                        {jobDetails.job?.status}
                      </div>
                      {jobDetails.job?.startTime && (
                        <div className="space-y-1 text-xs">
                          <p className="text-gray-500">Started: <span className="text-white font-medium">{new Date(jobDetails.job.startTime).toLocaleTimeString()}</span></p>
                          {jobDetails.job?.status === 'In Progress' && (
                            <div>
                              <p className="text-gray-500 mb-1">Duration:</p>
                              <LiveTimer startTime={jobDetails.job.startTime} className="text-white font-mono text-lg font-semibold" />
                            </div>
                          )}
                          {jobDetails.job?.completedAt && (
                            <div>
                              <p className="text-gray-500">Completed: <span className="text-white font-medium">{new Date(jobDetails.job.completedAt).toLocaleTimeString()}</span></p>
                              <p className="text-white font-mono text-sm mt-1">
                                {DateUtils.formatDuration(
                                  DateUtils.calculateDuration(jobDetails.job.startTime, jobDetails.job.completedAt)
                                )}
                              </p>
                            </div>
                          )}
                          {jobDetails.job?.technicianName && (
                            <p className="text-gray-500 pt-1 border-t border-gray-800">Tech: <span className="text-white font-medium">{jobDetails.job.technicianName}</span></p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Compact Activity Timeline */}
                <div className="bg-black rounded-lg p-3 border border-gray-800">
                  <h5 className="text-white font-semibold mb-2 text-sm flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    Activity Timeline
                  </h5>
                  <ul className="space-y-2 max-h-36 overflow-auto pr-1">
                    {jobDetails.job?.startTime && (
                      <li className="text-xs border-l-2 border-gray-600 pl-2 py-1">
                        <span className="text-white font-medium">Started</span>
                        <span className="text-gray-500 block text-[11px]">
                          {DateUtils.formatDateTime(jobDetails.job.startTime)}
                          {jobDetails.job?.technicianName && ` • ${jobDetails.job.technicianName}`}
                        </span>
                      </li>
                    )}
                    {jobDetails.job?.completedAt && (
                      <li className="text-xs border-l-2 border-gray-600 pl-2 py-1">
                        <span className="text-white font-medium">Completed</span>
                        <span className="text-gray-500 block text-[11px]">
                          {DateUtils.formatDateTime(jobDetails.job.completedAt)}
                          {jobDetails.job?.duration && ` • ${DateUtils.formatDuration(jobDetails.job.duration)}`}
                        </span>
                      </li>
                    )}
                    {(jobDetails.events || []).map((ev, idx) => {
                      const validDate = DateUtils.getValidDate(ev.timestamp || ev.at);
                      return (
                        <li key={idx} className="text-xs border-l-2 border-gray-600 pl-2 py-1">
                          <span className="text-white font-medium">
                            {ev.type?.replace('_', ' ')?.replace(/\b\w/g, l => l.toUpperCase()) || 'Event'}
                          </span>
                          <span className="text-gray-500 block text-[11px]">
                            {validDate ? DateUtils.formatDateTime(validDate) : 'Invalid Date'}
                            {ev.userName && ` • ${ev.userName}`}
                          </span>
                        </li>
                      );
                    })}
                    {(!jobDetails.job?.startTime && (!jobDetails.events || jobDetails.events.length === 0)) && (
                      <li className="text-gray-500 text-xs italic">No activity recorded</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Detailer New Job Component
function DetailerNewJob({ user, onSearch, searchResults, isSearching, searchTerm, setSearchTerm, showScanner, setShowScanner, onScanSuccess, hasSearched, onJobCreated }) {
  const toast = useToast();
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [serviceType, setServiceType] = useState('Detail');
  const [salesPerson, setSalesPerson] = useState('');
  const [salespersons, setSalespersons] = useState([]);

  const serviceTypes = ['Detail', 'Delivery', 'Rewash', 'Lot Car', 'FCTP', 'Cleanup', 'Showroom'];

  // Fetch salespersons
  useEffect(() => {
    const fetchSalespersons = async () => {
      try {
        const response = await V2.get('/users');
        const salespeople = response.data.filter(user => user.role === 'salesperson');
        setSalespersons(salespeople);
      } catch (error) {
        console.error('Failed to fetch salespersons:', error);
      }
    };
    fetchSalespersons();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  // Auto-select when exactly one result
  useEffect(() => {
    if (searchResults && searchResults.length === 1) {
      setSelectedVehicle(searchResults[0]);
    }
  }, [searchResults]);

  const handleCreateJob = async () => {
    // Enhanced validation
    if (!selectedVehicle) {
      toast.error('Please select a vehicle first');
      return;
    }
    
    if (!serviceType || serviceType.trim() === '') {
      toast.error('Please select a service type');
      return;
    }

    if (!selectedVehicle.vin || selectedVehicle.vin.length < 10) {
      toast.error('Invalid VIN number');
      return;
    }
    
    try {
      toast.info('Creating job...');
      const now = new Date();
      const newJob = {
        technicianId: user.id,
        technicianName: user.name,
        vin: selectedVehicle.vin,
        stockNumber: selectedVehicle.stockNumber,
        vehicleDescription: `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`,
        serviceType: serviceType,
        salesPerson: salesPerson.trim() || '',
        assignedTechnicianIds: [user.id],
        status: 'In Progress',
        date: DateUtils.getLocalDateString(now),
        startTime: now.toISOString(),
        startedAt: now.toISOString(),
        createdAt: now.toISOString(),
        timestamp: now.toISOString(),
        // Vehicle details
        year: selectedVehicle.year || '',
        make: selectedVehicle.make || '',
        model: selectedVehicle.model || '',
        vehicleColor: selectedVehicle.color || '',
        priority: 'Normal'
      };
      
      await V2.post('/jobs', newJob);
      toast.success('Job started successfully! 🚗');
      setSelectedVehicle(null);
      setSearchTerm('');
      setSalesPerson('');
      
      // Refresh job data and navigate to dashboard
      if (onJobCreated) {
        await onJobCreated();
      }
    } catch (err) {
      toast.error('Failed to start job: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Scan Option */}
      <div className="bg-black rounded-xl p-6 border border-gray-800 shadow-sm">
        <h3 className="text-white font-semibold text-lg mb-4">Scan VIN Barcode</h3>
        <button 
          onClick={() => setShowScanner(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          <span>Scan VIN</span>
        </button>
      </div>

      {/* Search Option */}
      <div className="bg-black rounded-xl p-6 border border-gray-800 shadow-sm">
        <h3 className="text-white font-semibold text-lg mb-4">Search Vehicle</h3>
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Enter VIN or Stock Number"
            className="w-full bg-black text-white placeholder-gray-500 border border-gray-700 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-gray-600"
          />
          <div className="flex items-center gap-2">
            <button 
              type="submit"
              disabled={isSearching || !searchTerm.trim()}
              className="flex-1 bg-white hover:bg-gray-200 text-black font-bold py-3 px-4 rounded-full transition-colors disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {isSearching ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </span>
              ) : 'Search'}
            </button>
            {searchTerm && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); }}
                className="px-4 py-3 rounded-full border border-gray-800 text-gray-300 bg-black hover:bg-gray-900"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Search Results */}
        {/* Vehicle Search Results - X Style */}
        {hasSearched && searchResults.length === 0 && !isSearching && (
          <p className="mt-4 text-gray-500 text-sm">No vehicles found. Check VIN/Stock and try again.</p>
        )}
        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-white font-medium text-sm">Search Results</h4>
            {searchResults.map((vehicle, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg cursor-pointer transition-all border ${
                  selectedVehicle?.vin === vehicle.vin 
                    ? 'bg-gray-900 border-gray-600' 
                    : 'bg-black border-gray-800 hover:border-gray-700 hover:bg-gray-900'
                }`}
                onClick={() => setSelectedVehicle(vehicle)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-white font-semibold">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-gray-500 text-xs">VIN: <span className="font-mono text-gray-400">{vehicle.vin}</span></p>
                      <p className="text-gray-500 text-xs">Stock: <span className="text-gray-400">{vehicle.stockNumber}</span></p>
                    </div>
                  </div>
                  {vehicle.color && (
                    <span className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded-full font-medium border border-gray-700">
                      {vehicle.color}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected Vehicle & Job Creation - X Style */}
        {selectedVehicle && (
          <div className="mt-4 bg-black rounded-lg p-4 border border-gray-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-white text-lg font-bold">{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</p>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-gray-500 text-xs">Stock: <span className="text-gray-400">{selectedVehicle.stockNumber}</span></p>
                  <p className="text-gray-500 text-xs">VIN: <span className="font-mono text-gray-400">{selectedVehicle.vin}</span></p>
                </div>
              </div>
              {selectedVehicle.color && (
                <span className="px-3 py-1 bg-gray-800 text-gray-300 text-xs rounded-full font-medium border border-gray-700">
                  {selectedVehicle.color}
                </span>
              )}
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-gray-400 font-medium mb-2 text-sm">Service Type</label>
                <select 
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full bg-gray-900 text-white border border-gray-800 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-gray-600"
                >
                  {serviceTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-gray-400 font-medium mb-2 text-sm">Sales Person (Optional)</label>
                <select
                  value={salesPerson}
                  onChange={(e) => setSalesPerson(e.target.value)}
                  className="w-full bg-gray-900 text-white border border-gray-800 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-gray-600"
                >
                  <option value="">Select Sales Person...</option>
                  {salespersons.map((person) => (
                    <option key={person.id || person._id} value={person.name}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <button 
              onClick={handleCreateJob}
              className="w-full mt-4 bg-white hover:bg-gray-200 text-black font-bold py-3 px-4 rounded-full transition-colors"
            >
              Start Job
            </button>
          </div>
        )}
      </div>

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black rounded-xl p-6 w-full max-w-md border border-gray-800 shadow-lg">
            <h3 className="text-white font-semibold text-lg mb-4">Scan VIN Barcode</h3>
            <VinScanner onSuccess={onScanSuccess} onClose={() => setShowScanner(false)} />
            <button 
              onClick={() => setShowScanner(false)}
              className="w-full mt-4 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Salesperson Dashboard Component
function SalespersonDashboard({ user, jobs }) {
  const [myJobs, setMyJobs] = useState([]);

  // Filter jobs assigned to this salesperson
  useEffect(() => {
    if (jobs) {
      const filtered = jobs.filter(job => 
        job.salesPerson === user.name || 
        job.salesPerson === user.employeeId ||
        job.salesPerson === user.id
      );
      setMyJobs(filtered);
    }
  }, [jobs, user]);

  const handleQualityCheck = async (jobId, passed) => {
    try {
      await V2.post(`/jobs/${jobId}/qc`, {
        qcCheckerId: user.employeeId || user.id,
        qcCheckerName: user.name,
        qcPassed: passed,
        qcNotes: passed ? 'Quality check passed' : 'Quality check failed - needs attention'
      });
      alert('Quality check recorded successfully');
    } catch (err) {
      alert('QC update failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleMessage = async (jobId, recipientType) => {
    const message = prompt('Enter your message:');
    if (!message) return;

    try {
      await V2.post(`/jobs/${jobId}/message`, {
        message,
        fromUserId: user.id,
        fromUserName: user.name,
        recipientType // 'detailer' or 'sales'
      });
      alert('Message sent successfully');
    } catch (err) {
      alert('Message failed: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-black rounded-3xl p-8 shadow-xl mb-8 border border-gray-800">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Sales Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user.name}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-blue-700 font-semibold text-sm">My Jobs</p>
                  <p className="text-2xl font-bold text-blue-900">{myJobs.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-green-700 font-semibold text-sm">Completed</p>
                  <p className="text-2xl font-bold text-green-900">
                    {myJobs.filter(j => j.status === 'Completed').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-orange-700 font-semibold text-sm">In Progress</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {myJobs.filter(j => j.status === 'In Progress').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Jobs List */}
        <div className="bg-black rounded-3xl p-8 shadow-xl border border-gray-800">
          <h3 className="text-2xl font-bold text-white mb-6">My Vehicle Jobs</h3>
          
          <div className="space-y-4">
            {myJobs.map(job => (
              <div key={job.id} className="job-card bg-black rounded-2xl p-4 md:p-3 border border-gray-800 hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-gray-700">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <h4 className="text-base md:text-lg font-bold text-white mb-2 leading-tight">
                      {job.year} {job.make} {job.model} {job.vehicleColor && `• ${job.vehicleColor}`}
                    </h4>
                    <div className="job-info-grid grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 text-xs md:text-sm mb-3">
                      <div>
                        <p className="text-gray-600 font-medium text-xs">VIN</p>
                        <p className="text-white font-semibold font-mono text-xs">{job.vin?.slice(-6)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-medium text-xs">Stock</p>
                        <p className="text-white font-semibold">{job.stockNumber}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-medium text-xs">Service</p>
                        <p className="text-blue-700 font-semibold">{job.serviceType}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 font-medium text-xs">Technician</p>
                        <p className="text-white font-semibold">{job.technicianName}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`status-badge px-2 md:px-3 py-1 rounded-full text-xs font-bold border ${
                        job.status === 'Completed' ? 'status-completed' :
                        job.status === 'In Progress' ? 'status-in-progress' :
                        job.status === 'QC Required' ? 'status-qc-required' :
                        job.status === 'Failed QC' ? 'status-failed-qc' :
                        'status-pending'
                      }`}>
                        {job.status}
                      </span>
                      
                      {job.priority && job.priority !== 'Normal' && (
                        <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-bold border ${
                          job.priority === 'Urgent' ? 'priority-urgent' :
                          job.priority === 'High' ? 'priority-high' :
                          job.priority === 'Low' ? 'priority-low' :
                          'priority-normal'
                        }`}>
                          {job.priority}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 ml-2">
                    {job.status === 'Completed' && !job.qcCompleted && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleQualityCheck(job.id, true); }}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                        >
                          ✓ Pass
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleQualityCheck(job.id, false); }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                        >
                          ✗ Fail
                        </button>
                      </div>
                    )}
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMessage(job.id, 'detailer'); }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                    >
                      💬 Message
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {myJobs.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-500 font-semibold">No jobs assigned yet</p>
                <p className="text-gray-400 text-sm mt-1">Jobs assigned to you will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Manager Dashboard Component with Auto-refresh  
const DASHBOARD_ACCENTS = {
  blue: 'bg-sky-400',
  green: 'bg-emerald-400',
  amber: 'bg-amber-400',
  purple: 'bg-violet-400',
  red: 'bg-rose-400',
  slate: 'bg-slate-400'
};

const TEAM_DONUT_COLORS = ['#38bdf8', '#6366f1', '#a855f7', '#22d3ee', '#14b8a6', '#f97316', '#facc15', '#f472b6'];

const formatMinutesForDisplay = (minutes) => {
  if (!minutes || Number.isNaN(minutes)) return '—';
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remaining = safeMinutes % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
};

const MetricCard = ({ label, value, subLabel, accent = 'blue' }) => {
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-neutral-950/80 p-4 shadow-[0_24px_48px_-28px_rgba(15,23,42,0.9)] transition-colors hover:border-sky-500/40">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.32em] text-gray-500">
        <span>{label}</span>
        <span className={`h-2 w-2 rounded-full ${DASHBOARD_ACCENTS[accent] || DASHBOARD_ACCENTS.blue}`}></span>
      </div>
      <div className="mt-3 text-2xl font-semibold text-white">{displayValue}</div>
      {subLabel ? <p className="mt-1 text-xs text-gray-500">{subLabel}</p> : null}
    </div>
  );
};

const SectionCard = ({ title, action, children, className = '' }) => (
  <div className={`rounded-3xl border border-white/5 bg-neutral-950/70 p-5 lg:p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.9)] ${className}`}>
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gray-500">{title}</h3>
      {action || null}
    </div>
    {children}
  </div>
);

function ManagerDashboard({ jobs, users, currentUser, onRefresh, dashboardStats }) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);
  const [detailsError, setDetailsError] = useState('');
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('today');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh || selectedJob) return undefined;
    const intervalId = setInterval(() => {
      onRefresh?.();
    }, 30000);
    return () => clearInterval(intervalId);
  }, [autoRefresh, onRefresh, selectedJob]);

  const filteredJobs = useMemo(() => {
    if (!Array.isArray(jobs)) return [];
    return jobs.filter(job => {
      if (dateFilter === 'all') return true;
      const candidate = job.startTime || job.startedAt || job.completedAt || job.date || job.createdAt || job.timestamp;
      const jobDate = DateUtils.getValidDate(candidate);
      if (!jobDate) return false;
      if (dateFilter === 'today') return DateUtils.isToday(jobDate);
      if (dateFilter === 'week') return DateUtils.isThisWeek(jobDate);
      if (dateFilter === 'month') return DateUtils.isThisMonth(jobDate);
      return true;
    });
  }, [jobs, dateFilter]);

  const activeJobs = useMemo(
    () =>
      filteredJobs.filter(job => {
        const status = (job.status || '').toLowerCase();
        return status === 'in progress' || status === 'in_progress' || status === 'pending';
      }),
    [filteredJobs]
  );

  const completedJobs = useMemo(
    () =>
      filteredJobs.filter(job => {
        const status = (job.status || '').toLowerCase();
        return status === 'completed';
      }),
    [filteredJobs]
  );

  const qcJobs = useMemo(
    () =>
      jobs.filter(job => {
        const status = (job.status || '').toLowerCase();
        return status === 'qc required' || status === 'qc_required';
      }),
    [jobs]
  );

  const overdueJobs = useMemo(() => {
    return activeJobs.filter(job => {
      const start = job.startTime || job.startedAt;
      const startDate = DateUtils.getValidDate(start);
      if (!startDate) return false;
      const diffMinutes = (Date.now() - startDate.getTime()) / 60000;
      return diffMinutes > 120;
    });
  }, [activeJobs]);

  const onShiftCount = useMemo(() => {
    const ids = new Set();
    activeJobs.forEach(job => {
      if (Array.isArray(job.assignedTechnicianIds)) {
        job.assignedTechnicianIds.forEach(id => ids.add(id));
      }
      if (job.technicianId) ids.add(job.technicianId);
      if (job.technicianName) ids.add(job.technicianName);
    });
    return ids.size;
  }, [activeJobs]);

  const detailerCount = useMemo(
    () => Object.values(users || {}).filter(userRecord => userRecord?.role === 'detailer').length,
    [users]
  );

  const todayCompletedCount = useMemo(() => {
    if (typeof dashboardStats?.todayCompleted === 'number') {
      return dashboardStats.todayCompleted;
    }
    const todayKey = new Date().toDateString();
    return jobs.filter(job => job.completedAt && new Date(job.completedAt).toDateString() === todayKey).length;
  }, [dashboardStats?.todayCompleted, jobs]);

  const weekCompletedCount = useMemo(() => {
    if (typeof dashboardStats?.weekCompleted === 'number') {
      return dashboardStats.weekCompleted;
    }
    return jobs.filter(job => DateUtils.isThisWeek(job.completedAt)).length;
  }, [dashboardStats?.weekCompleted, jobs]);

  const averageTodayMinutes = useMemo(() => {
    if (typeof dashboardStats?.averageTimeToday === 'number') {
      return dashboardStats.averageTimeToday;
    }
    const todays = jobs.filter(job => job.startedAt && job.completedAt && DateUtils.isToday(job.completedAt));
    if (!todays.length) return 0;
    const total = todays.reduce((sum, job) => sum + DateUtils.calculateDuration(job.startedAt, job.completedAt), 0);
    return Math.round(total / todays.length);
  }, [dashboardStats?.averageTimeToday, jobs]);

  const averageWeekMinutes = useMemo(() => {
    if (typeof dashboardStats?.averageTimeWeek === 'number') {
      return dashboardStats.averageTimeWeek;
    }
    const weeklies = jobs.filter(job => job.startedAt && job.completedAt && DateUtils.isThisWeek(job.completedAt));
    if (!weeklies.length) return 0;
    const total = weeklies.reduce((sum, job) => sum + DateUtils.calculateDuration(job.startedAt, job.completedAt), 0);
    return Math.round(total / weeklies.length);
  }, [dashboardStats?.averageTimeWeek, jobs]);

  const efficiencyScore = useMemo(() => {
    if (typeof dashboardStats?.efficiency === 'number') {
      return dashboardStats.efficiency;
    }
    if (!weekCompletedCount) return 0;
    const averagePerDay = weekCompletedCount / 7;
    if (!averagePerDay) return 0;
    return Math.round((todayCompletedCount / averagePerDay) * 100);
  }, [dashboardStats?.efficiency, weekCompletedCount, todayCompletedCount]);

  const performanceSeries = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - index));
      const label = day.toLocaleDateString('en-US', { weekday: 'short' });
      const value = jobs.filter(job => {
        if (!job.completedAt && !job.date) return false;
        const compareDate = DateUtils.getValidDate(job.completedAt || job.date);
        if (!compareDate) return false;
        return compareDate.toDateString() === day.toDateString();
      }).length;
      return { label, value };
    });
  }, [jobs]);

  const sparklineData = useMemo(() => performanceSeries.map(point => point.value), [performanceSeries]);

  const teamDonutData = useMemo(() => {
    const detailersList = Object.values(users || {}).filter(userRecord => userRecord?.role === 'detailer');
    const distribution = detailersList
      .map((detailer, index) => {
        const totalJobs = jobs.filter(job => {
          const status = (job.status || '').toLowerCase();
          const isCountable = status === 'completed' || status === 'qc required' || status === 'qc_required';
          if (!isCountable) return false;
          return (
            job.assignedTechnicianIds?.includes(detailer.id) ||
            job.technicianId === detailer.id ||
            job.technicianName === detailer.name
          );
        }).length;
        return {
          label: detailer.name || `Detailer ${index + 1}`,
          value: totalJobs,
          color: TEAM_DONUT_COLORS[index % TEAM_DONUT_COLORS.length]
        };
      })
      .filter(entry => entry.value > 0);
    if (distribution.length === 0) {
      return [{ label: 'No data yet', value: 1, color: TEAM_DONUT_COLORS[0] }];
    }
    return distribution.slice(0, 6);
  }, [jobs, users]);

  const activePreview = useMemo(() => activeJobs.slice(0, 6), [activeJobs]);
  const completedPreview = useMemo(() => completedJobs.slice(0, 6), [completedJobs]);
  const qcPreview = useMemo(() => qcJobs.slice(0, 6), [qcJobs]);

  const getStatusMeta = useCallback((status) => {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'in progress' || normalized === 'in_progress') {
      return { label: 'In Progress', className: 'border-sky-500/30 bg-sky-500/10 text-sky-300' };
    }
    if (normalized === 'completed') {
      return { label: 'Completed', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' };
    }
    if (normalized === 'qc required' || normalized === 'qc_required') {
      return { label: 'QC Required', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' };
    }
    return { label: status || 'Pending', className: 'border-slate-500/30 bg-slate-500/10 text-slate-300' };
  }, []);

  const openJobDetails = useCallback(async (job) => {
    setSelectedJob(job);
    setDetailsError('');
    setDetailsLoading(true);
    try {
      const jobId = job.id || job._id;
      if (!jobId) throw new Error('Job ID not found');
      const res = await V2.get(`/jobs/${jobId}`);
      setJobDetails(res.data || null);
    } catch (err) {
      setDetailsError(err.response?.data?.error || err.message || 'Unable to load job details');
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const closeJobDetails = useCallback(() => {
    setSelectedJob(null);
    setJobDetails(null);
    setDetailsError('');
  }, []);

  const performJobAction = useCallback(async (action) => {
    const jobId = jobDetails?.job?.id || selectedJob?.id || selectedJob?._id;
    if (!jobId) {
      alert('Job ID not found');
      return;
    }
    try {
      let message = '';
      if (action === 'start') {
        await V2.put(`/jobs/${jobId}/start`, { userId: currentUser?.id });
        message = 'Timer started';
      } else if (action === 'stop') {
        await V2.put(`/jobs/${jobId}/stop`, { userId: currentUser?.id });
        message = 'Timer stopped';
      } else if (action === 'complete') {
        await V2.put(`/jobs/${jobId}/complete`, { userId: currentUser?.id, completedAt: new Date().toISOString() });
        message = 'Job marked complete';
      } else if (action === 'qc') {
        await V2.put(`/jobs/${jobId}/status`, { status: 'QC Required' });
        message = 'Sent to QC';
      }
      await onRefresh?.();
      closeJobDetails();
      if (message) alert(message);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Action failed');
    }
  }, [jobDetails?.job?.id, selectedJob, currentUser?.id, onRefresh, closeJobDetails]);

  const metricCards = [
    {
      label: 'ACTIVE',
      value: activeJobs.length,
      subLabel: `${onShiftCount || 0} tech${onShiftCount === 1 ? '' : 's'} on shift`,
      accent: 'blue'
    },
    {
      label: 'COMPLETED TODAY',
      value: todayCompletedCount,
      subLabel: `Avg ${formatMinutesForDisplay(averageTodayMinutes)}`,
      accent: 'green'
    },
    {
      label: 'QC PENDING',
      value: qcJobs.length,
      subLabel: qcJobs.length ? 'Awaiting review' : 'All clear',
      accent: 'amber'
    },
    {
      label: 'WEEK COMPLETED',
      value: weekCompletedCount,
      subLabel: `${dashboardStats?.totalCompleted ?? completedJobs.length} total`,
      accent: 'purple'
    },
    {
      label: 'OVERDUE',
      value: overdueJobs.length,
      subLabel: overdueJobs.length ? 'Over 2h active' : 'No lag',
      accent: 'red'
    },
    {
      label: 'TEAM',
      value: detailerCount,
      subLabel: `${jobs.length} jobs in scope`,
      accent: 'slate'
    }
  ];

  const lastUpdated = DateUtils.formatDate(new Date(), { hour: '2-digit', minute: '2-digit' });
  const timeframeOptions = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'all', label: 'All' }
  ];

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Operations Command</h2>
          <p className="text-sm text-gray-500">
            {filteredJobs.length} jobs in view • updated {lastUpdated}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-full border border-gray-800 bg-black/40 p-1">
            {timeframeOptions.map(option => (
              <button
                key={option.key}
                onClick={() => setDateFilter(option.key)}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  dateFilter === option.key
                    ? 'border border-sky-500/40 bg-sky-500/20 text-sky-200'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setAutoRefresh(prev => !prev)}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
              autoRefresh
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                : 'border-gray-700 bg-black/50 text-gray-400 hover:text-white'
            }`}
          >
            {autoRefresh ? 'Auto On' : 'Auto Off'}
          </button>
          <button
            onClick={() => onRefresh?.()}
            className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 transition-colors hover:border-sky-500 hover:bg-sky-500/20"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {metricCards.map(card => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard
          title="PERFORMANCE TREND"
          className="xl:col-span-2"
          action={<span className="text-xs text-gray-500">Last 7 days</span>}
        >
          <PerformanceChart data={performanceSeries} height={220} color="#38bdf8" showGrid />
          <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-gray-500 lg:grid-cols-4">
            <div>
              Avg today
              <span className="ml-1 text-white">{formatMinutesForDisplay(averageTodayMinutes)}</span>
            </div>
            <div>
              Avg week
              <span className="ml-1 text-white">{formatMinutesForDisplay(averageWeekMinutes)}</span>
            </div>
            <div>
              Efficiency
              <span className="ml-1 text-white">{efficiencyScore ? `${efficiencyScore}%` : '—'}</span>
            </div>
            <div>
              Active vs Done
              <span className="ml-1 text-white">{activeJobs.length}:{completedJobs.length}</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="TEAM DISTRIBUTION"
          action={<span className="text-xs text-gray-500">Top performers</span>}
        >
          <div className="flex flex-col items-center">
            <DonutChart data={teamDonutData} size={200} centerText="Jobs" />
            <div className="mt-4 w-full">
              <Sparkline data={sparklineData} width={220} height={48} color="#a855f7" />
              <p className="mt-2 text-xs text-gray-500">Completions per day</p>
            </div>
            <div className="mt-3 w-full space-y-1 text-xs text-gray-500">
              {teamDonutData.slice(0, 3).map(entry => (
                <div key={entry.label} className="flex items-center justify-between">
                  <span>{entry.label}</span>
                  <span className="text-white">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="ACTIVE JOBS"
          action={<span className="text-xs text-gray-500">{activeJobs.length} total</span>}
        >
          <div className="space-y-3">
            {activePreview.length ? (
              activePreview.map(job => {
                const meta = getStatusMeta(job.status);
                return (
                  <button
                    key={job.id || job._id}
                    onClick={() => openJobDetails(job)}
                    className="group flex w-full items-center justify-between rounded-2xl border border-white/5 bg-black/40 px-4 py-3 text-left transition hover:border-sky-500/40 hover:bg-black/60"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                        <span>
                          {job.year} {job.make} {job.model}
                        </span>
                        {job.vehicleColor ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] uppercase tracking-wide text-gray-400">
                            {job.vehicleColor}
                          </span>
                        ) : null}
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.28em] ${meta.className}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500">
                        <span>
                          Stock <span className="text-white">{job.stockNumber || 'N/A'}</span>
                        </span>
                        <span>
                          VIN <span className="text-white font-mono">{job.vin?.slice(-8) || 'N/A'}</span>
                        </span>
                        <span>
                          Service <span className="text-sky-300">{job.serviceType || 'N/A'}</span>
                        </span>
                        <span>
                          Tech <span className="text-white">{job.technicianName || job.assignedTo || 'N/A'}</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {job.startTime || job.startedAt ? (
                        <>
                          <LiveTimer
                            startTime={job.startTime || job.startedAt}
                            className="text-lg font-semibold text-sky-200"
                          />
                          <p className="text-[11px] uppercase tracking-wide text-sky-500">Live</p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-500">Awaiting start</p>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-white/5 bg-black/40 px-4 py-6 text-center text-sm text-gray-500">
                No active jobs right now
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="RECENT COMPLETIONS"
          action={<span className="text-xs text-gray-500">{completedJobs.length} in range</span>}
        >
          <div className="space-y-3">
            {completedPreview.length ? (
              completedPreview.map(job => {
                const meta = getStatusMeta(job.status);
                const duration = job.completedAt && (job.startTime || job.startedAt)
                  ? formatMinutesForDisplay(
                      DateUtils.calculateDuration(job.startTime || job.startedAt, job.completedAt)
                    )
                  : '—';
                return (
                  <button
                    key={job.id || job._id}
                    onClick={() => openJobDetails(job)}
                    className="flex w-full items-center justify-between rounded-2xl border border-white/5 bg-black/30 px-4 py-3 text-left transition hover:border-emerald-500/40 hover:bg-black/50"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                        {job.year} {job.make} {job.model}
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.28em] ${meta.className}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500">
                        <span>
                          Stock <span className="text-white">{job.stockNumber || 'N/A'}</span>
                        </span>
                        <span>
                          Service <span className="text-emerald-300">{job.serviceType || 'N/A'}</span>
                        </span>
                        <span>
                          Completed <span className="text-white">{DateUtils.formatDateTime(job.completedAt)}</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-emerald-200">{duration}</p>
                      <p className="text-[11px] uppercase tracking-wide text-emerald-500">Cycle time</p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-white/5 bg-black/40 px-4 py-6 text-center text-sm text-gray-500">
                No completions in this window
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="QUALITY CONTROL"
        action={
          <span className={`text-xs font-semibold uppercase tracking-wide ${qcJobs.length ? 'text-amber-300' : 'text-gray-500'}`}>
            {qcJobs.length ? `${qcJobs.length} waiting` : 'All clear'}
          </span>
        }
      >
        <div className="space-y-3">
          {qcPreview.length ? (
            qcPreview.map(job => {
              const meta = getStatusMeta(job.status);
              return (
                <button
                  key={job.id || job._id}
                  onClick={() => openJobDetails(job)}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/5 bg-black/30 px-4 py-3 text-left transition hover:border-amber-500/40 hover:bg-black/50"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                      {job.year} {job.make} {job.model}
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.28em] ${meta.className}`}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500">
                      <span>
                        Stock <span className="text-white">{job.stockNumber || 'N/A'}</span>
                      </span>
                      <span>
                        Tech <span className="text-white">{job.technicianName || 'N/A'}</span>
                      </span>
                      <span>
                        Completed <span className="text-white">{DateUtils.formatDateTime(job.completedAt)}</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
                      Review
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="rounded-2xl border border-white/5 bg-black/40 px-4 py-6 text-center text-sm text-gray-500">
              No jobs awaiting QC
            </div>
          )}
        </div>
      </SectionCard>

      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/5 bg-neutral-950 p-6 shadow-[0_40px_80px_-20px_rgba(15,23,42,0.9)]">
            <button
              onClick={closeJobDetails}
              className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/40 p-2 text-gray-400 transition hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="pr-8">
              <p className="text-[11px] uppercase tracking-[0.32em] text-gray-500">Job Overview</p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                {selectedJob.year} {selectedJob.make} {selectedJob.model}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                <span>Stock <span className="text-white">{selectedJob.stockNumber || 'N/A'}</span></span>
                <span>VIN <span className="text-white font-mono">{selectedJob.vin || 'N/A'}</span></span>
                <span>Service <span className="text-sky-300">{selectedJob.serviceType || 'N/A'}</span></span>
                <span>Tech <span className="text-white">{selectedJob.technicianName || 'N/A'}</span></span>
              </div>
            </div>

            {detailsLoading ? (
              <div className="py-16 text-center text-sm text-gray-500">Loading details…</div>
            ) : (
              <>
                {detailsError ? (
                  <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
                    {detailsError}
                  </div>
                ) : null}

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.32em] text-gray-500">Vehicle</h3>
                    <dl className="mt-3 space-y-2 text-sm text-gray-400">
                      <div className="flex justify-between">
                        <dt>Stock</dt>
                        <dd className="text-white">{jobDetails?.job?.stockNumber || 'N/A'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>VIN</dt>
                        <dd className="text-white font-mono text-xs">{jobDetails?.job?.vin || 'N/A'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Service</dt>
                        <dd className="text-sky-300">{jobDetails?.job?.serviceType || 'N/A'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Sales</dt>
                        <dd className="text-emerald-300">{jobDetails?.job?.salesPerson || '—'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Priority</dt>
                        <dd className="text-white">{jobDetails?.job?.priority || 'Normal'}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.32em] text-gray-500">Timing</h3>
                    <dl className="mt-3 space-y-2 text-sm text-gray-400">
                      <div className="flex items-center justify-between">
                        <dt>Status</dt>
                        <dd>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.28em] ${getStatusMeta(jobDetails?.job?.status).className}`}>
                            {getStatusMeta(jobDetails?.job?.status).label}
                          </span>
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Created</dt>
                        <dd className="text-white">{DateUtils.formatDateTime(jobDetails?.job?.date)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Started</dt>
                        <dd className="text-white">{DateUtils.formatDateTime(jobDetails?.job?.startTime || jobDetails?.job?.startedAt)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Completed</dt>
                        <dd className="text-white">{DateUtils.formatDateTime(jobDetails?.job?.completedAt)}</dd>
                      </div>
                    </dl>
                    {jobDetails?.job?.status && (jobDetails.job.status === 'In Progress' || jobDetails.job.status === 'in_progress') && (jobDetails.job.startTime || jobDetails.job.startedAt) ? (
                      <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-center">
                        <p className="text-[11px] uppercase tracking-[0.32em] text-amber-200">Live timer</p>
                        <LiveTimer
                          startTime={jobDetails.job.startTime || jobDetails.job.startedAt}
                          className="text-2xl font-semibold text-amber-100"
                        />
                      </div>
                    ) : null}
                    {jobDetails?.job?.status && jobDetails.job.status.toLowerCase() === 'completed' && jobDetails.job.completedAt && (jobDetails.job.startTime || jobDetails.job.startedAt) ? (
                      <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
                        <p className="text-[11px] uppercase tracking-[0.32em] text-emerald-200">Total time</p>
                        <p className="text-2xl font-semibold text-emerald-100">
                          {formatMinutesForDisplay(
                            DateUtils.calculateDuration(jobDetails.job.startTime || jobDetails.job.startedAt, jobDetails.job.completedAt)
                          )}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 max-h-48 overflow-y-auto rounded-2xl border border-white/5 bg-black/30 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.32em] text-gray-500">Timeline</h3>
                  <ul className="mt-3 space-y-2 text-sm text-gray-400">
                    {(jobDetails?.events || []).filter(eventItem => eventItem?.type).map((eventItem, index) => (
                      <li key={`${eventItem.type}-${index}`} className="flex items-center justify-between gap-4">
                        <div>
                          <span className="text-white">{eventItem.type}</span>
                          {eventItem.userName ? (
                            <span className="ml-2 text-xs text-gray-500">{eventItem.userName}</span>
                          ) : null}
                        </div>
                        <span className="text-xs text-gray-500">{DateUtils.formatDateTime(eventItem.timestamp)}</span>
                      </li>
                    ))}
                    {(jobDetails?.events || []).filter(eventItem => eventItem?.type).length === 0 ? (
                      <li className="py-4 text-center text-sm text-gray-500">No timeline entries yet</li>
                    ) : null}
                  </ul>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={() => performJobAction('start')}
                    className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-500 hover:bg-emerald-500/20"
                  >
                    Start Timer
                  </button>
                  <button
                    onClick={() => performJobAction('stop')}
                    className="rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:border-amber-500 hover:bg-amber-500/20"
                  >
                    Stop Timer
                  </button>
                  <button
                    onClick={() => performJobAction('complete')}
                    className="rounded-full border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:border-sky-500 hover:bg-sky-500/20"
                  >
                    Mark Complete
                  </button>
                  <button
                    onClick={() => performJobAction('qc')}
                    className="rounded-full border border-fuchsia-500/40 bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-200 transition hover:border-fuchsia-500 hover:bg-fuchsia-500/20"
                  >
                    Send to QC
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Jobs View Component
function JobsView({ jobs, users, currentUser, onRefresh }) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 🔍 Enterprise Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);
  // Sub-tabs and compact view
  const [tab, setTab] = useState('active'); // 'active' | 'completed' | 'qc' | 'all'
  const [compact, setCompact] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    serviceType: '',
    vehicleType: '', // new/used
    detailer: '',
    status: ''
  });

  // 🎯 Keyboard Shortcuts for Search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search jobs"]');
        if (searchInput) {
          searchInput.focus();
          setSearchFocus(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Get unique values for filter options
  const filterOptions = useMemo(() => {
    const serviceTypes = [...new Set(jobs.map(j => j.serviceType).filter(Boolean))];
    const detailers = Object.values(users || {}).filter(u => u.role === 'detailer');
    const statuses = [...new Set(jobs.map(j => j.status).filter(Boolean))];
    
    return { serviceTypes, detailers, statuses };
  }, [jobs, users]);

  // 🚀 Enterprise Filter & Search Logic
  const filteredJobs = useMemo(() => {
    let filtered = jobs.filter(job => {
      // 🔍 Intelligent Search - searches across multiple fields
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const searchableFields = [
          job.vin,
          job.stockNumber,
          job.vehicleDescription,
          job.make,
          job.model,
          job.year?.toString(),
          job.color,
          job.serviceType,
          job.technicianName,
          job.salesPerson,
          job.status
        ].filter(Boolean).join(' ').toLowerCase();
        
        // Fuzzy search - allows partial matches
        if (!searchableFields.includes(query)) {
          // Check if query matches any word in the searchable fields
          const queryWords = query.split(' ');
          const matches = queryWords.some(word => 
            searchableFields.includes(word) || 
            searchableFields.split(' ').some(field => field.startsWith(word))
          );
          if (!matches) return false;
        }
      }
      
      // Date filter
      if (filters.startDate) {
        const jobDate = new Date(job.date);
        const startDate = new Date(filters.startDate);
        if (jobDate < startDate) return false;
      }
      
      if (filters.endDate) {
        const jobDate = new Date(job.date);
        const endDate = new Date(filters.endDate);
        if (jobDate > endDate) return false;
      }
      
      // Service type filter
      if (filters.serviceType && job.serviceType !== filters.serviceType) return false;
      
      // Vehicle type filter (new/used)
      if (filters.vehicleType) {
        const vehicleDesc = (job.vehicleDescription || '').toLowerCase();
        if (filters.vehicleType === 'new' && !vehicleDesc.includes('new')) return false;
        if (filters.vehicleType === 'used' && vehicleDesc.includes('new')) return false;
      }
      
      // Detailer filter
      if (filters.detailer && job.technicianId !== filters.detailer) return false;
      
      // Status filter
      if (filters.status && job.status !== filters.status) return false;
      
      return true;
    });
    // Apply tab filter
    if (tab === 'active') {
      filtered = filtered.filter(j => (j.status === 'In Progress' || j.status === 'in_progress' || j.status === 'Pending'));
    } else if (tab === 'completed') {
      filtered = filtered.filter(j => (j.status === 'Completed' || j.status === 'completed'));
    } else if (tab === 'qc') {
      filtered = filtered.filter(j => (j.status === 'QC Required' || j.status === 'qc_required'));
    }

    return filtered;
  }, [jobs, filters, searchQuery, tab]);

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      serviceType: '',
      vehicleType: '',
      detailer: '',
      status: ''
    });
  };

  const openDetails = async (job) => {
    setSelectedJob(job);
    setLoading(true);
    setError('');
    setJobDetails(null);
    try {
      const jobId = job.id || job._id;
      if (!jobId) {
        setError('Job ID not found');
        return;
      }
      const res = await V2.get(`/jobs/${jobId}`);
      if (res.data) {
        setJobDetails(res.data);
      } else {
        setError('Job details not found');
      }
    } catch (err) {
      console.error('Job details error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedJob(null);
    setJobDetails(null);
    setError('');
  };

  return (
    <div className="space-y-6">
      {/* 🔍 Search + Controls Header (Dark X.com style) */}
      <div className="bg-black rounded-3xl p-6 border border-gray-800 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center border border-gray-800">
              <svg className="w-5 h-5 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Job Management</h2>
              <p className="text-gray-400 font-medium">
                {filteredJobs.length} of {jobs.length} jobs
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-200 rounded-xl font-medium transition-all duration-200 border border-gray-700"
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        
        {/* 🚀 Intelligent Search Bar */}
        <div className="relative">
          <div className={`relative transition-all duration-200 ${searchFocus ? 'scale-[1.02]' : ''}`}>
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className={`w-5 h-5 transition-colors duration-200 ${searchFocus ? 'text-white' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
              placeholder="Search jobs by VIN, stock number, vehicle, technician, or status..."
              className="w-full pl-12 pr-20 py-3 bg-black border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-gray-500 transition-all duration-200 text-base"
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center gap-2">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <kbd className="px-2 py-1 bg-gray-900 text-gray-300 rounded-lg font-mono text-xs border border-gray-700">⌘F</kbd>
            </div>
          </div>
          
          {/* Search Results Counter */}
          {searchQuery && (
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-gray-400 font-medium">
                {filteredJobs.length} result{filteredJobs.length !== 1 ? 's' : ''} found
              </span>
              {filteredJobs.length === 0 && (
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Try a different search term
                </span>
              )}
            </div>
          )}

          {/* Sub-tabs and view toggle */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-full p-1">
              {['active','completed','qc','all'].map(key => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                    tab === key ? 'bg-black text-black' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {key === 'qc' ? 'QC' : key}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCompact(v => !v)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border ${compact ? 'bg-gray-800 text-white border-gray-700' : 'bg-gray-900 text-gray-300 border-gray-800'} hover:bg-gray-800`}
              title="Toggle compact table view"
            >
              {compact ? 'Card View' : 'Table View'}
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-black border border-gray-800 rounded-2xl p-3 sm:p-4 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Start</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full bg-gray-950 text-white text-xs border border-gray-800 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-gray-600"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">End</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full bg-gray-950 text-white text-xs border border-gray-800 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-gray-600"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Service</label>
            <select
              value={filters.serviceType}
              onChange={e => setFilters(prev => ({ ...prev, serviceType: e.target.value }))}
              className="w-full bg-gray-950 text-white text-xs border border-gray-800 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-gray-600"
            >
              <option value="">All Types</option>
              {filterOptions.serviceTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Vehicle</label>
            <select
              value={filters.vehicleType}
              onChange={e => setFilters(prev => ({ ...prev, vehicleType: e.target.value }))}
              className="w-full bg-gray-950 text-white text-xs border border-gray-800 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-gray-600"
            >
              <option value="">All</option>
              <option value="new">New</option>
              <option value="used">Used</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Detailer</label>
            <select
              value={filters.detailer}
              onChange={e => setFilters(prev => ({ ...prev, detailer: e.target.value }))}
              className="w-full bg-gray-950 text-white text-xs border border-gray-800 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-gray-600"
            >
              <option value="">All</option>
              {filterOptions.detailers.map(detailer => (
                <option key={detailer.id} value={detailer.id}>{detailer.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Status</label>
            <select
              value={filters.status}
              onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full bg-gray-950 text-white text-xs border border-gray-800 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-gray-600"
            >
              <option value="">All</option>
              {filterOptions.statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
            Showing {filteredJobs.length} of {jobs.length} jobs
          </span>
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-300 bg-gray-950 border border-gray-800 rounded-full hover:bg-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear Filters
          </button>
        </div>
      </div>

      {/* Jobs List */}
      {!compact ? (
        <div className="bg-black rounded-xl p-3 border border-gray-800">
          <h3 className="text-white font-semibold text-base mb-2">All Jobs</h3>
          <div className="job-list-container space-y-1.5 max-h-[calc(100vh-300px)] overflow-y-auto">
            {filteredJobs.length > 0 ? filteredJobs.map(job => (
            <div
              key={job.id || job._id}
              className="job-card bg-black rounded-lg p-2.5 border border-gray-800 hover:bg-gray-900/50 hover:border-gray-700 transition-all cursor-pointer"
              onClick={() => openDetails(job)}
            >
              {/* Main Job Header */}
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <h4 className="text-white font-semibold text-sm leading-tight">
                      {job.year} {job.make} {job.model}
                    </h4>
                    {job.vehicleColor && (
                      <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full font-medium border border-blue-500/30">
                        {job.vehicleColor}
                      </span>
                    )}
                    {job.priority && job.priority !== 'Normal' && (
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium border ${
                        job.priority === 'Urgent' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                        job.priority === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                        job.priority === 'Low' ? 'bg-gray-500/10 text-gray-400 border-gray-500/30' :
                        'bg-gray-500/10 text-gray-400 border-gray-500/30'
                      }`}>
                        {job.priority}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs mb-1">
                    <div>
                      <span className="text-gray-500">Stock:</span>
                      <span className="text-white ml-1">{job.stockNumber || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">VIN:</span>
                      <span className="font-mono text-white text-xs ml-1">{job.vin?.slice(-8) || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Service:</span>
                      <span className="text-blue-400 ml-1">{job.serviceType || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Detailer:</span>
                      <span className="text-white ml-1">{job.technicianName || job.assignedTo || 'N/A'}</span>
                    </div>
                    {job.salesPerson && (
                      <div>
                        <span className="text-gray-500">Sales:</span>
                        <span className="text-green-400 ml-1">{job.salesPerson}</span>
                      </div>
                    )}
                  </div>

                  {/* Timing Information */}
                  <div className="flex flex-wrap gap-x-3 text-xs">
                    {job.startTime || job.startedAt ? (
                      <div>
                        <span className="text-gray-500">Started:</span>
                        <span className="text-green-400 ml-1">
                          {DateUtils.formatDateTime(job.startTime || job.startedAt)}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <span className="text-gray-400 ml-1">
                          {DateUtils.formatDateTime(job.date || job.createdAt)}
                        </span>
                      </div>
                    )}
                    
                    {job.completedAt && (
                      <div>
                        <span className="text-gray-500">Completed:</span>
                        <span className="text-green-400 ml-1">
                          {DateUtils.formatDateTime(job.completedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status and Duration */}
                <div className="text-right ml-2 flex-shrink-0">
                  <div className={`status-badge px-2 py-0.5 rounded-full text-xs font-medium border inline-block ${
                    job.status === 'In Progress' || job.status === 'in_progress'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                      : job.status === 'Completed' || job.status === 'completed'
                      ? 'bg-green-500/10 text-green-400 border-green-500/30'
                      : job.status === 'QC Required'
                      ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                      : job.status === 'Failed QC'
                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : 'bg-gray-500/10 text-gray-400 border-gray-500/30'
                  }`}>
                    {job.status === 'in_progress' ? 'In Progress' : 
                     job.status === 'completed' ? 'Completed' : 
                     job.status || 'Pending'}
                  </div>
                  
                  {(job.status === 'In Progress' || job.status === 'in_progress') && job.startTime && (
                    <div className="mt-1.5">
                      <LiveTimer startTime={job.startTime} className="text-yellow-400 font-mono text-base font-semibold" />
                      <p className="text-gray-500 text-xs mt-0.5">Live</p>
                    </div>
                  )}
                  
                  {(job.status === 'Completed' || job.status === 'completed') && job.completedAt && (job.startTime || job.startedAt) && (
                    <div className="mt-1.5">
                      <p className="text-green-400 font-semibold text-base">
                        {DateUtils.formatDuration(
                          DateUtils.calculateDuration(
                            job.startTime || job.startedAt, 
                            job.completedAt
                          )
                        )}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">Duration</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-12">
              <p className="text-gray-400">No jobs found matching your filters</p>
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg border border-blue-400/30 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
          </div>
        </div>
      ) : (
        <div className="bg-black rounded-xl p-3 border border-gray-800">
          <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-black">
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-1.5 px-2 font-medium">Vehicle</th>
                  <th className="text-left py-1.5 px-2 font-medium">Stock</th>
                  <th className="text-left py-1.5 px-2 font-medium">VIN</th>
                  <th className="text-left py-1.5 px-2 font-medium">Service</th>
                  <th className="text-left py-1.5 px-2 font-medium">Detailer</th>
                  <th className="text-left py-1.5 px-2 font-medium">Status</th>
                  <th className="text-left py-1.5 px-2 font-medium">Started</th>
                  <th className="text-left py-1.5 px-2 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length > 0 ? filteredJobs.map(job => (
                  <tr key={job.id || job._id} className="border-b border-gray-800/50 hover:bg-gray-900/50 cursor-pointer transition-colors" onClick={() => openDetails(job)}>
                    <td className="py-1.5 px-2 text-white text-xs font-medium">{job.year} {job.make} {job.model}</td>
                    <td className="py-1.5 px-2 text-gray-400 text-xs">{job.stockNumber || 'N/A'}</td>
                    <td className="py-1.5 px-2 text-gray-400 font-mono text-xs">{job.vin?.slice(-8) || 'N/A'}</td>
                    <td className="py-1.5 px-2 text-gray-300 text-xs">{job.serviceType || 'N/A'}</td>
                    <td className="py-1.5 px-2 text-gray-300 text-xs">{job.technicianName || job.assignedTo || 'N/A'}</td>
                    <td className="py-1.5 px-2">
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium border ${
                        job.status === 'In Progress' || job.status === 'in_progress'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                          : job.status === 'Completed' || job.status === 'completed'
                          ? 'bg-green-500/10 text-green-400 border-green-500/30'
                          : job.status === 'QC Required' || job.status === 'qc_required'
                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                          : 'bg-gray-500/10 text-gray-400 border-gray-500/30'
                      }`}>
                        {job.status === 'in_progress' ? 'In Progress' : job.status === 'completed' ? 'Completed' : job.status || 'Pending'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-gray-400 text-xs">{(job.startTime || job.startedAt) ? DateUtils.formatDateTime(job.startTime || job.startedAt) : '-'}</td>
                    <td className="py-1.5 px-2 text-gray-400 text-xs">{job.completedAt ? DateUtils.formatDateTime(job.completedAt) : '-'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td className="py-6 px-2 text-center text-gray-400" colSpan="8">No jobs found matching your filters</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compact Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black rounded-xl p-4 w-full max-w-5xl border border-gray-800 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="text-white font-bold">
                  {selectedJob.year} {selectedJob.make} {selectedJob.model}
                </h4>
                {selectedJob.vehicleColor && (
                  <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium border border-blue-200 mt-1">
                    {selectedJob.vehicleColor}
                  </span>
                )}
              </div>
              <button onClick={closeDetails} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
            </div>
            {loading && <p className="text-gray-600 text-center py-6 text-sm">Loading details...</p>}
            {error && <p className="text-red-700 text-center py-3 bg-red-50 rounded-lg border border-red-200 text-sm">{error}</p>}
            
            {jobDetails && (
              <div className="space-y-4">
                {/* Compact 3-Column Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-black rounded-lg p-3 border border-gray-800">
                    <h5 className="text-white font-semibold mb-2 text-sm">Vehicle Info</h5>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Vehicle:</span>
                        <span className="text-white font-medium text-right">{selectedJob.vehicleDescription || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Stock:</span>
                        <span className="text-white font-medium">{jobDetails.job?.stockNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">VIN:</span>
                        <span className="text-white font-mono text-xs">{jobDetails.job?.vin?.slice(0,10) || 'N/A'}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service:</span>
                        <span className="text-blue-700 font-medium">{jobDetails.job?.serviceType || 'N/A'}</span>
                      </div>
                      {jobDetails.job?.salesPerson && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sales:</span>
                          <span className="text-green-700 font-medium text-xs">{jobDetails.job.salesPerson}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-black rounded-lg p-3 border border-gray-800">
                    <h5 className="text-white font-semibold mb-2 text-sm">Timing & Status</h5>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`font-medium ${
                          jobDetails.job?.status === 'In Progress' || jobDetails.job?.status === 'in_progress'
                            ? 'text-yellow-700' 
                            : jobDetails.job?.status === 'Completed' || jobDetails.job?.status === 'completed'
                            ? 'text-green-700'
                            : 'text-gray-700'
                        }`}>
                          {jobDetails.job?.status === 'in_progress' ? 'In Progress' : 
                           jobDetails.job?.status === 'completed' ? 'Completed' : 
                           jobDetails.job?.status || 'Unknown'}
                        </span>
                      </div>
                      
                      {jobDetails.job?.date && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Created:</span>
                          <span className="text-gray-700">{DateUtils.formatDate(jobDetails.job.date)}</span>
                        </div>
                      )}
                      
                      {(jobDetails.job?.startTime || jobDetails.job?.startedAt) && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Started:</span>
                          <span className="text-green-700">{DateUtils.formatTime(jobDetails.job.startTime || jobDetails.job.startedAt)}</span>
                        </div>
                      )}
                      
                      {jobDetails.job?.completedAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Completed:</span>
                          <span className="text-green-700">{DateUtils.formatTime(jobDetails.job.completedAt)}</span>
                        </div>
                      )}
                      
                      {/* Live Timer or Duration */}
                      {(jobDetails.job?.status === 'In Progress' || jobDetails.job?.status === 'in_progress') && 
                       (jobDetails.job?.startTime || jobDetails.job?.startedAt) && (
                        <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                          <p className="text-gray-600 text-xs mb-0.5">Duration:</p>
                          <LiveTimer 
                            startTime={jobDetails.job.startTime || jobDetails.job.startedAt} 
                            className="text-yellow-700 font-mono text-base font-bold" 
                          />
                        </div>
                      )}
                      
                      {(jobDetails.job?.status === 'Completed' || jobDetails.job?.status === 'completed') && 
                       jobDetails.job?.completedAt && (jobDetails.job?.startTime || jobDetails.job?.startedAt) && (
                        <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                          <p className="text-gray-600 text-xs mb-0.5">Total:</p>
                          <p className="text-green-700 font-mono text-base font-bold">
                            {DateUtils.formatDuration(
                              DateUtils.calculateDuration(
                                jobDetails.job.startTime || jobDetails.job.startedAt, 
                                jobDetails.job.completedAt
                              )
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-black rounded-lg p-3 border border-gray-800">
                    <h5 className="text-white font-semibold mb-2 text-sm">Team & Activity</h5>
                    <div className="space-y-2 text-xs">
                      {(jobDetails.technicians || []).length > 0 && (
                        <div>
                          <p className="text-gray-600 mb-1">Technicians:</p>
                          <div className="space-y-0.5">
                            {(jobDetails.technicians || []).map(t => (
                              <p key={t.userId} className="text-white font-medium">• {t.userName || t.name || t.userId}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {(jobDetails.events || []).length > 0 && (
                        <div className="mt-2">
                          <p className="text-gray-600 mb-1">Recent Events:</p>
                          <div className="space-y-0.5 max-h-24 overflow-y-auto">
                            {(jobDetails.events || []).slice(0, 4).map((ev, idx) => (
                              <p key={idx} className="text-gray-700 text-xs">
                                • {ev.type?.replace('_', ' ')?.replace(/\b\w/g, l => l.toUpperCase()) || 'Event'}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {(!jobDetails.technicians || jobDetails.technicians.length === 0) && 
                       (!jobDetails.events || jobDetails.events.length === 0) && (
                        <p className="text-gray-500 text-center py-4">No activity</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Compact Action Buttons */}
                {jobDetails.job?.status !== 'completed' && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={async () => { 
                        try { 
                          const jobId = jobDetails.job?.id || selectedJob?.id || selectedJob?._id;
                          if (!jobId) return alert('Job ID not found');
                          await V2.put(`/jobs/${jobId}/start`, { userId: currentUser?.id }); 
                          await onRefresh?.(); 
                          closeDetails(); 
                          alert('Timer started');
                        } catch (e) { 
                          alert('Start failed: ' + (e.response?.data?.error || e.message)); 
                        } 
                      }}
                      className="px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
                    >
                      Start Timer
                    </button>
                    <button
                      onClick={async () => { 
                        try { 
                          const jobId = jobDetails.job?.id || selectedJob?.id || selectedJob?._id;
                          if (!jobId) return alert('Job ID not found');
                          await V2.put(`/jobs/${jobId}/stop`, { userId: currentUser?.id }); 
                          await onRefresh?.(); 
                          closeDetails(); 
                          alert('Timer stopped');
                        } catch (e) { 
                          alert('Stop failed: ' + (e.response?.data?.error || e.message)); 
                        } 
                      }}
                      className="px-3 py-1.5 rounded bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium transition-colors"
                    >
                      Stop Timer
                    </button>
                    <button
                      onClick={async () => { 
                        try { 
                          const jobId = jobDetails.job?.id || selectedJob?.id || selectedJob?._id;
                          if (!jobId) return alert('Job ID not found');
                          await V2.put(`/jobs/${jobId}/complete`, { 
                            userId: currentUser?.id,
                            completedAt: new Date().toISOString()
                          }); 
                          await onRefresh?.(); 
                          closeDetails(); 
                          alert('Job marked complete');
                        } catch (e) { 
                          alert('Complete failed: ' + (e.response?.data?.error || e.message)); 
                        } 
                      }}
                      className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                    >
                      Mark Complete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Enhanced Reports View Component with Interactive Analytics
// DEPRECATED: This component has been replaced by EnhancedReports.js
// Keeping for reference only
/* eslint-disable no-unused-vars */
function ReportsView({ jobs = [], users = {} }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [selectedDetailer, setSelectedDetailer] = useState(null);
  const [selectedServiceType, setSelectedServiceType] = useState(null);
  const [drillDownJobs, setDrillDownJobs] = useState([]);
  const [showDrillDown, setShowDrillDown] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch reports data from API
  const fetchReportsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);
      
      const response = await V2.get('/reports?' + params.toString());
      setReportData(response.data);
    } catch (err) {
      console.error('Reports fetch error:', err);
      setError('Failed to load reports: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  // Fetch data on mount and when dates change
  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  const filtered = useMemo(() => {
    try {
      if (!start && !end) return jobs;
      const s = start ? new Date(start) : null;
      const e = end ? new Date(end) : null;
      return jobs.filter(j => {
        const jobDate = new Date(j.date || j.startTime || j.createdAt);
        if (s && jobDate < s) return false;
        if (e && jobDate > e) return false;
        return true;
      });
    } catch (err) {
      console.error('Filter error:', err);
      return jobs;
    }
  }, [jobs, start, end]);

  // Use API data if available, fallback to client-side calculation
  const displayData = useMemo(() => {
    if (reportData) {
      return {
        totalLast7Days: reportData.last7Days,
        completedLast7Days: reportData.last7Days, // Assume completed for now
        serviceTypeCounts: reportData.serviceTypes.reduce((acc, st) => ({ ...acc, [st.name]: st.jobs }), {}),
        serviceTypePerformance: reportData.serviceTypes,
        detailerPerformance: reportData.detailerPerformance,
        dailyStats: reportData.dailyTrends.reduce((acc, day) => ({ 
          ...acc, 
          [day.date]: { total: day.jobs, completed: day.completed } 
        }), {}),
        filteredTotal: reportData.periodTotal,
        filteredCompleted: reportData.completed,
        completionRate: reportData.completionRate
      };
    }
    
    // Fallback to filtered jobs if no API data
    const fallbackFiltered = filtered.length > 0 ? filtered : jobs;
    return {
      totalLast7Days: fallbackFiltered.length,
      completedLast7Days: fallbackFiltered.filter(j => j.status === 'Completed').length,
      serviceTypeCounts: fallbackFiltered.reduce((acc, job) => {
        acc[job.serviceType] = (acc[job.serviceType] || 0) + 1;
        return acc;
      }, {}),
      serviceTypePerformance: [],
      detailerPerformance: [],
      dailyStats: {},
      filteredTotal: fallbackFiltered.length,
      filteredCompleted: fallbackFiltered.filter(j => j.status === 'Completed').length,
      completionRate: fallbackFiltered.length > 0 ? Math.round((fallbackFiltered.filter(j => j.status === 'Completed').length / fallbackFiltered.length) * 100) : 0
    };
  }, [reportData, filtered, jobs]);

  // Interactive drill-down functions
  const handleDetailerClick = (detailer) => {
    setSelectedDetailer(detailer.name || detailer);
    setDrillDownJobs(detailer.recentJobs || []);
    setShowDrillDown(true);
  };

  const handleServiceTypeClick = (serviceType) => {
    setSelectedServiceType(serviceType.name || serviceType);
    setDrillDownJobs(serviceType.jobs || []);
    setShowDrillDown(true);
  };

  const closeDrillDown = () => {
    setShowDrillDown(false);
    setSelectedDetailer(null);
    setSelectedServiceType(null);
    setDrillDownJobs([]);
  };



  const exportPdf = async () => {
    try {
      // Create comprehensive HTML report that can be printed as PDF
      const period = start && end ? `${start} to ${end}` : 'All Time';
      
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Cleanup Tracker Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: white; color: black; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
        .section { margin-bottom: 25px; }
        .section h2 { background: #f0f0f0; padding: 10px; margin: 0 0 15px 0; border-left: 4px solid #007acc; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .stat-card { background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #ddd; }
        .stat-value { font-size: 24px; font-weight: bold; color: #007acc; }
        .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f0f0f0; font-weight: bold; }
        .performance-table td:nth-child(2), .performance-table td:nth-child(3), .performance-table td:nth-child(4), .performance-table td:nth-child(5) { text-align: right; }
        .service-item { margin-bottom: 8px; padding: 8px; background: #f9f9f9; border-radius: 4px; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        @media print { body { margin: 0; } .no-print { display: none; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚗 CLEANUP TRACKER</h1>
        <h2>Performance Report</h2>
        <p><strong>Report Period:</strong> ${period} | <strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="section">
        <h2>📊 Summary Statistics</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${displayData.filteredTotal}</div>
                <div class="stat-label">Total Jobs</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${displayData.filteredCompleted}</div>
                <div class="stat-label">Completed Jobs</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${displayData.avgEfficiency || 'N/A'}</div>
                <div class="stat-label">Avg Time/Job</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${displayData.totalLast7Days}</div>
                <div class="stat-label">Last 7 Days</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>👥 Detailer Performance</h2>
        <table class="performance-table">
            <thead>
                <tr>
                    <th>Detailer Name</th>
                    <th>Total Jobs</th>
                    <th>Completed</th>
                    <th>Success Rate</th>
                    <th>Avg Time</th>
                    <th>Top Services</th>
                </tr>
            </thead>
            <tbody>
                ${displayData.detailerPerformance.map(perf => {
                    const completionRate = perf.totalJobs ? Math.round((perf.completedJobs / perf.totalJobs) * 100) : 0;
                    const avgTimeStr = perf.avgTime ? DateUtils.formatDuration(perf.avgTime) : 'N/A';
                    const topServices = Object.entries(perf.serviceTypes).sort(([,a], [,b]) => b - a).slice(0, 3).map(([k,v]) => `${k}(${v})`).join(', ');
                    return `
                    <tr>
                        <td><strong>${perf.name}</strong></td>
                        <td>${perf.totalJobs}</td>
                        <td>${perf.completedJobs}</td>
                        <td>${completionRate}%</td>
                        <td>${avgTimeStr}</td>
                        <td>${topServices}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>🔧 Service Type Breakdown</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
            ${Object.entries(displayData.serviceTypeCounts).map(([type, count]) => {
                const percentage = displayData.filteredTotal ? Math.round((count / displayData.filteredTotal) * 100) : 0;
                return `<div class="service-item"><strong>${type}</strong>: ${count} jobs (${percentage}%)</div>`;
            }).join('')}
        </div>
    </div>

    <div class="section">
        <h2>📅 Recent Activity</h2>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Detailer</th>
                    <th>Service</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>Duration</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.slice(0, 50).map(job => {
                    const duration = job.duration ? DateUtils.formatDuration(job.duration) : DateUtils.formatDuration(DateUtils.calculateDuration(job.startTime || job.startedAt, job.completedAt));
                    return `
                    <tr>
                        <td>${job.date}</td>
                        <td>${job.technicianName}</td>
                        <td>${job.serviceType}</td>
                        <td>${job.vehicleDescription}</td>
                        <td>${job.status}</td>
                        <td>${duration}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    </div>

    <div class="footer">
        <p>Report generated by Cleanup Tracker - Professional Vehicle Management System</p>
        <p class="no-print">To save as PDF: Use your browser's Print function and select "Save as PDF"</p>
    </div>
</body>
</html>`;

      // Create and open HTML report in new window for printing/PDF
      const newWindow = window.open('', '_blank');
      newWindow.document.write(htmlContent);
      newWindow.document.close();
      
      // Auto-trigger print dialog
      setTimeout(() => {
        newWindow.print();
      }, 1000);
      
      alert('PDF report opened in new window. Use your browser\'s print function to save as PDF.');
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  };

  // Error boundary for reports
  if (error) {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-black rounded-xl p-8 shadow-lg border border-red-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-red-800 font-bold text-xl mb-2">Reports Error</h3>
              <p className="text-red-600 mb-6 max-w-md mx-auto">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-lg transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced Loading state with better animations
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-12 shadow-xl border border-white/20 text-center">
            <div className="relative mb-8">
              <div className="animate-spin w-16 h-16 border-4 border-blue-200 rounded-full mx-auto"></div>
              <div className="animate-spin w-16 h-16 border-t-4 border-blue-600 rounded-full mx-auto absolute top-0 left-1/2 transform -translate-x-1/2"></div>
            </div>
            <div className="space-y-3">
              <p className="text-white text-xl font-bold animate-pulse">Loading Cleanup Tracker</p>
              <p className="text-gray-700 text-base">Gathering your reports and analytics...</p>
              <div className="flex justify-center space-x-1 mt-4">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Filters & Export */}
        <div className="bg-black rounded-xl p-6 shadow-lg border border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-4">📊 Reports Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2">Start Date</label>
              <input type="date" value={start} onChange={e => setStart(e.target.value)} className="w-full bg-black text-white border border-gray-700 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2">End Date</label>
              <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-full bg-black text-white border border-gray-700 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button
                onClick={() => {
                  const headers = ['Date', 'Technician', 'Service Type', 'Vehicle', 'Status', 'Duration'].join(',');
                  const rows = filtered.map(job => {
                    const duration = job.duration || DateUtils.calculateDuration(job.startTime || job.startedAt, job.completedAt);
                    return [
                      job.date,
                      job.technicianName || 'Unknown',
                      job.serviceType || 'N/A',
                      job.vehicleDescription || '',
                      job.status || 'Unknown',
                      DateUtils.formatDuration(duration)
                    ].map(v => `"${v}"`).join(',');
                  });
                  const csv = [headers, ...rows].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'cleanup-tracker-report.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-lg transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
              <button
                onClick={() => {
                  const json = JSON.stringify(filtered, null, 2);
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'cleanup-tracker-report.json';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold shadow-lg transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Export JSON
              </button>
              <button
                onClick={exportPdf}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold shadow-lg transition-all"
              >
                📄 Export Report
              </button>
              <button
                onClick={() => { setStart(''); setEnd(''); }}
                className="px-4 py-2 rounded-lg border border-gray-700 text-gray-700 bg-black hover:bg-gray-900 text-sm font-semibold shadow transition-all"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-black rounded-xl p-6 shadow-lg border border-gray-800">
            <h4 className="text-gray-600 text-sm font-semibold mb-2">Period Total</h4>
            <p className="text-3xl font-bold text-white">{displayData.filteredTotal}</p>
          </div>
          <div className="bg-black rounded-xl p-6 shadow-lg border border-gray-800">
            <h4 className="text-gray-600 text-sm font-semibold mb-2">Completed</h4>
            <p className="text-3xl font-bold text-green-600">{displayData.filteredCompleted}</p>
          </div>
          <div className="bg-black rounded-xl p-6 shadow-lg border border-gray-800">
            <h4 className="text-gray-600 text-sm font-semibold mb-2">Avg Time/Job</h4>
            <p className="text-3xl font-bold text-blue-600">{displayData.avgEfficiency || 'N/A'}</p>
          </div>
          <div className="bg-black rounded-xl p-6 shadow-lg border border-gray-800">
            <h4 className="text-gray-600 text-sm font-semibold mb-2">Last 7 Days</h4>
            <p className="text-3xl font-bold text-orange-600">{displayData.totalLast7Days}</p>
          </div>
        </div>

        {/* Detailer Performance - Click to see details */}
        <div className="bg-black rounded-xl p-6 shadow-lg border border-gray-800">
          <h3 className="text-white font-bold text-xl mb-6">📈 Detailer Performance (Click for Details)</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-700 text-sm font-semibold py-3">Name</th>
                  <th className="text-right text-gray-700 text-sm font-semibold py-3">Total Jobs</th>
                  <th className="text-right text-gray-700 text-sm font-semibold py-3">Avg Time</th>
                  <th className="text-right text-gray-700 text-sm font-semibold py-3">Min Time</th>
                  <th className="text-right text-gray-700 text-sm font-semibold py-3">Max Time</th>
                  <th className="text-right text-gray-700 text-sm font-semibold py-3">Recent Jobs</th>
                </tr>
              </thead>
              <tbody>
                {displayData.detailerPerformance.map((perf, idx) => {
                  const avgTimeStr = perf.avgTime ? DateUtils.formatDuration(perf.avgTime) : 'N/A';
                  const minTimeStr = perf.minTime ? DateUtils.formatDuration(perf.minTime) : 'N/A';
                  const maxTimeStr = perf.maxTime ? DateUtils.formatDuration(perf.maxTime) : 'N/A';
                  return (
                    <tr 
                      key={idx} 
                      className="border-b border-gray-800 cursor-pointer hover:bg-blue-50 transition-all"
                      onClick={() => handleDetailerClick(perf.name)}
                    >
                      <td className="text-white py-3 font-medium">{perf.name}</td>
                      <td className="text-gray-700 text-right py-3">{perf.totalJobs}</td>
                      <td className="text-green-600 text-right py-3 font-medium">{avgTimeStr}</td>
                      <td className="text-blue-600 text-right py-3">{minTimeStr}</td>
                      <td className="text-red-600 text-right py-3">{maxTimeStr}</td>
                      <td className="text-gray-700 text-right py-3">{perf.recentJobs ? perf.recentJobs.length : 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Service Type Breakdown - Click to see details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-black rounded-xl p-6 shadow-lg border border-gray-800">
            <h3 className="text-white font-bold text-xl mb-6">🔧 Service Types (Click for Details)</h3>
            <div className="space-y-3">
              {(displayData.serviceTypePerformance || []).map((data, idx) => {
                const avgTimeStr = data.avgTime ? DateUtils.formatDuration(data.avgTime) : 'N/A';
                const minTimeStr = data.minTime ? DateUtils.formatDuration(data.minTime) : 'N/A';
                const maxTimeStr = data.maxTime ? DateUtils.formatDuration(data.maxTime) : 'N/A';
                return (
                  <div 
                    key={idx} 
                    className="space-y-3 p-4 bg-black rounded-lg cursor-pointer hover:bg-blue-50 transition-all border border-gray-800"
                    onClick={() => handleServiceTypeClick(data)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-white font-semibold">{data.name}</span>
                      <span className="text-gray-600 text-sm font-medium">{data.jobs?.length || 0} jobs</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center">
                        <div className="text-green-600 font-semibold">{avgTimeStr}</div>
                        <div className="text-gray-500 text-xs">Avg Time</div>
                      </div>
                      <div className="text-center">
                        <div className="text-blue-600 font-semibold">{minTimeStr}</div>
                        <div className="text-gray-500 text-xs">Min Time</div>
                      </div>
                      <div className="text-center">
                        <div className="text-red-600 font-semibold">{maxTimeStr}</div>
                        <div className="text-gray-500 text-xs">Max Time</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-black rounded-xl p-6 shadow-lg border border-gray-800">
            <h3 className="text-white font-bold text-xl mb-6">📅 Daily Trends</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {Object.entries(displayData.dailyStats || {})
                .sort(([a], [b]) => new Date(b) - new Date(a))
                .slice(0, 10)
                .map(([date, stats]) => {
                  const rate = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
                  return (
                    <div key={date} className="flex justify-between items-center p-3 bg-black rounded-lg border border-gray-800">
                      <span className="text-white text-sm font-medium">{new Date(date).toLocaleDateString()}</span>
                      <span className="text-gray-700 text-sm font-semibold">{stats.completed}/{stats.total} ({rate}%)</span>
                    </div>
                  );
                })
              }
            </div>
          </div>
        </div>

        {/* Drill-Down Modal */}
        {showDrillDown && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-black rounded-xl p-6 max-w-6xl w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-gray-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-bold text-2xl">
                  {selectedDetailer ? `${selectedDetailer} - Job Details` : `${selectedServiceType} - Job Details`}
                </h3>
                <button
                  onClick={closeDrillDown}
                  className="text-gray-500 hover:text-gray-700 transition-colors text-2xl font-bold"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4 text-gray-700 font-semibold">
                Showing {drillDownJobs.length} jobs
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-800">
                      <th className="text-left text-gray-700 text-sm font-bold py-3">VIN</th>
                      <th className="text-left text-gray-700 text-sm font-bold py-3">Service Type</th>
                      <th className="text-left text-gray-700 text-sm font-bold py-3">Detailer</th>
                      <th className="text-left text-gray-700 text-sm font-bold py-3">Status</th>
                      <th className="text-left text-gray-700 text-sm font-bold py-3">Duration</th>
                      <th className="text-left text-gray-700 text-sm font-bold py-3">Started</th>
                      <th className="text-left text-gray-700 text-sm font-bold py-3">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillDownJobs.map((job, idx) => {
                      const startTime = DateUtils.getValidDate(job.startTime || job.startedAt || job.createdAt || job.timestamp || job.date);
                      const endTime = DateUtils.getValidDate(job.completedAt);
                      const duration = startTime && endTime ? 
                        DateUtils.formatDuration(DateUtils.calculateDuration(startTime, endTime)) : 
                        (startTime ? 'In Progress' : 'N/A');
                      
                      return (
                        <tr key={idx} className="border-b border-gray-800 hover:bg-blue-50 transition-all">
                          <td className="text-white py-3 font-mono text-sm">{job.vin || 'N/A'}</td>
                          <td className="text-gray-700 py-3">{job.serviceType || 'N/A'}</td>
                          <td className="text-gray-700 py-3">{job.detailer || job.assignedTo || 'N/A'}</td>
                          <td className="text-gray-700 py-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              job.status === 'Completed' ? 'bg-green-100 text-green-800' :
                              job.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-900 text-gray-800'
                            }`}>
                              {job.status || 'Pending'}
                            </span>
                          </td>
                          <td className="text-gray-700 py-3 font-medium">{duration}</td>
                          <td className="text-gray-700 py-3">
                            {startTime ? DateUtils.formatDateTime(startTime) : 'N/A'}
                          </td>
                          <td className="text-gray-700 py-3">
                            {endTime ? DateUtils.formatDateTime(endTime) : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}



// Main Component - Enhanced with professional error handling
export default function FirebaseV2() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const handleLogin = useCallback((sessionData) => {
    if (!sessionData?.user || !sessionData?.tokens) {
      Logger.error('Invalid session payload received on login', null, { sessionData });
      setError('Login failed: unexpected response');
      return;
    }

    setSessionTokens(sessionData.tokens);
    persistSession(sessionData);
    Logger.info('User login successful', { 
      userId: sessionData.user?.id, 
      role: sessionData.user?.role,
      name: sessionData.user?.name 
    });
    setUser(sessionData.user);
    setError(null);
  }, []);

  const handleLogout = useCallback((message) => {
    Logger.info('User logout');
    clearSessionTokens();
    persistSession(null);
    setUser(null);
    setError(message || null);
  }, []);

  const handleError = useCallback((errorMessage, error = null) => {
    Logger.error('Application error', error, { errorMessage });
    setError(errorMessage);
  }, []);

  useEffect(() => {
    const stored = loadStoredSession();
    if (stored?.user && stored?.tokens) {
      setSessionTokens(stored.tokens);
      setUser(stored.user);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onUnauthorized = () => {
      handleLogout('Your session expired. Please sign in again.');
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [handleLogout]);

  // 🚀 Command Palette Keyboard Shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show error with professional styling
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="bg-black rounded-xl p-6 border border-red-200 shadow-lg max-w-md w-full">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-red-800 font-bold mb-2">Application Error</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => setError(null)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main app render
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      {!user ? (
        <LoginForm onLogin={handleLogin} />
        ) : (
          <MainApp 
            user={user} 
            onLogout={handleLogout} 
            onError={handleError}
            showCommandPalette={showCommandPalette}
            setShowCommandPalette={setShowCommandPalette}
          />
        )}
    </Suspense>
  );
}

// Manager Settings View
function SettingsView({ settings, onSettingsChange }) {
  const mapExpectationsToList = useCallback((expectations = {}) => (
    Object.entries(expectations).map(([name, value], index) => ({
      id: `${name}-${index}`,
      name,
      duration: Number(value?.duration) || 0,
      description: value?.description || ''
    }))
  ), []);

  const [siteTitle, setSiteTitle] = useState(settings?.siteTitle || 'CleanUP Tracker');
  const [csvUrl, setCsvUrl] = useState(settings?.inventoryCsvUrl || '');
  const [jobTypes, setJobTypes] = useState(() => mapExpectationsToList(settings?.serviceExpectations));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSiteTitle(settings?.siteTitle || 'CleanUP Tracker');
    setCsvUrl(settings?.inventoryCsvUrl || '');
    setJobTypes(mapExpectationsToList(settings?.serviceExpectations));
  }, [settings, mapExpectationsToList]);

  const updateJobType = (id, field, value) => {
    setJobTypes(prev => prev.map(type => type.id === id ? { ...type, [field]: field === 'duration' ? Number(value) || 0 : value } : type));
  };

  const addJobType = () => {
    setJobTypes(prev => ([
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: 'New Service',
        duration: 60,
        description: ''
      }
    ]));
  };

  const removeJobType = (id) => {
    setJobTypes(prev => prev.filter(type => type.id !== id));
  };

  const persistSettings = async (options = { refreshInventory: false }) => {
    setSaving(true);
    try {
      // Input validation
      if (!Array.isArray(jobTypes)) {
        throw new Error('Invalid job types configuration');
      }

      const normalizedJobTypes = jobTypes.reduce((acc, type) => {
        const trimmedName = type.name?.trim();
        if (!trimmedName) {
          return acc;
        }
        acc[trimmedName] = {
          duration: Math.max(0, Math.round(Number(type.duration) || 0)),
          description: (type.description || '').trim()
        };
        return acc;
      }, {});

      const tasks = [
        V2.put('/settings', { key: 'siteTitle', value: siteTitle?.trim() || 'CleanUP Tracker' }),
        V2.put('/settings', { key: 'serviceExpectations', value: normalizedJobTypes })
      ];

      const trimmedUrl = csvUrl?.trim() || '';
      if (trimmedUrl) {
        // Validate CSV URL format
        try {
          new URL(trimmedUrl);
        } catch {
          throw new Error('Invalid CSV URL format');
        }
        tasks.push(
          V2.post('/vehicles/set-csv', { url: trimmedUrl }).catch(() => V2.put('/settings', { key: 'inventoryCsvUrl', value: trimmedUrl }))
        );
      } else {
        tasks.push(V2.put('/settings', { key: 'inventoryCsvUrl', value: '' }));
      }

      await Promise.all(tasks);

      if (options.refreshInventory) {
        await V2.post('/vehicles/refresh');
      }

      const latestSettings = await V2.get('/settings');
      onSettingsChange({
        ...(latestSettings.data || {}),
        serviceExpectations: normalizedJobTypes
      });

      alert(options.refreshInventory ? 'Settings saved and inventory refreshed.' : 'Settings saved.');
    } catch (err) {
      Logger.error('Failed to save settings', err, { 
        hasJobTypes: Array.isArray(jobTypes),
        csvUrl: csvUrl?.substring(0, 50) // Log partial URL
      });
      alert('Failed to save settings: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const refreshOnly = async () => {
    try {
      await V2.post('/vehicles/refresh');
      alert('Inventory refreshed.');
    } catch (err) {
      alert('Refresh failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const totalDuration = jobTypes.reduce((sum, type) => sum + (Number(type.duration) || 0), 0);

  return (
    <div className="space-y-6">
      <section className="bg-black rounded-2xl border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-white text-lg font-semibold">Brand Identity</h3>
            <p className="text-[11px] uppercase tracking-widest text-gray-500">Update the look that appears across the platform</p>
          </div>
          <span className="text-xs text-gray-500">Total Services: {jobTypes.length}</span>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Site Title</label>
            <input
              type="text"
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              className="w-full bg-gray-950 text-white border border-gray-800 rounded-xl py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-gray-600 placeholder-gray-600"
              placeholder="CleanUP Tracker"
            />
          </div>
        </div>
      </section>

      <section className="bg-black rounded-2xl border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-white text-lg font-semibold">Inventory Source</h3>
            <p className="text-[11px] uppercase tracking-widest text-gray-500">Control live vehicle feeds</p>
          </div>
          <button
            onClick={refreshOnly}
            className="hidden sm:inline-flex items-center gap-2 rounded-full border border-gray-800 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:border-gray-600"
            type="button"
          >
            Refresh Inventory
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Google Sheets CSV URL</label>
            <input
              type="url"
              value={csvUrl}
              onChange={(e) => setCsvUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/.../pub?output=csv"
              className="w-full bg-gray-950 text-white border border-gray-800 rounded-xl py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-600"
            />
            <p className="text-[11px] text-gray-600 mt-2">Leave blank to disable auto-import.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => persistSettings({ refreshInventory: false })} disabled={saving} className="inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-full bg-white text-black font-semibold text-sm disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
            <button onClick={() => persistSettings({ refreshInventory: true })} disabled={saving} className="inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm disabled:opacity-50">
              {saving ? 'Working…' : 'Save & Import Vehicles'}
            </button>
            <button onClick={refreshOnly} type="button" className="sm:hidden inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-full bg-gray-900 text-gray-300 text-sm border border-gray-800">
              Refresh Inventory
            </button>
          </div>
        </div>
      </section>

      <section className="bg-black rounded-2xl border border-gray-800 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-white text-lg font-semibold">Job Types & Timing</h3>
            <p className="text-[11px] uppercase tracking-widest text-gray-500">Define expectations for each service</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>Total Minutes: {totalDuration}</span>
            <button onClick={addJobType} type="button" className="inline-flex items-center gap-2 rounded-full border border-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:border-gray-600">
              + Add Service
            </button>
          </div>
        </div>
        {jobTypes.length === 0 ? (
          <div className="border border-dashed border-gray-800 rounded-xl p-8 text-center text-gray-500">
            No services configured yet. Add at least one service to guide technician pacing.
          </div>
        ) : (
          <div className="space-y-4">
            {jobTypes.map(type => (
              <div key={type.id} className="bg-gray-950 border border-gray-900 rounded-xl p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <div className="flex-1 space-y-2">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-1">Service Name</label>
                    <input
                      type="text"
                      value={type.name}
                      onChange={(e) => updateJobType(type.id, 'name', e.target.value)}
                      className="w-full bg-black text-white border border-gray-800 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-gray-600 placeholder-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-1">Description</label>
                    <textarea
                      value={type.description}
                      onChange={(e) => updateJobType(type.id, 'description', e.target.value)}
                      rows={2}
                      className="w-full bg-black text-white border border-gray-800 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-gray-600 placeholder-gray-600"
                      placeholder="Optional guidance detailers see in dashboards"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-40 space-y-2">
                  <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-1">Target Minutes</label>
                  <input
                    type="number"
                    min="0"
                    value={type.duration}
                    onChange={(e) => updateJobType(type.id, 'duration', e.target.value)}
                    className="w-full bg-black text-white border border-gray-800 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button onClick={() => removeJobType(type.id)} type="button" className="inline-flex items-center justify-center w-full rounded-full border border-gray-800 px-3 py-2 text-xs text-red-400 hover:border-red-500">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-[11px] text-gray-500">These expectations power timeline badges, analytics, and technician pacing recommendations.</p>
      </section>
    </div>
  );
}

// Personal Settings View (for both roles)
function MySettingsView({ user }) {
  const [name, setName] = useState(user?.name || '');
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return alert('Name is required');
    
    // Restrict PIN changes for detailers
    if ((user.role === 'detailer' || user.role === 'technician') && pin) {
      return alert('PIN changes are not allowed for detailers. Contact your manager.');
    }
    
    if (pin && pin.length !== 4) return alert('PIN must be 4 digits');
    setSaving(true);
    try {
      // Fetch latest user from API list to get ID mapping
      const all = await V2.get('/users');
      const me = (all.data || []).find(u => u.id === user.id || u.pin === user.pin || u.name === user.name);
      if (!me) return alert('Cannot locate your profile');
      
      // Only include PIN in update if user is manager
      const updateData = { name, role: me.role };
      if (user.role === 'manager' && pin) {
        updateData.pin = pin;
      }
      
      await V2.put(`/users/${me.id}`, updateData);
      alert('Profile updated');
    } catch (err) {
      alert('Failed to update: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="bg-black border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold text-lg">Profile Preferences</h3>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Optimized for the X experience</p>
          </div>
          <span className="px-3 py-1 text-[11px] uppercase tracking-wide text-gray-400 border border-gray-800 rounded-full">
            {user.role}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-1.5">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-gray-950 text-white text-sm border border-gray-800 rounded-xl py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-gray-600 placeholder-gray-600"
            />
          </div>

          {user.role === 'manager' && (
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-1.5">New PIN (optional)</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-gray-950 text-white text-sm border border-gray-800 rounded-xl py-2.5 px-3 focus:outline-none focus:ring-1 focus:ring-gray-600 placeholder-gray-600"
              />
              <p className="mt-1 text-[11px] text-gray-600 uppercase tracking-wide">Requires 4 digits</p>
            </div>
          )}

          {(user.role === 'detailer' || user.role === 'technician') && (
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-3">
              <p className="text-sm text-gray-300 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-white text-xs">🔒</span>
                PIN changes are managed by your supervisor. Reach out to your manager for updates.
              </p>
            </div>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// QC View Component for Managers
function QCView({ jobs, users, currentUser, onRefresh }) {
  
  // Get jobs that need QC review
  const qcJobs = jobs.filter(job => job.status === 'QC Required' || job.status === 'qc_required');
  
  const handleQCApprove = async (job) => {
    try {
      await V2.put(`/jobs/${job.id}/status`, { status: 'Completed' });
      onRefresh();
      alert('Job approved and marked as completed!');
    } catch (error) {
      console.error('Failed to approve job:', error);
      alert('Failed to approve job: ' + (error.response?.data?.error || error.message));
    }
  };
  
  const handleQCReject = async (job, reason) => {
    try {
      await V2.put(`/jobs/${job.id}/status`, { 
        status: 'In Progress',
        qcNotes: reason 
      });
      onRefresh();
      alert('Job sent back for rework');
    } catch (error) {
      console.error('Failed to reject job:', error);
      alert('Failed to reject job: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Quality Control Dashboard</h2>
        <p className="text-gray-600">Review and approve completed jobs before final delivery</p>
      </div>

      {/* QC Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
          <h3 className="text-yellow-700 font-semibold mb-2">Pending Review</h3>
          <p className="text-3xl font-bold text-yellow-900">{qcJobs.length}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-6 border border-green-200">
          <h3 className="text-green-700 font-semibold mb-2">Approved Today</h3>
          <p className="text-3xl font-bold text-green-900">
            {jobs.filter(job => {
              const today = new Date().toISOString().split('T')[0];
              return job.status === 'Completed' && job.completedAt && 
                     new Date(job.completedAt).toISOString().split('T')[0] === today;
            }).length}
          </p>
        </div>
        <div className="bg-red-50 rounded-xl p-6 border border-red-200">
          <h3 className="text-red-700 font-semibold mb-2">Rejected Today</h3>
          <p className="text-3xl font-bold text-red-900">
            {jobs.filter(job => {
              const today = new Date().toISOString().split('T')[0];
              return job.qcNotes && job.updatedAt && 
                     new Date(job.updatedAt).toISOString().split('T')[0] === today;
            }).length}
          </p>
        </div>
      </div>

      {/* Jobs Needing Review */}
      <div className="bg-black rounded-xl shadow-sm border border-gray-800">
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-xl font-semibold text-white">Jobs Awaiting QC Review</h3>
        </div>
        
        {qcJobs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-white mb-2">All caught up!</h4>
            <p className="text-gray-600">No jobs are currently waiting for quality control review.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {qcJobs.map((job) => (
              <div key={job.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-white">
                        {job.year} {job.make} {job.model}
                      </h4>
                      {job.vehicleColor && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                          {job.vehicleColor}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-500 font-medium">VIN</p>
                        <p className="font-mono">{job.vin}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium">Stock</p>
                        <p>{job.stockNumber}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium">Service</p>
                        <p>{job.serviceType}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium">Technician</p>
                        <p>{job.technicianName}</p>
                      </div>
                    </div>
                    {job.completedAt && (
                      <p className="text-sm text-gray-600">
                        Completed: {new Date(job.completedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleQCApprove(job)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Enter reason for rejection (this will be sent back to the technician):');
                        if (reason) handleQCReject(job, reason);
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
