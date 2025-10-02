import React, { useState, useEffect } from 'react';

const SimpleReports = ({ jobs, users, theme }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReportData = async () => {
      try {
        const response = await fetch('/api/v2/reports');
        const data = await response.json();
        setReportData(data);
      } catch (error) {
        console.error('Failed to load report data:', error);
        // Fallback to calculate from props
        const jobStats = jobs.reduce((acc, job) => {
          acc[job.status] = (acc[job.status] || 0) + 1;
          return acc;
        }, {});

        setReportData({
          summary: {
            totalJobs: jobs.length,
            completedJobs: jobStats['Completed'] || 0,
            pendingJobs: jobStats['Pending'] || 0,
            inProgressJobs: jobStats['In Progress'] || 0,
            totalVehicles: 0,
            totalUsers: Object.keys(users).length
          },
          jobsByStatus: jobStats,
          recentActivity: []
        });
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, [jobs, users]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error Loading Reports</h3>
          <p className="text-red-600">Unable to load report data. Please try again later.</p>
        </div>
      </div>
    );
  }

  const { summary } = reportData;

  return (
    <div className="p-6" style={{
      backgroundColor: theme === 'dark' ? '#0F172A' : '#FFFFFF',
      color: theme === 'dark' ? '#F1F5F9' : '#111827'
    }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Reports & Analytics</h1>
        <p className="text-secondary mt-1">Track performance and monitor key metrics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6" style={{
          backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF',
          borderColor: theme === 'dark' ? '#334155' : '#E5E7EB'
        }}>
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-secondary">Total Jobs</h3>
              <p className="text-2xl font-bold text-primary">{summary.totalJobs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6" style={{
          backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF',
          borderColor: theme === 'dark' ? '#334155' : '#E5E7EB'
        }}>
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-secondary">Completed</h3>
              <p className="text-2xl font-bold text-primary">{summary.completedJobs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6" style={{
          backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF',
          borderColor: theme === 'dark' ? '#334155' : '#E5E7EB'
        }}>
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-secondary">In Progress</h3>
              <p className="text-2xl font-bold text-primary">{summary.inProgressJobs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6" style={{
          backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF',
          borderColor: theme === 'dark' ? '#334155' : '#E5E7EB'
        }}>
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-secondary">Active Users</h3>
              <p className="text-2xl font-bold text-primary">{summary.totalUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Job Status Breakdown */}
      <div className="bg-white rounded-lg shadow p-6" style={{
        backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF',
        borderColor: theme === 'dark' ? '#334155' : '#E5E7EB'
      }}>
        <h2 className="text-lg font-semibold text-primary mb-4">Job Status Breakdown</h2>
        <div className="space-y-4">
          {Object.entries(reportData.jobsByStatus).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between">
              <span className="text-secondary">{status}</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3" style={{
                  backgroundColor: theme === 'dark' ? '#334155' : '#E5E7EB'
                }}>
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, (count / Math.max(summary.totalJobs, 1)) * 100)}%`
                    }}
                  ></div>
                </div>
                <span className="text-primary font-semibold min-w-[2rem] text-right">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimpleReports;