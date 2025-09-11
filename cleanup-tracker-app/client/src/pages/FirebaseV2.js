import React, { useState, useEffect, useMemo } from 'react';
import VinScanner from '../components/VinScanner';
import axios from 'axios';

// Utility functions for date/time handling with Eastern Time support
const DateUtils = {
  // Get current local date in YYYY-MM-DD format (Eastern Time)
  getLocalDateString: (date = new Date()) => {
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
      .toISOString().slice(0, 10);
  },
  
  // Check if date is today (Eastern Time)
  isToday: (date) => {
    if (!date) return false;
    const inputDate = new Date(date);
    if (isNaN(inputDate.getTime())) return false;
    return DateUtils.getLocalDateString(inputDate) === DateUtils.getLocalDateString();
  },
  
  // Check if date is this week (Eastern Time)
  isThisWeek: (date) => {
    if (!date) return false;
    const inputDate = new Date(date);
    if (isNaN(inputDate.getTime())) return false;
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000));
    return inputDate >= weekStart && inputDate < weekEnd;
  },
  
  // Check if date is this month (Eastern Time)
  isThisMonth: (date) => {
    if (!date) return false;
    const inputDate = new Date(date);
    if (isNaN(inputDate.getTime())) return false;
    const now = new Date();
    return inputDate.getMonth() === now.getMonth() && inputDate.getFullYear() === now.getFullYear();
  },
  
  // Format date safely
  formatDate: (date, options = {}) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleString('en-US', { 
      timeZone: 'America/New_York',
      ...options 
    });
  },
  
  // Format duration from minutes to readable format
  formatDuration: (minutes) => {
    if (!minutes || minutes < 0) return 'N/A';
    // Cap unrealistic durations at 24 hours
    const cappedMinutes = Math.min(minutes, 24 * 60);
    const hours = Math.floor(cappedMinutes / 60);
    const mins = Math.round(cappedMinutes % 60);
    if (hours === 0) return `${mins}min`;
    return `${hours}h ${mins}m`;
  },
  
  // Calculate duration between two dates in minutes
  calculateDuration: (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    // Cap at 24 hours to prevent unrealistic durations
    return Math.max(0, Math.min(diffMins, 24 * 60));
  },
  
  // Validate if a date string/object is valid
  isValidDate: (date) => {
    if (!date) return false;
    const d = new Date(date);
    return !isNaN(d.getTime());
  }
};

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

// Create API instance with proper base URL
const V2 = axios.create({
  baseURL: (process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL.replace(/\/$/, '')}/api/v2` : '/api/v2'),
  timeout: 10000,
});

// Login Component with gradient/glass theme
function LoginForm({ onLogin }) {
  const [employeeId, setEmployeeId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!employeeId) {
        alert('Enter your employee ID');
        return;
      }
      const response = await V2.post('/auth/login', { employeeId });
      if (response.data.user) onLogin(response.data.user); else alert('Invalid employee ID');
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Login failed';
      alert(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{siteTitle}</h1>
          <p className="text-gray-300">Mission Ford</p>
        </div>

        {/* Single login using Employee ID for both roles */}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value.replace(/\D/g,''))}
              placeholder="Employee ID (e.g., 1709)"
              className="w-full bg-white/10 text-white placeholder-gray-300 border border-white/20 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
  className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg disabled:bg-gray-500"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Main App Component with Mobile-First Design
function MainApp({ user, onLogout }) {
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
  const [settings, setSettings] = useState({ siteTitle: 'Cleanup Tracker' });
    // no local state needed for inventory warm-up

  // Load data on mount
  useEffect(() => {
    loadInitialData();
  }, []);

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

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [jobsRes, usersRes, settingsRes] = await Promise.all([
        V2.get('/jobs'),
        V2.get('/users'),
        V2.get('/settings')
      ]);
      
      setJobs(jobsRes.data);
      
      // Convert users array to object for easy lookup
      const usersObj = {};
      usersRes.data.forEach(user => {
        usersObj[user.id || user._id] = user;
      });
      setUsers(usersObj);
      if (settingsRes && settingsRes.data) {
        setSettings(settingsRes.data);
      }
      
    } catch (err) {
      setError('Failed to load data: ' + (err.response?.data?.error || err.message));
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Allow detailers to freely navigate; no forced redirect.

  // Search functionality
  const handleSearch = async (term) => {
    if (!term.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await V2.get(`/vehicles/search?q=${encodeURIComponent(term)}`);
      setSearchResults(response.data || []);
      setHasSearched(true);
    } catch (err) {
      console.error('Search failed:', err);
      alert('Search failed: ' + (err.response?.data?.error || err.message));
      setSearchResults([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced auto-search on input change for VIN/Stock
  useEffect(() => {
    const term = searchTerm.trim();
    if (!term) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    // trigger auto search for 17-char VINs or when 3+ chars entered
    const shouldSearch = term.length === 17 || term.length >= 3;
    if (!shouldSearch) return;
    const controller = new AbortController();
    const id = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await V2.get(`/vehicles/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        setSearchResults(response.data || []);
        setHasSearched(true);
      } catch (err) {
        if (err.name !== 'CanceledError') {
          console.error('Search failed:', err);
          setSearchResults([]);
          setHasSearched(true);
        }
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [searchTerm]);

  // Scan success handler
  const handleScanSuccess = async (vin) => {
    setShowScanner(false);
    try {
      // Try to join an in-progress job by VIN; if none, just run a search to offer starting a job
      await V2.put(`/vehicles/join-by-vin`, { vin, userId: user.id });
      await loadInitialData();
      setSearchTerm(vin);
      setView('dashboard');
    } catch (err) {
      // fallback to search
      try {
        const response = await V2.get(`/vehicles/search?q=${encodeURIComponent(vin)}`);
        setSearchResults(response.data || []);
        setSearchTerm(vin);
        setHasSearched(true);
        setView('jobs');
      } catch (e2) {
        alert('VIN lookup failed: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  // Stop work handler
  const handleStopWork = async () => {
    try {
      const activeJob = jobs.find(j => j.status === 'In Progress' && (j.assignedTechnicianIds?.includes(user.id)));
      if (!activeJob) return;
      
      // Stop timer and mark as complete with proper timing
      await V2.put(`/jobs/${activeJob.id}/complete`, { 
        userId: user.id,
        completedAt: new Date().toISOString() 
      });
      
      await loadInitialData(); // Reload data
      alert('Job completed successfully!');
    } catch (err) {
      alert('Failed to complete job: ' + (err.response?.data?.error || err.message));
    }
  };

  // Delete user handler
  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this detailer?')) return;
    
    try {
      await V2.delete(`/users/${userId}`);
      await loadInitialData(); // Reload data
      alert('Detailer deleted successfully');
    } catch (err) {
      alert('Failed to delete detailer: ' + (err.response?.data?.error || err.message));
    }
  };

  // Computed values
  const activeJobs = useMemo(() => jobs.filter(j => j.status === 'In Progress'), [jobs]);
  const completedJobs = useMemo(() => jobs.filter(j => j.status === 'Completed'), [jobs]);
  const userActiveJob = useMemo(() => 
    activeJobs.find(j => j.assignedTechnicianIds?.includes(user.id)), 
    [activeJobs, user.id]
  );
  const detailers = useMemo(() => 
    Object.values(users).filter(u => u.role === 'detailer'), 
    [users]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-500/20 backdrop-blur-lg rounded-xl p-6 border border-red-400/30 max-w-md">
          <h2 className="text-red-100 font-semibold text-lg mb-2">Error</h2>
          <p className="text-red-200 mb-4">{error}</p>
          <button 
            onClick={loadInitialData}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Mobile Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg">{settings.siteTitle || 'Cleanup Tracker'}</h1>
            <p className="text-gray-300 text-sm">{user.name} • {user.role === 'manager' ? 'Manager' : 'Detailer'}</p>
          </div>
          <button 
            onClick={onLogout}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-red-400/30"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="bg-white/5 backdrop-blur-lg border-b border-white/20 px-4 py-2 overflow-x-auto">
        <div className="flex space-x-2 min-w-max">
          <button 
            onClick={() => setView('dashboard')} 
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              view === 'dashboard' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Dashboard
          </button>
          
          {user.role === 'detailer' ? (
            <>
              <button 
                onClick={() => setView('jobs')} 
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  view === 'jobs' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                New Job
              </button>
              <button 
                onClick={() => setView('me')} 
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  view === 'me' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                Me
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setView('jobs')} 
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  view === 'jobs' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                All Jobs
              </button>
              <button 
                onClick={() => setView('users')} 
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  view === 'users' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                Team
              </button>
              <button 
                onClick={() => setView('reports')} 
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  view === 'reports' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                Reports
              </button>
              <button 
                onClick={() => setView('settings')} 
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  view === 'settings' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                Settings
              </button>
              <button 
                onClick={() => setView('me')} 
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  view === 'me' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                Me
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Detailer Views */}
        {user.role === 'detailer' && (
          <>
            {view === 'dashboard' && <DetailerDashboard user={user} jobs={activeJobs} completedJobs={completedJobs} userActiveJob={userActiveJob} onStopWork={handleStopWork} onOpenScanner={() => setShowScanner(true)} onGoToNewJob={() => setView('jobs')} />}
            {view === 'jobs' && <DetailerNewJob user={user} onSearch={handleSearch} searchResults={searchResults} isSearching={isSearching} searchTerm={searchTerm} setSearchTerm={setSearchTerm} showScanner={showScanner} setShowScanner={setShowScanner} onScanSuccess={handleScanSuccess} hasSearched={hasSearched} onJobCreated={async () => { await loadInitialData(); setView('dashboard'); }} />}
            {view === 'me' && <MySettingsView user={user} />}
          </>
        )}        {/* Manager Views */}
    {user.role === 'manager' && (
          <>
            {view === 'dashboard' && <ManagerDashboard jobs={jobs} users={users} currentUser={user} onRefresh={loadInitialData} />}
            {view === 'jobs' && <JobsView jobs={jobs} users={users} currentUser={user} onRefresh={loadInitialData} />}
            {view === 'users' && <UsersView users={users} detailers={detailers} onDeleteUser={deleteUser} />}
            {view === 'reports' && <ReportsView jobs={jobs} users={users} />}
            {view === 'settings' && <SettingsView settings={settings} onSettingsChange={setSettings} />}
      {view === 'me' && <MySettingsView user={user} />}
          </>
        )}
      </div>
    </div>
  );
}

// Detailer Dashboard Component
function DetailerDashboard({ user, jobs, completedJobs, userActiveJob, onStopWork, onOpenScanner, onGoToNewJob }) {
  const myJobsToday = useMemo(() => {
    return completedJobs.filter(j => {
      const jobDate = j.date || j.completedAt || j.startTime || j.createdAt;
      return DateUtils.isToday(jobDate) && j.assignedTechnicianIds?.includes(user.id);
    }).length;
  }, [completedJobs, user.id]);

  const [details, setDetails] = useState(null);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [showTimeline, setShowTimeline] = useState(false);
  
  // Job details modal state
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);
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

  const fmt = (s) => {
    const h = Math.floor(s / 3600).toString().padStart(2,'0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2,'0');
    const sec = (s % 60).toString().padStart(2,'0');
    return `${h}:${m}:${sec}`;
  };

  return (
    <div className="space-y-4">
      {/* Current Job Status */}
      {userActiveJob ? (
        <div className="bg-yellow-500/20 backdrop-blur-lg rounded-xl p-6 border border-yellow-400/30">
          <h3 className="text-yellow-100 font-semibold text-lg mb-3">Current Job</h3>
          <div className="text-white">
            <p className="text-xl font-bold">{userActiveJob.vehicleDescription}</p>
            <p className="text-yellow-200">Service: {userActiveJob.serviceType}</p>
            <p className="text-yellow-200">Stock #: {userActiveJob.stockNumber}</p>
            {details && (
              <>
                <p className="text-yellow-200">
                  Started: {DateUtils.formatDate(
                    (details.job?.startedAt) || (details.events?.[0]?.timestamp) || Date.now(),
                    { hour: '2-digit', minute: '2-digit', second: '2-digit' }
                  )}
                </p>
                <p className="text-yellow-100 text-2xl font-mono mt-2">{fmt(elapsed)}</p>
              </>
            )}
          </div>
          <button 
            onClick={onStopWork}
            className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Complete Job
          </button>
          {details && (
            <div className="mt-4">
              <button onClick={() => setShowTimeline(!showTimeline)} className="text-yellow-200 underline text-sm">{showTimeline ? 'Hide' : 'Show'} Timeline</button>
              {showTimeline && (
                <ul className="mt-2 space-y-1 max-h-40 overflow-auto pr-2">
                  {(details.events || []).map((ev, idx) => (
                    <li key={idx} className="text-yellow-100 text-sm">
                      <span className="font-medium">{ev.type}</span> — {DateUtils.formatDate(ev.timestamp)} {ev.userName ? `• ${ev.userName}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-white font-semibold text-lg mb-3">Start a New Job</h3>
          <p className="text-gray-300 mb-4">Scan a VIN or search by VIN/Stock to begin.</p>
            <div className="mb-4">
              <button
                onClick={async () => { try { await V2.post('/vehicles/refresh'); alert('Inventory refreshed. Try your search again.'); } catch (e) { alert('Refresh failed: ' + (e.response?.data?.error || e.message)); } }}
                className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-white text-sm backdrop-blur border border-white/20"
              >
                Refresh Inventory
              </button>
            </div>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={onOpenScanner}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Scan VIN
            </button>
            <button 
              onClick={onGoToNewJob}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Search Vehicle
            </button>
          </div>
        </div>
      )}

      {/* Today's Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <h4 className="text-gray-300 text-sm font-medium">Completed Today</h4>
          <p className="text-3xl font-bold text-green-400">{myJobsToday}</p>
          <p className="text-gray-400 text-xs mt-1">Great work!</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <h4 className="text-gray-300 text-sm font-medium">Active Job</h4>
          <p className="text-3xl font-bold text-yellow-400">{userActiveJob ? 1 : 0}</p>
          <p className="text-gray-400 text-xs mt-1">{userActiveJob ? 'Keep going!' : 'Ready to start'}</p>
        </div>
      </div>

      {/* My Job History */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-white font-semibold text-lg mb-4">My Recent Jobs</h3>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {completedJobs
            .filter(job => job.assignedTechnicianIds?.includes(user.id))
            .slice(0, 10)
            .map(job => (
              <button
                key={job.id}
                onClick={() => openJobDetails(job)}
                className="w-full text-left bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-medium text-lg">{job.vehicleDescription}</p>
                      {job.color && (
                        <span className="px-2 py-1 bg-white/10 text-white text-xs rounded-full font-medium">
                          {job.color}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                      <p className="text-gray-300">Stock: <span className="text-white font-medium">{job.stockNumber}</span></p>
                      <p className="text-gray-300">VIN: <span className="font-mono text-white text-xs">{job.vin?.slice(-6) || 'N/A'}</span></p>
                    </div>
                    <div className="flex items-center gap-4 text-sm mb-2">
                      <span className="text-blue-300 font-medium">{job.serviceType}</span>
                      {job.priority && job.priority !== 'Normal' && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          job.priority === 'Urgent' ? 'bg-red-500/20 text-red-400' :
                          job.priority === 'High' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {job.priority}
                        </span>
                      )}
                    </div>
                    {job.salesPerson && (
                      <p className="text-blue-300 text-sm mb-1">Sales: {job.salesPerson}</p>
                    )}
                    <div className="text-xs text-gray-400">
                      {job.startTime && (
                        <p>Started: {DateUtils.formatDateTime(job.startTime)}</p>
                      )}
                      {job.completedAt && (
                        <p>Completed: {DateUtils.formatDateTime(job.completedAt)}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      job.status === 'In Progress' 
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30' 
                        : 'bg-green-500/20 text-green-400 border border-green-400/30'
                    }`}>
                      {job.status}
                    </span>
                    {job.completedAt && (job.startTime || job.startedAt) && (
                      <div className="mt-2">
                        <p className="text-green-400 font-bold text-lg">
                          {DateUtils.formatDuration(
                            DateUtils.calculateDuration(
                              job.startTime || job.startedAt, 
                              job.completedAt
                            )
                          )}
                        </p>
                        <p className="text-gray-400 text-xs">Total Time</p>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          {completedJobs.filter(job => job.assignedTechnicianIds?.includes(user.id)).length === 0 && (
            <p className="text-gray-400 text-center py-4">No jobs completed yet</p>
          )}
        </div>
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 w-full max-w-3xl border border-white/20 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-white font-semibold text-xl">Job Details</h4>
              <button onClick={closeJobDetails} className="text-white/80 hover:text-white text-2xl">✕</button>
            </div>
            
            {loading && <p className="text-gray-300">Loading job details…</p>}
            {error && <p className="text-red-300">{error}</p>}
            
            {jobDetails && (
              <div className="space-y-6">
                {/* Vehicle & Job Information */}
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-white font-medium mb-3">Vehicle Information</h5>
                      <p className="text-white font-medium text-xl mb-2">{selectedJob.vehicleDescription}</p>
                      <div className="space-y-2">
                        <p className="text-gray-300 text-sm">VIN: <span className="font-mono text-white">{jobDetails.job?.vin}</span></p>
                        <p className="text-gray-300 text-sm">Stock Number: <span className="text-white">{jobDetails.job?.stockNumber}</span></p>
                        {jobDetails.job?.color && (
                          <p className="text-gray-300 text-sm">Color: <span className="text-white font-medium">{jobDetails.job.color}</span></p>
                        )}
                        <p className="text-gray-300 text-sm">Service Type: <span className="text-blue-300 font-medium">{jobDetails.job?.serviceType}</span></p>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300 text-sm">Priority:</span>
                          <select 
                            value={jobDetails.job?.priority || 'Normal'} 
                            onChange={(e) => handlePriorityChange(e.target.value)}
                            className="bg-white/10 text-white border border-white/20 rounded px-2 py-1 text-sm"
                          >
                            <option value="Low" className="bg-gray-800">Low</option>
                            <option value="Normal" className="bg-gray-800">Normal</option>
                            <option value="High" className="bg-gray-800">High</option>
                            <option value="Urgent" className="bg-gray-800">Urgent</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300 text-sm">Sales Person:</span>
                          <input 
                            type="text"
                            value={jobDetails.job?.salesPerson || ''}
                            onChange={(e) => handleSalesPersonChange(e.target.value)}
                            placeholder="Enter sales person name"
                            className="bg-white/10 text-white border border-white/20 rounded px-2 py-1 text-sm flex-1"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-white font-medium mb-3">My Performance</h5>
                      <p className={`text-lg font-medium mb-2 ${
                        jobDetails.job?.status === 'In Progress' ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        Status: {jobDetails.job?.status}
                      </p>
                      {jobDetails.job?.startTime && (
                        <div className="space-y-2">
                          <p className="text-gray-300 text-sm">
                            Started: {new Date(jobDetails.job.startTime).toLocaleString()}
                          </p>
                          {jobDetails.job?.status === 'In Progress' && (
                            <div>
                              <p className="text-gray-300 text-sm">Working for:</p>
                              <LiveTimer startTime={jobDetails.job.startTime} className="text-yellow-300 font-mono text-2xl" />
                            </div>
                          )}
                          {jobDetails.job?.completedAt && (
                            <div>
                              <p className="text-gray-300 text-sm">
                                Completed: {DateUtils.formatDate(jobDetails.job.completedAt)}
                              </p>
                              <p className="text-green-300 text-lg font-medium">
                                Total Time: {DateUtils.formatDuration(
                                  DateUtils.calculateDuration(jobDetails.job.startTime, jobDetails.job.completedAt)
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Job Timeline */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h5 className="text-white font-medium mb-3">Job Timeline</h5>
                  <ul className="space-y-3 max-h-48 overflow-auto pr-2">
                    {/* Job Started Event */}
                    {jobDetails.job?.startTime && (
                      <li className="text-gray-300 text-sm border-l-2 border-green-400 pl-3">
                        <span className="text-green-400 font-medium">Job Started</span>
                        <span className="text-gray-400 block text-xs mt-1">
                          {DateUtils.formatDateTime(jobDetails.job.startTime)}
                          {jobDetails.job?.technicianName && ` • ${jobDetails.job.technicianName}`}
                        </span>
                      </li>
                    )}
                    
                    {/* Job Completed Event */}
                    {jobDetails.job?.completedAt && (
                      <li className="text-gray-300 text-sm border-l-2 border-blue-400 pl-3">
                        <span className="text-blue-400 font-medium">Job Completed</span>
                        <span className="text-gray-400 block text-xs mt-1">
                          {DateUtils.formatDateTime(jobDetails.job.completedAt)}
                          {jobDetails.job?.duration && ` • Duration: ${DateUtils.formatDuration(jobDetails.job.duration)}`}
                        </span>
                      </li>
                    )}
                    
                    {/* Other Timeline Events */}
                    {(jobDetails.events || []).map((ev, idx) => {
                      const validDate = DateUtils.getValidDate(ev.timestamp || ev.at);
                      return (
                        <li key={idx} className="text-gray-300 text-sm border-l-2 border-gray-500 pl-3">
                          <span className="text-white/90 font-medium">
                            {ev.type?.replace('_', ' ')?.replace(/\b\w/g, l => l.toUpperCase()) || 'Event'}
                          </span>
                          <span className="text-gray-400 block text-xs mt-1">
                            {validDate ? DateUtils.formatDateTime(validDate) : 'Invalid Date'}
                            {ev.userName && ` • ${ev.userName}`}
                          </span>
                        </li>
                      );
                    })}
                    
                    {(!jobDetails.job?.startTime && (!jobDetails.events || jobDetails.events.length === 0)) && (
                      <li className="text-gray-400 text-sm">No timeline events recorded</li>
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
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [serviceType, setServiceType] = useState('Detail');
  const [salesPerson, setSalesPerson] = useState('');

  const serviceTypes = ['Detail', 'Delivery', 'Rewash', 'Lot Car', 'FCTP', 'Cleanup', 'Showroom'];

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
    if (!selectedVehicle) return;
    
    try {
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
        timestamp: now.toISOString()
      };
      
      await V2.post('/jobs', newJob);
      alert('Job started successfully!');
      setSelectedVehicle(null);
      setSearchTerm('');
      setSalesPerson('');
      
      // Refresh job data and navigate to dashboard
      if (onJobCreated) {
        await onJobCreated();
      }
    } catch (err) {
      alert('Failed to start job: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Scan Option */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-white font-semibold text-lg mb-4">Scan VIN Barcode</h3>
        <button 
          onClick={() => setShowScanner(true)}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          <span>Scan VIN</span>
        </button>
      </div>

      {/* Search Option */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-white font-semibold text-lg mb-4">Search Vehicle</h3>
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Enter VIN or Stock Number"
            className="w-full bg-white/10 text-white placeholder-gray-400 border border-white/20 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-2">
            <button 
              type="submit"
              disabled={isSearching || !searchTerm.trim()}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-500"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
            {searchTerm && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); }}
                className="px-4 py-3 rounded-lg border border-white/20 text-white bg-white/10 hover:bg-white/20"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Search Results */}
        {hasSearched && searchResults.length === 0 && !isSearching && (
          <p className="mt-4 text-gray-300">No vehicles found. Check VIN/Stock and try again.</p>
        )}
        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-white font-medium">Search Results</h4>
            {searchResults.map((vehicle, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedVehicle?.vin === vehicle.vin 
                    ? 'bg-blue-500/30 border border-blue-400' 
                    : 'bg-white/5 hover:bg-white/10 border border-white/10'
                }`}
                onClick={() => setSelectedVehicle(vehicle)}
              >
                <p className="text-white font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                <p className="text-gray-300 text-sm">VIN: {vehicle.vin}</p>
                <p className="text-gray-300 text-sm">Stock: {vehicle.stockNumber}</p>
              </div>
            ))}
          </div>
        )}

        {/* Selected Vehicle & Job Creation */}
        {selectedVehicle && (
          <div className="mt-6 bg-blue-500/20 backdrop-blur-lg rounded-lg p-4 border border-blue-400/30">
            <h4 className="text-blue-100 font-semibold mb-3">Selected Vehicle</h4>
            <p className="text-white text-lg font-bold">{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</p>
            <p className="text-blue-200">Stock: {selectedVehicle.stockNumber}</p>
            <p className="text-blue-200">VIN: {selectedVehicle.vin}</p>
            
            <div className="mt-4">
              <label className="block text-blue-100 font-medium mb-2">Service Type</label>
              <select 
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full bg-white/10 text-white border border-white/20 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {serviceTypes.map(type => (
                  <option key={type} value={type} className="bg-gray-800">{type}</option>
                ))}
              </select>
            </div>
            
            <div className="mt-4">
              <label className="block text-blue-100 font-medium mb-2">Sales Person (Optional)</label>
              <input
                type="text"
                value={salesPerson}
                onChange={(e) => setSalesPerson(e.target.value)}
                placeholder="Enter sales person name"
                className="w-full bg-white/10 text-white placeholder-gray-400 border border-white/20 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button 
              onClick={handleCreateJob}
              className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Start Job
            </button>
          </div>
        )}
      </div>

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 w-full max-w-md border border-white/20">
            <h3 className="text-white font-semibold text-lg mb-4">Scan VIN Barcode</h3>
            <VinScanner onSuccess={onScanSuccess} onClose={() => setShowScanner(false)} />
            <button 
              onClick={() => setShowScanner(false)}
              className="w-full mt-4 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Manager Dashboard Component with Auto-refresh
function ManagerDashboard({ jobs, users, currentUser, onRefresh }) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh every 30 seconds if enabled and no modal is open
  useEffect(() => {
    if (!autoRefresh || selectedJob) return; // Pause when modal is open
    const interval = setInterval(() => {
      onRefresh?.();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh, selectedJob]);

  // Filter jobs based on date range using Eastern Time
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Check multiple possible date fields for comprehensive coverage
      const possibleDates = [
        job.date,
        job.startTime,
        job.startedAt,
        job.createdAt,
        job.timestamp,
        job.completedAt
      ].filter(d => d && DateUtils.isValidDate(d));
      
      if (possibleDates.length === 0) return dateFilter === 'all';
      
      // Use the most relevant date (prefer start times, then creation times)
      const jobDate = job.startTime || job.startedAt || job.createdAt || 
                     job.timestamp || job.date || possibleDates[0];
      
      switch (dateFilter) {
        case 'today':
          return DateUtils.isToday(jobDate);
        case 'week':
          return DateUtils.isThisWeek(jobDate);
        case 'month':
          return DateUtils.isThisMonth(jobDate);
        case 'all':
        default:
          return true;
      }
    });
  }, [jobs, dateFilter]);

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
  // Calculate statistics with better validation
  const stats = useMemo(() => {
    const todayJobs = jobs.filter(job => {
      const jobDate = job.date || job.startTime || job.createdAt || job.timestamp;
      return DateUtils.isToday(jobDate);
    });
    
    const activeJobs = filteredJobs.filter(j => j.status === 'In Progress');
    const completedJobs = filteredJobs.filter(j => j.status === 'Completed');
    const detailers = Object.values(users || {}).filter(u => u.role === 'detailer');
    
    return {
      totalFiltered: filteredJobs.length,
      totalToday: todayJobs.length,
      active: activeJobs.length,
      completed: completedJobs.length,
      detailers: detailers.length
    };
  }, [filteredJobs, jobs, users]);

  return (
    <div className="space-y-6">
      {/* Date Filter & Controls */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h4 className="text-white font-medium">Dashboard View</h4>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                autoRefresh 
                  ? 'bg-green-600 text-white' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => onRefresh?.()}
              className="px-2 py-1 text-xs rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white"
            >
              🔄 Refresh
            </button>
          </div>
          <div className="flex gap-2">
            {[
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' },
              { key: 'all', label: 'All Time' }
            ].map(option => (
              <button
                key={option.key}
                onClick={() => setDateFilter(option.key)}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  dateFilter === option.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 flex justify-between items-center">
          <span className="text-sm text-gray-400">
            Showing {stats.totalFiltered} jobs for {dateFilter === 'all' ? 'all time' : dateFilter}
          </span>
          <span className="text-xs text-gray-500">
            Last updated: {DateUtils.formatDate(new Date(), { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            })}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <h4 className="text-gray-300 text-sm font-medium">Filtered Jobs</h4>
          <p className="text-3xl font-bold text-white">{stats.totalFiltered}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <h4 className="text-gray-300 text-sm font-medium">Active Jobs</h4>
          <p className="text-3xl font-bold text-yellow-400">{stats.active}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <h4 className="text-gray-300 text-sm font-medium">Completed</h4>
          <p className="text-3xl font-bold text-green-400">{stats.completed}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <h4 className="text-gray-300 text-sm font-medium">Detailers</h4>
          <p className="text-3xl font-bold text-blue-400">{stats.detailers}</p>
        </div>
      </div>

      {/* Active Jobs with Live Timers */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-white font-semibold text-lg mb-4">Jobs In Progress</h3>
        <div className="space-y-3">
          {filteredJobs.filter(job => job.status === 'In Progress').map(job => (
            <button
              key={job.id}
              onClick={() => openJobDetails(job)}
              className="w-full text-left bg-yellow-500/10 rounded-lg p-4 border border-yellow-400/20 hover:bg-yellow-500/20 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-white font-medium">{job.vehicleDescription}</p>
                  <p className="text-gray-300 text-sm">Stock: {job.stockNumber} • VIN: {job.vin}</p>
                  <p className="text-gray-300 text-sm">{job.technicianName} • {job.serviceType}</p>
                  {job.salesPerson && (
                    <p className="text-blue-300 text-sm">Sales: {job.salesPerson}</p>
                  )}
                  <p className="text-gray-400 text-xs mt-1">Click for details</p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-400/30">
                    In Progress
                  </span>
                  {(job.startTime || job.startedAt) && (
                    <div className="mt-2">
                      <LiveTimer startTime={job.startTime || job.startedAt} className="text-yellow-300 font-mono text-lg" />
                      <p className="text-gray-400 text-xs">
                        Started: {DateUtils.formatDate(job.startTime || job.startedAt, { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
          {filteredJobs.filter(job => job.status === 'In Progress').length === 0 && (
            <p className="text-gray-400 text-center py-4">No jobs in progress</p>
          )}
        </div>
      </div>

      {/* Recent Completed Jobs */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-white font-semibold text-lg mb-4">Recent Completed Jobs</h3>
        <div className="space-y-3">
          {filteredJobs.filter(job => job.status === 'Completed').slice(0, 5).map(job => (
            <button
              key={job.id}
              onClick={() => openJobDetails(job)}
              className="w-full text-left bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-medium">{job.vehicleDescription}</p>
                  <p className="text-gray-300 text-sm">Stock: {job.stockNumber}</p>
                  <p className="text-gray-300 text-sm">{job.technicianName} • {job.serviceType}</p>
                  {job.salesPerson && (
                    <p className="text-blue-300 text-sm">Sales: {job.salesPerson}</p>
                  )}
                  <p className="text-gray-400 text-xs mt-1">Click for details</p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-400/30">
                    Completed
                  </span>
                  {job.completedAt && (
                    <div className="text-xs mt-1">
                      <p className="text-gray-400">
                        Completed: {DateUtils.formatDate(job.completedAt, { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      {(job.startTime || job.startedAt) && (
                        <p className="text-gray-500">
                          Duration: {DateUtils.formatDuration(
                            DateUtils.calculateDuration(
                              job.startTime || job.startedAt, 
                              job.completedAt
                            )
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 w-full max-w-4xl border border-white/20 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-white font-semibold text-xl">Job Details</h4>
              <button onClick={closeJobDetails} className="text-white/80 hover:text-white text-2xl">✕</button>
            </div>
            
            {loading && <p className="text-gray-300">Loading job details…</p>}
            {error && <p className="text-red-300">{error}</p>}
            
            {jobDetails && (
              <div className="space-y-6">
                {/* Vehicle & Job Information */}
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-white font-medium mb-3">Vehicle Information</h5>
                      <p className="text-white font-medium text-xl mb-2">{selectedJob.vehicleDescription}</p>
                      <div className="space-y-1">
                        <p className="text-gray-300 text-sm">VIN: {jobDetails.job?.vin}</p>
                        <p className="text-gray-300 text-sm">Stock Number: {jobDetails.job?.stockNumber}</p>
                        <p className="text-gray-300 text-sm">Service Type: {jobDetails.job?.serviceType}</p>
                        {jobDetails.job?.salesPerson && (
                          <p className="text-blue-300 text-sm">Sales Person: {jobDetails.job.salesPerson}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h5 className="text-white font-medium mb-3">Job Status & Timing</h5>
                      <p className={`text-lg font-medium mb-2 ${
                        jobDetails.job?.status === 'In Progress' ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        Status: {jobDetails.job?.status}
                      </p>
                      {jobDetails.job?.startTime && (
                        <div className="space-y-2">
                          <p className="text-gray-300 text-sm">
                            Started: {new Date(jobDetails.job.startTime).toLocaleString()}
                          </p>
                          {jobDetails.job?.status === 'In Progress' && (
                            <div>
                              <p className="text-gray-300 text-sm">Current Duration:</p>
                              <LiveTimer startTime={jobDetails.job.startTime} className="text-yellow-300 font-mono text-2xl" />
                            </div>
                          )}
                          {jobDetails.job?.completedAt && (
                            <div>
                              <p className="text-gray-300 text-sm">
                                Completed: {new Date(jobDetails.job.completedAt).toLocaleString()}
                              </p>
                              <p className="text-gray-300 text-sm">
                                Total Duration: {Math.floor((new Date(jobDetails.job.completedAt) - new Date(jobDetails.job.startTime)) / (1000 * 60))} minutes
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Management Actions */}
                  {jobDetails.job?.status === 'In Progress' && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                      <button
                        onClick={async () => { 
                          try { 
                            const jobId = jobDetails.job?.id || selectedJob?.id || selectedJob?._id;
                            if (!jobId) return alert('Job ID not found');
                            await V2.put(`/jobs/${jobId}/stop`, { userId: currentUser?.id }); 
                            await onRefresh?.(); 
                            closeJobDetails(); 
                            alert('Timer stopped');
                          } catch (e) { 
                            alert('Stop failed: ' + (e.response?.data?.error || e.message)); 
                          } 
                        }}
                        className="px-4 py-2 rounded bg-yellow-600 hover:bg-yellow-500 text-white text-sm"
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
                            closeJobDetails(); 
                            alert('Job marked complete');
                          } catch (e) { 
                            alert('Complete failed: ' + (e.response?.data?.error || e.message)); 
                          } 
                        }}
                        className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-white text-sm"
                      >
                        Mark Complete
                      </button>
                    </div>
                  )}
                </div>

                {/* Enhanced Details & Timeline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h5 className="text-white font-medium mb-3">Job Details</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Technician:</span>
                        <span className="text-gray-300 text-sm">{selectedJob.technicianName || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Priority:</span>
                        <span className="text-gray-300 text-sm">{jobDetails.job?.priority || 'Normal'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Location:</span>
                        <span className="text-gray-300 text-sm">{jobDetails.job?.location || 'Detail Bay'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-sm">Vehicle Type:</span>
                        <span className="text-gray-300 text-sm">
                          {selectedJob.vehicleDescription?.toLowerCase().includes('new') ? 'New' : 'Used'}
                        </span>
                      </div>
                      {jobDetails.job?.notes && (
                        <div>
                          <span className="text-gray-400 text-sm block">Notes:</span>
                          <span className="text-gray-300 text-sm">{jobDetails.job.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h5 className="text-white font-medium mb-3">Job Timeline</h5>
                    <ul className="space-y-2 max-h-48 overflow-auto pr-2">
                      {(jobDetails.events || []).filter(ev => ev && ev.type).map((ev, idx) => (
                        <li key={idx} className="text-gray-300 text-sm">
                          <span className="text-white/90 font-medium">{ev.type}</span>
                          <span className="text-gray-400 block text-xs">
                            {DateUtils.formatDate(ev.timestamp) || 'Unknown time'}
                            {ev.userName && ` • ${ev.userName}`}
                          </span>
                        </li>
                      ))}
                      {(!jobDetails.events || jobDetails.events.length === 0) && (
                        <li className="text-gray-400 text-sm">No timeline events recorded</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
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
  
  // Filter states
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    serviceType: '',
    vehicleType: '', // new/used
    detailer: '',
    status: ''
  });

  // Get unique values for filter options
  const filterOptions = useMemo(() => {
    const serviceTypes = [...new Set(jobs.map(j => j.serviceType).filter(Boolean))];
    const detailers = Object.values(users || {}).filter(u => u.role === 'detailer');
    const statuses = [...new Set(jobs.map(j => j.status).filter(Boolean))];
    
    return { serviceTypes, detailers, statuses };
  }, [jobs, users]);

  // Filter jobs based on current filter settings
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
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
  }, [jobs, filters]);

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
      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-white font-medium">Filters</h4>
          <button
            onClick={clearFilters}
            className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20"
          >
            Clear All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-gray-300 text-xs mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full bg-white/10 text-white text-sm border border-white/20 rounded py-2 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 text-xs mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full bg-white/10 text-white text-sm border border-white/20 rounded py-2 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 text-xs mb-1">Service Type</label>
            <select
              value={filters.serviceType}
              onChange={e => setFilters(prev => ({ ...prev, serviceType: e.target.value }))}
              className="w-full bg-white/10 text-white text-sm border border-white/20 rounded py-2 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" className="bg-gray-800">All Types</option>
              {filterOptions.serviceTypes.map(type => (
                <option key={type} value={type} className="bg-gray-800">{type}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-gray-300 text-xs mb-1">Vehicle Type</label>
            <select
              value={filters.vehicleType}
              onChange={e => setFilters(prev => ({ ...prev, vehicleType: e.target.value }))}
              className="w-full bg-white/10 text-white text-sm border border-white/20 rounded py-2 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" className="bg-gray-800">All Vehicles</option>
              <option value="new" className="bg-gray-800">New</option>
              <option value="used" className="bg-gray-800">Used</option>
            </select>
          </div>
          
          <div>
            <label className="block text-gray-300 text-xs mb-1">Detailer</label>
            <select
              value={filters.detailer}
              onChange={e => setFilters(prev => ({ ...prev, detailer: e.target.value }))}
              className="w-full bg-white/10 text-white text-sm border border-white/20 rounded py-2 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" className="bg-gray-800">All Detailers</option>
              {filterOptions.detailers.map(detailer => (
                <option key={detailer.id} value={detailer.id} className="bg-gray-800">{detailer.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-gray-300 text-xs mb-1">Status</label>
            <select
              value={filters.status}
              onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full bg-white/10 text-white text-sm border border-white/20 rounded py-2 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" className="bg-gray-800">All Status</option>
              {filterOptions.statuses.map(status => (
                <option key={status} value={status} className="bg-gray-800">{status}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-3 text-sm text-gray-400">
          Showing {filteredJobs.length} of {jobs.length} jobs
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-white font-semibold text-lg mb-4">All Jobs</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredJobs.map(job => (
          <button
            key={job.id}
            onClick={() => openDetails(job)}
            className="w-full text-left bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-white font-medium text-lg">{job.vehicleDescription}</p>
                  {job.color && (
                    <span className="px-2 py-1 bg-white/10 text-white text-xs rounded-full font-medium">
                      {job.color}
                    </span>
                  )}
                  {job.priority && job.priority !== 'Normal' && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      job.priority === 'Urgent' ? 'bg-red-500/20 text-red-400' :
                      job.priority === 'High' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {job.priority}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                  <p className="text-gray-300">Stock: <span className="text-white font-medium">{job.stockNumber}</span></p>
                  <p className="text-gray-300">VIN: <span className="font-mono text-white text-xs">{job.vin?.slice(-6) || 'N/A'}</span></p>
                </div>
                <div className="flex items-center gap-4 text-sm mb-2">
                  <span className="text-white font-medium">{job.technicianName}</span>
                  <span className="text-blue-300 font-medium">{job.serviceType}</span>
                </div>
                {job.salesPerson && (
                  <p className="text-blue-300 text-sm mb-2">Sales: {job.salesPerson}</p>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                  {job.startTime && (
                    <p>Started: {DateUtils.formatDateTime(job.startTime)}</p>
                  )}
                  {job.completedAt ? (
                    <p className="text-green-400">Finished: {DateUtils.formatDateTime(job.completedAt)}</p>
                  ) : (
                    <p>Created: {DateUtils.formatDate(job.date || job.createdAt)}</p>
                  )}
                </div>
              </div>
              <div className="text-right ml-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  job.status === 'In Progress' 
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30' 
                    : 'bg-green-500/20 text-green-400 border border-green-400/30'
                }`}>
                  {job.status}
                </span>
                {job.status === 'In Progress' && job.startTime && (
                  <div className="mt-2">
                    <LiveTimer startTime={job.startTime} className="text-yellow-300 font-mono text-lg font-bold" />
                    <p className="text-gray-400 text-xs mt-1">Current Time</p>
                  </div>
                )}
                {job.status === 'Completed' && job.completedAt && (job.startTime || job.startedAt) && (
                  <div className="mt-2">
                    <p className="text-green-400 font-bold text-lg">
                      {DateUtils.formatDuration(
                        DateUtils.calculateDuration(
                          job.startTime || job.startedAt, 
                          job.completedAt
                        )
                      )}
                    </p>
                    <p className="text-gray-400 text-xs">Total Time</p>
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 w-full max-w-2xl border border-white/20">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-white font-semibold text-lg">Job Details</h4>
              <button onClick={closeDetails} className="text-white/80 hover:text-white">✕</button>
            </div>
            {loading && <p className="text-gray-300">Loading…</p>}
            {error && <p className="text-red-300">{error}</p>}
            {jobDetails && (
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-white font-medium mb-2">Vehicle Information</h5>
                      <p className="text-white font-medium text-lg">{selectedJob.vehicleDescription}</p>
                      <p className="text-gray-300 text-sm">VIN: {jobDetails.job?.vin}</p>
                      <p className="text-gray-300 text-sm">Stock Number: {jobDetails.job?.stockNumber}</p>
                      <p className="text-gray-300 text-sm">Service Type: {jobDetails.job?.serviceType}</p>
                      {jobDetails.job?.salesPerson && (
                        <p className="text-blue-300 text-sm">Sales Person: {jobDetails.job.salesPerson}</p>
                      )}
                    </div>
                    <div>
                      <h5 className="text-white font-medium mb-2">Job Status & Timing</h5>
                      <p className={`text-sm font-medium ${
                        jobDetails.job?.status === 'In Progress' ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        Status: {jobDetails.job?.status}
                      </p>
                      {jobDetails.job?.startTime && (
                        <div className="space-y-1">
                          <p className="text-gray-300 text-sm">
                            Started: {new Date(jobDetails.job.startTime).toLocaleString()}
                          </p>
                          {jobDetails.job?.status === 'In Progress' && (
                            <div>
                              <p className="text-gray-300 text-sm">Current Duration:</p>
                              <LiveTimer startTime={jobDetails.job.startTime} className="text-yellow-300 font-mono text-xl" />
                            </div>
                          )}
                          {jobDetails.job?.completedAt && (
                            <p className="text-gray-300 text-sm">
                              Completed: {new Date(jobDetails.job.completedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
                      <p className="text-gray-400 text-xs mt-2">Created: {jobDetails.job?.date}</p>
                    </div>
                  </div>
                  {jobDetails.job?.status !== 'completed' && (
                    <div className="flex gap-2 mt-3">
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
                        className="px-3 py-2 rounded bg-yellow-600 hover:bg-yellow-500 text-white text-sm"
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
                        className="px-3 py-2 rounded bg-green-600 hover:bg-green-500 text-white text-sm"
                      >
                        Mark Complete
                      </button>
                      <button
                        onClick={async () => { 
                          try { 
                            const jobId = jobDetails.job?.id || selectedJob?.id || selectedJob?._id;
                            if (!jobId) return alert('Job ID not found');
                            await V2.put(`/jobs/${jobId}/join`, { userId: currentUser?.id }); 
                            await onRefresh?.(); 
                            alert('Assigned to you'); 
                          } catch (e) { 
                            alert('Assign failed: ' + (e.response?.data?.error || e.message)); 
                          } 
                        }}
                        className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm"
                      >
                        Assign Me
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h5 className="text-white font-medium mb-2">Technicians</h5>
                    <ul className="space-y-1">
                      {(jobDetails.technicians || []).map(t => (
                        <li key={t.userId} className="text-gray-300 text-sm">• {t.userName || t.name || t.userId}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <h5 className="text-white font-medium mb-2">Timeline</h5>
                    <ul className="space-y-3 max-h-56 overflow-auto pr-2">
                      {/* Job Started Event */}
                      {jobDetails.job?.startTime && (
                        <li className="text-gray-300 text-sm border-l-2 border-green-400 pl-3">
                          <span className="text-green-400 font-medium">Job Started</span>
                          <span className="text-gray-400 block text-xs mt-1">
                            {DateUtils.formatDateTime(jobDetails.job.startTime)}
                            {jobDetails.job?.technicianName && ` • ${jobDetails.job.technicianName}`}
                          </span>
                        </li>
                      )}
                      
                      {/* Job Completed Event */}
                      {jobDetails.job?.completedAt && (
                        <li className="text-gray-300 text-sm border-l-2 border-blue-400 pl-3">
                          <span className="text-blue-400 font-medium">Job Completed</span>
                          <span className="text-gray-400 block text-xs mt-1">
                            {DateUtils.formatDateTime(jobDetails.job.completedAt)}
                            {jobDetails.job?.duration && ` • Duration: ${DateUtils.formatDuration(jobDetails.job.duration)}`}
                          </span>
                        </li>
                      )}
                      
                      {/* Other Timeline Events */}
                      {(jobDetails.events || []).map((ev, idx) => {
                        const validDate = DateUtils.getValidDate(ev.timestamp || ev.at);
                        return (
                          <li key={idx} className="text-gray-300 text-sm border-l-2 border-gray-500 pl-3">
                            <span className="text-white/90 font-medium">
                              {ev.type?.replace('_', ' ')?.replace(/\b\w/g, l => l.toUpperCase()) || 'Event'}
                            </span>
                            <span className="text-gray-400 block text-xs mt-1">
                              {validDate ? DateUtils.formatDateTime(validDate) : 'Invalid Date'}
                              {ev.userName && ` • ${ev.userName}`}
                            </span>
                          </li>
                        );
                      })}
                      
                      {(!jobDetails.job?.startTime && (!jobDetails.events || jobDetails.events.length === 0)) && (
                        <li className="text-gray-400 text-sm">No timeline events recorded</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// Users View Component
function UsersView({ users, detailers, onDeleteUser }) {
  const [newUser, setNewUser] = useState({ name: '', pin: '', role: 'detailer' });
  const [isAdding, setIsAdding] = useState(false);

  const handleAddDetailer = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.pin) return;
    if (newUser.pin.length !== 4) {
      alert('PIN must be exactly 4 digits');
      return;
    }

    setIsAdding(true);
    try {
      await V2.post('/users', {
        name: newUser.name,
        pin: newUser.pin,
        role: newUser.role
      });
      setNewUser({ name: '', pin: '', role: 'detailer' });
      alert('User added successfully');
    } catch (err) {
      alert('Failed to add user: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New User */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-white font-semibold text-lg mb-4">Add New Team Member</h3>
        <form onSubmit={handleAddDetailer} className="space-y-4">
          <input
            type="text"
            value={newUser.name}
            onChange={(e) => setNewUser({...newUser, name: e.target.value})}
            placeholder="Full Name"
            className="w-full bg-white/10 text-white placeholder-gray-400 border border-white/20 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="text"
            value={newUser.pin}
            onChange={(e) => setNewUser({...newUser, pin: e.target.value})}
            placeholder="4-Digit PIN"
            maxLength="4"
            className="w-full bg-white/10 text-white placeholder-gray-400 border border-white/20 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <div>
            <label className="block text-gray-300 text-sm mb-2">Role</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              className="w-full bg-white/10 text-white border border-white/20 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="detailer" className="bg-gray-800">Detailer</option>
              <option value="manager" className="bg-gray-800">Manager</option>
            </select>
          </div>
          <button 
            type="submit"
            disabled={isAdding}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-500"
          >
            {isAdding ? 'Adding...' : 'Add Member'}
          </button>
        </form>
      </div>

      {/* Current Detailers */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-white font-semibold text-lg mb-4">Current Detailers</h3>
        <div className="space-y-3">
          {detailers.map(detailer => (
            <div key={detailer.id || detailer._id} className="bg-white/5 rounded-lg p-4 border border-white/10 flex justify-between items-center">
              <div>
                <p className="text-white font-medium">{detailer.name}</p>
                <p className="text-gray-300 text-sm">PIN: {detailer.pin}</p>
              </div>
              <button 
                onClick={() => onDeleteUser(detailer.id || detailer._id)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Enhanced Reports View Component with Interactive Analytics
function ReportsView({ jobs, users }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [selectedDetailer, setSelectedDetailer] = useState(null);
  const [selectedServiceType, setSelectedServiceType] = useState(null);
  const [drillDownJobs, setDrillDownJobs] = useState([]);
  const [showDrillDown, setShowDrillDown] = useState(false);

  const filtered = useMemo(() => {
    if (!start && !end) return jobs;
    const s = start ? new Date(start) : null;
    const e = end ? new Date(end) : null;
    return jobs.filter(j => {
      const jobDate = new Date(j.date || j.startTime || j.createdAt);
      if (s && jobDate < s) return false;
      if (e && jobDate > e) return false;
      return true;
    });
  }, [jobs, start, end]);

  const reportData = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const last7Days = jobs.filter(j => {
      const jobDate = new Date(j.date);
      const daysDiff = (new Date(today) - jobDate) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    });
    
    const serviceTypeCounts = filtered.reduce((acc, job) => {
      acc[job.serviceType] = (acc[job.serviceType] || 0) + 1;
      return acc;
    }, {});

    // Enhanced performance analysis with time focus
    const detailerPerformance = {};
    const serviceTypePerformance = {};
    const userMap = Object.values(users || {}).reduce((acc, u) => ({ ...acc, [u.id]: u }), {});
    
    filtered.forEach(job => {
      const techId = job.technicianId;
      const techName = job.technicianName || userMap[techId]?.name || 'Unknown';
      const serviceType = job.serviceType || 'Unknown';
      
      // Detailer performance tracking
      if (!detailerPerformance[techId]) {
        detailerPerformance[techId] = {
          id: techId,
          name: techName,
          totalJobs: 0,
          completedJobs: 0,
          totalTime: 0,
          avgTime: 0,
          minTime: Infinity,
          maxTime: 0,
          serviceTypes: {},
          recentJobs: []
        };
      }
      
      // Service type performance tracking
      if (!serviceTypePerformance[serviceType]) {
        serviceTypePerformance[serviceType] = {
          name: serviceType,
          totalJobs: 0,
          completedJobs: 0,
          totalTime: 0,
          avgTime: 0,
          minTime: Infinity,
          maxTime: 0,
          detailers: new Set(),
          jobs: []
        };
      }
      
      detailerPerformance[techId].totalJobs++;
      serviceTypePerformance[serviceType].totalJobs++;
      serviceTypePerformance[serviceType].detailers.add(techName);
      serviceTypePerformance[serviceType].jobs.push(job);
      
      if (job.status === 'Completed') {
        detailerPerformance[techId].completedJobs++;
        serviceTypePerformance[serviceType].completedJobs++;
        
        // Calculate duration in minutes
        let duration = 0;
        if (job.duration) {
          duration = job.duration;
        } else if (job.startTime && job.completedAt) {
          duration = DateUtils.calculateDuration(job.startTime, job.completedAt);
        } else if (job.startedAt && job.completedAt) {
          duration = DateUtils.calculateDuration(job.startedAt, job.completedAt);
        }
        
        if (duration > 0) {
          detailerPerformance[techId].totalTime += duration;
          detailerPerformance[techId].minTime = Math.min(detailerPerformance[techId].minTime, duration);
          detailerPerformance[techId].maxTime = Math.max(detailerPerformance[techId].maxTime, duration);
          
          serviceTypePerformance[serviceType].totalTime += duration;
          serviceTypePerformance[serviceType].minTime = Math.min(serviceTypePerformance[serviceType].minTime, duration);
          serviceTypePerformance[serviceType].maxTime = Math.max(serviceTypePerformance[serviceType].maxTime, duration);
        }
        
        // Keep recent jobs for drill-down
        detailerPerformance[techId].recentJobs.push(job);
        if (detailerPerformance[techId].recentJobs.length > 10) {
          detailerPerformance[techId].recentJobs.shift();
        }
      }
      
      // Track service types per detailer
      const st = job.serviceType || 'Unknown';
      detailerPerformance[techId].serviceTypes[st] = (detailerPerformance[techId].serviceTypes[st] || 0) + 1;
    });

    // Calculate averages and efficiency metrics
    Object.keys(detailerPerformance).forEach(techId => {
      const perf = detailerPerformance[techId];
      if (perf.completedJobs > 0) {
        perf.avgTime = Math.round(perf.totalTime / perf.completedJobs);
        if (perf.minTime === Infinity) perf.minTime = 0;
      }
    });
    
    Object.keys(serviceTypePerformance).forEach(serviceType => {
      const perf = serviceTypePerformance[serviceType];
      if (perf.completedJobs > 0) {
        perf.avgTime = Math.round(perf.totalTime / perf.completedJobs);
        if (perf.minTime === Infinity) perf.minTime = 0;
        perf.detailers = Array.from(perf.detailers);
      }
    });

    // Daily performance
    const dailyStats = {};
    filtered.forEach(job => {
      const date = job.date;
      if (!dailyStats[date]) {
        dailyStats[date] = { total: 0, completed: 0 };
      }
      dailyStats[date].total++;
      if (job.status === 'Completed') {
        dailyStats[date].completed++;
      }
    });

    return {
      totalLast7Days: last7Days.length,
      completedLast7Days: last7Days.filter(j => j.status === 'Completed').length,
      serviceTypeCounts,
      serviceTypePerformance: Object.values(serviceTypePerformance),
      detailerPerformance: Object.values(detailerPerformance),
      dailyStats,
      filteredTotal: filtered.length,
      filteredCompleted: filtered.filter(j => j.status === 'Completed').length
    };
  }, [jobs, users, filtered]);

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

  const exportCsv = (rows, filename = 'cleanup-tracker-report.csv') => {
    if (!rows || rows.length === 0) return alert('No data to export');
    const headers = [
      'id','date','status','technicianName','serviceType','vin','stockNumber','vehicleDescription','duration','startTime','endTime'
    ];
    const esc = (v) => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const csv = [headers.join(',')]
      .concat(rows.map(r => headers.map(h => esc(r[h])).join(',')))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
                <div class="stat-value">${reportData.filteredTotal}</div>
                <div class="stat-label">Total Jobs</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${reportData.filteredCompleted}</div>
                <div class="stat-label">Completed Jobs</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${reportData.filteredTotal ? Math.round((reportData.filteredCompleted / reportData.filteredTotal) * 100) : 0}%</div>
                <div class="stat-label">Completion Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${reportData.totalLast7Days}</div>
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
                ${reportData.detailerPerformance.map(perf => {
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
            ${Object.entries(reportData.serviceTypeCounts).map(([type, count]) => {
                const percentage = reportData.filteredTotal ? Math.round((count / reportData.filteredTotal) * 100) : 0;
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
        <p>Report generated by Cleanup Tracker - Mission Ford of Dearborn</p>
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

  return (
    <div className="space-y-6">
      {/* Filters & Export */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-4">
          <div>
            <label className="block text-gray-300 text-sm mb-1">Start Date</label>
            <input type="date" value={start} onChange={e => setStart(e.target.value)} className="w-full bg-white/10 text-white border border-white/20 rounded-lg py-2 px-3 focus:outline-none" />
          </div>
          <div>
            <label className="block text-gray-300 text-sm mb-1">End Date</label>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-full bg-white/10 text-white border border-white/20 rounded-lg py-2 px-3 focus:outline-none" />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button
              onClick={() => exportCsv(filtered, 'cleanup-tracker-filtered.csv')}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm"
            >
              📊 Export CSV
            </button>
            <button
              onClick={exportPdf}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm"
            >
              📄 Export Report
            </button>
            <button
              onClick={() => { setStart(''); setEnd(''); }}
              className="px-4 py-2 rounded-lg border border-white/20 text-white bg-white/10 hover:bg-white/20 text-sm"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <h4 className="text-gray-300 text-sm font-medium">Period Total</h4>
          <p className="text-3xl font-bold text-white">{reportData.filteredTotal}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <h4 className="text-gray-300 text-sm font-medium">Completed</h4>
          <p className="text-3xl font-bold text-green-400">{reportData.filteredCompleted}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <h4 className="text-gray-300 text-sm font-medium">Completion Rate</h4>
          <p className="text-3xl font-bold text-blue-400">{reportData.filteredTotal ? Math.round((reportData.filteredCompleted / reportData.filteredTotal) * 100) : 0}%</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <h4 className="text-gray-300 text-sm font-medium">Last 7 Days</h4>
          <p className="text-3xl font-bold text-yellow-400">{reportData.totalLast7Days}</p>
        </div>
      </div>

      {/* Detailer Performance - Click to see details */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-white font-semibold text-lg mb-4">📈 Detailer Performance (Click for Details)</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left text-gray-300 text-sm font-medium py-2">Name</th>
                <th className="text-right text-gray-300 text-sm font-medium py-2">Total Jobs</th>
                <th className="text-right text-gray-300 text-sm font-medium py-2">Avg Time</th>
                <th className="text-right text-gray-300 text-sm font-medium py-2">Min Time</th>
                <th className="text-right text-gray-300 text-sm font-medium py-2">Max Time</th>
                <th className="text-right text-gray-300 text-sm font-medium py-2">Recent Jobs</th>
              </tr>
            </thead>
            <tbody>
              {reportData.detailerPerformance.map((perf, idx) => {
                const avgTimeStr = perf.avgTime ? DateUtils.formatDuration(perf.avgTime) : 'N/A';
                const minTimeStr = perf.minTime ? DateUtils.formatDuration(perf.minTime) : 'N/A';
                const maxTimeStr = perf.maxTime ? DateUtils.formatDuration(perf.maxTime) : 'N/A';
                return (
                  <tr 
                    key={idx} 
                    className="border-b border-white/10 cursor-pointer hover:bg-white/10 transition-all"
                    onClick={() => handleDetailerClick(perf.name)}
                  >
                    <td className="text-white py-3 font-medium">{perf.name}</td>
                    <td className="text-gray-300 text-right py-3">{perf.totalJobs}</td>
                    <td className="text-green-400 text-right py-3 font-medium">{avgTimeStr}</td>
                    <td className="text-blue-400 text-right py-3">{minTimeStr}</td>
                    <td className="text-red-400 text-right py-3">{maxTimeStr}</td>
                    <td className="text-gray-300 text-right py-3">{perf.recentJobs ? perf.recentJobs.length : 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Service Type Breakdown - Click to see details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-white font-semibold text-lg mb-4">🔧 Service Types (Click for Details)</h3>
          <div className="space-y-3">
            {(reportData.serviceTypePerformance || []).map((data, idx) => {
              const avgTimeStr = data.avgTime ? DateUtils.formatDuration(data.avgTime) : 'N/A';
              const minTimeStr = data.minTime ? DateUtils.formatDuration(data.minTime) : 'N/A';
              const maxTimeStr = data.maxTime ? DateUtils.formatDuration(data.maxTime) : 'N/A';
              return (
                <div 
                  key={idx} 
                  className="space-y-2 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all"
                  onClick={() => handleServiceTypeClick(data)}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">{data.name}</span>
                    <span className="text-gray-300 text-sm">{data.jobs?.length || 0} jobs</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <div className="text-green-400 font-medium">{avgTimeStr}</div>
                      <div className="text-gray-400 text-xs">Avg Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-400 font-medium">{minTimeStr}</div>
                      <div className="text-gray-400 text-xs">Min Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-400 font-medium">{maxTimeStr}</div>
                      <div className="text-gray-400 text-xs">Max Time</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-white font-semibold text-lg mb-4">📅 Daily Trends</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(reportData.dailyStats)
              .sort(([a], [b]) => new Date(b) - new Date(a))
              .slice(0, 10)
              .map(([date, stats]) => {
                const rate = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
                return (
                  <div key={date} className="flex justify-between items-center p-2 bg-white/5 rounded">
                    <span className="text-gray-300 text-sm">{new Date(date).toLocaleDateString()}</span>
                    <span className="text-white text-sm">{stats.completed}/{stats.total} ({rate}%)</span>
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
          <div className="bg-gray-900 rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto border border-white/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold text-xl">
                {selectedDetailer ? `${selectedDetailer} - Job Details` : `${selectedServiceType} - Job Details`}
              </h3>
              <button
                onClick={closeDrillDown}
                className="text-gray-400 hover:text-white transition-colors text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4 text-gray-300">
              Showing {drillDownJobs.length} jobs
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left text-gray-300 text-sm font-medium py-2">VIN</th>
                    <th className="text-left text-gray-300 text-sm font-medium py-2">Service Type</th>
                    <th className="text-left text-gray-300 text-sm font-medium py-2">Detailer</th>
                    <th className="text-left text-gray-300 text-sm font-medium py-2">Status</th>
                    <th className="text-left text-gray-300 text-sm font-medium py-2">Duration</th>
                    <th className="text-left text-gray-300 text-sm font-medium py-2">Started</th>
                    <th className="text-left text-gray-300 text-sm font-medium py-2">Completed</th>
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
                      <tr key={idx} className="border-b border-white/10 hover:bg-white/5">
                        <td className="text-white py-2 font-mono text-sm">{job.vin || 'N/A'}</td>
                        <td className="text-gray-300 py-2">{job.serviceType || 'N/A'}</td>
                        <td className="text-gray-300 py-2">{job.detailer || job.assignedTo || 'N/A'}</td>
                        <td className="text-gray-300 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            job.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {job.status || 'pending'}
                          </span>
                        </td>
                        <td className="text-gray-300 py-2 font-medium">{duration}</td>
                        <td className="text-gray-300 py-2">
                          {startTime ? DateUtils.formatDateTime(startTime) : 'N/A'}
                        </td>
                        <td className="text-gray-300 py-2">
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
  );
}

// Main Component - This is only V2, no switching
export default function FirebaseV2() {
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return <MainApp user={user} onLogout={handleLogout} />;
}

// Manager Settings View
function SettingsView({ settings, onSettingsChange }) {
  const [siteTitle, setSiteTitle] = useState(settings?.siteTitle || 'Cleanup Tracker');
  const [csvUrl, setCsvUrl] = useState(settings?.inventoryCsvUrl || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSiteTitle(settings?.siteTitle || 'Cleanup Tracker');
    setCsvUrl(settings?.inventoryCsvUrl || '');
  }, [settings]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Save site title
      await V2.put('/settings', { key: 'siteTitle', value: siteTitle });
      // Save CSV URL using settings (and also set-csv for compatibility)
      if (csvUrl?.trim()) {
        try {
          await V2.post('/vehicles/set-csv', { url: csvUrl.trim() });
        } catch (_) {
          // fallback to generic settings endpoint
          await V2.put('/settings', { key: 'inventoryCsvUrl', value: csvUrl.trim() });
        }
      }
      const res = await V2.get('/settings');
      onSettingsChange(res.data || {});
      alert('Settings saved.');
    } catch (err) {
      alert('Failed to save settings: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const saveAndImport = async () => {
    await saveSettings();
    try {
      await V2.post('/vehicles/refresh');
      alert('Inventory refreshed from CSV.');
    } catch (err) {
      alert('Refresh failed: ' + (err.response?.data?.error || err.message));
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

  return (
    <div className="space-y-6">
      <section className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-white font-semibold text-lg mb-4">General</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm mb-2">Site Title</label>
            <input
              type="text"
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              className="w-full bg-white/10 text-white placeholder-gray-400 border border-white/20 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="Cleanup Tracker"
            />
          </div>
        </div>
      </section>

      <section className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-white font-semibold text-lg mb-4">Inventory Source</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm mb-2">Google Sheets CSV URL</label>
            <input
              type="url"
              value={csvUrl}
              onChange={(e) => setCsvUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/.../pub?output=csv"
              className="w-full bg-white/10 text-white placeholder-gray-400 border border-white/20 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={saveSettings} disabled={saving} className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm disabled:bg-gray-500">Save</button>
            <button onClick={saveAndImport} disabled={saving} className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm disabled:bg-gray-500">Save & Import</button>
            <button onClick={refreshOnly} className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm">Refresh Inventory</button>
          </div>
        </div>
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
    if (user.role === 'detailer' && pin) {
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
    <div className="max-w-md mx-auto space-y-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h3 className="text-white font-semibold text-lg mb-4">My Settings</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-gray-300 text-sm mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white/10 text-white placeholder-gray-400 border border-white/20 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          {user.role === 'manager' && (
            <div>
              <label className="block text-gray-300 text-sm mb-1">New PIN (optional)</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white/10 text-white placeholder-gray-400 border border-white/20 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
          )}
          {user.role === 'detailer' && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3">
              <p className="text-amber-300 text-sm">
                🔒 PIN changes are restricted for detailers. Contact your manager to update your PIN.
              </p>
            </div>
          )}
          <button onClick={save} disabled={saving} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-500">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
