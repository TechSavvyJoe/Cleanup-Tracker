import React, { Component } from 'react';

// Enhanced Error Boundary with better UX and error reporting
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: Date.now() + Math.random()
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    const errorId = this.state.errorId;

    console.error('Error Boundary caught an error:', {
      errorId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry, LogRocket, etc.
      this.reportError(error, errorInfo, errorId);
    }

    this.setState({
      error,
      errorInfo
    });
  }

  reportError = (error, errorInfo, errorId) => {
    // This would integrate with your error reporting service
    // Example with fetch to your own endpoint:
    /*
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      })
    }).catch(e => console.error('Failed to report error:', e));
    */
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      const { fallback: FallbackComponent, showDetails = false } = this.props;

      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            onRetry={this.handleRetry}
            onReload={this.handleReload}
          />
        );
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            {/* Error icon */}
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            {/* Error message */}
            <div className="text-center">
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-600 mb-6">
                We're sorry for the inconvenience. The application encountered an unexpected error.
              </p>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleRetry}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                >
                  Try Again
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-medium transition-colors duration-200"
                >
                  Reload Page
                </button>
              </div>

              {/* Error details toggle */}
              {(showDetails || process.env.NODE_ENV === 'development') && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Show error details
                  </summary>
                  <div className="mt-3 p-4 bg-gray-100 rounded-lg text-xs font-mono text-gray-800 overflow-auto max-h-40">
                    <div className="mb-2">
                      <strong>Error ID:</strong> {this.state.errorId}
                    </div>
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error?.toString()}
                    </div>
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Support info */}
              <p className="mt-4 text-xs text-gray-500">
                Error ID: {this.state.errorId}
                <br />
                If this problem persists, please contact support with this error ID.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundaries
export const withErrorBoundary = (WrappedComponent, errorBoundaryProps = {}) => {
  const WithErrorBoundaryComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
};

// Custom fallback components
export const SimpleErrorFallback = ({ error, onRetry, onReload }) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
    <div className="flex items-center space-x-2 text-red-800 mb-2">
      <span className="text-lg">⚠️</span>
      <h3 className="font-semibold">Error occurred</h3>
    </div>
    <p className="text-red-700 text-sm mb-3">
      {error?.message || 'An unexpected error occurred'}
    </p>
    <div className="flex space-x-2">
      <button
        onClick={onRetry}
        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium"
      >
        Retry
      </button>
      <button
        onClick={onReload}
        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm font-medium"
      >
        Reload
      </button>
    </div>
  </div>
);

export const InlineErrorFallback = ({ error, onRetry }) => (
  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <span>⚠️</span>
        <span className="text-sm text-yellow-800">
          {error?.message || 'Component failed to load'}
        </span>
      </div>
      <button
        onClick={onRetry}
        className="text-xs text-yellow-700 hover:text-yellow-900 underline"
      >
        Retry
      </button>
    </div>
  </div>
);

export default ErrorBoundary;