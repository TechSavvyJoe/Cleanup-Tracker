import React, { memo, useMemo } from 'react';
import { LoadingButton } from './LoadingSpinner';

// Memoized Job Card component for optimal performance
const JobCard = memo(({
  job,
  onComplete,
  onEdit,
  onDelete,
  onViewDetails,
  isLoading = false,
  showActions = true,
  compact = false,
  className = ''
}) => {
  // Memoized status configuration
  const statusConfig = useMemo(() => ({
    'Pending': {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: '⏳',
      priority: 1
    },
    'In Progress': {
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: '🔄',
      priority: 2
    },
    'Paused': {
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: '⏸',
      priority: 3
    },
    'Completed': {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: '✅',
      priority: 4
    },
    'QC Required': {
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: '🔍',
      priority: 5
    },
    'QC Approved': {
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: '✨',
      priority: 6
    }
  }), []);

  // Memoized priority configuration
  const priorityConfig = useMemo(() => ({
    'High': { color: 'text-red-600', indicator: '🔴' },
    'Medium': { color: 'text-yellow-600', indicator: '🟡' },
    'Normal': { color: 'text-green-600', indicator: '🟢' },
    'Low': { color: 'text-gray-600', indicator: '⚪' }
  }), []);

  // Memoized duration calculation
  const durationInfo = useMemo(() => {
    if (!job) return null;

    const duration = job.duration || job.durationMinutes || 0;
    const expected = job.expectedDuration || 60;
    const isOvertime = duration > expected;

    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    const durationText = hours > 0
      ? `${hours}h ${minutes}m`
      : `${minutes}m`;

    return {
      text: durationText,
      isOvertime,
      percentage: Math.round((duration / expected) * 100)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.duration, job?.durationMinutes, job?.expectedDuration]);

  // Memoized formatted date
  const formattedDate = useMemo(() => {
    if (!job?.date) return '';
    try {
      return new Date(job.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: job.date.includes(new Date().getFullYear().toString()) ? undefined : 'numeric'
      });
    } catch {
      return job.date;
    }
  }, [job?.date]);

  if (!job) return null;

  const status = statusConfig[job.status] || statusConfig['Pending'];
  const priority = priorityConfig[job.priority] || priorityConfig['Normal'];

  if (compact) {
    return (
      <div
        className={`
          bg-white border border-gray-200 rounded-lg p-3 shadow-sm
          hover:shadow-md transition-shadow duration-200 cursor-pointer
          ${className}
        `}
        onClick={() => onViewDetails?.(job)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {/* Status indicator */}
            <div className={`px-2 py-1 rounded-full text-xs font-medium border ${status.color}`}>
              <span className="mr-1">{status.icon}</span>
              {job.status}
            </div>

            {/* Job info */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {job.vin || 'No VIN'}
              </p>
              <p className="text-xs text-gray-500">
                {job.serviceType} • {job.technicianName || 'Unassigned'}
              </p>
            </div>
          </div>

          {/* Duration */}
          {durationInfo && (
            <div className={`text-xs ${durationInfo.isOvertime ? 'text-red-600' : 'text-gray-600'}`}>
              {durationInfo.text}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        bg-white border border-gray-200 rounded-lg shadow-sm
        hover:shadow-lg transition-all duration-200
        ${isLoading ? 'opacity-75 pointer-events-none' : ''}
        ${className}
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {/* Priority indicator */}
            <div className={`${priority.color} text-lg`} title={`${job.priority || 'Normal'} Priority`}>
              {priority.indicator}
            </div>

            {/* Job details */}
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {job.vin || 'No VIN'}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                <span>{job.serviceType}</span>
                {job.vehicleDescription && (
                  <>
                    <span>•</span>
                    <span className="truncate">{job.vehicleDescription}</span>
                  </>
                )}
                {formattedDate && (
                  <>
                    <span>•</span>
                    <span>{formattedDate}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div className={`px-3 py-1 rounded-full text-sm font-medium border ${status.color}`}>
            <span className="mr-1">{status.icon}</span>
            {job.status}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {/* Technician */}
          <div>
            <span className="text-gray-500">Technician:</span>
            <p className="font-medium text-gray-900 mt-1">
              {job.technicianName || 'Unassigned'}
            </p>
          </div>

          {/* Duration */}
          {durationInfo && (
            <div>
              <span className="text-gray-500">Duration:</span>
              <p className={`font-medium mt-1 ${durationInfo.isOvertime ? 'text-red-600' : 'text-gray-900'}`}>
                {durationInfo.text}
                {job.expectedDuration && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({durationInfo.percentage}% of expected)
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Stock number */}
          {job.stockNumber && (
            <div>
              <span className="text-gray-500">Stock #:</span>
              <p className="font-medium text-gray-900 mt-1">{job.stockNumber}</p>
            </div>
          )}
        </div>

        {/* Issues */}
        {job.issues && job.issues.length > 0 && (
          <div className="mt-4">
            <span className="text-gray-500 text-sm">Issues:</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {job.issues.map((issue, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                >
                  {issue}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Progress bar for in-progress jobs */}
        {job.status === 'In Progress' && job.expectedDuration && durationInfo && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span>{durationInfo.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  durationInfo.isOvertime ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(durationInfo.percentage, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {onViewDetails && (
                <button
                  onClick={() => onViewDetails(job)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View Details
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(job)}
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  Edit
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {job.status === 'In Progress' && onComplete && (
                <LoadingButton
                  onClick={() => onComplete(job)}
                  isLoading={isLoading}
                  loadingText="Completing..."
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  Complete Job
                </LoadingButton>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(job)}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

JobCard.displayName = 'JobCard';

export default JobCard;