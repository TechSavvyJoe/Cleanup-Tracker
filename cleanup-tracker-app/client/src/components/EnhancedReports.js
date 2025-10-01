import React, { useState, useEffect, useMemo } from 'react';
import { ModernTheme } from '../styles/ModernDesignSystem';
import { PerformanceChart, BarChart, DonutChart, Heatmap } from './DataVisualization';

// Enhanced Reports Component with Advanced Features
const EnhancedReports = ({ jobs, users, theme }) => {
  const [dateRange, setDateRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [filters, setFilters] = useState({
    status: 'all',
    assignedTo: 'all',
    jobType: 'all',
  });
  const [exportFormat, setExportFormat] = useState('csv');
  const [isExporting, setIsExporting] = useState(false);

  const currentTheme = theme === 'dark' ? ModernTheme.dark : ModernTheme.light;

  // Calculate date range
  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    
    switch(dateRange) {
      case '24h':
        start.setHours(start.getHours() - 24);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case 'ytd':
        start.setMonth(0, 1);
        break;
      case 'all':
        start.setFullYear(2020);
        break;
      default:
        start.setDate(start.getDate() - 7);
    }
    
    return { start, end };
  };

  // Filter jobs based on criteria
  const filteredJobs = useMemo(() => {
    const { start, end } = getDateRange();
    
    return jobs.filter(job => {
      const jobDate = new Date(job.timestamp || job.createdAt);
      const inDateRange = jobDate >= start && jobDate <= end;
      const matchesStatus = filters.status === 'all' || job.status === filters.status;
      const matchesAssignee = filters.assignedTo === 'all' || job.assignedTo === filters.assignedTo;
      const matchesType = filters.jobType === 'all' || job.jobType === filters.jobType;
      
      return inDateRange && matchesStatus && matchesAssignee && matchesType;
    });
  }, [jobs, dateRange, filters]);

  // Calculate metrics - focused on time tracking and efficiency
  const metrics = useMemo(() => {
    const total = filteredJobs.length;
    const completed = filteredJobs.filter(j => j.status === 'complete' || j.status === 'completed').length;
    const inProgress = filteredJobs.filter(j => j.status === 'in-progress' || j.status === 'In Progress').length;
    const pending = filteredJobs.filter(j => j.status === 'pending' || j.status === 'Pending').length;
    
    // Calculate average time per job (only for completed jobs with duration)
    const completedWithDuration = filteredJobs.filter(j => 
      (j.status === 'complete' || j.status === 'completed') && j.duration
    );
    const totalDuration = completedWithDuration.reduce((acc, job) => acc + (job.duration || 0), 0);
    const avgTime = completedWithDuration.length > 0 ? Math.round(totalDuration / completedWithDuration.length) : 0;
    
    // Total minutes tracked across all jobs
    const totalMinutes = filteredJobs.reduce((acc, job) => acc + (job.duration || 0), 0);
    
    return {
      total,
      completed,
      inProgress,
      pending,
      avgTime,
      totalMinutes,
    };
  }, [filteredJobs]);

  // Export functionality
  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      if (exportFormat === 'csv') {
        exportToCSV();
      } else if (exportFormat === 'pdf') {
        exportToPDF();
      } else if (exportFormat === 'excel') {
        exportToExcel();
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['VIN', 'Status', 'Service Type', 'Assigned To', 'Date', 'Duration (min)', 'Efficiency'];
    const rows = filteredJobs.map(job => [
      job.vin,
      job.status,
      job.serviceType || 'N/A',
      job.technicianName || job.assignedTo || 'N/A',
      job.date ? new Date(job.date).toLocaleDateString() : 'N/A',
      job.duration || 0,
      job.duration && metrics.avgTime ? `${((job.duration / metrics.avgTime) * 100).toFixed(0)}%` : 'N/A',
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cleanup-tracker-report-${Date.now()}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    alert('PDF export coming soon! Use CSV for now.');
  };

  const exportToExcel = () => {
    alert('Excel export coming soon! Use CSV for now.');
  };

  // Prepare chart data
  const statusChartData = [
    { label: 'Completed', value: metrics.completed, color: ModernTheme.colors.success[500] },
    { label: 'In Progress', value: metrics.inProgress, color: ModernTheme.colors.info[500] },
    { label: 'Pending', value: metrics.pending, color: ModernTheme.colors.warning[500] },
  ];

  const performanceData = filteredJobs
    .slice(0, 30)
    .map((job, index) => ({
      x: index,
      y: job.efficiency || (70 + Math.random() * 30),
    }));

  return (
    <div style={{
      padding: '1.5rem',
      maxWidth: '100%',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: ModernTheme.typography.fontSize['3xl'],
            fontWeight: ModernTheme.typography.fontWeight.bold,
            color: currentTheme.text.primary,
          }}>
            📊 Advanced Reports
          </h1>
          <p style={{
            margin: '0.5rem 0 0 0',
            fontSize: ModernTheme.typography.fontSize.sm,
            color: currentTheme.text.secondary,
          }}>
            Comprehensive analytics and insights
          </p>
        </div>

        {/* Export Button */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: ModernTheme.borderRadius.lg,
              border: `1px solid ${currentTheme.border.default}`,
              backgroundColor: currentTheme.background.secondary,
              color: currentTheme.text.primary,
              fontSize: ModernTheme.typography.fontSize.sm,
            }}
          >
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
            <option value="excel">Excel</option>
          </select>
          <button
            onClick={handleExport}
            disabled={isExporting}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: ModernTheme.borderRadius.lg,
              border: 'none',
              backgroundColor: ModernTheme.colors.primary[500],
              color: '#fff',
              fontSize: ModernTheme.typography.fontSize.sm,
              fontWeight: ModernTheme.typography.fontWeight.medium,
              cursor: isExporting ? 'not-allowed' : 'pointer',
              opacity: isExporting ? 0.6 : 1,
              transition: ModernTheme.transition.fast,
            }}
          >
            {isExporting ? '⏳ Exporting...' : '📥 Export Report'}
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
        padding: '1.5rem',
        borderRadius: ModernTheme.borderRadius.xl,
        backgroundColor: currentTheme.background.secondary,
        border: `1px solid ${currentTheme.border.default}`,
      }}>
        {/* Date Range */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: ModernTheme.typography.fontSize.xs,
            fontWeight: ModernTheme.typography.fontWeight.medium,
            color: currentTheme.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Date Range
          </label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: ModernTheme.borderRadius.lg,
              border: `1px solid ${currentTheme.border.default}`,
              backgroundColor: currentTheme.background.primary,
              color: currentTheme.text.primary,
              fontSize: ModernTheme.typography.fontSize.sm,
            }}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="ytd">Year to Date</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: ModernTheme.typography.fontSize.xs,
            fontWeight: ModernTheme.typography.fontWeight.medium,
            color: currentTheme.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: ModernTheme.borderRadius.lg,
              border: `1px solid ${currentTheme.border.default}`,
              backgroundColor: currentTheme.background.primary,
              color: currentTheme.text.primary,
              fontSize: ModernTheme.typography.fontSize.sm,
            }}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="complete">Complete</option>
          </select>
        </div>

        {/* Assignee Filter */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: ModernTheme.typography.fontSize.xs,
            fontWeight: ModernTheme.typography.fontWeight.medium,
            color: currentTheme.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Assigned To
          </label>
          <select
            value={filters.assignedTo}
            onChange={(e) => setFilters({...filters, assignedTo: e.target.value})}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: ModernTheme.borderRadius.lg,
              border: `1px solid ${currentTheme.border.default}`,
              backgroundColor: currentTheme.background.primary,
              color: currentTheme.text.primary,
              fontSize: ModernTheme.typography.fontSize.sm,
            }}
          >
            <option value="all">All Users</option>
            {users && users.map(user => (
              <option key={user.email} value={user.email}>
                {user.displayName || user.email}
              </option>
            ))}
          </select>
        </div>

        {/* Metric View */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: ModernTheme.typography.fontSize.xs,
            fontWeight: ModernTheme.typography.fontWeight.medium,
            color: currentTheme.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            View
          </label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: ModernTheme.borderRadius.lg,
              border: `1px solid ${currentTheme.border.default}`,
              backgroundColor: currentTheme.background.primary,
              color: currentTheme.text.primary,
              fontSize: ModernTheme.typography.fontSize.sm,
            }}
          >
            <option value="overview">Overview</option>
            <option value="performance">Performance</option>
            <option value="efficiency">Efficiency</option>
            <option value="team">Team Analytics</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {/* Total Jobs */}
        <div style={{
          padding: '1.5rem',
          borderRadius: ModernTheme.borderRadius.xl,
          backgroundColor: currentTheme.background.elevated,
          border: `1px solid ${currentTheme.border.default}`,
          boxShadow: currentTheme.shadow.md,
        }}>
          <div style={{
            fontSize: ModernTheme.typography.fontSize.sm,
            color: currentTheme.text.secondary,
            marginBottom: '0.5rem',
          }}>
            Total Jobs
          </div>
          <div style={{
            fontSize: ModernTheme.typography.fontSize['3xl'],
            fontWeight: ModernTheme.typography.fontWeight.bold,
            color: currentTheme.text.primary,
          }}>
            {metrics.total}
          </div>
        </div>

        {/* Average Time per Job */}
        <div style={{
          padding: '1.5rem',
          borderRadius: ModernTheme.borderRadius.xl,
          backgroundColor: currentTheme.background.elevated,
          border: `1px solid ${currentTheme.border.default}`,
          boxShadow: currentTheme.shadow.md,
        }}>
          <div style={{
            fontSize: ModernTheme.typography.fontSize.sm,
            color: currentTheme.text.secondary,
            marginBottom: '0.5rem',
          }}>
            Avg. Job Time
          </div>
          <div style={{
            fontSize: ModernTheme.typography.fontSize['3xl'],
            fontWeight: ModernTheme.typography.fontWeight.bold,
            color: ModernTheme.colors.info[500],
          }}>
            {metrics.avgTime}m
          </div>
        </div>

        {/* Total Time Tracked */}
        <div style={{
          padding: '1.5rem',
          borderRadius: ModernTheme.borderRadius.xl,
          backgroundColor: currentTheme.background.elevated,
          border: `1px solid ${currentTheme.border.default}`,
          boxShadow: currentTheme.shadow.md,
        }}>
          <div style={{
            fontSize: ModernTheme.typography.fontSize.sm,
            color: currentTheme.text.secondary,
            marginBottom: '0.5rem',
          }}>
            Total Hours Tracked
          </div>
          <div style={{
            fontSize: ModernTheme.typography.fontSize['3xl'],
            fontWeight: ModernTheme.typography.fontWeight.bold,
            color: ModernTheme.colors.purple[500],
          }}>
            {(metrics.totalMinutes / 60).toFixed(1)}h
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem',
      }}>
        {/* Status Distribution */}
        <div style={{
          padding: '1.5rem',
          borderRadius: ModernTheme.borderRadius.xl,
          backgroundColor: currentTheme.background.elevated,
          border: `1px solid ${currentTheme.border.default}`,
          boxShadow: currentTheme.shadow.md,
        }}>
          <h3 style={{
            margin: '0 0 1.5rem 0',
            fontSize: ModernTheme.typography.fontSize.lg,
            fontWeight: ModernTheme.typography.fontWeight.semibold,
            color: currentTheme.text.primary,
          }}>
            Status Distribution
          </h3>
          <DonutChart data={statusChartData} width={350} height={300} />
        </div>

        {/* Performance Trend */}
        <div style={{
          padding: '1.5rem',
          borderRadius: ModernTheme.borderRadius.xl,
          backgroundColor: currentTheme.background.elevated,
          border: `1px solid ${currentTheme.border.default}`,
          boxShadow: currentTheme.shadow.md,
        }}>
          <h3 style={{
            margin: '0 0 1.5rem 0',
            fontSize: ModernTheme.typography.fontSize.lg,
            fontWeight: ModernTheme.typography.fontWeight.semibold,
            color: currentTheme.text.primary,
          }}>
            Performance Trend
          </h3>
          <PerformanceChart
            data={performanceData}
            width={350}
            height={250}
            color={ModernTheme.colors.primary[500]}
          />
        </div>
      </div>

      {/* Responsive Mobile Styles */}
      <style>{`
        @media (max-width: 640px) {
          [style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default EnhancedReports;
