/**
 * Performance Logging Middleware
 * 
 * Logs request execution time to identify slow endpoints.
 * Helps identify endpoints that need optimization.
 * 
 * Usage: Add to server.js before routes
 */

export const performanceLogger = (req, res, next) => {
  const start = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Log request start
  console.log(`[REQ START] ${req.method} ${req.originalUrl} [${requestId}]`);
  
  // Override res.end to log completion time
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const ms = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '🔴' : res.statusCode >= 300 ? '🟡' : '🟢';
    const slowIndicator = ms > 2000 ? ' ⚠️ SLOW' : ms > 1000 ? ' ⚡ MODERATE' : '';
    
    console.log(
      `[REQ END] ${statusColor} ${req.method} ${req.originalUrl} - ${ms}ms [${requestId}]${slowIndicator}`
    );
    
    // Log slow requests with more detail
    if (ms > 2000) {
      console.log(`[SLOW REQUEST] ${req.method} ${req.originalUrl} took ${ms}ms - Consider optimization`);
    }
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

export default performanceLogger;

