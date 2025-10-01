import React from 'react';

// Modern, accessible loading spinner component
const LoadingSpinner = ({
  size = 'medium',
  color = 'blue',
  text = 'Loading...',
  showText = true,
  className = '',
  inline = false
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xlarge: 'w-16 h-16'
  };

  const colorClasses = {
    blue: 'border-blue-500 border-t-blue-200',
    green: 'border-green-500 border-t-green-200',
    red: 'border-red-500 border-t-red-200',
    yellow: 'border-yellow-500 border-t-yellow-200',
    purple: 'border-purple-500 border-t-purple-200',
    gray: 'border-gray-500 border-t-gray-200'
  };

  const ContainerComponent = inline ? 'span' : 'div';

  return (
    <ContainerComponent
      className={`${inline ? 'inline-flex' : 'flex'} items-center justify-center space-x-2 ${className}`}
      role="status"
      aria-label={text}
    >
      <div
        className={`
          ${sizeClasses[size]}
          ${colorClasses[color]}
          border-2 border-solid rounded-full animate-spin
        `}
        aria-hidden="true"
      />
      {showText && (
        <span className="text-gray-600 font-medium">{text}</span>
      )}
      <span className="sr-only">{text}</span>
    </ContainerComponent>
  );
};

// Loading overlay for full-screen loading states
export const LoadingOverlay = ({
  isVisible,
  text = 'Loading...',
  backdrop = true,
  children
}) => {
  if (!isVisible) return children || null;

  return (
    <div className="relative">
      {children}
      <div
        className={`
          absolute inset-0 flex items-center justify-center z-50
          ${backdrop ? 'bg-white bg-opacity-80 backdrop-blur-sm' : ''}
        `}
      >
        <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center space-y-4">
          <LoadingSpinner size="large" text={text} />
        </div>
      </div>
    </div>
  );
};

// Skeleton loading component for content placeholders
export const SkeletonLoader = ({
  lines = 3,
  width = 'full',
  height = '4',
  className = '',
  avatar = false
}) => {
  const widthClasses = {
    'quarter': 'w-1/4',
    'half': 'w-1/2',
    'three-quarters': 'w-3/4',
    'full': 'w-full'
  };

  return (
    <div className={`animate-pulse ${className}`} role="status" aria-label="Loading content">
      {avatar && (
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className={`
              h-${height} bg-gray-300 rounded
              ${index === lines - 1 ? widthClasses['three-quarters'] : widthClasses[width]}
            `}
          />
        ))}
      </div>
      <span className="sr-only">Loading content</span>
    </div>
  );
};

// Button with loading state
export const LoadingButton = ({
  isLoading,
  children,
  loadingText = 'Loading...',
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`
        relative inline-flex items-center justify-center
        ${isLoading ? 'cursor-not-allowed opacity-75' : ''}
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <LoadingSpinner
            size="small"
            showText={false}
            className="mr-2"
            inline
          />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default LoadingSpinner;