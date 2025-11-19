# IP Whitelist Configuration Guide

This guide explains how to configure IP whitelisting to restrict access to your LTO Website system to specific IP addresses or networks.

## Overview

IP whitelisting is a security feature that allows you to restrict system access to specific IP addresses or IP ranges. This is useful when you want to ensure that only users from specific locations or networks can access the system.

## Features

- ✅ Support for individual IP addresses
- ✅ Support for CIDR notation (IP ranges)
- ✅ Support for multiple IPs/ranges
- ✅ Works behind proxies/load balancers (detects real client IP)
- ✅ Easy to enable/disable via environment variable
- ✅ Detailed logging for access attempts

## Configuration

### Step 1: Enable IP Whitelisting

Add the following to your `.env` file in the `backend/` directory:

```env
# Enable IP whitelisting (set to 'true' to enable)
IP_WHITELIST_ENABLED=true

# Comma-separated list of allowed IP addresses or CIDR ranges
ALLOWED_IPS=192.168.1.100,10.0.0.0/8,172.16.0.0/12
```

### Step 2: Configure Allowed IPs

The `ALLOWED_IPS` environment variable accepts:
- **Individual IP addresses**: `192.168.1.100`
- **CIDR notation (IP ranges)**: `192.168.1.0/24` (all IPs from 192.168.1.0 to 192.168.1.255)
- **Multiple IPs/ranges**: Comma-separated list

## Examples

### Example 1: Single IP Address

```env
IP_WHITELIST_ENABLED=true
ALLOWED_IPS=192.168.1.100
```

Only allows access from `192.168.1.100`

### Example 2: Multiple IP Addresses

```env
IP_WHITELIST_ENABLED=true
ALLOWED_IPS=192.168.1.100,192.168.1.101,192.168.1.102
```

Allows access from three specific IP addresses.

### Example 3: IP Range (CIDR Notation)

```env
IP_WHITELIST_ENABLED=true
ALLOWED_IPS=192.168.1.0/24
```

Allows access from all IPs in the range `192.168.1.0` to `192.168.1.255` (256 IPs).

### Example 4: Multiple IPs and Ranges

```env
IP_WHITELIST_ENABLED=true
ALLOWED_IPS=192.168.1.100,10.0.0.0/8,172.16.0.0/12
```

Allows access from:
- Specific IP: `192.168.1.100`
- Private network range: `10.0.0.0` to `10.255.255.255`
- Another private network range: `172.16.0.0` to `172.31.255.255`

### Example 5: Local Network Only

```env
IP_WHITELIST_ENABLED=true
ALLOWED_IPS=192.168.0.0/16,10.0.0.0/8
```

Allows access from common local network ranges.

## CIDR Notation Reference

| CIDR | Subnet Mask | Hosts | Description |
|------|-------------|-------|-------------|
| `/8` | 255.0.0.0 | 16,777,214 | Large network (Class A) |
| `/16` | 255.255.0.0 | 65,534 | Medium network (Class B) |
| `/24` | 255.255.255.0 | 254 | Small network (Class C) |
| `/32` | 255.255.255.255 | 1 | Single IP |

Common private IP ranges:
- `10.0.0.0/8` - Class A private network
- `172.16.0.0/12` - Class B private network
- `192.168.0.0/16` - Class C private network

## How It Works

1. **IP Detection**: The middleware detects the client's real IP address, even when behind a proxy or load balancer, by checking headers in this order:
   - `X-Forwarded-For`
   - `X-Real-IP`
   - Connection remote address
   - Socket remote address

2. **IP Matching**: 
   - First checks for exact IP matches
   - Then checks if the IP falls within any configured CIDR ranges

3. **Access Control**:
   - If IP whitelisting is disabled (`IP_WHITELIST_ENABLED=false`), all requests are allowed
   - If enabled and IP is whitelisted, request proceeds
   - If enabled and IP is not whitelisted, request is denied with 403 error

## Logging

The middleware logs all access attempts:

```
Access attempt from IP: 192.168.1.100
```

For denied access:
```
Access denied for IP: 203.0.113.50. Allowed IPs: 192.168.1.100,10.0.0.0/8
```

## Disabling IP Whitelisting

To disable IP whitelisting (allow all IPs), set:

```env
IP_WHITELIST_ENABLED=false
```

Or simply remove the `IP_WHITELIST_ENABLED` variable from your `.env` file.

## Troubleshooting

### Issue: "Access denied" even with correct IP

**Solution:**
1. Check that `IP_WHITELIST_ENABLED=true` is set correctly
2. Verify your IP is in the `ALLOWED_IPS` list
3. Check server logs to see what IP the system detected
4. If behind a proxy, ensure `app.set('trust proxy', true)` is configured (already set in server.js)

### Issue: Can't access system after enabling

**Solution:**
1. Temporarily set `IP_WHITELIST_ENABLED=false` to disable
2. Find your current public IP using: `curl ifconfig.me` or visit `whatismyip.com`
3. Add your IP to `ALLOWED_IPS`
4. Re-enable whitelisting

### Issue: IP keeps changing (Dynamic IP)

**Solution:**
If your IP changes frequently, consider:
1. Using a broader CIDR range that covers your network
2. Using a VPN with a static IP
3. Configuring a reverse proxy with IP forwarding rules

## Security Considerations

⚠️ **Important Notes:**

1. **IP Spoofing**: IP whitelisting can be bypassed if headers are spoofed. Always ensure your proxy/load balancer is configured correctly and not accessible to attackers.

2. **Dynamic IPs**: Users with dynamic IPs will need to update the whitelist when their IP changes, or use CIDR ranges.

3. **Development vs Production**: 
   - Disable in development: `IP_WHITELIST_ENABLED=false`
   - Enable in production with your office/home IPs

4. **Fail-Safe**: If `ALLOWED_IPS` is empty when whitelisting is enabled, all access will be denied.

## Testing

After configuration, test by:

1. **From allowed IP**: Should access normally
2. **From non-allowed IP**: Should receive 403 error:
   ```json
   {
     "success": false,
     "message": "Access denied. Your IP address is not authorized to access this system.",
     "code": "IP_NOT_WHITELISTED"
   }
   ```

## Example Complete .env Configuration

```env
NODE_ENV=production
PORT=5000
DATABASE=mongodb://user:password@localhost:27017/lto_website

# IP Whitelist Configuration
IP_WHITELIST_ENABLED=true
ALLOWED_IPS=192.168.1.100,192.168.1.0/24,10.0.0.0/8

# Other environment variables...
ACCESS_TOKEN_SECRET=your_secret_key
```

## Support

For issues or questions, check the server logs or refer to `backend/middleware/ipWhitelistMiddleware.js` for implementation details.

