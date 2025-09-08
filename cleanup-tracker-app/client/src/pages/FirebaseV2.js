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

  // Restore persisted session
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
  useEffect(() => {
    let jobsTimer; let usersTimer;

    const normalizeUsers = (arr) => {
      const map = {};
      arr.forEach(u => {
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
        const data = res.data || [];
        if (Array.isArray(data)) {
          setUsers(normalizeUsers(data));
        }
      } catch (e) {
        // If the primary fetch fails, assume the DB might not be initialized.
        // Call the /init endpoint and then retry fetching users.
        try {
          await V2.post('/init');
          const res2 = await V2.get('/users');
          setUsers(normalizeUsers(res2.data || []));
        } catch (initErr) {
          setError(prev => prev || 'Failed to load users from server.');
          console.error("Failed to fetch users after init:", initErr);
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
      }));

      try {
        const res = await V2.get('/jobs');
        setJobs(processJobs(res.data));
      } catch (e) {
        // If the primary fetch fails, assume the DB might not be initialized.
        // Call the /init endpoint and then retry fetching jobs.
        try {
          await V2.post('/init');
          const res2 = await V2.get('/jobs');
          setJobs(processJobs(res2.data));
        } catch (initErr) {
          setError(prev => prev || 'Failed to load jobs from server.');
          console.error("Failed to fetch jobs after init:", initErr);
        }
      }
    };

    // initial load
    fetchUsers();
    fetchJobs();
    // polling
    jobsTimer = setInterval(fetchJobs, 3000);
    usersTimer = setInterval(fetchUsers, 10000);
    return () => { clearInterval(jobsTimer); clearInterval(usersTimer); };
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {!user ? (
        <LoginScreen onLogin={handleLogin} onPinLogin={handlePinLogin} error={error} setError={setError} users={users} />
      ) : (
  <MainApp user={user} jobs={jobs} users={users} onLogout={handleLogout} librariesLoaded={librariesLoaded} />
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
      setIsLoggingIn(true); setError('');
      setTimeout(() => {
        onPinLogin(pin);
        setIsLoggingIn(false);
        if (!Object.values(users).find(u => u.pin === pin)) {
          setTimeout(() => setPin(''), 1000);
        }
      }, 500);
    }
  }, [pin, onPinLogin, setError, users]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-700">
      <div className="p-8 bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl w-full max-w-md border border-white/20">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-blue-500 rounded-full mb-3 shadow-lg"><svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg></div>
          <h1 className="text-3xl font-bold text-white mt-2">Mission Ford Detail</h1>
          <p className="text-gray-300">Workflow & Analytics SAAS</p>
        </div>
        {error && <p className="text-red-300 text-center text-sm mb-4 bg-red-500/30 p-2 rounded-md border border-red-400/50">{error}</p>}
        {loginMode === 'detailer' ? (
          <div className="text-white text-center">
            <h2 className="text-xl mb-4">Enter Your 4-Digit PIN</h2>
            <div className="flex justify-center items-center space-x-4 mb-6 h-12">
              {Array(4).fill(0).map((_, i) => (<div key={i} className={`w-8 h-8 rounded-full transition-colors duration-300 ${pin.length > i ? 'bg-blue-400' : 'bg-white/20'}`}></div>))}
            </div>
            {isLoggingIn && <div className="flex justify-center h-10"><Spinner /></div>}
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <button key={n} onClick={() => handlePinInput(n)} className="text-3xl p-4 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">{n}</button>)}
              <button onClick={handleBackspace} className="text-3xl p-4 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">⌫</button>
              <button onClick={() => handlePinInput(0)} className="text-3xl p-4 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">0</button>
            </div>
            <button onClick={() => setLoginMode('manager')} className="text-blue-300 text-sm mt-6 hover:underline">Manager Login</button>
          </div>
        ) : (
          <form onSubmit={handleManagerSubmit} className="space-y-4">
            <h2 className="text-xl text-white text-center mb-4">Manager Login</h2>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="bg-white/10 text-white placeholder-gray-400 border border-white/20 rounded-lg w-full py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Username" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white/10 text-white placeholder-gray-400 border border-white/20 rounded-lg w-full py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Password" required />
            <button type="submit" disabled={isLoggingIn} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex justify-center items-center">{isLoggingIn ? <Spinner /> : 'Sign In'}</button>
            <button onClick={() => setLoginMode('detailer')} className="text-blue-300 text-sm mt-2 hover:underline w-full text-center">Back to Detailer Login</button>
          </form>
        )}
      </div>
    </div>
  );
}

function MainApp({ user, jobs, users, onLogout, librariesLoaded }) {
  const [detailerView, setDetailerView] = useState('newJob');
  const [managerView, setManagerView] = useState('dashboard');
  return (
    <>
      <Header userData={user} onLogout={onLogout} />
      <main className="p-4 sm:p-6 md:p-8">
        {user.role === 'manager' && (
          <div className="max-w-7xl mx-auto">
            <div className="flex border-b border-gray-300 mb-6"><button onClick={() => setManagerView('dashboard')} className={`px-4 py-2 text-sm font-medium ${managerView === 'dashboard' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Dashboard</button><button onClick={() => setManagerView('team')} className={`px-4 py-2 text-sm font-medium ${managerView === 'team' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Team Management</button></div>
            {managerView === 'dashboard' && <ManagerDashboard jobs={jobs} users={users} librariesLoaded={librariesLoaded} />}
            {managerView === 'team' && <TeamManagement users={users} />}
          </div>
        )}
        {user.role === 'detailer' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex border-b border-gray-300 mb-6"><button onClick={() => setDetailerView('newJob')} className={`px-4 py-2 text-sm font-medium ${detailerView === 'newJob' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>New Job</button><button onClick={() => setDetailerView('dashboard')} className={`px-4 py-2 text-sm font-medium ${detailerView === 'dashboard' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>My Dashboard</button></div>
            {detailerView === 'dashboard' && <DetailerDashboard user={user} allJobs={jobs} />}
            {detailerView === 'newJob' && <DetailerNewJobView user={user} users={users} jobs={jobs} isScannerLoaded={librariesLoaded} />}
          </div>
        )}
      </main>
    </>
  );
}

function Header({ userData, onLogout }) {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3"><div className="p-2 bg-blue-600 rounded-lg"><svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg></div><h1 className="text-xl font-bold text-gray-800">Mission Ford Detail</h1></div>
          <div className="flex items-center space-x-4"><div className="text-right"><span className="font-semibold text-gray-700">{userData.name}</span><span className="text-sm text-gray-500 block capitalize">{userData.role}</span></div><button onClick={onLogout} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-lg transition duration-300"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button></div>
        </div>
      </div>
    </header>
  );
}

function DetailerNewJobView({ user, users, jobs, isScannerLoaded }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState('');
  const [loadingVehicle, setLoadingVehicle] = useState(false);
  const [jobType, setJobType] = useState('Detail');
  const [isScanning, setIsScanning] = useState(false);
  const activeJob = useMemo(() => jobs.find(j => (j.technicianId === user.uid || (j.assignedTechnicianIds||[]).includes(user.uid)) && j.status === 'In Progress' && (j.techTimers?.[user.uid]?.endedAt ? false : true)), [jobs, user.uid]);
  const coTechOptions = useMemo(() => Object.values(users).filter(u => u.role === 'detailer' && u.uid !== user.uid), [users, user.uid]);
  const [coTechId, setCoTechId] = useState('');

  const handleSearch = React.useCallback(async (term) => {
    if (!term) return;
    if (isScanning) setIsScanning(false);
    setLoadingVehicle(true); setError(''); setVehicle(null);
    try {
      const res = await V2.get('/vehicles/search', { params: { q: term.trim() } });
      const first = (res.data || [])[0];
      if (first) setVehicle(first);
      else setError('VIN/Stock # not found in the inventory list.');
    } catch (e) {
      setError('Search failed. Please try again.');
    } finally {
      setLoadingVehicle(false);
    }
  }, [isScanning]);

  // Normalize VIN-like codes: strip spaces, make uppercase, and keep last 17 when QR contains prefixed text
  const normalizeVinCandidate = (str) => {
    if (!str) return '';
    const s = String(str).trim().toUpperCase();
    // If QR contains key:value pairs, try to find 17-char VIN substring
    const vinMatch = s.match(/[A-HJ-NPR-Z0-9]{17}/); // VIN excludes I,O,Q
    if (vinMatch) return vinMatch[0];
    // Otherwise, return as-is for stock or short queries
    return s;
  };

  const handleScan = (text) => {
    const normalized = normalizeVinCandidate(text);
    handleSearch(normalized);
  };

  const handleStartJob = async () => {
    if (!vehicle) return;
    const payload = {
      technicianId: user.uid,
      technicianName: user.name,
      vin: vehicle.vin,
      stockNumber: vehicle.stockNumber,
      vehicleDescription: vehicle.vehicleDescription || toVehicleDescription(vehicle),
      serviceType: jobType,
      date: new Date().toISOString().split('T')[0],
  coTechnicianIds: coTechId ? [coTechId] : [],
    };
    try {
      await V2.post('/jobs', payload);
      resetForm();
    } catch (e) {
      console.error(e);
      setError('Failed to start job in database.');
    }
  };

  const handleCompleteJob = async () => {
    if (!activeJob || !activeJob.startTime) return;
    try { await V2.put(`/jobs/${activeJob.id}/complete`); }
    catch (e) { console.error(e); setError('Failed to complete job in database.'); }
  };

  const handleJoinExistingJob = async () => {
    if (!vehicle) return;
    try {
      await V2.put('/vehicles/join-by-vin', { vin: vehicle.vin, userId: user.uid });
      resetForm();
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.error || 'Failed to join job for this VIN.');
    }
  };

  const handleStopMyTimer = async (jobId) => {
    try {
      await V2.put(`/jobs/${jobId}/stop`, { userId: user.uid });
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.error || 'Failed to stop timer.');
    }
  };

  const resetForm = () => { setSearchTerm(''); setVehicle(null); setError(''); };
  if (activeJob) return <ActiveJobCard activeJob={activeJob} onComplete={handleCompleteJob} onStopMyTimer={() => handleStopMyTimer(activeJob.id)} myTimerStart={activeJob.techTimers?.[user.uid]?.startedAt} />;
  return (
    <div className="max-w-lg mx-auto bg-white p-6 rounded-xl shadow-lg space-y-4">
      <h2 className="text-2xl font-bold text-center text-gray-800">Start New Job</h2>
      <>
        {isScanning ? (
          <div>
            <VinScanner onScanSuccess={handleScan} />
            <button onClick={() => setIsScanning(false)} className="mt-4 w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg">Cancel Scan</button>
          </div>
        ) : (
          <button onClick={() => setIsScanning(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2">Scan VIN / QR / Barcode</button>
        )}
        <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div><div className="relative flex justify-center"><span className="px-2 bg-white text-sm text-gray-500">OR</span></div></div>
        <form onSubmit={e => { e.preventDefault(); handleSearch(searchTerm); }} className="space-y-2">
          <label htmlFor="search-term" className="text-sm font-medium text-gray-700">Enter VIN or Stock #</label>
          <div className="flex rounded-md shadow-sm"><input id="search-term" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="e.g., WBABC4C5XKBU95732" className="flex-1 block w-full rounded-none rounded-l-md sm:text-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 p-2" /><button type="submit" className="inline-flex items-center px-4 py-2 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100">Find</button></div>
        </form>
        {loadingVehicle && <div className="flex justify-center"><Spinner/></div>}
        {error && <p className="text-red-500 text-center text-sm mt-2">{error}</p>}
        {vehicle && (
          <div className="border border-blue-200 bg-blue-50 p-4 rounded-lg space-y-4 animate-fade-in">
            <h3 className="font-bold text-lg text-blue-800">Vehicle Found</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p><strong className="text-gray-600">VIN:</strong> {vehicle.vin}</p>
              <p><strong className="text-gray-600">Stock #:</strong> {vehicle.stockNumber}</p>
              <p className="col-span-2"><strong className="text-gray-600">Vehicle:</strong> {vehicle.vehicleDescription}</p>
            </div>
            <select value={jobType} onChange={e => setJobType(e.target.value)} className="block w-full p-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
              <option>Detail</option><option>Delivery</option><option>Rewash</option><option>Lot Car</option><option>FCTP</option><option>Cleanup</option>
            </select>
            <div>
              <label className="block text-sm text-blue-800 mb-1">Optional Co-Detailer</label>
              <select value={coTechId} onChange={e => setCoTechId(e.target.value)} className="block w-full p-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                <option value="">None</option>
                {coTechOptions.map(ct => <option key={ct.uid} value={ct.uid}>{ct.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button onClick={handleStartJob} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg">Start New Job</button>
              <button onClick={handleJoinExistingJob} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg">Join In-Progress</button>
            </div>
          </div>
        )}
      </>
    </div>
  );
}

function ActiveJobCard({ activeJob, onComplete, onStopMyTimer, myTimerStart }) {
  const [elapsedTime, setElapsedTime] = useState('');
  useEffect(() => {
    const startRef = myTimerStart ? new Date(myTimerStart) : new Date(activeJob.startTime);
    if (!startRef) return;
    const timer = setInterval(() => setElapsedTime(formatDuration(new Date() - startRef)), 1000);
    return () => clearInterval(timer);
  }, [activeJob, myTimerStart]);
  return (
    <div className="max-w-lg mx-auto bg-yellow-50 border-2 border-yellow-400 p-6 rounded-xl shadow-lg text-center space-y-4">
      <h2 className="text-2xl font-bold text-yellow-800">Job In Progress</h2>
      <div className="text-yellow-900">
        <p className="text-xl font-semibold">{activeJob.vehicleDescription}</p>
        <p><strong>Stock #:</strong> {activeJob.stockNumber}</p>
        <p><strong>Service:</strong> {activeJob.serviceType}</p>
      </div>
      <div className="bg-yellow-100 p-4 rounded-lg">
        <p className="text-lg font-medium text-yellow-800">Elapsed Time</p>
        <p className="text-4xl font-bold text-yellow-900 tracking-wider font-mono">{elapsedTime}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button onClick={onStopMyTimer} className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-lg">Stop My Timer</button>
        <button onClick={onComplete} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg">Complete Job</button>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, colorClass }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-lg flex items-center space-x-4">
      <div className={`rounded-full p-3 ${colorClass}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg></div>
      <div><p className="text-sm text-gray-500">{title}</p><p className="text-2xl font-bold text-gray-800">{value}</p></div>
    </div>
  );
}

function DetailerDashboard({ user, allJobs }) {
  const [filters, setFilters] = useState({ dateRange: 'today' });
  const [customDate, setCustomDate] = useState('');
  const myJobs = useMemo(() => allJobs.filter(j => j.technicianId === user.uid || (j.assignedTechnicianIds||[]).includes(user.uid)), [allJobs, user.uid]);

  const filteredJobs = useMemo(() => {
    const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate;
    switch(filters.dateRange) {
      case '7days': startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000); break;
      case '30days': startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000); break;
      case 'custom': startDate = customDate ? new Date(customDate + 'T00:00:00') : null; break;
      case 'today': default: startDate = today; break;
    }
    return myJobs.filter(job => !startDate || (filters.dateRange === 'custom' ? job.date === customDate : new Date(job.date + 'T00:00:00') >= startDate));
  }, [myJobs, filters, customDate]);

  const kpiData = useMemo(() => {
    const completed = filteredJobs.filter(j => j.status === 'Completed');
    const totalDuration = completed.reduce((acc, job) => acc + (job.duration || 0), 0);
    return { totalJobs: filteredJobs.length, avgDuration: completed.length ? formatDuration(totalDuration / completed.length) : 'N/A' };
  }, [filteredJobs]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-lg space-y-3">
        <h3 className="font-semibold text-gray-700">My Performance</h3>
        <div className="flex items-center space-x-2">
          <select value={filters.dateRange} onChange={e => setFilters({...filters, dateRange: e.target.value})} className="p-2 border border-gray-300 rounded-md shadow-sm text-sm"><option value="today">Today</option><option value="7days">Last 7 Days</option><option value="30days">Last 30 Days</option><option value="custom">Custom Date</option></select>
          {filters.dateRange === 'custom' && <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="p-2 border border-gray-300 rounded-md shadow-sm text-sm"/>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <KpiCard title="Total Jobs (Filtered)" value={kpiData.totalJobs} colorClass="bg-blue-100 text-blue-600" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>} />
        <KpiCard title="My Avg. Duration" value={kpiData.avgDuration} colorClass="bg-green-100 text-green-600" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>} />
      </div>
      <div className="bg-white p-6 rounded-xl shadow-lg"><h3 className="text-lg font-semibold mb-4 text-gray-800">My Completed Jobs ({filteredJobs.filter(j => j.status === 'Completed').length})</h3><JobsTable jobs={filteredJobs.filter(j => j.status === 'Completed')} /></div>
    </div>
  );
}

function ManagerDashboard({ jobs, users, librariesLoaded }) {
  const [filters, setFilters] = useState({ employee: 'All', service: 'All', dateRange: 'today' });
  const [customDate, setCustomDate] = useState('');
  const [exporting, setExporting] = useState({ pdf: false, excel: false });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');
  const uniqueEmployees = useMemo(() => {
    const names = new Set();
    for (const j of jobs) {
      names.add(j.technicianName);
      (j.assignedTechnicianIds||[]).forEach(uid => {
        const u = users[Object.keys(users).find(k => users[k].uid === uid)];
        if (u?.name) names.add(u.name);
      });
    }
    return ['All', ...Array.from(names).sort()];
  }, [jobs, users]);
  const serviceTypes = ['All', 'Detail', 'Delivery', 'Rewash', 'Lot Car', 'FCTP', 'Cleanup'];

  const filteredJobs = useMemo(() => {
    const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate;
    switch(filters.dateRange) {
      case '7days': startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000); break;
      case '30days': startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000); break;
      case 'custom': startDate = customDate ? new Date(customDate + 'T00:00:00') : null; break;
      case 'today': default: startDate = today; break;
    }
    return jobs.filter(job => {
      const jobDate = new Date(job.date + 'T00:00:00');
      const dateMatch = !startDate || (filters.dateRange === 'custom' ? job.date === customDate : jobDate >= startDate);
      return (filters.employee === 'All' || job.technicianName === filters.employee) && (filters.service === 'All' || job.serviceType === filters.service) && dateMatch;
    });
  }, [jobs, filters, customDate]);

  const kpiData = useMemo(() => {
    const completed = filteredJobs.filter(j => j.status === 'Completed');
    const totalDuration = completed.reduce((acc, job) => acc + (job.duration || 0), 0);
    const employeeCounts = filteredJobs.reduce((acc, job) => ({ ...acc, [job.technicianName]: (acc[job.technicianName] || 0) + 1 }), {});
    const topEmployee = Object.entries(employeeCounts).sort((a, b) => b[1] - a[1])[0];
    return { jobsInProgress: jobs.filter(j => j.status === 'In Progress').length, totalJobs: filteredJobs.length, avgDuration: completed.length ? formatDuration(totalDuration / completed.length) : 'N/A', topEmployee: topEmployee ? `${topEmployee[0]} (${topEmployee[1]})` : 'N/A' };
  }, [jobs, filteredJobs]);

  const chartData = useMemo(() => {
    const counts = {};
    for (const job of filteredJobs) {
      counts[job.technicianName] = (counts[job.technicianName] || 0) + 1;
      for (const uid of (job.assignedTechnicianIds||[])) {
        const u = Object.values(users).find(x => x.uid === uid);
        const name = u?.name || uid;
        counts[name] = (counts[name] || 0) + 1;
      }
    }
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);
  }, [filteredJobs, users]);
  const jobsInProgress = useMemo(() => filteredJobs.filter(j => j.status === 'In Progress').sort((a, b) => new Date(b.startTime) - new Date(a.startTime)), [filteredJobs]);
  const jobsCompleted = useMemo(() => filteredJobs.filter(j => j.status === 'Completed').sort((a, b) => new Date(b.startTime) - new Date(a.startTime)), [filteredJobs]);

  const refreshInventory = async () => {
    setRefreshing(true);
    setRefreshMsg('');
    try {
      const res = await V2.post('/vehicles/refresh');
      const { upserted = 0, modified = 0, total = 0 } = res.data || {};
      setRefreshMsg(`Inventory refreshed. Upserted: ${upserted}, Modified: ${modified}, Total: ${total}.`);
    } catch (e) {
      setRefreshMsg('Inventory refresh failed.');
    } finally {
      setRefreshing(false);
      // Auto-hide message after a short delay
      setTimeout(() => setRefreshMsg(''), 4000);
    }
  };

  const exportToPDF = (data) => {
    if (!librariesLoaded || !window.jspdf || !window.jspdf.jsPDF) return;
    setExporting(prev => ({ ...prev, pdf: true }));
    setTimeout(() => {
      try {
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        doc.text('Detailing Job Report', 14, 16);
        const rows = data.map(job => [job.technicianName, job.vehicleDescription, job.stockNumber, job.serviceType, new Date(job.date).toLocaleDateString(), formatTime(job.startTime), formatTime(job.endTime), formatDuration(job.duration)]);
        // eslint-disable-next-line no-undef
        doc.autoTable({ startY: 22, head: [['Employee', 'Vehicle', 'Stock #', 'Service', 'Date', 'Start', 'End', 'Duration']], body: rows });
        doc.save(`detailing_report_${new Date().toISOString().split('T')[0]}.pdf`);
      } catch (e) {
        console.error('PDF export failed:', e);
      } finally {
        setExporting(prev => ({ ...prev, pdf: false }));
      }
    }, 0);
  };
  const exportToExcel = (data) => {
    if (!librariesLoaded || !window.XLSX) return;
    setExporting(prev => ({ ...prev, excel: true }));
    setTimeout(() => {
      try {
        const worksheetData = data.map(job => ({ Employee: job.technicianName, Vehicle: job.vehicleDescription, 'Stock #': job.stockNumber, VIN: job.vin, Service: job.serviceType, Date: new Date(job.date).toLocaleDateString(), 'Start Time': formatTime(job.startTime), 'End Time': formatTime(job.endTime), 'Duration (ms)': job.duration, 'Duration (Formatted)': formatDuration(job.duration) }));
        const worksheet = window.XLSX.utils.json_to_sheet(worksheetData); const workbook = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Jobs');
        window.XLSX.writeFile(workbook, `detailing_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      } catch (e) {
        console.error('Excel export failed:', e);
      } finally {
        setExporting(prev => ({ ...prev, excel: false }));
      }
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard title="Jobs In Progress" value={kpiData.jobsInProgress} colorClass="bg-yellow-100 text-yellow-600" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>} />
  <KpiCard title="Total Jobs (Filtered)" value={kpiData.totalJobs} colorClass="bg-blue-100 text-blue-600" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>} />
        <KpiCard title="Avg. Duration" value={kpiData.avgDuration} colorClass="bg-green-100 text-green-600" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"></path>} />
        <KpiCard title="Top Employee" value={kpiData.topEmployee} colorClass="bg-indigo-100 text-indigo-600" icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>} />
      </div>
      <div className="bg-white p-4 rounded-xl shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-700">Filter Options</h3>
          <div className="flex items-center space-x-2">
            <button onClick={refreshInventory} disabled={refreshing} className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400">
              {refreshing ? 'Refreshing…' : 'Refresh Inventory'}
            </button>
          </div>
        </div>
        {refreshMsg && <div className="text-sm text-green-700 bg-green-100 border border-green-200 rounded-md p-2">{refreshMsg}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <select value={filters.dateRange} onChange={e => setFilters({...filters, dateRange: e.target.value})} className="p-2 border border-gray-300 rounded-md shadow-sm"><option value="today">Today</option><option value="7days">Last 7 Days</option><option value="30days">Last 30 Days</option><option value="custom">Custom Date</option></select>
          {filters.dateRange === 'custom' && <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="p-2 border border-gray-300 rounded-md shadow-sm"/>}
          <select value={filters.employee} onChange={e => setFilters({...filters, employee: e.target.value})} className="p-2 border border-gray-300 rounded-md shadow-sm">{uniqueEmployees.map(e => <option key={e} value={e}>{e}</option>)}</select>
          <select value={filters.service} onChange={e => setFilters({...filters, service: e.target.value})} className="p-2 border border-gray-300 rounded-md shadow-sm">{serviceTypes.map(s => <option key={s} value={s}>{s}</option>)}</select>
        </div>
      </div>
  <div className="bg-white p-4 rounded-xl shadow-lg flex items-center justify-between"><h3 className="text-lg font-semibold text-gray-800">Filtered Jobs Report ({filteredJobs.length})</h3><div className="flex space-x-2"><button onClick={() => exportToPDF(filteredJobs)} disabled={!librariesLoaded || exporting.pdf} className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:bg-gray-400">{exporting.pdf ? 'Exporting…' : 'Export PDF'}</button><button onClick={() => exportToExcel(filteredJobs)} disabled={!librariesLoaded || exporting.excel} className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-gray-400">{exporting.excel ? 'Exporting…' : 'Export Excel'}</button></div></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg"><h3 className="text-lg font-semibold mb-4 text-gray-800">Jobs by Employee</h3><JobsChart data={chartData} /></div><div className="lg:col-span-2 space-y-6"><div className="bg-white p-6 rounded-xl shadow-lg"><h3 className="text-lg font-semibold mb-4 text-yellow-700">In Progress ({jobsInProgress.length})</h3><JobsTable jobs={jobsInProgress} /></div><div className="bg-white p-6 rounded-xl shadow-lg"><h3 className="text-lg font-semibold mb-4 text-green-700">Completed ({jobsCompleted.length})</h3><JobsTable jobs={jobsCompleted} /></div></div></div>
    </div>
  );
}

function TeamManagement({ users }) {
  const [newUser, setNewUser] = useState({ name: '', pin: '' });
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError('');
    if(!newUser.name || !newUser.pin) { setError('All fields are required.'); return; }
    if (newUser.pin.length !== 4 || !/^\d{4}$/.test(newUser.pin)) { setError('PIN must be exactly 4 digits.'); return; }
    if (Object.values(users).find(u => u.pin === newUser.pin)) { setError('This PIN is already in use.'); return; }

    try {
      await V2.post('/users', { name: newUser.name, pin: newUser.pin });
      setNewUser({ name: '', pin: '' });
    } catch (e) {
      console.error(e);
      if (e?.response?.status === 409) setError('This PIN is already in use.');
      else setError('Failed to add user to the database.');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError('');
    if(!editingUser.name || !editingUser.pin) { setError('All fields are required.'); return; }
    if (editingUser.pin.length !== 4 || !/^\d{4}$/.test(editingUser.pin)) { setError('PIN must be exactly 4 digits.'); return; }

    if (Object.values(users).find(u => u.pin === editingUser.pin && u.id !== editingUser.id)) {
      setError('This PIN is already in use by another detailer.');
      return;
    }

    try {
      await V2.put(`/users/${editingUser.id}`, { name: editingUser.name, pin: editingUser.pin });
      setEditingUser(null);
    } catch (e) {
      console.error(e);
      if (e?.response?.status === 409) setError('This PIN is already in use by another detailer.');
      else setError('Failed to update user.');
    }
  };

  const handleRemoveUser = async (idToRemove) => {
    try { await V2.delete(`/users/${idToRemove}`); }
    catch (e) { console.error(e); setError('Failed to remove user.'); }
  };

  const detailers = Object.values(users).filter(u => u.role === 'detailer');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">{editingUser ? 'Edit Detailer' : 'Add New Detailer'}</h3>
        <form onSubmit={editingUser ? handleUpdateUser : handleAddUser} className="space-y-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <input value={editingUser ? editingUser.name : newUser.name} onChange={e => editingUser ? setEditingUser({...editingUser, name: e.target.value}) : setNewUser({...newUser, name: e.target.value})} placeholder="Full Name" className="w-full p-2 border rounded-md"/>
          <input value={editingUser ? editingUser.pin : newUser.pin} onChange={e => editingUser ? setEditingUser({...editingUser, pin: e.target.value}) : setNewUser({...newUser, pin: e.target.value})} placeholder="4-Digit PIN" type="number" maxLength="4" className="w-full p-2 border rounded-md"/>
          <div className="flex space-x-2">
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">{editingUser ? 'Save Changes' : 'Add User'}</button>
            {editingUser && <button type="button" onClick={() => setEditingUser(null)} className="w-full bg-gray-500 text-white py-2 rounded-md hover:bg-gray-600">Cancel</button>}
          </div>
        </form>
      </div>
      <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Current Detailers</h3>
        <div className="space-y-3">
          {detailers.map(d => (
            <div key={d.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div><p className="font-semibold text-gray-800">{d.name}</p><p className="text-sm text-gray-500">PIN: {d.pin}</p></div>
              <div className="flex space-x-2">
                <button onClick={() => setEditingUser(d)} className="text-blue-500 hover:text-blue-700">Edit</button>
                <button onClick={() => handleRemoveUser(d.id)} className="text-red-500 hover:text-red-700">Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function JobsChart({ data }) {
  const maxValue = useMemo(() => Math.max(...data.map(d => d.count), 0), [data]);
  if (data.length === 0) return <p className="text-gray-500 text-center py-8">No data for current filters.</p>;
  return (
    <div className="space-y-4">
      {data.map(item => (
        <div key={item.name} className="flex items-center group">
          <div className="w-24 text-sm text-gray-600 truncate pr-2">{item.name}</div>
          <div className="flex-1 bg-gray-200 rounded-full h-6">
            <div className="bg-blue-500 h-6 rounded-full flex items-center justify-between px-2 transition-all duration-500" style={{ width: `${maxValue > 0 ? (item.count / maxValue) * 100 : 0}%`}}>
              <span className="text-xs font-bold text-white">{item.count}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function JobsTable({ jobs }) {
  if (jobs.length === 0) { return <p className="text-gray-500">No jobs to display.</p>; }
  return (
    <div className="overflow-x-auto -mx-6">
      <table className="min-w-full">
        <thead className="bg-gray-50"><tr><th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase">Employee</th><th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th><th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase">Service</th><th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase">Time</th><th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase">Duration</th></tr></thead>
        <tbody className="bg-white divide-y divide-gray-200">{jobs.map(job => <JobRow key={job.id} job={job} />)}</tbody>
      </table>
    </div>
  );
}

function JobRow({ job }) {
  const [elapsedTime, setElapsedTime] = useState('');
  useEffect(() => {
    let timer;
    if (job.status === 'In Progress') { timer = setInterval(() => setElapsedTime(formatDuration(new Date() - new Date(job.startTime))), 1000); }
    return () => clearInterval(timer);
  }, [job.status, job.startTime]);
  const statusClass = job.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
  return (
    <tr className="hover:bg-gray-50">
      <td className="py-4 px-6 whitespace-nowrap text-sm font-medium text-gray-900">{job.technicianName}</td>
      <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-800"><div>{job.vehicleDescription}</div><div className="text-xs text-gray-500">Stock: {job.stockNumber} | VIN: ...{job.vin.slice(-6)}</div></td>
      <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-500">{job.serviceType}</td>
      <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-500"><div>Start: {formatTime(job.startTime)}</div><div>End: {job.status === 'Completed' ? formatTime(job.endTime) : '-'}</div></td>
      <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-800 font-mono"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`}>{job.status === 'In Progress' ? elapsedTime : formatDuration(job.duration)}</span></td>
    </tr>
  );
}
 
