/**
 * Premium Enterprise Dashboard
 * Ultra-sophisticated analytics, real-time metrics, and advanced visualizations
 * $100M-level design and functionality
 */

import React, { useState } from 'react';

// ============================================================================
// ADVANCED METRIC CARD WITH TREND ANALYSIS
// ============================================================================

export const AdvancedMetricCard = ({
  title,
  value,
  unit = '',
  trend = 0,
  comparison = 'vs last period',
  icon = '📊',
  color = 'blue',
  detailed = false,
  history = [],
  onClick,
}) => {
  const colorMap = {
    blue: 'from-blue-600 to-blue-400',
    green: 'from-emerald-600 to-emerald-400',
    purple: 'from-purple-600 to-purple-400',
    orange: 'from-orange-600 to-orange-400',
    red: 'from-red-600 to-red-400',
    pink: 'from-pink-600 to-pink-400',
  };

  const trendColor = trend >= 0 ? 'text-emerald-500' : 'text-red-500';
  const trendIcon = trend >= 0 ? '↑' : '↓';

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-2xl p-6 cursor-pointer
        transition-all duration-300 transform hover:scale-105 hover:shadow-2xl
        bg-gradient-to-br ${colorMap[color]}
        text-white group
      `}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 bg-white" />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-white/80 text-sm font-medium">{title}</p>
            <h3 className="text-4xl font-bold mt-2">
              {value}
              {unit && <span className="text-lg ml-2 font-semibold">{unit}</span>}
            </h3>
          </div>
          <div className="text-4xl opacity-80">{icon}</div>
        </div>

        {/* Trend indicator */}
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${trendColor}`}>
            {trendIcon} {Math.abs(trend)}%
          </span>
          <span className="text-xs text-white/70">{comparison}</span>
        </div>

        {/* Mini chart representation */}
        {history.length > 0 && (
          <div className="mt-4 flex items-end gap-1 h-8">
            {history.slice(-12).map((v, i) => (
              <div
                key={i}
                className="flex-1 bg-white/30 rounded-t transition-all duration-300"
                style={{
                  height: `${(v / Math.max(...history)) * 100}%`,
                  minHeight: '2px',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Hover border effect */}
      <div className="absolute inset-0 rounded-2xl border-2 border-white/0 group-hover:border-white/30 transition-all duration-300" />
    </div>
  );
};

// ============================================================================
// ADVANCED PROGRESS RING WITH DETAILS
// ============================================================================

export const AdvancedProgressRing = ({
  percentage = 0,
  label = 'Progress',
  size = 'md',
  color = 'blue',
  details = [],
  animated = true,
  showLabel = true,
}) => {
  const sizeMap = {
    sm: { radius: 30, strokeWidth: 3 },
    md: { radius: 45, strokeWidth: 4 },
    lg: { radius: 60, strokeWidth: 5 },
  };

  const config = sizeMap[size];
  const circumference = 2 * Math.PI * config.radius;
  const offset = circumference - (percentage / 100) * circumference;

  const colorMap = {
    blue: 'url(#gradientBlue)',
    green: 'url(#gradientGreen)',
    purple: 'url(#gradientPurple)',
    orange: 'url(#gradientOrange)',
  };

  return (
    <div className="flex flex-col items-center">
      <svg
        width={config.radius * 2 + config.strokeWidth * 2}
        height={config.radius * 2 + config.strokeWidth * 2}
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient id="gradientBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="gradientGreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="gradientPurple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>
          <linearGradient id="gradientOrange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
        </defs>

        {/* Background circle */}
        <circle
          cx={config.radius + config.strokeWidth}
          cy={config.radius + config.strokeWidth}
          r={config.radius}
          stroke="#e5e7eb"
          strokeWidth={config.strokeWidth}
          fill="none"
        />

        {/* Progress circle */}
        <circle
          cx={config.radius + config.strokeWidth}
          cy={config.radius + config.strokeWidth}
          r={config.radius}
          stroke={colorMap[color]}
          strokeWidth={config.strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={animated ? 'transition-all duration-1000' : ''}
        />
      </svg>

      {/* Center text */}
      <div className="absolute flex flex-col items-center mt-2">
        {showLabel && (
          <>
            <span className="text-3xl font-bold text-gray-900">{percentage}%</span>
            <span className="text-xs text-gray-500 mt-1">{label}</span>
          </>
        )}
      </div>

      {/* Details below */}
      {details.length > 0 && (
        <div className="mt-6 w-full space-y-2">
          {details.map((detail, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-gray-600">{detail.label}</span>
              <span className="font-semibold text-gray-900">{detail.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ADVANCED DATA TABLE WITH SORTING AND PAGINATION
// ============================================================================

export const AdvancedDataTable = ({
  columns = [],
  data = [],
  sortable = true,
  selectable = true,
  rowsPerPage = 10,
  actions,
  onRowClick,
  striped = true,
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedRows, setSelectedRows] = useState(new Set());

  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return data;

    const sorted = [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [data, sortConfig]);

  const paginatedData = sortedData.slice(
    currentPage * rowsPerPage,
    (currentPage + 1) * rowsPerPage
  );

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedData.map((_, idx) => idx)));
    }
  };

  const totalPages = Math.ceil(data.length / rowsPerPage);

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-lg">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <tr>
              {selectable && (
                <th className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length}
                    onChange={handleSelectAll}
                    className="rounded cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`
                    px-6 py-4 text-left text-sm font-semibold text-gray-700
                    ${sortable ? 'cursor-pointer hover:bg-gray-200 transition-colors' : ''}
                  `}
                  onClick={() => sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-2">
                    {col.label}
                    {sortable && sortConfig.key === col.key && (
                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
              {actions && <th className="px-6 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <tr
                key={idx}
                className={`
                  border-b border-gray-100 transition-colors duration-200
                  ${selectedRows.has(idx) ? 'bg-blue-50' : ''}
                  ${striped && idx % 2 === 0 ? 'bg-gray-50' : ''}
                  hover:bg-blue-100 cursor-pointer
                `}
                onClick={() => onRowClick?.(row)}
              >
                {selectable && (
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(idx)}
                      onChange={(e) => {
                        e.stopPropagation();
                        const newSelected = new Set(selectedRows);
                        if (newSelected.has(idx)) {
                          newSelected.delete(idx);
                        } else {
                          newSelected.add(idx);
                        }
                        setSelectedRows(newSelected);
                      }}
                      className="rounded cursor-pointer"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td
                    key={`${idx}-${col.key}`}
                    className="px-6 py-4 text-sm text-gray-800"
                  >
                    {col.render
                      ? col.render(row[col.key], row)
                      : row[col.key]}
                  </td>
                ))}
                {actions && (
                  <td
                    className="px-6 py-4 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-end gap-2">
                      {actions.map((action, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={() => action.onClick(row)}
                          className={`
                            px-3 py-1 rounded text-sm font-medium
                            transition-all duration-200
                            ${action.variant === 'danger'
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }
                          `}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <span className="text-sm text-gray-600">
            Showing {currentPage * rowsPerPage + 1} to{' '}
            {Math.min((currentPage + 1) * rowsPerPage, data.length)} of {data.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-200"
            >
              ← Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`
                  px-3 py-1 rounded font-medium transition-all
                  ${i === currentPage
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 hover:bg-gray-200'
                  }
                `}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-200"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// REAL-TIME ACTIVITY FEED
// ============================================================================

export const RealTimeActivityFeed = ({ activities = [], maxItems = 8 }) => {
  const getActivityColor = (type) => {
    const colors = {
      job_created: 'from-blue-500 to-blue-400',
      job_completed: 'from-green-500 to-green-400',
      user_added: 'from-purple-500 to-purple-400',
      job_updated: 'from-orange-500 to-orange-400',
      error: 'from-red-500 to-red-400',
    };
    return colors[type] || 'from-gray-500 to-gray-400';
  };

  const getActivityIcon = (type) => {
    const icons = {
      job_created: '✨',
      job_completed: '✅',
      user_added: '👤',
      job_updated: '⚡',
      error: '⚠️',
    };
    return icons[type] || '📌';
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-3">
      {activities.slice(0, maxItems).map((activity, idx) => (
        <div
          key={idx}
          className={`
            flex gap-4 p-4 rounded-xl border border-gray-200
            bg-gradient-to-r ${getActivityColor(activity.type)}
            text-white shadow-sm hover:shadow-md transition-all duration-300
            animate-in slide-in-from-right
          `}
        >
          <div className="text-2xl flex-shrink-0">{getActivityIcon(activity.type)}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{activity.title}</p>
            <p className="text-xs opacity-90 mt-1">{activity.description}</p>
          </div>
          <div className="text-xs opacity-75 flex-shrink-0">
            {formatTime(activity.timestamp)}
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// ADVANCED COMPARISON CHART
// ============================================================================

export const ComparisonChart = ({
  title,
  data = [],
  categories = ['Category A', 'Category B', 'Category C'],
  series1Label = 'This Period',
  series2Label = 'Last Period',
}) => {
  const maxValue = Math.max(...data.flat());

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <h3 className="font-bold text-lg mb-6 text-gray-900">{title}</h3>

      <div className="space-y-6">
        {categories.map((category, idx) => (
          <div key={idx}>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{category}</span>
              <span className="text-xs text-gray-500">
                {data[0]?.[idx]} vs {data[1]?.[idx]}
              </span>
            </div>

            <div className="flex gap-2">
              {/* Series 1 bar */}
              <div className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg h-8 relative overflow-hidden group"
                style={{ width: `${(data[0]?.[idx] / maxValue) * 100}%` }}>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-all duration-300" />
              </div>

              {/* Series 2 bar */}
              <div className="flex-1 bg-gradient-to-r from-gray-300 to-gray-400 rounded-lg h-8 relative overflow-hidden group"
                style={{ width: `${(data[1]?.[idx] / maxValue) * 100}%` }}>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-all duration-300" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-6 mt-8 pt-6 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600" />
          <span className="text-sm text-gray-600">{series1Label}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-gray-300 to-gray-400" />
          <span className="text-sm text-gray-600">{series2Label}</span>
        </div>
      </div>
    </div>
  );
};

const PremiumDashboardComponents = {
  AdvancedMetricCard,
  AdvancedProgressRing,
  AdvancedDataTable,
  RealTimeActivityFeed,
  ComparisonChart,
};

export default PremiumDashboardComponents;
