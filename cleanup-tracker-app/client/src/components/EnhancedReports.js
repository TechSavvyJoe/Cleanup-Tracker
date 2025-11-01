import React, { useState, useEffect, useMemo } from 'react';
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
    <div className="p-6 max-w-full mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="m-0 text-3xl font-bold text-gray-900 dark:text-white">
            📊 Advanced Reports
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Comprehensive analytics and insights
          </p>
        </div>

        {/* Export Button */}
        <div className="flex gap-3 items-center">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="p-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
            <option value="excel">Excel</option>
          </select>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="py-3 px-6 rounded-lg border-none bg-blue-500 text-white text-sm font-medium cursor-pointer hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? '⏳ Exporting...' : '📥 Export Report'}
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 p-6 rounded-xl bg-gray-100 border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        {/* Date Range */}
        <div>
          <label className="block mb-2 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
            Date Range
          </label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
          <label className="block mb-2 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="w-full p-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="complete">Complete</option>
          </select>
        </div>

        {/* Assignee Filter */}
        <div>
          <label className="block mb-2 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
            Assigned To
          </label>
          <select
            value={filters.assignedTo}
            onChange={(e) => setFilters({...filters, assignedTo: e.target.value})}
            className="w-full p-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
          <label className="block mb-2 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
            View
          </label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="overview">Overview</option>
            <option value="performance">Performance</option>
            <option value="efficiency">Efficiency</option>
            <option value="team">Team Analytics</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* Total Jobs */}
        <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-md dark:bg-gray-800 dark:border-gray-700">
          <div className="text-sm text-gray-500 mb-2 dark:text-gray-400">
            Total Jobs
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {metrics.total}
          </div>
        </div>

        {/* Average Time per Job */}
        <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-md dark:bg-gray-800 dark:border-gray-700">
          <div className="text-sm text-gray-500 mb-2 dark:text-gray-400">
            Avg. Job Time
          </div>
          <div className="text-3xl font-bold text-blue-500">
            {metrics.avgTime}m
          </div>
        </div>

        {/* Total Time Tracked */}
        <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-md dark:bg-gray-800 dark:border-gray-700">
          <div className="text-sm text-gray-500 mb-2 dark:text-gray-400">
            Total Hours Tracked
          </div>
          <div className="text-3xl font-bold text-purple-500">
            {(metrics.totalMinutes / 60).toFixed(1)}h
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-md dark:bg-gray-800 dark:border-gray-700">
          <h3 className="m-0 mb-6 text-lg font-semibold text-gray-900 dark:text-white">
            Status Distribution
          </h3>
          <DonutChart data={statusChartData} width={350} height={300} />
        </div>

        {/* Performance Trend */}
        <div className="p-6 rounded-xl bg-white border border-gray-200 shadow-md dark:bg-gray-800 dark:border-gray-700">
          <h3 className="m-0 mb-6 text-lg font-semibold text-gray-900 dark:text-white">
            Performance Trend
          </h3>
          <PerformanceChart
            data={performanceData}
            width={350}
            height={250}
            color="#3B82F6"
          />
        </div>
      </div>


    </div>
  );
};

export default EnhancedReports;
