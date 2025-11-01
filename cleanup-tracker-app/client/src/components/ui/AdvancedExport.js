/**
 * Advanced Export & Reporting System
 * Multi-format export (PDF, CSV, Excel, JSON) with customization
 */

import React, { useState } from 'react';

// ============================================================================
// EXPORT DIALOG
// ============================================================================

export const ExportDialog = ({ data = [], columns = [], onClose, title = 'Export Data' }) => {
  const [format, setFormat] = useState('csv');
  const [selectedColumns, setSelectedColumns] = useState(columns.map((c) => c.key));
  const [includeFormatting, setIncludeFormatting] = useState(true);
  const [dateRange, setDateRange] = useState('all');

  const handleColumnToggle = (columnKey) => {
    setSelectedColumns((prev) =>
      prev.includes(columnKey)
        ? prev.filter((c) => c !== columnKey)
        : [...prev, columnKey]
    );
  };

  const handleExport = () => {
    const filteredColumns = columns.filter((c) => selectedColumns.includes(c.key));
    const filteredData = data.map((row) =>
      Object.fromEntries(filteredColumns.map((col) => [col.key, row[col.key]]))
    );

    switch (format) {
      case 'csv':
        exportCSV(filteredData, filteredColumns);
        break;
      case 'json':
        exportJSON(filteredData);
        break;
      case 'excel':
        exportExcel(filteredData, filteredColumns);
        break;
      case 'pdf':
        exportPDF(filteredData, filteredColumns);
        break;
      default:
        break;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        {/* Format Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Export Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'csv', label: 'CSV', description: 'Spreadsheet format' },
              { id: 'excel', label: 'Excel', description: 'XLSX format' },
              { id: 'json', label: 'JSON', description: 'JSON format' },
              { id: 'pdf', label: 'PDF', description: 'Document format' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`
                  p-4 rounded-lg border-2 transition-all text-left
                  ${
                    format === f.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <p className="font-semibold text-gray-900">{f.label}</p>
                <p className="text-xs text-gray-600">{f.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Column Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Select Columns
          </label>
          <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
            {columns.map((col) => (
              <label key={col.key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(col.key)}
                  onChange={() => handleColumnToggle(col.key)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">{col.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeFormatting}
              onChange={(e) => setIncludeFormatting(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">
              Include formatting (colors, headers)
            </span>
          </label>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">All data</option>
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex-1 px-4 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

const buildCsv = (data, columns) => {
  const headers = columns.map((c) => c.label).join(',');
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        const stringValue = String(value ?? '');
        return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
      })
      .join(',')
  );

  return [headers, ...rows].join('\n');
};

const exportCSV = (data, columns) => {
  const csv = buildCsv(data, columns);
  downloadFile(csv, 'export.csv', 'text/csv');
};

const exportJSON = (data) => {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, 'export.json', 'application/json');
};

const exportExcel = (data, columns) => {
  // Simple Excel-compatible CSV (for a true XLSX export, integrate a library such as xlsx)
  const csv = buildCsv(data, columns);
  downloadFile(csv, 'export.xlsx', 'text/csv');
};

const exportPDF = (data, columns) => {
  // PDF export would require a library like jsPDF
  // For now, we'll create a simple HTML-to-PDF approach
  const html = generatePDFHTML(data, columns);
  downloadFile(html, 'export.pdf', 'text/html');
};

const generatePDFHTML = (data, columns) => {
  const table = `
    <table border="1" cellpadding="8">
      <thead>
        <tr>
          ${columns.map((c) => `<th>${c.label}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data.map((row) => `
          <tr>
            ${columns.map((c) => `<td>${row[c.key] || ''}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Export</title>
        <style>
          body { font-family: Arial; margin: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #3b82f6; color: white; text-align: left; }
        </style>
      </head>
      <body>
        ${table}
      </body>
    </html>
  `;
};

const downloadFile = (content, filename, type) => {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// ============================================================================
// REPORT TEMPLATE
// ============================================================================

export const ReportTemplate = ({ title, sections = [] }) => {
  return (
    <div className="space-y-8 p-8 bg-white">
      {/* Header */}
      <div className="border-b-2 border-gray-300 pb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600">Generated on {new Date().toLocaleDateString()}</p>
      </div>

      {/* Sections */}
      {sections.map((section, idx) => (
        <div key={idx} className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 border-b pb-3">
            {section.title}
          </h2>

          {section.type === 'table' && (
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  {section.columns.map((col) => (
                    <th key={col} className="border border-gray-300 p-3 text-left font-semibold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.data.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {section.columns.map((col) => (
                      <td key={col} className="border border-gray-300 p-3">
                        {row[col]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {section.type === 'text' && (
            <p className="text-gray-700 leading-relaxed">{section.content}</p>
          )}

          {section.type === 'chart' && (
            <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
              Chart visualization would render here
            </div>
          )}
        </div>
      ))}

      {/* Footer */}
      <div className="border-t-2 border-gray-300 pt-8 text-center text-sm text-gray-600">
        <p>Confidential - For authorized use only</p>
      </div>
    </div>
  );
};

const AdvancedExport = {
  ExportDialog,
  ReportTemplate,
};

export default AdvancedExport;
