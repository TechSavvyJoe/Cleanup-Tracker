/**
 * Audit Log & Activity Tracking
 * Comprehensive compliance and activity monitoring
 */

import React, { useState } from 'react';

// ============================================================================
// AUDIT LOG VIEWER
// ============================================================================

export const AuditLogViewer = ({ logs = [], loading = false }) => {
  const [expandedLog, setExpandedLog] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  const actionTypes = {
    CREATE: { icon: '✨', label: 'Created', color: 'bg-blue-100 text-blue-700' },
    UPDATE: { icon: '✏️', label: 'Updated', color: 'bg-yellow-100 text-yellow-700' },
    DELETE: { icon: '🗑️', label: 'Deleted', color: 'bg-red-100 text-red-700' },
    LOGIN: { icon: '🔐', label: 'Login', color: 'bg-green-100 text-green-700' },
    LOGOUT: { icon: '🚪', label: 'Logout', color: 'bg-gray-100 text-gray-700' },
    EXPORT: { icon: '📤', label: 'Export', color: 'bg-purple-100 text-purple-700' },
    IMPORT: { icon: '📥', label: 'Import', color: 'bg-indigo-100 text-indigo-700' },
  };

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter((log) => log.action === filter);

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.timestamp) - new Date(a.timestamp);
    }
    return 0;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-lg h-16 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Action Type
          </label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All Actions</option>
            {Object.entries(actionTypes).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="date">Most Recent</option>
            <option value="user">User</option>
          </select>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {sortedLogs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-2">📋</p>
            <p>No logs found</p>
          </div>
        ) : (
          sortedLogs.map((log) => {
            const actionType = actionTypes[log.action] || actionTypes.UPDATE;
            const isExpanded = expandedLog === log.id;

            return (
              <div
                key={log.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all"
              >
                {/* Log Entry */}
                <button
                  onClick={() =>
                    setExpandedLog(isExpanded ? null : log.id)
                  }
                  className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                >
                  {/* Icon */}
                  <div className={`text-2xl flex-shrink-0 ${actionType.color} p-2 rounded-lg`}>
                    {actionType.icon}
                  </div>

                  {/* Main Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900">{log.description}</h3>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${actionType.color}`}>
                        {actionType.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {log.user} • {formatTime(log.timestamp)}
                    </p>
                  </div>

                  {/* Chevron */}
                  <div className={`text-xl transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    ⌄
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                          User
                        </p>
                        <p className="font-medium text-gray-900">{log.user}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                          IP Address
                        </p>
                        <p className="font-medium text-gray-900">{log.ipAddress}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                          Resource
                        </p>
                        <p className="font-medium text-gray-900">{log.resource}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">
                          Status
                        </p>
                        <span className={`
                          inline-block px-3 py-1 rounded-full text-xs font-semibold
                          ${log.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                          }
                        `}>
                          {log.status === 'success' ? '✓ Success' : '✗ Failed'}
                        </span>
                      </div>
                    </div>

                    {log.details && (
                      <div className="pt-4 border-t border-gray-300">
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                          Details
                        </p>
                        <code className="block bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </code>
                      </div>
                    )}

                    {log.changes && (
                      <div className="pt-4 border-t border-gray-300">
                        <p className="text-xs font-semibold text-gray-600 uppercase mb-2">
                          Changes
                        </p>
                        <div className="space-y-2">
                          {Object.entries(log.changes).map(([key, value]) => (
                            <div key={key} className="flex gap-4 text-sm">
                              <span className="font-medium text-gray-700 w-32">{key}:</span>
                              <span className="text-red-600 line-through">{value.old}</span>
                              <span className="text-green-600">→ {value.new}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ============================================================================
// ACTIVITY TIMELINE
// ============================================================================

export const ActivityTimeline = ({ activities = [] }) => {
  return (
    <div className="space-y-6">
      {activities.map((activity, idx) => (
        <div key={idx} className="flex gap-4">
          {/* Timeline */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
              {activity.icon || '•'}
            </div>
            {idx < activities.length - 1 && (
              <div className="w-0.5 h-12 bg-gradient-to-b from-blue-300 to-gray-200 mt-2" />
            )}
          </div>

          {/* Content */}
          <div className="pb-4">
            <p className="font-bold text-gray-900">{activity.title}</p>
            <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
            <p className="text-xs text-gray-500 mt-2">
              {formatTime(activity.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// COMPLIANCE REPORT
// ============================================================================

export const ComplianceReport = ({ period = '30days' }) => {
  const stats = {
    totalActions: 1256,
    successRate: 99.2,
    failedActions: 10,
    dataChanges: 342,
    userLogins: 456,
    exports: 78,
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            label: 'Total Actions',
            value: stats.totalActions,
            icon: '📊',
            color: 'blue',
          },
          {
            label: 'Success Rate',
            value: `${stats.successRate}%`,
            icon: '✅',
            color: 'green',
          },
          {
            label: 'Failed Actions',
            value: stats.failedActions,
            icon: '❌',
            color: 'red',
          },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white rounded-lg p-6 border border-gray-200">
            <p className="text-2xl mb-2">{stat.icon}</p>
            <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Activity Breakdown */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
        <h3 className="font-bold text-lg text-gray-900">Activity Breakdown</h3>
        {[
          { label: 'Data Changes', value: stats.dataChanges, max: 500 },
          { label: 'User Logins', value: stats.userLogins, max: 500 },
          { label: 'Data Exports', value: stats.exports, max: 200 },
        ].map((item, idx) => (
          <div key={idx}>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
              <span className="text-sm font-bold text-gray-900">{item.value}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full"
                style={{ width: `${(item.value / item.max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Certification */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border-2 border-green-200 text-center">
        <p className="text-3xl mb-2">✓</p>
        <p className="font-bold text-green-900 mb-1">Compliance Status: COMPLIANT</p>
        <p className="text-sm text-green-700">
          All audit logs are properly maintained and accessible for compliance purposes.
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// HELPER FUNCTION
// ============================================================================

const formatTime = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days < 7) return `${days} days ago`;
  return new Date(date).toLocaleDateString();
};

const AuditLogComponents = {
  AuditLogViewer,
  ActivityTimeline,
  ComplianceReport,
};

export default AuditLogComponents;
