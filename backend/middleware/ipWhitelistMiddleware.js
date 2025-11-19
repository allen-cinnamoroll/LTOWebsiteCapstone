import dotenv from "dotenv";

dotenv.config();

/**
 * IP Whitelist Middleware
 * Restricts access to the system based on allowed PUBLIC IP addresses only
 * 
 * Configuration via environment variables:
 * - ALLOWED_IPS: Comma-separated list of PUBLIC IP addresses or CIDR ranges
 *   Example: "64.226.59.38,203.0.113.0/24"
 *   ⚠️ Private IPs (10.x.x.x, 192.168.x.x, 172.16-31.x.x) are REJECTED
 * 
 * - IP_WHITELIST_ENABLED: Set to "true" to enable IP whitelisting (default: "false")
 */

// Private IP ranges (RFC 1918)
const PRIVATE_IP_RANGES = [
  { start: '10.0.0.0', end: '10.255.255.255', name: '10.0.0.0/8' },
  { start: '172.16.0.0', end: '172.31.255.255', name: '172.16.0.0/12' },
  { start: '192.168.0.0', end: '192.168.255.255', name: '192.168.0.0/16' },
  { start: '127.0.0.0', end: '127.255.255.255', name: '127.0.0.0/8 (localhost)' },
  { start: '169.254.0.0', end: '169.254.255.255', name: '169.254.0.0/16 (link-local)' },
];

// Helper function to check if an IP is in a CIDR range
function ipToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function isInCIDR(ip, cidr) {
  const [network, prefixLength] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(prefixLength, 10)) - 1);
  return (ipToInt(ip) & mask) === (ipToInt(network) & mask);
}

// Check if an IP is private/local (not public)
function isPrivateIP(ip) {
  if (!ip || ip === 'unknown' || ip === 'localhost' || ip === '::1') {
    return true;
  }

  // Handle IPv6 mapped IPv4 (::ffff:192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }

  // Handle IPv6 localhost
  if (ip === '::1' || ip.startsWith('fe80:')) {
    return true;
  }

  // Check if it's a valid IPv4 address
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) {
    // Not a valid IPv4, could be IPv6 - treat as potentially public but log
    return false;
  }

  const ipInt = ipToInt(ip);
  
  for (const range of PRIVATE_IP_RANGES) {
    const startInt = ipToInt(range.start);
    const endInt = ipToInt(range.end);
    if (ipInt >= startInt && ipInt <= endInt) {
      return true;
    }
  }

  return false;
}

// Check if an IP is public (not private)
function isPublicIP(ip) {
  return !isPrivateIP(ip);
}

// Validate that an IP or CIDR range is public
function validatePublicIP(ipOrCIDR) {
  if (!ipOrCIDR || typeof ipOrCIDR !== 'string') {
    return { valid: false, reason: 'Invalid IP format' };
  }

  // Handle CIDR notation
  if (ipOrCIDR.includes('/')) {
    const [network] = ipOrCIDR.split('/');
    if (isPrivateIP(network.trim())) {
      return { valid: false, reason: `CIDR range contains private IP: ${network}` };
    }
    return { valid: true, ip: network.trim(), cidr: ipOrCIDR };
  }

  // Single IP
  if (isPrivateIP(ipOrCIDR.trim())) {
    return { valid: false, reason: `Private IP not allowed: ${ipOrCIDR}` };
  }

  return { valid: true, ip: ipOrCIDR.trim() };
}

// Helper function to get client IP address with detailed logging
function getClientIP(req, logDetails = {}) {
  const xForwardedFor = req.headers['x-forwarded-for'];
  const xRealIP = req.headers['x-real-ip'];
  const connectionRemoteAddress = req.connection?.remoteAddress;
  const socketRemoteAddress = req.socket?.remoteAddress;
  const reqIP = req.ip;

  // Log all IP sources
  logDetails.sources = {
    'X-Forwarded-For': xForwardedFor || null,
    'X-Real-IP': xRealIP || null,
    'req.connection.remoteAddress': connectionRemoteAddress || null,
    'req.socket.remoteAddress': socketRemoteAddress || null,
    'req.ip': reqIP || null,
  };

  // Priority order: X-Forwarded-For (first IP), X-Real-IP, req.ip, socket/connection
  let ip = null;
  let source = 'unknown';

  if (xForwardedFor) {
    ip = xForwardedFor.split(',')[0].trim();
    source = 'X-Forwarded-For';
  } else if (xRealIP) {
    ip = xRealIP.trim();
    source = 'X-Real-IP';
  } else if (reqIP) {
    ip = reqIP;
    source = 'req.ip';
  } else if (socketRemoteAddress) {
    ip = socketRemoteAddress;
    source = 'req.socket.remoteAddress';
  } else if (connectionRemoteAddress) {
    ip = connectionRemoteAddress;
    source = 'req.connection.remoteAddress';
  }

  // Normalize IPv6 mapped IPv4 addresses (::ffff:64.226.59.38 -> 64.226.59.38)
  if (ip && ip.startsWith('::ffff:')) {
    const originalIP = ip;
    ip = ip.replace('::ffff:', '');
    logDetails.normalized = { from: originalIP, to: ip };
  }

  // Handle IPv6 localhost
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1';
    source += ' (normalized from IPv6 localhost)';
  }

  if (!ip) {
    ip = 'unknown';
  }

  logDetails.detectedIP = ip;
  logDetails.source = source;

  return ip;
}

// Parse allowed IPs from environment variable and validate they are public
function getAllowedIPs() {
  const allowedIPsEnv = process.env.ALLOWED_IPS || '';
  if (!allowedIPsEnv.trim()) {
    return { valid: [], invalid: [], errors: [] };
  }
  
  const ips = allowedIPsEnv
    .split(',')
    .map(ip => ip.trim())
    .filter(ip => ip.length > 0);

  const valid = [];
  const invalid = [];
  const errors = [];

  for (const ipOrCIDR of ips) {
    const validation = validatePublicIP(ipOrCIDR);
    if (validation.valid) {
      valid.push(ipOrCIDR);
    } else {
      invalid.push(ipOrCIDR);
      errors.push(`${ipOrCIDR}: ${validation.reason}`);
    }
  }

  return { valid, invalid, errors };
}

// Check if IP is whitelisted
function isIPAllowed(clientIP, allowedIPs) {
  // If no IPs are configured, deny access (fail-safe)
  if (!allowedIPs || allowedIPs.length === 0) {
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
        console.error(`[IP Whitelist] Invalid CIDR notation: ${allowedIP}`, error);
      }
    }
  }

  return false;
}

/**
 * IP Whitelist Middleware
 * Use this to restrict access based on PUBLIC IP addresses only
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

  // Get client IP with detailed logging
  const logDetails = {};
  const clientIP = getClientIP(req, logDetails);
  const allowedIPsResult = getAllowedIPs();
  const allowedIPs = allowedIPsResult.valid;

  // Log invalid private IPs in whitelist configuration
  if (allowedIPsResult.invalid.length > 0) {
    console.error(`[IP Whitelist] ⚠️ INVALID PRIVATE IPs in ALLOWED_IPS (ignored): ${allowedIPsResult.invalid.join(', ')}`);
    allowedIPsResult.errors.forEach(error => {
      console.error(`[IP Whitelist]   - ${error}`);
    });
  }

  // Strict logging of IP detection
  console.log(`[IP Whitelist] 🔍 IP Detection Details:`);
  console.log(`[IP Whitelist]   - X-Forwarded-For: ${logDetails.sources['X-Forwarded-For'] || 'not present'}`);
  console.log(`[IP Whitelist]   - X-Real-IP: ${logDetails.sources['X-Real-IP'] || 'not present'}`);
  console.log(`[IP Whitelist]   - req.ip: ${logDetails.sources['req.ip'] || 'not present'}`);
  console.log(`[IP Whitelist]   - req.socket.remoteAddress: ${logDetails.sources['req.socket.remoteAddress'] || 'not present'}`);
  console.log(`[IP Whitelist]   - req.connection.remoteAddress: ${logDetails.sources['req.connection.remoteAddress'] || 'not present'}`);
  if (logDetails.normalized) {
    console.log(`[IP Whitelist]   - Normalized: ${logDetails.normalized.from} → ${logDetails.normalized.to}`);
  }
  console.log(`[IP Whitelist]   ✅ Using IP: ${clientIP} (source: ${logDetails.source})`);

  // Block private IPs by default (only allow if explicitly whitelisted)
  if (isPrivateIP(clientIP)) {
    console.warn(`[IP Whitelist] 🚫 ACCESS DENIED: Private IP detected: ${clientIP} (Private IPs are blocked by default)`);
    return res.status(403).json({
      success: false,
      message: 'Access denied. Private/local IP addresses are not allowed. Only public IP addresses can access this system.',
      code: 'IP_NOT_WHITELISTED',
      detectedIP: clientIP,
      ipType: 'private',
      reason: 'Private IP addresses are blocked by default'
    });
  }

  // If no valid public IPs are configured, deny all access
  if (allowedIPs.length === 0) {
    console.error(`[IP Whitelist] 🚫 ACCESS DENIED: No valid public IPs configured in ALLOWED_IPS`);
    return res.status(403).json({
      success: false,
      message: 'Access denied. No valid public IP addresses configured.',
      code: 'IP_NOT_WHITELISTED',
      detectedIP: clientIP,
      ipType: 'public'
    });
  }

  console.log(`[IP Whitelist] 📋 Whitelist Check: IP ${clientIP} against allowed IPs: ${allowedIPs.join(', ')}`);

  if (!isIPAllowed(clientIP, allowedIPs)) {
    console.warn(`[IP Whitelist] 🚫 ACCESS DENIED for IP: ${clientIP} | Allowed IPs: ${allowedIPs.join(', ')}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied. Your IP address is not authorized to access this system.',
      code: 'IP_NOT_WHITELISTED',
      detectedIP: clientIP,
      ipType: 'public',
      allowedIPs: allowedIPs
    });
  }

  // IP is allowed, proceed
  console.log(`[IP Whitelist] ✅ ACCESS ALLOWED for IP: ${clientIP}`);
  next();
};

// Log whitelist configuration on module load
const isEnabledOnLoad = String(process.env.IP_WHITELIST_ENABLED || '').trim().toLowerCase() === 'true';
const allowedIPsResultOnLoad = getAllowedIPs();
const allowedIPsOnLoad = allowedIPsResultOnLoad.valid;

if (isEnabledOnLoad) {
  console.log(`[IP Whitelist] ✅ ENABLED - Allowed PUBLIC IPs: ${allowedIPsOnLoad.join(', ') || 'NONE (ALL ACCESS WILL BE DENIED)'}`);
  
  if (allowedIPsResultOnLoad.invalid.length > 0) {
    console.error(`[IP Whitelist] ⚠️ WARNING: Private IPs found in ALLOWED_IPS (will be ignored):`);
    allowedIPsResultOnLoad.errors.forEach(error => {
      console.error(`[IP Whitelist]   - ${error}`);
    });
    console.error(`[IP Whitelist] ⚠️ Only PUBLIC IP addresses are allowed in ALLOWED_IPS`);
  }
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
