import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const SimpleReports = ({ jobs, users, theme }) => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasJobs = useMemo(() => Array.isArray(jobs) && jobs.length > 0, [jobs]);

  useEffect(() => {
    const loadReportData = async () => {
      try {
        const response = await fetch('/api/v2/reports');
        const data = await response.json();
        
        console.log('Raw API data:', data);
        
        // Transform API response to match component expectations
        const transformedData = {
          summary: {
            totalJobs: data.periodTotal || 0,
            completedJobs: data.completed || 0,
            pendingJobs: data.periodTotal - data.completed || 0,
            inProgressJobs: 0, // This would need to be calculated or provided by API
            totalVehicles: 0, // This would need to be provided by API
            totalUsers: 0 // This would need to be provided by API
          },
          jobsByStatus: {
            'Completed': data.completed || 0,
            'Pending': (data.periodTotal - data.completed) || 0,
            'In Progress': 0
          },
          recentActivity: data.dailyTrends || []
        };
        
        console.log('Transformed data:', transformedData);
        setReportData(transformedData);
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
            totalUsers: Array.isArray(users) ? users.length : (users ? Object.keys(users).length : 0)
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

  const summary = reportData?.summary;

  // Additional safety check
  if (!summary) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-yellow-800 font-semibold">Loading Reports...</h3>
          <p className="text-yellow-600">Report data is being processed. Please wait.</p>
        </div>
      </div>
    );
  }

  const formatDateValue = (value) => {
    if (!value) {
      return 'N/A';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
  };

  const buildJobExportRows = () => {
    if (!hasJobs) {
      return [];
    }

    return jobs.map((job) => ({
      ID: job.jobNumber || job.referenceNumber || job.id || job._id || 'N/A',
      Status: job.status || 'Unknown',
      'Service Type': job.serviceType || 'N/A',
      Technician: job.technicianName || job.detailerName || job.assignedTo || 'N/A',
      VIN: job.vin || 'N/A',
      Stock: job.stockNumber || 'N/A',
      Location: job.location || job.lot || 'N/A',
      Created: formatDateValue(job.createdAt || job.startTime || job.date),
      Completed: formatDateValue(job.completedAt)
    }));
  };

  const siteTitle = 'Cleanup Tracker';

  const getExportFileBase = () => {
    const stamp = new Date();
    const datePart = stamp.toISOString().slice(0, 10);
    const timePart = stamp.toTimeString().slice(0, 8).replace(/:/g, '');
    return `${siteTitle.toLowerCase().replace(/\s+/g, '-')}-report-${datePart}-${timePart}`;
  };

  // Convert a local SVG logo to a PNG data URL for embedding in PDFs
  const loadLogoDataUrl = async () => {
    const candidates = ['/brand.svg', '/favicon.svg'];
    for (const path of candidates) {
      try {
        const res = await fetch(path);
        if (!res.ok) {
          continue;
        }
        const svgText = await res.text();
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.src = url;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        // Draw to canvas at a small square size for crisp embedding
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(url);
        return canvas.toDataURL('image/png');
      } catch (e) {
        // Try next candidate
      }
    }
    return null;
  };

  const handleExportExcel = () => {
    try {
      const jobRows = buildJobExportRows();
      const workbook = XLSX.utils.book_new();

      if (jobRows.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(jobRows);
        // Auto-size columns based on content length
        const headers = ['ID', 'Status', 'Service Type', 'Technician', 'VIN', 'Stock', 'Location', 'Created', 'Completed'];
        const colWidths = headers.map((h, idx) => {
          const maxLen = Math.max(
            h.length,
            ...jobRows.map((r) => String(r[headers[idx]] ?? '').length)
          );
          // Approximate width in characters; add padding
          return { wch: Math.min(40, Math.max(10, Math.ceil(maxLen * 1.1))) };
        });
        worksheet['!cols'] = colWidths;
        // Add autofilter to header row
        worksheet['!autofilter'] = { ref: `A1:I${jobRows.length + 1}` };
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Jobs');
      } else {
        const worksheet = XLSX.utils.aoa_to_sheet([["Notice"], ["No job data available for export."]]);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Jobs');
      }

      const summarySheet = XLSX.utils.aoa_to_sheet([
        ['Metric', 'Value'],
        ['Total Jobs', summary.totalJobs || 0],
        ['Completed Jobs', summary.completedJobs || 0],
        ['Pending Jobs', summary.pendingJobs || 0],
        ['In Progress', summary.inProgressJobs || 0],
        ['Active Users', summary.totalUsers || 0]
      ]);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(blob, `${getExportFileBase()}.xlsx`);
    } catch (error) {
      console.error('Failed to export Excel report:', error);
      alert('Unable to export Excel report right now. Please try again.');
    }
  };

  const handleExportPdf = async () => {
    try {
      const doc = new jsPDF('landscape', 'pt', 'a4');
      const marginX = 48;
      const headerHeight = 60;
      const logoDataUrl = await loadLogoDataUrl();

      // Header renderer for each page
      const drawHeader = () => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const headerY = 30;
        if (logoDataUrl) {
          // Draw a small square logo
          doc.addImage(logoDataUrl, 'PNG', marginX, headerY - 18, 28, 28);
        }
        doc.setFontSize(16);
        doc.setTextColor(17, 24, 39);
        doc.text(`${siteTitle} Performance Report`, marginX + (logoDataUrl ? 36 : 0), headerY);

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated ${new Date().toLocaleString()}`, marginX + (logoDataUrl ? 36 : 0), headerY + 14);

        // Right-aligned datestamp
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(new Date().toISOString().slice(0, 10), pageWidth - marginX, headerY, { align: 'right' });

        // Divider line
        doc.setDrawColor(226, 232, 240);
        doc.line(marginX, headerY + 22, pageWidth - marginX, headerY + 22);
      };

      // Footer renderer to add page numbers after tables are added
      const drawFooters = () => {
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginX, pageHeight - 20, { align: 'right' });
          doc.text('Confidential — Cleanup Tracker', marginX, pageHeight - 20, { align: 'left' });
        }
      };

      // Summary table
      doc.autoTable({
        startY: headerHeight,
        head: [['Metric', 'Value']],
        body: [
          ['Total Jobs', summary.totalJobs || 0],
          ['Completed Jobs', summary.completedJobs || 0],
          ['Pending Jobs', summary.pendingJobs || 0],
          ['In Progress', summary.inProgressJobs || 0],
          ['Active Users', summary.totalUsers || 0]
        ],
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
        styles: { textColor: [30, 41, 59] },
        margin: { left: marginX, right: marginX },
        didDrawPage: drawHeader
      });

      // Jobs table
      const jobRows = buildJobExportRows();
      if (jobRows.length > 0) {
        const { finalY } = doc.lastAutoTable || { finalY: headerHeight };
        doc.autoTable({
          startY: finalY + 24,
          head: [['ID', 'Status', 'Service', 'Technician', 'VIN', 'Stock', 'Location', 'Created', 'Completed']],
          body: jobRows.map(row => [
            row.ID,
            row.Status,
            row['Service Type'],
            row.Technician,
            row.VIN,
            row.Stock,
            row.Location,
            row.Created,
            row.Completed
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [241, 245, 249] },
          margin: { left: marginX, right: marginX },
          didDrawPage: drawHeader
        });
      }

      drawFooters();
      doc.save(`${getExportFileBase()}.pdf`);
    } catch (error) {
      console.error('Failed to export PDF report:', error);
      alert('Unable to export PDF report right now. Please try again.');
    }
  };

  return (
    <div className="p-6" style={{
      backgroundColor: theme === 'dark' ? '#0F172A' : '#FFFFFF',
      color: theme === 'dark' ? '#F1F5F9' : '#111827'
    }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: theme === 'dark' ? '#F1F5F9' : '#111827' }}>Reports & Analytics</h1>
          <p className="mt-1" style={{ color: theme === 'dark' ? '#94A3B8' : '#6B7280' }}>Track performance and monitor key metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 rounded-full border border-gray-700/60 bg-black/40 px-3 py-1.5 text-xs font-semibold text-gray-100 transition-colors hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasJobs}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4h4v4H4V4zm0 6h4v4H4v-4zm0 6h4v4H4v-4zm6-12h10v4H10V4zm0 6h10v4H10v-4zm0 6h10v4H10v-4z" />
            </svg>
            Excel
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex items-center gap-2 rounded-full border border-gray-700/60 bg-black/40 px-3 py-1.5 text-xs font-semibold text-gray-100 transition-colors hover:bg-black/60"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9-5-9-5-9 5 9 5zm0 0v-6" />
            </svg>
            PDF
          </button>
        </div>
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
              <h3 className="text-sm font-medium" style={{ color: theme === 'dark' ? '#94A3B8' : '#6B7280' }}>Total Jobs</h3>
              <p className="text-2xl font-bold" style={{ color: theme === 'dark' ? '#F1F5F9' : '#111827' }}>{summary.totalJobs}</p>
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
              <h3 className="text-sm font-medium" style={{ color: theme === 'dark' ? '#94A3B8' : '#6B7280' }}>Completed</h3>
              <p className="text-2xl font-bold" style={{ color: theme === 'dark' ? '#F1F5F9' : '#111827' }}>{summary.completedJobs}</p>
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
              <h3 className="text-sm font-medium" style={{ color: theme === 'dark' ? '#94A3B8' : '#6B7280' }}>In Progress</h3>
              <p className="text-2xl font-bold" style={{ color: theme === 'dark' ? '#F1F5F9' : '#111827' }}>{summary.inProgressJobs}</p>
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
              <h3 className="text-sm font-medium" style={{ color: theme === 'dark' ? '#94A3B8' : '#6B7280' }}>Active Users</h3>
              <p className="text-2xl font-bold" style={{ color: theme === 'dark' ? '#F1F5F9' : '#111827' }}>{summary.totalUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Job Status Breakdown */}
      <div className="bg-white rounded-lg shadow p-6" style={{
        backgroundColor: theme === 'dark' ? '#1E293B' : '#FFFFFF',
        borderColor: theme === 'dark' ? '#334155' : '#E5E7EB'
      }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: theme === 'dark' ? '#F1F5F9' : '#111827' }}>Job Status Breakdown</h2>
        <div className="space-y-4">
          {(reportData.jobsByStatus && Object.entries(reportData.jobsByStatus).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between">
              <span style={{ color: theme === 'dark' ? '#94A3B8' : '#6B7280' }}>{status}</span>
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
                <span className="font-semibold min-w-[2rem] text-right" style={{ color: theme === 'dark' ? '#F1F5F9' : '#111827' }}>{count}</span>
              </div>
            </div>
          ))) || (
            <div className="text-center py-4">
              <p style={{ color: theme === 'dark' ? '#94A3B8' : '#6B7280' }}>No job status data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleReports;