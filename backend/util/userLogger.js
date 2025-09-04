import UserLog from '../model/UserLogModel.js';

/**
 * Log user activity
 * @param {Object} logData - Log data object
 * @param {string} logData.userId - User ID (target user)
 * @param {string} logData.userName - User's full name (target user)
 * @param {string} logData.email - User's email (target user)
 * @param {string} logData.role - User's role (target user)
 * @param {string} logData.logType - Type of activity (login, register, etc.)
 * @param {string} logData.ipAddress - User's IP address
 * @param {string} logData.userAgent - User's browser/device info
 * @param {string} logData.status - Activity status (success, failed, pending)
 * @param {string} logData.details - Additional details
 * @param {string} logData.actorId - Actor's user ID (who performed the action)
 * @param {string} logData.actorName - Actor's full name
 * @param {string} logData.actorEmail - Actor's email
 * @param {string} logData.actorRole - Actor's role
 */
const logUserActivity = async (logData) => {
  try {
    const log = new UserLog({
      userId: logData.userId,
      userName: logData.userName,
      email: logData.email,
      role: logData.role,
      logType: logData.logType,
      ipAddress: logData.ipAddress,
      userAgent: logData.userAgent,
      status: logData.status,
      details: logData.details || '',
      actorId: logData.actorId,
      actorName: logData.actorName,
      actorEmail: logData.actorEmail,
      actorRole: logData.actorRole
    });

    await log.save();
    return log;
  } catch (error) {
    console.error('Error logging user activity:', error);
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
  
  // Log IP detection for debugging
  console.log('IP Detection:', {
    reqIp: req.ip,
    connectionRemoteAddress: req.connection.remoteAddress,
    socketRemoteAddress: req.socket.remoteAddress,
    xForwardedFor: req.headers['x-forwarded-for'],
    finalIp: ip
  });
  
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
