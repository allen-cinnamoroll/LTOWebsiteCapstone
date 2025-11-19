import dotenv from "dotenv";

dotenv.config();

/**
 * IP Whitelist Middleware
 * Restricts access to the system based on allowed IP addresses
 * 
 * Configuration via environment variables:
 * - ALLOWED_IPS: Comma-separated list of IP addresses or CIDR ranges
 *   Example: "192.168.1.100,10.0.0.0/8,172.16.0.0/12"
 * 
 * - IP_WHITELIST_ENABLED: Set to "true" to enable IP whitelisting (default: "false")
 */

// Helper function to check if an IP is in a CIDR range
function ipToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isInCIDR(ip, cidr) {
  const [network, prefixLength] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(prefixLength, 10)) - 1);
  return (ipToInt(ip) & mask) === (ipToInt(network) & mask);
}

// Helper function to get client IP address
function getClientIP(req) {
  // Check various headers in order of preference
  // This handles cases where the app is behind a proxy/load balancer
  let ip = (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    (req.socket?.remoteAddress ? req.socket.remoteAddress.replace('::ffff:', '') : null) ||
    'unknown'
  );
  
  // Remove IPv6 prefix if present
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }
  
  // Handle IPv6 localhost
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1';
  }
  
  return ip;
}

// Parse allowed IPs from environment variable
function getAllowedIPs() {
  const allowedIPsEnv = process.env.ALLOWED_IPS || '';
  if (!allowedIPsEnv.trim()) {
    return [];
  }
  
  return allowedIPsEnv
    .split(',')
    .map(ip => ip.trim())
    .filter(ip => ip.length > 0);
}

// Check if IP is whitelisted
function isIPAllowed(clientIP, allowedIPs) {
  // If no IPs are configured, deny access (fail-safe)
  if (allowedIPs.length === 0) {
    return false;
  }

  // Check if exact IP match
  if (allowedIPs.includes(clientIP)) {
    return true;
  }

  // Check if IP is in any CIDR range
  for (const allowedIP of allowedIPs) {
    if (allowedIP.includes('/')) {
      // CIDR notation
      try {
        if (isInCIDR(clientIP, allowedIP)) {
          return true;
        }
      } catch (error) {
        console.error(`Invalid CIDR notation: ${allowedIP}`, error);
      }
    }
  }

  return false;
}

/**
 * IP Whitelist Middleware
 * Use this to restrict access based on IP addresses
 */
export const ipWhitelist = (req, res, next) => {
  // Check if IP whitelisting is enabled (case-insensitive, trimmed)
  const isEnabled = String(process.env.IP_WHITELIST_ENABLED || '').trim().toLowerCase() === 'true';
  
  if (!isEnabled) {
    // If whitelisting is disabled, allow all requests
    // But log for debugging if someone expects it to be enabled
    if (process.env.IP_WHITELIST_ENABLED) {
      console.log(`[IP Whitelist] DISABLED - IP_WHITELIST_ENABLED="${process.env.IP_WHITELIST_ENABLED}" (not 'true')`);
    }
    return next();
  }

  const clientIP = getClientIP(req);
  const allowedIPs = getAllowedIPs();

  // Log the access attempt (useful for debugging)
  console.log(`[IP Whitelist] Access attempt from IP: ${clientIP} | Allowed IPs: ${allowedIPs.join(', ') || 'NONE'}`);

  // Check if IP is 'unknown' or localhost - this might indicate configuration issue
  if (clientIP === 'unknown' || clientIP === '::1') {
    console.warn(`[IP Whitelist] WARNING: Could not detect client IP properly. IP detected: ${clientIP}`);
  }

  if (!isIPAllowed(clientIP, allowedIPs)) {
    console.warn(`[IP Whitelist] ACCESS DENIED for IP: ${clientIP} | Allowed IPs: ${allowedIPs.join(', ')}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied. Your IP address is not authorized to access this system.',
      code: 'IP_NOT_WHITELISTED',
      detectedIP: clientIP
    });
  }

  // IP is allowed, proceed
  console.log(`[IP Whitelist] ACCESS ALLOWED for IP: ${clientIP}`);
  next();
};

// Log whitelist configuration on module load
const isEnabledOnLoad = String(process.env.IP_WHITELIST_ENABLED || '').trim().toLowerCase() === 'true';
const allowedIPsOnLoad = getAllowedIPs();

if (isEnabledOnLoad) {
  console.log(`[IP Whitelist] ENABLED - Allowed IPs: ${allowedIPsOnLoad.join(', ') || 'NONE (ALL ACCESS WILL BE DENIED)'}`);
} else {
  console.log(`[IP Whitelist] DISABLED - All requests will be allowed`);
  if (process.env.IP_WHITELIST_ENABLED) {
    console.log(`[IP Whitelist] Note: IP_WHITELIST_ENABLED is set to "${process.env.IP_WHITELIST_ENABLED}" but should be "true" to enable`);
  }
}

/**
 * Optional: Middleware that allows certain routes (like auth/login) to bypass IP check
 */
export const ipWhitelistExcept = (exceptions = []) => {
  return (req, res, next) => {
    // Check if current path should bypass IP check
    const path = req.path || req.url;
    const shouldBypass = exceptions.some(exception => path.includes(exception));

    if (shouldBypass) {
      return next();
    }

    // Apply IP whitelist check for other routes
    return ipWhitelist(req, res, next);
  };
};

export default ipWhitelist;

