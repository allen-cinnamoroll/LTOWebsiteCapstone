import dotenv from "dotenv";

dotenv.config();

/**
 * IP Whitelist Middleware
 * 
 * Restricts access to the API only from specific IP addresses or IP ranges.
 * This ensures that only devices connected to a specific WiFi network can access the system.
 * 
 * Configuration:
 * - Set ALLOWED_IPS in .env file with comma-separated IP addresses or CIDR ranges
 * - Set IP_WHITELIST_ENABLED=true to enable the whitelist (false to disable for development)
 * 
 * Examples:
 * - ALLOWED_IPS=192.168.1.0/24,10.0.0.0/8
 * - ALLOWED_IPS=192.168.1.100,192.168.1.101,192.168.1.102
 */

// Get the real client IP address, considering proxies
const getClientIP = (req) => {
  // Check various headers that might contain the real IP
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return realIP;
  }
  
  // Fallback to connection remote address
  return req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         req.connection.socket?.remoteAddress ||
         req.ip;
};

// Check if an IP is in a CIDR range
const isIPInCIDR = (ip, cidr) => {
  // Handle IPv6 addresses wrapped with ::ffff: prefix
  const cleanIP = ip.replace(/^::ffff:/, '');
  
  if (!cidr.includes('/')) {
    // Not a CIDR range, just a single IP
    return cleanIP === cidr;
  }
  
  const [range, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);
  
  const ipToNumber = (ipStr) => {
    return ipStr.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  };
  
  try {
    const ipNum = ipToNumber(cleanIP);
    const rangeNum = ipToNumber(range);
    return (ipNum & mask) === (rangeNum & mask);
  } catch (error) {
    console.error('Error parsing IP/CIDR:', error);
    return false;
  }
};

// Check if IP is whitelisted
const isIPWhitelisted = (clientIP, allowedIPs) => {
  // Handle IPv6 addresses wrapped with ::ffff: prefix (IPv4-mapped IPv6)
  const cleanIP = clientIP.replace(/^::ffff:/, '');
  
  // Always allow localhost for development
  const localhostIPs = ['127.0.0.1', '::1', 'localhost'];
  if (localhostIPs.includes(cleanIP) || localhostIPs.includes(clientIP)) {
    return true;
  }
  
  // Check against allowed IPs/ranges
  for (const allowedIP of allowedIPs) {
    const cleanAllowedIP = allowedIP.trim();
    
    if (cleanAllowedIP.includes('/')) {
      // CIDR range
      if (isIPInCIDR(clientIP, cleanAllowedIP)) {
        return true;
      }
    } else {
      // Single IP address
      if (cleanIP === cleanAllowedIP || clientIP === cleanAllowedIP) {
        return true;
      }
    }
  }
  
  return false;
};

export const ipWhitelist = (req, res, next) => {
  // Check if IP whitelist is enabled
  const isEnabled = process.env.IP_WHITELIST_ENABLED === 'true';
  
  if (!isEnabled) {
    console.log('IP Whitelist is disabled. Allowing all requests.');
    return next();
  }
  
  // Get allowed IPs from environment variable
  const allowedIPsString = process.env.ALLOWED_IPS || '';
  const allowedIPs = allowedIPsString.split(',').map(ip => ip.trim()).filter(ip => ip);
  
  if (allowedIPs.length === 0) {
    console.warn('Warning: IP Whitelist is enabled but no ALLOWED_IPS configured. Allowing all requests.');
    return next();
  }
  
  // Get client IP
  const clientIP = getClientIP(req);
  
  // Check if IP is whitelisted
  if (isIPWhitelisted(clientIP, allowedIPs)) {
    console.log(`Access granted for IP: ${clientIP}`);
    return next();
  }
  
  // IP not whitelisted - deny access
  console.log(`Access denied for IP: ${clientIP}. Allowed IPs: ${allowedIPsString}`);
  return res.status(403).json({
    success: false,
    message: 'Access denied. This system can only be accessed from authorized networks.',
    error: 'IP_NOT_WHITELISTED',
    clientIP: clientIP, // Include for debugging (remove in production if needed)
  });
};

export default ipWhitelist;

