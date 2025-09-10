import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import VinScanner from '../components/VinScanner';

// REST API base
const API_BASE = process.env.REACT_APP_API_URL || '';
const V2 = axios.create({ baseURL: `${API_BASE}/api/v2` });

// Helper to build a vehicle description if needed
const toVehicleDescription = (v) => v.vehicle || `${v.year || ''} ${v.make || ''} ${v.model || ''}`.trim();

const formatTime = (date) => date ? new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';
const formatDuration = (milliseconds) => {
  if (milliseconds === null || milliseconds === undefined) return 'In Progress';
  if (milliseconds < 0) return '0s';
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  let durationString = '';
  if (hours > 0) durationString += `${hours}h `;
  if (minutes > 0) durationString += `${minutes}m `;
  if (seconds >= 0) durationString += `${seconds}s`;
  return durationString.trim() || '0s';
};

const Spinner = () => (<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>);

export default function FirebaseV2() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState({}); // map of id -> user
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');
  const [librariesLoaded, setLibrariesLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Restore persisted session
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    try {
      const saved = localStorage.getItem('v2User');
      if (saved) setUser(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Load external libraries used for exports (scanner handled by component now)
  useEffect(() => {
    const loadLibraries = async () => {
      const loadScript = (src, id) => new Promise((resolve, reject) => {
        if (document.getElementById(id)) { resolve(); return; }
        const script = document.createElement('script');
        script.src = src; script.id = id; script.onload = resolve; script.onerror = reject;
        document.body.appendChild(script);
      });
      try {
        await Promise.all([
          loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf-script'),
          loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js', 'jspdf-autotable-script'),
          loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'xlsx-script')
        ]);
        setLibrariesLoaded(true);
      } catch {
        setError('Failed to load export libraries. Reporting may not work.');
      }
    };
    loadLibraries();
  }, []);

  // Seed (idempotent) and load users; poll jobs and users periodically
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let jobsTimer; let usersTimer;

    const normalizeUsers = (arr) => {
      const map = {};
      (arr || []).forEach(u => {
        map[u._id] = {
          id: u._id,
          name: u.name,
          pin: u.pin,
          role: u.role,
          uid: u.uid,
          username: u.username,
          password: u.password,
        };
      });
      return map;
    };

    const fetchUsers = async () => {
      try {
        const res = await V2.get('/users');
        setUsers(normalizeUsers(res.data));
        // If we succeed, clear any previous loading errors
        if (error.includes('Failed to load users')) setError('');
      } catch (e) {
        // If the primary fetch fails, let's diagnose and retry.
        try {
          const diagRes = await V2.get('/diag');
          if (!diagRes.data?.dbBound) {
            setError('Critical Error: Database not bound. Please check Cloudflare D1 binding.');
            return;
          }

          // DB is bound, so let's try to force initialization and retry.
          await V2.post('/init');
          const res2 = await V2.get('/users');
          setUsers(normalizeUsers(res2.data));
          setError(prev => (prev && prev.includes('Failed to load users') ? '' : prev)); // Clear error on success
        } catch (retryErr) {
          const errorMsg = retryErr?.response?.data?.error || retryErr.message;
          setError(`Failed to load users from server. Reason: ${errorMsg}`);
          console.error("Failed to fetch users after retry:", retryErr);
        }
      }
    };

  const fetchJobs = async () => {
      const processJobs = (data) => (data || []).map(j => ({
        id: j._id,
        technicianId: j.technicianId,
        technicianName: j.technicianName,
        assignedTechnicianIds: j.assignedTechnicianIds || [],
        techTimers: j.techTimers || {},
        vin: j.vin,
        stockNumber: j.stockNumber,
        vehicleDescription: j.vehicleDescription,
        serviceType: j.serviceType,
        startTime: j.startTime ? new Date(j.startTime) : null,
        endTime: j.endTime ? new Date(j.endTime) : null,
        duration: j.duration ?? null,
        status: j.status,
        date: j.date,
        notes: j.notes,
        location: j.location,
        price: j.price,
      }));

      try {
        const res = await V2.get('/jobs');
        setJobs(processJobs(res.data));
        setError(prev => (prev && prev.includes('Failed to load jobs') ? '' : prev));
      } catch (e) {
        // If the primary fetch fails, assume the DB might not be initialized.
        // Call the /init endpoint and then retry fetching jobs.
        try {
          await V2.post('/init');
          const res2 = await V2.get('/jobs');
          setJobs(processJobs(res2.data));
          setError(prev => (prev && prev.includes('Failed to load jobs') ? '' : prev));
        } catch (initErr) {
          const errorMsg = initErr?.response?.data?.error || initErr.message;
          setError(`Failed to load jobs from server. Reason: ${errorMsg}`);
          console.error("Failed to fetch jobs after init:", initErr);
        }
      }
    };

    // initial load
    const initialLoad = async () => {
      setIsLoading(true);
      await Promise.all([fetchUsers(), fetchJobs()]);
      setIsLoading(false);
    };
    
    initialLoad();

    // polling
    jobsTimer = setInterval(fetchJobs, 5000);
    usersTimer = setInterval(fetchUsers, 15000);
    return () => { clearInterval(jobsTimer); clearInterval(usersTimer); };
  }, [error]); // effect intentionally runs only on mount

  const handleLogin = (loginId, password) => {
    const potentialUser = Object.values(users).find(u => u.username?.toLowerCase() === loginId.toLowerCase());
    if (potentialUser && potentialUser.role === 'manager' && potentialUser.password === password) { setUser(potentialUser); setError(''); try { localStorage.setItem('v2User', JSON.stringify(potentialUser)); } catch {}
    }
    else { setError('Manager login failed.'); }
  };

  const handlePinLogin = (pin) => {
    const potentialUser = Object.values(users).find(u => u.role === 'detailer' && u.pin === pin);
    if (potentialUser) { setUser(potentialUser); setError(''); try { localStorage.setItem('v2User', JSON.stringify(potentialUser)); } catch {} }
    else { setError('Invalid PIN.'); }
  };

  const handleLogout = () => { setUser(null); try { localStorage.removeItem('v2User'); } catch {} };

  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-gray-800 flex flex-col justify-center items-center text-white">
        <Spinner />
        <p className="mt-4 text-lg">Loading application...</p>
        {error && <p className="mt-2 text-red-400 text-sm max-w-md text-center">{error}</p>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {!user ? (
        <LoginScreen onLogin={handleLogin} onPinLogin={handlePinLogin} error={error} setError={setError} users={users} />
      ) : (
  <MainApp user={user} jobs={jobs} users={users} onLogout={handleLogout} librariesLoaded={librariesLoaded} error={error} />
      )}
    </div>
  );
}

function LoginScreen({ onLogin, onPinLogin, error, setError, users }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginMode, setLoginMode] = useState('detailer');

  const handleManagerSubmit = (e) => {
    e.preventDefault(); setIsLoggingIn(true); setError('');
    setTimeout(() => { onLogin(username, password); setIsLoggingIn(false); }, 500);
  };
  const handlePinInput = (digit) => { if (pin.length < 4) setPin(pin + digit); };
  const handleBackspace = () => setPin(pin.slice(0, -1));

  useEffect(() => {
    if (pin.length === 4) {
      setIsLoggingIn(true);
      setTimeout(() => { onPinLogin(pin); setIsLoggingIn(false); }, 300);
    }
  }, [pin, onPinLogin]);

  const detailers = useMemo(() => Object.values(users).filter(u => u.role === 'detailer'), [users]);

  return (
    <div className="min-h-screen bg-gray-800 flex flex-col justify-center items-center p-4">
      <h1 className="text-4xl font-bold text-white mb-8">Cleanup Tracker</h1>
      
      {error && <div className="bg-red-500 text-white p-3 rounded-md mb-6 max-w-md text-center shadow-lg">{error}</div>}

      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        <div className="flex justify-center mb-6 border-b">
          <button onClick={() => setLoginMode('detailer')} className={`px-4 py-2 text-lg font-semibold ${loginMode === 'detailer' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>
            Technician
          </button>
          <button onClick={() => setLoginMode('manager')} className={`px-4 py-2 text-lg font-semibold ${loginMode === 'manager' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>
            Manager
          </button>
        </div>

        {loginMode === 'detailer' ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Enter PIN</h2>
            <div className="flex justify-center items-center mb-4">
              <div className="w-24 h-12 bg-gray-200 rounded-md flex items-center justify-center text-2xl tracking-widest">
                {isLoggingIn ? <Spinner /> : pin.padEnd(4, '•')}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                <button key={d} onClick={() => handlePinInput(d)} className="p-4 bg-gray-200 rounded-md text-xl font-bold hover:bg-gray-300 transition-colors">
                  {d}
                </button>
              ))}
              <button onClick={() => setPin('')} className="p-4 bg-red-200 rounded-md text-xl font-bold hover:bg-red-300 transition-colors">
                Clear
              </button>
              <button onClick={() => handlePinInput(0)} className="p-4 bg-gray-200 rounded-md text-xl font-bold hover:bg-gray-300 transition-colors">
                0
              </button>
              <button onClick={handleBackspace} className="p-4 bg-yellow-200 rounded-md text-xl font-bold hover:bg-yellow-300 transition-colors">
                &larr;
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleManagerSubmit}>
            <h2 className="text-2xl font-bold text-gray-700 mb-4 text-center">Manager Login</h2>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            <div className="flex items-center justify-between">
              <button type="submit" disabled={isLoggingIn} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full flex justify-center items-center">
                {isLoggingIn ? <Spinner /> : 'Sign In'}
              </button>
            </div>
          </form>
        )}
      </div>
      <div className="mt-8 text-center">
        <h3 className="text-white text-lg mb-2">Available Technicians</h3>
        <div className="flex flex-wrap justify-center gap-2 max-w-lg">
          {detailers.length > 0 ? detailers.map(d => (
            <div key={d.id} className="bg-gray-700 text-white px-3 py-1 rounded-full text-sm">{d.name}</div>
          )) : <p className="text-gray-400">Loading technicians...</p>}
        </div>
      </div>
    </div>
  );
}

function MainApp({ user, jobs, users, onLogout, librariesLoaded, error }) {
  const [view, setView] = useState('dashboard'); // dashboard, jobs, users, reports
  const [showScanner, setShowScanner] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  const handleScanSuccess = async (vin) => {
    setShowScanner(false);
    if (user.role !== 'detailer') {
      alert(`Scanned VIN: ${vin}. Only technicians can join jobs.`);
      return;
    }
    try {
      const res = await V2.put('/vehicles/join-by-vin', { vin, userId: user.id });
      alert(`Successfully joined job for VIN ${vin}. Job ID: ${res.data.jobId}`);
    } catch (err) {
      const errorMsg = err?.response?.data?.error || err.message;
      alert(`Failed to join job for VIN ${vin}. Reason: ${errorMsg}`);
    }
  };

  const detailers = useMemo(() => Object.values(users).filter(u => u.role === 'detailer'), [users]);
  const managers = useMemo(() => Object.values(users).filter(u => u.role === 'manager'), [users]);
  const activeJobs = useMemo(() => jobs.filter(j => j.status === 'In Progress'), [jobs]);
  const completedJobs = useMemo(() => jobs.filter(j => j.status === 'Completed'), [jobs]);

  const userActiveJob = useMemo(() => {
    if (user.role !== 'detailer') return null;
    return activeJobs.find(j => {
      const timer = j.techTimers?.[user.id];
      return timer && timer.startedAt && !timer.endedAt;
    });
  }, [activeJobs, user]);

  const handleStopWork = async () => {
    if (!userActiveJob) return;
    try {
      await V2.put(`/jobs/${userActiveJob.id}/stop`, { userId: user.id });
      alert('You have stopped work on the current job.');
    } catch (err) {
      alert('Failed to stop work. Please try again.');
    }
  };

  return (
    <div className="flex h-screen bg-gray-200">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="px-8 py-6 border-b border-gray-700">
          <h2 className="text-2xl font-semibold">Cleanup Tracker</h2>
          <p className="text-gray-400">Welcome, {user.name}</p>
        </div>
        <nav className="flex-1 px-6 py-4">
          <a href="#/" onClick={() => setView('dashboard')} className={`block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 ${view === 'dashboard' ? 'bg-gray-700' : ''}`}>Dashboard</a>
          <a href="#/" onClick={() => setView('jobs')} className={`block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 ${view === 'jobs' ? 'bg-gray-700' : ''}`}>Jobs</a>
          {user.role === 'manager' && (
            <>
              <a href="#/" onClick={() => setView('users')} className={`block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 ${view === 'users' ? 'bg-gray-700' : ''}`}>Users</a>
              <a href="#/" onClick={() => setView('reports')} className={`block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 ${view === 'reports' ? 'bg-gray-700' : ''}`}>Reports</a>
            </>
          )}
        </nav>
        <div className="px-6 py-4">
          <button onClick={onLogout} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 capitalize">{view}</h1>
          {error && <div className="text-red-500 text-sm font-semibold">{error}</div>}
          <div>
            {user.role === 'detailer' && userActiveJob && (
              <button onClick={handleStopWork} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded mr-4 flex items-center">
                <span className="mr-2">Stop My Work</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              </button>
            )}
            {user.role === 'detailer' && (
              <button onClick={() => setShowScanner(true)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                Scan VIN to Join Job
              </button>
            )}
            {user.role === 'manager' && (
              <button onClick={() => setView('new-job')} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
                Create New Job
              </button>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 p-6">
          {view === 'dashboard' && <Dashboard user={user} jobs={jobs} users={users} activeJobs={activeJobs} completedJobs={completedJobs} userActiveJob={userActiveJob} />}
          {view === 'jobs' && <JobsList jobs={jobs} users={users} onJobSelect={setSelectedJob} />}
          {view === 'users' && user.role === 'manager' && <UsersList users={detailers} managers={managers} />}
          {view === 'reports' && user.role === 'manager' && <Reports jobs={jobs} users={users} librariesLoaded={librariesLoaded} />}
          {view === 'new-job' && user.role === 'manager' && <NewJobForm technicians={detailers} onJobCreated={() => setView('jobs')} />}
        </main>
      </div>

      {showScanner && <VinScanner onScanSuccess={handleScanSuccess} onCancel={() => setShowScanner(false)} />}
      {selectedJob && <JobDetailsModal job={selectedJob} users={users} onClose={() => setSelectedJob(null)} />}
    </div>
  );
}

function Dashboard({ user, jobs, users, activeJobs, completedJobs, userActiveJob }) {
  const myCompletedToday = useMemo(() => {
    if (user.role !== 'detailer') return [];
    const today = new Date().toISOString().slice(0, 10);
    return completedJobs.filter(j => j.date === today && j.assignedTechnicianIds.includes(user.id));
  }, [completedJobs, user]);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-gray-500 text-sm font-medium">Total Jobs Today</h3>
          <p className="text-3xl font-bold text-gray-800">{jobs.filter(j => j.date === new Date().toISOString().slice(0, 10)).length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-gray-500 text-sm font-medium">Active Jobs</h3>
          <p className="text-3xl font-bold text-gray-800">{activeJobs.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-gray-500 text-sm font-medium">Completed Today</h3>
          <p className="text-3xl font-bold text-gray-800">{completedJobs.filter(j => j.date === new Date().toISOString().slice(0, 10)).length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-gray-500 text-sm font-medium">Active Technicians</h3>
          <p className="text-3xl font-bold text-gray-800">{Object.keys(users).filter(id => users[id].role === 'detailer').length}</p>
        </div>
      </div>

      {user.role === 'detailer' && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">My Status</h2>
          {userActiveJob ? (
            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4" role="alert">
              <p className="font-bold">You are currently working on a job:</p>
              <p>{userActiveJob.vehicleDescription} ({userActiveJob.vin})</p>
              <p>Started at: {formatTime(userActiveJob.startTime)}</p>
            </div>
          ) : (
            <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4" role="alert">
              <p className="font-bold">You are not currently on a job.</p>
              <p>Scan a VIN to start a new job.</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Active Jobs</h2>
          <div className="overflow-y-auto max-h-96">
            {activeJobs.length > 0 ? (
              activeJobs.map(job => <JobCard key={job.id} job={job} users={users} />)
            ) : (
              <p className="text-gray-500">No active jobs.</p>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">My Completed Jobs Today</h2>
          <div className="overflow-y-auto max-h-96">
            {myCompletedToday.length > 0 ? (
              myCompletedToday.map(job => <JobCard key={job.id} job={job} users={users} />)
            ) : (
              <p className="text-gray-500">You haven't completed any jobs today.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function JobCard({ job, users }) {
  const assignedTechs = job.assignedTechnicianIds.map(id => users[id]?.name || 'Unknown').join(', ');
  return (
    <div className="border-b py-3">
      <p className="font-semibold text-gray-800">{job.vehicleDescription}</p>
      <p className="text-sm text-gray-600">VIN: {job.vin} | Stock: {job.stockNumber}</p>
      <p className="text-sm text-gray-600">Service: {job.serviceType}</p>
      <p className="text-sm text-gray-600">Assigned: {assignedTechs}</p>
      <p className="text-sm text-gray-500">Started: {formatTime(job.startTime)}</p>
    </div>
  );
}

function JobsList({ jobs, users, onJobSelect }) {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredJobs = useMemo(() => {
    return jobs
      .filter(job => {
        if (filter === 'all') return true;
        return job.status.toLowerCase().replace(' ', '-') === filter;
      })
      .filter(job => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          job.vin?.toLowerCase().includes(term) ||
          job.stockNumber?.toLowerCase().includes(term) ||
          job.vehicleDescription?.toLowerCase().includes(term) ||
          job.serviceType?.toLowerCase().includes(term) ||
          (job.assignedTechnicianIds.map(id => users[id]?.name).join(' ').toLowerCase().includes(term))
        );
      });
  }, [jobs, users, filter, searchTerm]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-full text-sm ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}>All</button>
          <button onClick={() => setFilter('in-progress')} className={`px-3 py-1 rounded-full text-sm ${filter === 'in-progress' ? 'bg-yellow-500 text-white' : 'bg-gray-300'}`}>In Progress</button>
          <button onClick={() => setFilter('completed')} className={`px-3 py-1 rounded-full text-sm ${filter === 'completed' ? 'bg-green-500 text-white' : 'bg-gray-300'}`}>Completed</button>
        </div>
        <input
          type="text"
          placeholder="Search jobs..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="border rounded px-3 py-1"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3">Vehicle</th>
              <th className="p-3">VIN/Stock</th>
              <th className="p-3">Service</th>
              <th className="p-3">Technicians</th>
              <th className="p-3">Start Time</th>
              <th className="p-3">End Time</th>
              <th className="p-3">Duration</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.map(job => (
              <tr key={job.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => onJobSelect(job)}>
                <td className="p-3">{job.vehicleDescription}</td>
                <td className="p-3">{job.vin}<br/>{job.stockNumber}</td>
                <td className="p-3">{job.serviceType}</td>
                <td className="p-3">{job.assignedTechnicianIds.map(id => users[id]?.name || 'N/A').join(', ')}</td>
                <td className="p-3">{formatTime(job.startTime)}</td>
                <td className="p-3">{formatTime(job.endTime)}</td>
                <td className="p-3">{formatDuration(job.duration)}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    job.status === 'Completed' ? 'bg-green-200 text-green-800' :
                    job.status === 'In Progress' ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-800'
                  }`}>
                    {job.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JobDetailsModal({ job, users, onClose }) {
  if (!job) return null;

  const assignedTechs = job.assignedTechnicianIds.map(id => users[id]).filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Job Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><strong className="text-gray-600">Vehicle:</strong> {job.vehicleDescription}</div>
          <div><strong className="text-gray-600">VIN:</strong> {job.vin}</div>
          <div><strong className="text-gray-600">Stock #:</strong> {job.stockNumber}</div>
          <div><strong className="text-gray-600">Service:</strong> {job.serviceType}</div>
          <div><strong className="text-gray-600">Date:</strong> {new Date(job.date).toLocaleDateString()}</div>
          <div><strong className="text-gray-600">Status:</strong> {job.status}</div>
          <div><strong className="text-gray-600">Start Time:</strong> {formatTime(job.startTime)}</div>
          <div><strong className="text-gray-600">End Time:</strong> {formatTime(job.endTime)}</div>
          <div><strong className="text-gray-600">Total Duration:</strong> {formatDuration(job.duration)}</div>
        </div>
        <div className="mt-6">
          <h3 className="text-xl font-bold text-gray-800 mb-3">Assigned Technicians</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">Name</th>
                <th className="p-2">Time Started</th>
                <th className="p-2">Time Ended</th>
                <th className="p-2">Individual Duration</th>
              </tr>
            </thead>
            <tbody>
              {assignedTechs.map(tech => {
                const timer = job.techTimers?.[tech.id];
                return (
                  <tr key={tech.id} className="border-b">
                    <td className="p-2">{tech.name}</td>
                    <td className="p-2">{timer ? formatTime(timer.startedAt) : 'Not Started'}</td>
                    <td className="p-2">{timer ? formatTime(timer.endedAt) : 'In Progress'}</td>
                    <td className="p-2">{timer ? formatDuration(timer.duration) : 'N/A'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UsersList({ users, managers }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const handleAddUser = async (name, pin) => {
    try {
      await V2.post('/users', { name, pin });
      setIsAdding(false);
    } catch (err) {
      alert(`Failed to add user: ${err?.response?.data?.error || err.message}`);
    }
  };

  const handleUpdateUser = async (id, name, pin) => {
    try {
      await V2.put(`/users/${id}`, { name, pin });
      setEditingUser(null);
    } catch (err) {
      alert(`Failed to update user: ${err?.response?.data?.error || err.message}`);
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await V2.delete(`/users/${id}`);
      } catch (err) {
        alert('Failed to delete user.');
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Technicians</h2>
        <button onClick={() => setIsAdding(true)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
          Add Technician
        </button>
      </div>
      <table className="w-full text-left mb-8">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3">Name</th>
            <th className="p-3">PIN</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} className="border-b">
              <td className="p-3">{user.name}</td>
              <td className="p-3">{user.pin}</td>
              <td className="p-3">
                <button onClick={() => setEditingUser(user)} className="text-blue-500 hover:underline mr-4">Edit</button>
                <button onClick={() => handleDeleteUser(user.id)} className="text-red-500 hover:underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-xl font-bold mb-4">Managers</h2>
      <table className="w-full text-left">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3">Name</th>
            <th className="p-3">Username</th>
          </tr>
        </thead>
        <tbody>
          {managers.map(user => (
            <tr key={user.id} className="border-b">
              <td className="p-3">{user.name}</td>
              <td className="p-3">{user.username}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {(isAdding || editingUser) && (
        <UserEditModal
          user={editingUser}
          onClose={() => { setIsAdding(false); setEditingUser(null); }}
          onSave={editingUser ? (name, pin) => handleUpdateUser(editingUser.id, name, pin) : handleAddUser}
        />
      )}
    </div>
  );
}

function UserEditModal({ user, onClose, onSave }) {
  const [name, setName] = useState(user?.name || '');
  const [pin, setPin] = useState(user?.pin || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(name, pin);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-8" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4">{user ? 'Edit' : 'Add'} Technician</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">PIN (4 digits)</label>
            <input
              type="text"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full border rounded px-3 py-2"
              pattern="\d{4}"
              title="PIN must be 4 digits"
              required
            />
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="mr-4 bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded">
              Cancel
            </button>
            <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Reports({ jobs, users, librariesLoaded }) {
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const handleExport = (format) => {
    if (!librariesLoaded) {
      alert('Export libraries are not loaded yet. Please wait a moment.');
      return;
    }

    const filteredJobs = jobs.filter(job => {
      const jobDate = new Date(job.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1); // include end date
      return jobDate >= start && jobDate < end;
    });

    const data = filteredJobs.map(job => ({
      'Date': new Date(job.date).toLocaleDateString(),
      'Vehicle': job.vehicleDescription,
      'VIN': job.vin,
      'Stock #': job.stockNumber,
      'Service': job.serviceType,
      'Technicians': job.assignedTechnicianIds.map(id => users[id]?.name).join(', '),
      'Start Time': formatTime(job.startTime),
      'End Time': formatTime(job.endTime),
      'Duration (min)': job.duration ? (job.duration / 60000).toFixed(2) : 'N/A',
      'Status': job.status,
    }));

    if (format === 'csv') {
      const ws = window.XLSX.utils.json_to_sheet(data);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Jobs Report');
      window.XLSX.writeFile(wb, `Jobs_Report_${startDate}_to_${endDate}.xlsx`);
    } else if (format === 'pdf') {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.autoTable({
        head: [Object.keys(data[0] || {})],
        body: data.map(row => Object.values(row)),
      });
      doc.save(`Jobs_Report_${startDate}_to_${endDate}.pdf`);
    }
  };
  
  const handleRefreshInventory = async () => {
    if (!window.confirm('This will fetch the latest inventory CSV and update the vehicle database. This can take a moment. Continue?')) return;
    try {
      const res = await V2.post('/vehicles/refresh');
      alert(`Inventory refresh complete. Total rows processed: ${res.data.total}. New vehicles: ${res.data.upserted}. Updated vehicles: ${res.data.modified}.`);
    } catch (err) {
      alert(`Inventory refresh failed: ${err?.response?.data?.error || err.message}`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Generate Report</h2>
      <div className="flex items-center space-x-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md" />
        </div>
        <div className="self-end">
          <button onClick={() => handleExport('csv')} disabled={!librariesLoaded} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400">
            Export Excel
          </button>
        </div>
        <div className="self-end">
          <button onClick={() => handleExport('pdf')} disabled={!librariesLoaded} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400">
            Export PDF
          </button>
        </div>
      </div>
      <hr className="my-6" />
      <h2 className="text-xl font-bold mb-4">Data Management</h2>
      <button onClick={handleRefreshInventory} className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded">
        Refresh Vehicle Inventory from CSV
      </button>
      <p className="text-sm text-gray-500 mt-2">
        This will pull the latest data from the configured inventory CSV URL.
      </p>
    </div>
  );
}

function NewJobForm({ technicians, onJobCreated }) {
  const [vin, setVin] = useState('');
  const [stockNumber, setStockNumber] = useState('');
  const [vehicleDescription, setVehicleDescription] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [coTechnicianIds, setCoTechnicianIds] = useState([]);
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');

  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const search = async () => {
      if (vin.length < 3 && stockNumber.length < 3) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const query = vin || stockNumber;
        const res = await V2.get(`/vehicles/search?q=${query}`);
        setSearchResults(res.data || []);
      } catch {
        setSearchResults([]);
      }
      setIsSearching(false);
    };
    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [vin, stockNumber]);

  const handleSelectVehicle = (vehicle) => {
    setVin(vehicle.vin);
    setStockNumber(vehicle.stockNumber);
    setVehicleDescription(vehicle.vehicleDescription || toVehicleDescription(vehicle));
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!technicianId) {
      alert('Please select a primary technician.');
      return;
    }
    try {
      await V2.post('/jobs', {
        vin, stockNumber, vehicleDescription, serviceType, technicianId,
        technicianName: technicians.find(t => t.id === technicianId)?.name || '',
        coTechnicianIds,
        notes,
        price: parseFloat(price) || null,
        location,
      });
      alert('Job created successfully!');
      onJobCreated();
    } catch (err) {
      alert(`Failed to create job: ${err?.response?.data?.error || err.message}`);
    }
  };

  const handleCoTechnicianChange = (techId) => {
    setCoTechnicianIds(prev =>
      prev.includes(techId) ? prev.filter(id => id !== techId) : [...prev, techId]
    );
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Job</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vehicle Search */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700">Search VIN / Stock #</label>
            <input
              type="text"
              placeholder="Start typing VIN or Stock..."
              value={vin || stockNumber}
              onChange={e => { setVin(e.target.value); setStockNumber(e.target.value); }}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {isSearching && <p className="text-sm text-gray-500">Searching...</p>}
            {searchResults.length > 0 && (
              <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-auto">
                {searchResults.map(v => (
                  <li key={v.vin} onClick={() => handleSelectVehicle(v)} className="p-2 hover:bg-gray-100 cursor-pointer">
                    {v.vehicleDescription} ({v.vin})
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Vehicle Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Vehicle Description</label>
            <input type="text" value={vehicleDescription} onChange={e => setVehicleDescription(e.target.value)} readOnly className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">VIN</label>
            <input type="text" value={vin} onChange={e => setVin(e.target.value)} readOnly className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Stock #</label>
            <input type="text" value={stockNumber} onChange={e => setStockNumber(e.target.value)} readOnly className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm sm:text-sm" />
          </div>
        </div>

        <hr />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Service Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Service Type</label>
            <select value={serviceType} onChange={e => setServiceType(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              <option value="">Select Service</option>
              <option value="Detail">Detail</option>
              <option value="Delivery">Delivery</option>
              <option value="Rewash">Rewash</option>
              <option value="Lot Car">Lot Car</option>
              <option value="FCTP">FCTP</option>
              <option value="Cleanup">Cleanup</option>
              <option value="Showroom">Showroom</option>
            </select>
          </div>
          {/* Primary Technician */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Primary Technician</label>
            <select value={technicianId} onChange={e => setTechnicianId(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              <option value="">Select Technician</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        {/* Co-Technicians */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Additional Technicians</label>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
            {technicians.filter(t => t.id !== technicianId).map(t => (
              <label key={t.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={coTechnicianIds.includes(t.id)}
                  onChange={() => handleCoTechnicianChange(t.id)}
                  className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
                <span>{t.name}</span>
              </label>
            ))}
          </div>
        </div>

        <hr />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Price</label>
            <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g., 150.00" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g., Bay 3" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="3" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-colors">
            Create Job
          </button>
        </div>
      </form>
    </div>
  );
}

