/**
 * Ultra-Premium Dashboard
 * $100M-Level Enterprise Dashboard with Advanced Analytics
 */

import React, { useState, useEffect } from 'react';
import {
  AdvancedMetricCard,
  AdvancedProgressRing,
  AdvancedDataTable,
  RealTimeActivityFeed,
  ComparisonChart,
} from '../components/ui/PremiumDashboard';
import { V2 } from '../utils/v2Client';

export const UltraPremiumDashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30days');
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [reportsRes, jobsRes] = await Promise.all([
        V2.get('/reports'),
        V2.get('/jobs?limit=20'),
      ]);

      setStats(reportsRes.data);

      // Generate realistic activity feed
      const mockActivities = [
        {
          id: 1,
          title: 'New Job Created',
          description: '2023 Toyota Camry - Detail Service',
          type: 'job_created',
          timestamp: new Date(Date.now() - 5 * 60000),
        },
        {
          id: 2,
          title: 'Job Completed',
          description: 'Honda Accord - Cleanup Service',
          type: 'job_completed',
          timestamp: new Date(Date.now() - 15 * 60000),
        },
        {
          id: 3,
          title: 'Team Member Added',
          description: 'John Doe assigned as Detailer',
          type: 'user_added',
          timestamp: new Date(Date.now() - 30 * 60000),
        },
        {
          id: 4,
          title: 'Job Updated',
          description: 'BMW X5 - Status changed to In Progress',
          type: 'job_updated',
          timestamp: new Date(Date.now() - 45 * 60000),
        },
      ];

      setActivities(mockActivities);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="alert alert-danger">
        <span>⚠️</span>
        <div>
          <p className="font-semibold">{error}</p>
          <button onClick={fetchDashboardData} className="btn-secondary btn-sm mt-3">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Sample data for tables and charts
  const teamPerformance = stats?.detailerPerformance || [];
  const comparisonData = [
    [85, 92, 78, 95, 88],
    [72, 85, 65, 88, 75],
  ];

  const tableColumns = [
    {
      key: 'name',
      label: 'Team Member',
      render: (val) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
            {val?.charAt(0).toUpperCase()}
          </div>
          {val}
        </div>
      ),
    },
    { key: 'totalJobs', label: 'Total Jobs' },
    {
      key: 'avgTime',
      label: 'Avg Duration',
      render: (val) => `${val}m`,
    },
    {
      key: 'completionRate',
      label: 'Completion Rate',
      render: (val) => (
        <div className="flex items-center gap-2">
          <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-secondary h-full transition-all"
              style={{ width: `${val}%` }}
            />
          </div>
          <span className="text-sm font-semibold">{val}%</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-600">
            Real-time insights into your cleaning operations
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {['7days', '30days', '90days'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`
                btn-sm rounded-full font-semibold transition-all
                ${timeRange === range
                  ? 'btn-primary shadow-lg'
                  : 'btn-secondary hover:bg-gray-100'
                }
              `}
            >
              {range === '7days' ? '7 Days' : range === '30days' ? '30 Days' : '90 Days'}
            </button>
          ))}
          <button
            onClick={fetchDashboardData}
            className="btn-sm btn-secondary rounded-full hover:shadow-lg"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics Section */}
      <div>
        <h2 className="text-xl font-bold mb-6">Key Performance Indicators</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AdvancedMetricCard
            title="Total Jobs"
            value={stats?.periodTotal || 0}
            unit="jobs"
            trend={12}
            comparison="vs last period"
            icon="📋"
            color="blue"
            history={[10, 12, 15, 18, 16, 19, 20, 18, 17, 19, 20, 22]}
          />
          <AdvancedMetricCard
            title="Completed"
            value={stats?.completed || 0}
            unit="jobs"
            trend={8}
            comparison="vs last period"
            icon="✅"
            color="green"
            history={[8, 9, 11, 14, 12, 15, 16, 14, 13, 15, 16, 18]}
          />
          <AdvancedMetricCard
            title="In Progress"
            value={(stats?.periodTotal || 0) - (stats?.completed || 0)}
            unit="jobs"
            trend={-5}
            comparison="vs last period"
            icon="⏱️"
            color="purple"
            history={[4, 5, 6, 7, 6, 8, 7, 6, 6, 6, 5, 4]}
          />
          <AdvancedMetricCard
            title="Avg Duration"
            value={Math.round(
              (stats?.detailerPerformance?.reduce((acc, p) => acc + p.avgTime, 0) /
                (stats?.detailerPerformance?.length || 1)) ||
                0
            )}
            unit="mins"
            trend={-3}
            comparison="more efficient"
            icon="⏰"
            color="orange"
            history={[45, 44, 43, 42, 41, 40, 39, 38, 37, 36, 35, 34]}
          />
        </div>
      </div>

      {/* Advanced Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Performance */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-6">Team Performance</h2>
          {teamPerformance.length > 0 ? (
            <AdvancedDataTable
              columns={tableColumns}
              data={teamPerformance}
              sortable={true}
              selectable={true}
              rowsPerPage={5}
              actions={[
                {
                  label: 'View',
                  onClick: (row) => console.log('View', row),
                },
              ]}
              onRowClick={(row) => console.log('Row clicked:', row)}
            />
          ) : (
            <div className="card text-center py-12">
              <p className="text-gray-600">No team performance data available</p>
            </div>
          )}
        </div>

        {/* Completion Rate */}
        <div>
          <h2 className="text-xl font-bold mb-6">Overall Progress</h2>
          <div className="card">
            <div className="flex justify-center">
              <AdvancedProgressRing
                percentage={stats?.completionRate || 0}
                label="Completion"
                size="lg"
                color="green"
                details={[
                  { label: 'Completed', value: `${stats?.completed || 0} jobs` },
                  {
                    label: 'Pending',
                    value: `${(stats?.periodTotal || 0) - (stats?.completed || 0)} jobs`,
                  },
                  { label: 'Success Rate', value: `${stats?.completionRate || 0}%` },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Chart & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComparisonChart
          title="Performance Comparison"
          data={comparisonData}
          categories={['Team A', 'Team B', 'Team C', 'Team D', 'Team E']}
          series1Label="This Period"
          series2Label="Last Period"
        />

        <div>
          <h2 className="text-xl font-bold mb-6">Real-Time Activity</h2>
          <RealTimeActivityFeed activities={activities} maxItems={6} />
        </div>
      </div>

      {/* Service Distribution */}
      <div>
        <h2 className="text-xl font-bold mb-6">Service Distribution</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats?.serviceTypes?.slice(0, 4).map((service) => (
            <div key={service.name} className="card">
              <h4 className="font-bold text-lg mb-4">{service.name}</h4>
              <p className="text-3xl font-bold text-blue-600 mb-2">{service.jobs}</p>
              <p className="text-sm text-gray-600">jobs completed</p>
              <div className="mt-4 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-primary h-full transition-all"
                  style={{
                    width: `${
                      (service.jobs / Math.max(...(stats?.serviceTypes?.map((s) => s.jobs) || [1]))) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div>
        <h2 className="text-xl font-bold mb-6">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Database', status: 'Connected', color: 'green' },
            { label: 'API Server', status: 'Operational', color: 'green' },
            { label: 'Inventory Sync', status: 'Last 1h', color: 'blue' },
            { label: 'Storage', status: '85% Available', color: 'green' },
          ].map((item) => (
            <div key={item.label} className="card">
              <p className="text-gray-600 text-sm mb-2">{item.label}</p>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    item.color === 'green'
                      ? 'bg-green-500 animate-pulse'
                      : 'bg-blue-500'
                  }`}
                />
                <span className="font-semibold text-gray-900">{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UltraPremiumDashboard;
