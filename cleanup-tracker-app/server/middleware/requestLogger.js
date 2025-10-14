/**
 * Request logging middleware
 * Logs incoming requests with method, path, status code, and response time
 */

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Capture original end function
  const originalEnd = res.end;
  
  // Override end function to log after response
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };
    
    // Color code based on status
    const statusColor = res.statusCode >= 500 ? '\x1b[31m' : // Red for 5xx
                        res.statusCode >= 400 ? '\x1b[33m' : // Yellow for 4xx
                        res.statusCode >= 300 ? '\x1b[36m' : // Cyan for 3xx
                        '\x1b[32m'; // Green for 2xx
    const reset = '\x1b[0m';
    
    // Log with color in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `${statusColor}${req.method}${reset} ${req.path} - ${statusColor}${res.statusCode}${reset} (${duration}ms)`
      );
    } else {
      // Structured JSON logging in production
      console.log(JSON.stringify(logData));
    }
    
    // Call original end function
    originalEnd.apply(res, args);
  };
  
  next();
};

module.exports = requestLogger;
