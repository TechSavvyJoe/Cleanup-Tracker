/**
 * Enterprise Component Library
 * Professional, reusable UI components for the application
 */

import React, { useState } from 'react';
import { theme } from '../../styles/theme';

// ============================================================================
// BUTTONS
// ============================================================================

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  isLoading = false,
  onClick,
  className = '',
  ...props
}) => {
  const baseStyles = `
    font-semibold rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
  `;

  const variantStyles = {
    primary: `
      bg-sky-500 text-white hover:bg-sky-600 focus:ring-sky-500
      shadow-sm hover:shadow-md
    `,
    secondary: `
      bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500
    `,
    success: `
      bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500
    `,
    danger: `
      bg-red-500 text-white hover:bg-red-600 focus:ring-red-500
    `,
    outline: `
      bg-transparent border-2 border-sky-500 text-sky-500
      hover:bg-sky-50 focus:ring-sky-500
    `,
    ghost: `
      bg-transparent text-gray-700 hover:bg-gray-100
      focus:ring-gray-500
    `,
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
};

// ============================================================================
// CARDS
// ============================================================================

export const Card = ({
  children,
  className = '',
  hoverable = false,
  variant = 'elevated',
  ...props
}) => {
  const variantStyles = {
    elevated: 'bg-white shadow-md hover:shadow-lg border border-gray-100',
    flat: 'bg-gray-50 border border-gray-200',
    outline: 'bg-white border-2 border-gray-300',
  };

  return (
    <div
      className={`
        ${variantStyles[variant]}
        rounded-xl p-6
        transition-all duration-200
        ${hoverable ? 'cursor-pointer hover:-translate-y-0.5' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

// ============================================================================
// STAT CARD
// ============================================================================

export const StatCard = ({
  label,
  value,
  trend,
  trendValue,
  icon,
  color = 'blue',
}) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  return (
    <Card className={`${colorMap[color]} border-2`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trendValue && (
            <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${
              trend === 'up' ? 'text-emerald-600' : 'text-red-600'
            }`}>
              <span>{trend === 'up' ? '↑' : '↓'}</span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="text-3xl opacity-20">{icon}</div>
        )}
      </div>
    </Card>
  );
};

// ============================================================================
// INPUT FIELDS
// ============================================================================

export const Input = ({
  label,
  error,
  help,
  icon,
  required = false,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </span>
        )}
        <input
          className={`
            w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg
            focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100
            transition-all duration-200
            placeholder-gray-400
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      {help && <p className="text-gray-500 text-sm mt-1">{help}</p>}
    </div>
  );
};

// ============================================================================
// SELECT/DROPDOWN
// ============================================================================

export const Select = ({
  label,
  options = [],
  error,
  required = false,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        className={`
          w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg
          focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100
          transition-all duration-200
          appearance-none bg-white cursor-pointer
          ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''}
          ${className}
        `}
        {...props}
      >
        <option value="">Select an option...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

// ============================================================================
// BADGE
// ============================================================================

export const Badge = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    primary: 'bg-sky-100 text-sky-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-700',
  };

  const sizeStyles = {
    sm: 'px-2 py-1 text-xs font-medium',
    md: 'px-2.5 py-1 text-sm font-medium',
    lg: 'px-3 py-1.5 text-base font-medium',
  };

  return (
    <span className={`
      inline-flex items-center rounded-full
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${className}
    `}>
      {children}
    </span>
  );
};

// ============================================================================
// ALERT
// ============================================================================

export const Alert = ({
  children,
  variant = 'info',
  title,
  icon,
  onClose,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const variantStyles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
  };

  if (!isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  return (
    <div className={`
      border-l-4 p-4 rounded-lg
      ${variantStyles[variant]}
      ${className}
    `}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {icon && <span className="text-lg mt-0.5">{icon}</span>}
          <div>
            {title && <h3 className="font-semibold mb-1">{title}</h3>}
            <div className="text-sm">{children}</div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MODAL
// ============================================================================

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className = '',
}) => {
  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    '2xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`
        relative bg-white rounded-xl shadow-2xl
        ${sizeStyles[size]}
        w-full mx-4
        ${className}
      `}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between border-b border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// PROGRESS BAR
// ============================================================================

export const ProgressBar = ({
  value = 0,
  max = 100,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  animated = true,
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  const variantStyles = {
    primary: 'bg-sky-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  };

  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className="w-full">
      <div className={`
        w-full bg-gray-200 rounded-full overflow-hidden
        ${sizeStyles[size]}
      `}>
        <div
          className={`
            h-full transition-all duration-300
            ${variantStyles[variant]}
            ${animated ? 'animate-pulse' : ''}
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-sm text-gray-600 mt-2">
          {percentage.toFixed(0)}%
        </p>
      )}
    </div>
  );
};

// ============================================================================
// TABS
// ============================================================================

export const Tabs = ({
  tabs = [],
  defaultTab = 0,
  onChange,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (index) => {
    setActiveTab(index);
    onChange?.(index);
  };

  return (
    <div className={className}>
      {/* Tab Headers */}
      <div className="flex border-b border-gray-200 gap-0">
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => handleTabChange(index)}
            className={`
              px-6 py-3 font-medium text-sm border-b-2 transition-all
              ${activeTab === index
                ? 'border-sky-500 text-sky-600 bg-sky-50'
                : 'border-transparent text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {tabs[activeTab]?.content}
      </div>
    </div>
  );
};

// ============================================================================
// LOADING SPINNER
// ============================================================================

export const Spinner = ({
  size = 'md',
  variant = 'primary',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const variantStyles = {
    primary: 'text-sky-500',
    white: 'text-white',
    gray: 'text-gray-400',
  };

  return (
    <svg
      className={`
        animate-spin
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${className}
      `}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

// ============================================================================
// EMPTY STATE
// ============================================================================

export const EmptyState = ({
  icon = '📭',
  title = 'No data found',
  description = 'There is nothing to display right now',
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-center mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

// ============================================================================
// GRID LAYOUT
// ============================================================================

export const Grid = ({
  cols = 1,
  gap = 6,
  children,
  className = '',
}) => {
  const colClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  const gapClass = {
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8',
  };

  return (
    <div className={`
      grid
      ${colClass[cols]}
      ${gapClass[gap]}
      ${className}
    `}>
      {children}
    </div>
  );
};

export default {
  Button,
  Card,
  StatCard,
  Input,
  Select,
  Badge,
  Alert,
  Modal,
  ProgressBar,
  Tabs,
  Spinner,
  EmptyState,
  Grid,
};
