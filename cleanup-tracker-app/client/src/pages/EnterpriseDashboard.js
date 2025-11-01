/**
 * Enterprise Dashboard
 * Advanced analytics, KPIs, and real-time metrics
 */

import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  StatCard,
  Button,
  Badge,
  ProgressBar,
  Alert,
  Tabs,
  EmptyState,
  Spinner
} from '../components/ui/EnterpriseComponents';
import { V2 } from '../utils/v2Client';

export const EnterpriseDashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('7days');

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await V2.get('/reports');
      setStats(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" title="Error" icon="⚠️">
        {error}
      </Alert>
    );
  }

  // ========================================================================
  // KEY METRICS ROW
  // ========================================================================

  const KPIRow = () => (
    <Grid cols={4} gap={6}>
      <StatCard
        label="Total Jobs"
        value={stats?.periodTotal || 0}
        icon="📋"
        color="blue"
      />
      <StatCard
        label="Completed"
        value={stats?.completed || 0}
        trend="up"
        trendValue={`${stats?.completionRate || 0}%`}
        icon="✅"
        color="green"
      />
      <StatCard
        label="In Progress"
        value={stats?.periodTotal - stats?.completed || 0}
        icon="⏱️"
        color="purple"
      />
      <StatCard
        label="Avg Duration"
        value={
          stats?.detailerPerformance?.length > 0
            ? `${Math.round(
                stats.detailerPerformance.reduce((acc, p) => acc + p.avgTime, 0) /
                  stats.detailerPerformance.length
              )}m`
            : '0m'
        }
        icon="⏱️"
        color="blue"
      />
    </Grid>
  );

  // ========================================================================
  // PERFORMANCE CHART (Text-based visualization)
  // ========================================================================

  const PerformanceChart = () => (
    <Card>
      <h3 className="text-lg font-bold mb-6 text-gray-900">Team Performance</h3>
      <div className="space-y-4">
        {stats?.detailerPerformance?.length > 0 ? (
          stats.detailerPerformance
            .sort((a, b) => b.totalJobs - a.totalJobs)
            .slice(0, 5)
            .map((performer) => (
              <div key={performer.name} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">{performer.name}</span>
                  <Badge variant="primary">{performer.totalJobs} jobs</Badge>
                </div>
                <ProgressBar
                  value={performer.totalJobs}
                  max={Math.max(...stats.detailerPerformance.map(p => p.totalJobs))}
                  variant="success"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Avg: {performer.avgTime}m</span>
                  <span>Min: {performer.minTime}m | Max: {performer.maxTime}m</span>
                </div>
              </div>
            ))
        ) : (
          <EmptyState
            title="No Performance Data"
            description="Complete some jobs to see performance metrics"
          />
        )}
      </div>
    </Card>
  );

  // ========================================================================
  // SERVICE TYPE BREAKDOWN
  // ========================================================================

  const ServiceBreakdown = () => (
    <Card>
      <h3 className="text-lg font-bold mb-6 text-gray-900">Service Distribution</h3>
      <div className="space-y-4">
        {stats?.serviceTypes?.length > 0 ? (
          stats.serviceTypes
            .sort((a, b) => b.jobs - a.jobs)
            .map((service) => (
              <div key={service.name} className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">{service.name}</span>
                  <span className="text-sm text-gray-600">{service.jobs} jobs</span>
                </div>
                <ProgressBar
                  value={service.jobs}
                  max={Math.max(...stats.serviceTypes.map(s => s.jobs))}
                  variant="primary"
                />
              </div>
            ))
        ) : (
          <EmptyState title="No Service Data" />
        )}
      </div>
    </Card>
  );

  // ========================================================================
  // DAILY TRENDS
  // ========================================================================

  const DailyTrends = () => (
    <Card>
      <h3 className="text-lg font-bold mb-6 text-gray-900">Last 30 Days Activity</h3>
      <div className="space-y-2 text-sm">
        {stats?.dailyTrends?.length > 0 ? (
          stats.dailyTrends.map((day) => (
            <div key={day.date} className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">{day.date}</span>
              <div className="flex items-center gap-4 flex-1 ml-4">
                <div className="w-24">
                  <ProgressBar
                    value={day.completionRate}
                    max={100}
                    variant={day.completionRate >= 80 ? 'success' : 'warning'}
                  />
                </div>
                <div className="text-right w-20">
                  <span className="font-medium">{day.completed}/{day.jobs}</span>
                  <span className="text-gray-500 text-xs ml-2">({day.completionRate}%)</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <EmptyState title="No Activity Data" />
        )}
      </div>
    </Card>
  );

  // ========================================================================
  // QUICK ACTIONS
  // ========================================================================

  const QuickActions = () => (
    <Card>
      <h3 className="text-lg font-bold mb-4 text-gray-900">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="primary" size="md" fullWidth>
          📋 New Job
        </Button>
        <Button variant="secondary" size="md" fullWidth>
          📊 Reports
        </Button>
        <Button variant="outline" size="md" fullWidth>
          👥 Team
        </Button>
        <Button variant="ghost" size="md" fullWidth>
          ⚙️ Settings
        </Button>
      </div>
    </Card>
  );

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-8">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        {['7days', '30days', '90days'].map((range) => (
          <Button
            key={range}
            variant={timeRange === range ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setTimeRange(range)}
          >
            {range === '7days' ? 'Last 7 Days' : range === '30days' ? 'Last 30 Days' : 'Last 90 Days'}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={fetchDashboardData}>
          🔄 Refresh
        </Button>
      </div>

      {/* Key Performance Indicators */}
      <div>
        <h2 className="text-xl font-bold mb-4 text-gray-900">Key Performance Indicators</h2>
        <KPIRow />
      </div>

      {/* Analytics Section */}
      <Tabs
        defaultTab={0}
        tabs={[
          {
            label: '📈 Performance',
            content: <PerformanceChart />,
          },
          {
            label: '🏷️ Services',
            content: <ServiceBreakdown />,
          },
          {
            label: '📅 Trends',
            content: <DailyTrends />,
          },
        ]}
      />

      {/* Bottom Section */}
      <Grid cols={2} gap={6}>
        <QuickActions />
        <Card>
          <h3 className="text-lg font-bold mb-4 text-gray-900">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Database</span>
              <Badge variant="success">Connected</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">API</span>
              <Badge variant="success">Operational</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Inventory Sync</span>
              <Badge variant="warning">Last 1h ago</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Storage</span>
              <Badge variant="success">85% available</Badge>
            </div>
          </div>
        </Card>
      </Grid>
    </div>
  );
};

export default EnterpriseDashboard;
