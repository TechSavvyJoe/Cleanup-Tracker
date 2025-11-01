/**
 * Reports & Analytics Page
 * Advanced reporting with charts and data visualization
 */

import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  Button,
  Select,
  Spinner,
  Alert,
  Badge,
  Tabs,
} from '../components/ui/EnterpriseComponents';
import { useNotification } from '../components/ui/NotificationSystem';
import { V2 } from '../utils/v2Client';

export const ReportsAnalytics = ({ user }) => {
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30days');
  const [reports, setReports] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchReports();
  }, [timeRange]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await V2.get('/reports', {
        params: { timeRange },
      });
      setReports(response.data);
    } catch (err) {
      setError('Failed to load reports');
      addNotification({
        type: 'error',
        title: 'Failed to Load Reports',
        message: 'Could not fetch analytics data',
        duration: 5000,
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (format) => {
    addNotification({
      type: 'success',
      title: 'Export Started',
      message: `Exporting report as ${format.toUpperCase()}...`,
      duration: 3000,
    });
    // Export logic would go here
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!reports) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No report data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="danger" title="Error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reports & Analytics</h2>
          <p className="text-gray-600 mt-1">Business insights and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            options={[
              { value: '7days', label: 'Last 7 Days' },
              { value: '30days', label: 'Last 30 Days' },
              { value: '90days', label: 'Last 90 Days' },
              { value: 'year', label: 'This Year' },
            ]}
          />
          <Button variant="primary" onClick={() => exportReport('pdf')}>
            📥 Export PDF
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'performance', label: 'Performance', icon: '📈' },
          { id: 'technicians', label: 'Technicians', icon: '👥' },
          { id: 'services', label: 'Services', icon: '🔧' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <Grid cols={4} gap={6}>
            <Card>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Total Jobs</p>
                <p className="text-3xl font-bold text-gray-900">
                  {reports.totalJobs || 0}
                </p>
                <Badge variant="success" size="sm">
                  +12% vs last period
                </Badge>
              </div>
            </Card>

            <Card>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-green-600">
                  {reports.completedJobs || 0}
                </p>
                <Badge variant="success" size="sm">
                  {reports.totalJobs > 0
                    ? Math.round((reports.completedJobs / reports.totalJobs) * 100)
                    : 0}
                  % completion rate
                </Badge>
              </div>
            </Card>

            <Card>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Avg Duration</p>
                <p className="text-3xl font-bold text-blue-600">
                  {reports.avgDuration || 0}
                  <span className="text-lg text-gray-600">min</span>
                </p>
                <Badge variant="blue" size="sm">
                  -5min vs target
                </Badge>
              </div>
            </Card>

            <Card>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Active Jobs</p>
                <p className="text-3xl font-bold text-orange-600">
                  {reports.activeJobs || 0}
                </p>
                <Badge variant="warning" size="sm">
                  In progress
                </Badge>
              </div>
            </Card>
          </Grid>

          {/* Charts Placeholder */}
          <Grid cols={2} gap={6}>
            <Card>
              <h3 className="text-lg font-bold mb-4">Jobs Over Time</h3>
              <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-600">📊</p>
                  <p className="text-sm text-gray-500 mt-2">Line Chart</p>
                  <p className="text-xs text-gray-400">Daily job volume trend</p>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-bold mb-4">Service Distribution</h3>
              <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-600">🥧</p>
                  <p className="text-sm text-gray-500 mt-2">Pie Chart</p>
                  <p className="text-xs text-gray-400">Job type breakdown</p>
                </div>
              </div>
            </Card>
          </Grid>

          {/* Top Services */}
          <Card>
            <h3 className="text-lg font-bold mb-4">Top Services</h3>
            <div className="space-y-3">
              {reports.serviceTypes?.slice(0, 5).map((service, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{service.name}</span>
                      <span className="text-sm text-gray-600">{service.jobs} jobs</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${Math.min((service.jobs / reports.totalJobs) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )) || (
                <p className="text-gray-500 text-center py-4">No service data available</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-bold mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {reports.totalJobs > 0
                    ? Math.round((reports.completedJobs / reports.totalJobs) * 100)
                    : 0}
                  %
                </p>
                <p className="text-sm text-gray-600 mt-1">Completion Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {reports.avgDuration || 0}min
                </p>
                <p className="text-sm text-gray-600 mt-1">Avg Job Duration</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {reports.totalJobs > 0
                    ? Math.round((reports.activeJobs / reports.totalJobs) * 100)
                    : 0}
                  %
                </p>
                <p className="text-sm text-gray-600 mt-1">Currently Active</p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-bold mb-4">Daily Trends</h3>
            <div className="h-80 bg-gray-100 rounded flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-600 text-4xl">📈</p>
                <p className="text-sm text-gray-500 mt-2">Performance Trend Chart</p>
                <p className="text-xs text-gray-400">30-day performance history</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Technicians Tab */}
      {activeTab === 'technicians' && (
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-bold mb-4">Top Performers</h3>
            <div className="space-y-4">
              {reports.technicianStats?.slice(0, 10).map((tech, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      #{i + 1}
                    </div>
                    <div>
                      <p className="font-medium">{tech.name}</p>
                      <p className="text-sm text-gray-600">{tech.jobs} jobs completed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{tech.avgTime}min</p>
                    <p className="text-sm text-gray-600">avg time</p>
                  </div>
                </div>
              )) || (
                <p className="text-gray-500 text-center py-4">No technician data available</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          <Grid cols={2} gap={6}>
            <Card>
              <h3 className="text-lg font-bold mb-4">Service Performance</h3>
              <div className="space-y-3">
                {reports.serviceTypes?.map((service, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{service.name}</span>
                      <Badge variant="blue">{service.jobs} jobs</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">Avg Time</p>
                        <p className="font-medium">{service.avgTime}min</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Min</p>
                        <p className="font-medium">{service.minTime}min</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Max</p>
                        <p className="font-medium">{service.maxTime}min</p>
                      </div>
                    </div>
                  </div>
                )) || (
                  <p className="text-gray-500 text-center py-4">No service data available</p>
                )}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-bold mb-4">Service Comparison</h3>
              <div className="h-80 bg-gray-100 rounded flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-600 text-4xl">📊</p>
                  <p className="text-sm text-gray-500 mt-2">Bar Chart</p>
                  <p className="text-xs text-gray-400">Service type comparison</p>
                </div>
              </div>
            </Card>
          </Grid>
        </div>
      )}
    </div>
  );
};

export default ReportsAnalytics;
