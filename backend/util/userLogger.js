import UserLog from '../model/UserLogModel.js';

/**
 * Log user activity
 * @param {Object} logData - Log data object
 * @param {string} logData.userId - User ID (target user)
 * @param {string} logData.logType - Type of activity (login, register, etc.)
 * @param {string} logData.ipAddress - User's IP address
 * @param {string} logData.status - Activity status (success, failed, pending)
 * @param {string} logData.details - Additional details
 */
const logUserActivity = async (logData) => {
  try {
    // Validate required fields
    if (!logData.userId) {
      throw new Error('userId is required for user activity logging');
    }

    const log = new UserLog({
      userId: logData.userId,
      logType: logData.logType,
      ipAddress: logData.ipAddress,
      status: logData.status,
      details: logData.details || ''
    });

    await log.save();
    return log;
  } catch (error) {
    console.error('Error logging user activity:', error.message);
    // Don't throw error to avoid breaking the main flow
  }
};

/**
 * Get client IP address from request
 * @param {Object} req - Express request object
 * @returns {string} - IP address
 */
const getClientIP = (req) => {
  let ip = req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         'unknown';
  
  // Normalize localhost IPs for better display
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1';
  }
  
  // Log IP detection for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('IP Detection:', {
      reqIp: req.ip,
      connectionRemoteAddress: req.connection.remoteAddress,
      socketRemoteAddress: req.socket.remoteAddress,
      xForwardedFor: req.headers['x-forwarded-for'],
      finalIp: ip
    });
  }
  
  return ip;
};

/**
 * Get user agent from request
 * @param {Object} req - Express request object
 * @returns {string} - User agent string
 */
const getUserAgent = (req) => {
  return req.get('User-Agent') || 'unknown';
};

export {
  logUserActivity,
  getClientIP,
  getUserAgent
};
