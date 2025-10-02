import React, { useState } from 'react';
import axios from 'axios';

// Create a minimal API client
const API = axios.create({
  baseURL: '/api/v2',
  timeout: 10000,
});

const SimpleLogin = () => {
  const [pin, setPin] = useState('');
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Removed unused state variables since this component is not actively used

  const handleLogin = async (e) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await API.post('/auth/login', { employeeId: pin });
      setUser(response.data.user);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setPin('');
  };

  // Removed unused functions since this component is not actively used

  if (user) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Cleanup Tracker</h1>
                <p className="text-gray-600">{user.name} • {user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create New Job */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Create New Job</h2>
              <form onSubmit={createJob} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
                  <input
                    type="text"
                    value={newJob.vin}
                    onChange={(e) => setNewJob({...newJob, vin: e.target.value.toUpperCase()})}
                    placeholder="Enter VIN"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={17}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                  <select
                    value={newJob.serviceType}
                    onChange={(e) => setNewJob({...newJob, serviceType: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Cleanup">Cleanup</option>
                    <option value="Detail">Detail</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Rewash">Rewash</option>
                    <option value="Lot Car">Lot Car</option>
                    <option value="FCTP">FCTP</option>
                    <option value="Touch-up">Touch-up</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                >
                  Create Job
                </button>
              </form>
            </div>

            {/* Jobs List */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Jobs ({jobs.length})</h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {jobs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No jobs found</p>
                ) : (
                  jobs.map((job) => (
                    <div key={job.id || job._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-800">{job.vin}</h3>
                          <p className="text-sm text-gray-600">{job.serviceType}</p>
                          <p className="text-sm text-gray-600">Technician: {job.technicianName}</p>
                          <p className={`text-sm font-medium ${
                            job.status === 'Completed' ? 'text-green-600' :
                            job.status === 'In Progress' ? 'text-blue-600' : 'text-yellow-600'
                          }`}>
                            Status: {job.status}
                          </p>
                        </div>
                        {job.status === 'In Progress' && (
                          <button
                            onClick={() => completeJob(job.id || job._id)}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded">
                <h3 className="font-semibold text-blue-800">Total Jobs</h3>
                <p className="text-2xl font-bold text-blue-900">{jobs.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <h3 className="font-semibold text-green-800">Completed</h3>
                <p className="text-2xl font-bold text-green-900">
                  {jobs.filter(j => j.status === 'Completed').length}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded">
                <h3 className="font-semibold text-yellow-800">In Progress</h3>
                <p className="text-2xl font-bold text-yellow-900">
                  {jobs.filter(j => j.status === 'In Progress').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Cleanup Tracker</h1>
          <p className="text-gray-600 mt-2">Enter your 4-digit PIN</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Enter PIN"
              className="w-full p-4 text-center text-2xl border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={4}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pin.length !== 4 || loading}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-bold py-4 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-sm text-gray-500 text-center">
          <p>Test PINs:</p>
          <p>1701 (Manager) • 1716 (Detailer) • 2001 (Sales)</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleLogin;