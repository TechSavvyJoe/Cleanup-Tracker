// 🎨 Premium UI Components
// Enterprise-grade React components with modern design

import React, { useState, useEffect, useRef } from 'react';

/**
 * GLASSMORPHISM CARD
 * Modern frosted glass effect with subtle animations
 */
export const GlassCard = ({ children, className = '', hover = true, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={`
        backdrop-blur-xl bg-white/80 dark:bg-gray-900/80
        border border-white/20 dark:border-gray-700/30
        rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50
        transition-all duration-300 ease-out
        ${hover ? 'hover:shadow-2xl hover:-translate-y-1 hover:bg-white/90 dark:hover:bg-gray-900/90' : ''}
        ${isHovered ? 'scale-[1.02]' : 'scale-100'}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

/**
 * ANIMATED PROGRESS RING
 * Circular progress indicator with smooth animations
 */
export const ProgressRing = ({ progress = 0, size = 120, strokeWidth = 8, color = '#3b82f6', label, showPercentage = true }) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (displayProgress / 100) * circumference;

  useEffect(() => {
    // Animate progress
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.round(displayProgress)}%
          </span>
        )}
        {label && (
          <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {label}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * SKELETON LOADER
 * Shimmer loading effect for better perceived performance
 */
export const SkeletonLoader = ({ variant = 'text', width = '100%', height = '20px', className = '' }) => {
  const variants = {
    text: 'h-4 rounded',
    title: 'h-8 rounded',
    avatar: 'rounded-full',
    rectangle: 'rounded-lg',
    card: 'h-48 rounded-2xl'
  };

  return (
    <div 
      className={`
        animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700
        bg-[length:200%_100%] animate-shimmer
        ${variants[variant]}
        ${className}
      `}
      style={{ width, height }}
    />
  );
};

/**
 * COMMAND PALETTE
 * Keyboard-driven quick actions (Cmd+K)
 */
export const CommandPalette = ({ isOpen, onClose, actions = [], recentItems = [] }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const filteredActions = actions.filter(action =>
    action.title.toLowerCase().includes(query.toLowerCase()) ||
    action.description?.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (onClose) onClose();
      }
      
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredActions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        filteredActions[selectedIndex]?.action();
        onClose();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredActions, onClose]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Command palette */}
      <GlassCard className="relative w-full max-w-2xl max-h-96 overflow-hidden">
        {/* Search input */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search..."
              className="w-full pl-10 pr-4 py-3 bg-transparent border-none outline-none text-lg text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-80">
          {filteredActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.action();
                onClose();
              }}
              className={`
                w-full px-4 py-3 flex items-center space-x-3 transition-colors
                ${index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
              `}
            >
              {action.icon && (
                <span className="flex-shrink-0 text-gray-400">{action.icon}</span>
              )}
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{action.title}</div>
                {action.description && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">{action.description}</div>
                )}
              </div>
              {action.shortcut && (
                <kbd className="px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded">
                  {action.shortcut}
                </kbd>
              )}
            </button>
          ))}
          
          {filteredActions.length === 0 && query && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No results found for "{query}"
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

/**
 * STAT CARD
 * Animated statistic display with trend indicators
 */
export const StatCard = ({ title, value, change, trend, icon, color = 'blue', loading = false }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (loading) return;
    
    // Animate number counting
    const numericValue = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(numericValue)) {
      setDisplayValue(value);
      return;
    }

    const duration = 1000;
    const steps = 60;
    const increment = numericValue / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      current += increment;
      step++;
      
      if (step >= steps) {
        setDisplayValue(numericValue);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, loading]);

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500'
  };

  if (loading) {
    return (
      <GlassCard className="p-6">
        <SkeletonLoader variant="text" height="24px" className="mb-2" />
        <SkeletonLoader variant="title" height="40px" />
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6 hover:shadow-2xl transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {typeof displayValue === 'number' ? Math.round(displayValue) : displayValue}
          </p>
          
          {change && (
            <div className="mt-2 flex items-center space-x-1">
              {trend === 'up' && (
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
              {trend === 'down' && (
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              <span className={`text-sm font-medium ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                {change}
              </span>
            </div>
          )}
        </div>
        
        {icon && (
          <div className={`p-3 rounded-xl ${colorClasses[color]} bg-opacity-10`}>
            <div className={`text-${color}-600 dark:text-${color}-400`}>
              {icon}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

/**
 * TIMELINE COMPONENT
 * Vertical timeline for activity tracking
 */
export const Timeline = ({ events = [] }) => {
  return (
    <div className="space-y-6">
      {events.map((event, index) => (
        <div key={index} className="relative flex gap-x-4">
          {/* Vertical line */}
          {index !== events.length - 1 && (
            <div className="absolute left-0 top-0 flex w-6 justify-center -bottom-6">
              <div className="w-px bg-gray-200 dark:bg-gray-700" />
            </div>
          )}
          
          {/* Icon */}
          <div className="relative flex h-6 w-6 flex-none items-center justify-center">
            <div className={`h-3 w-3 rounded-full ring-1 ring-gray-300 dark:ring-gray-600 ${
              event.type === 'success' ? 'bg-green-500' :
              event.type === 'error' ? 'bg-red-500' :
              event.type === 'warning' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`} />
          </div>
          
          {/* Content */}
          <div className="flex-auto">
            <div className="flex items-center justify-between gap-x-4">
              <div className="py-0.5 text-xs leading-5">
                <span className="font-medium text-gray-900 dark:text-white">{event.title}</span>
                {event.description && (
                  <span className="text-gray-500 dark:text-gray-400"> — {event.description}</span>
                )}
              </div>
              <time className="flex-none py-0.5 text-xs leading-5 text-gray-500 dark:text-gray-400">
                {event.time}
              </time>
            </div>
            {event.details && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{event.details}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * BADGE COMPONENT
 * Status indicators with animations
 */
export const Badge = ({ children, variant = 'default', size = 'md', pulse = false, icon }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base'
  };

  return (
    <span className={`
      inline-flex items-center gap-1 font-medium rounded-full
      ${variants[variant]}
      ${sizes[size]}
      ${pulse ? 'animate-pulse' : ''}
    `}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

/**
 * TOOLTIP COMPONENT
 * Contextual help with positioning
 */
export const Tooltip = ({ children, content, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div 
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={`
          absolute z-50 px-3 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg
          whitespace-nowrap pointer-events-none
          transition-opacity duration-200
          ${positions[position]}
        `}>
          {content}
          <div className={`
            absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45
            ${position === 'top' ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' : ''}
            ${position === 'bottom' ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
            ${position === 'left' ? 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2' : ''}
            ${position === 'right' ? 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2' : ''}
          `} />
        </div>
      )}
    </div>
  );
};

// Add shimmer animation to global styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .animate-shimmer {
      animation: shimmer 2s infinite linear;
    }
  `;
  document.head.appendChild(style);
}

const PremiumUIComponents = {
  GlassCard,
  ProgressRing,
  SkeletonLoader,
  CommandPalette,
  StatCard,
  Timeline,
  Badge,
  Tooltip
};

export default PremiumUIComponents;
