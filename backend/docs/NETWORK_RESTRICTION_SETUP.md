# Network Restriction Setup Guide

This guide explains how to configure the system to only allow access from a specific WiFi network.

## Overview

The system includes an IP Whitelist feature that restricts access based on the client's IP address. This ensures that only devices connected to authorized WiFi networks can access the system.

## How It Works

1. **Backend Middleware**: Checks the client's IP address on every API request
2. **IP Matching**: Compares the client IP against the configured allowed IPs/ranges
3. **Access Control**: Blocks requests from unauthorized networks (403 error)
4. **Frontend Handling**: Redirects blocked users to a network restriction error page

---

## Configuration Steps

### Step 1: Find Your WiFi Network's IP Range

#### On Windows:
1. Connect to your WiFi network
2. Open Command Prompt (cmd)
3. Run: `ipconfig`
4. Look for "IPv4 Address" under your WiFi adapter (e.g., `192.168.1.50`)
5. Note the subnet mask (usually `255.255.255.0`)

#### On Mac/Linux:
1. Connect to your WiFi network
2. Open Terminal
3. Run: `ifconfig` (Mac) or `ip addr` (Linux)
4. Look for your WiFi adapter's IP address

#### Example Output:
```
IPv4 Address: 192.168.1.50
Subnet Mask: 255.255.255.0
```

This means your network range is `192.168.1.0/24` (allows IPs from 192.168.1.0 to 192.168.1.255)

---

### Step 2: Configure Backend

1. Navigate to the `backend` folder
2. Copy `.env.example` to `.env` (if not already done):
   ```bash
   cp .env.example .env
   ```

3. Edit the `.env` file and update these settings:

```env
# Enable IP whitelist
IP_WHITELIST_ENABLED=true

# Set your WiFi network's IP range
ALLOWED_IPS=192.168.1.0/24
```

#### Configuration Options:

**Option 1: Single IP Address**
```env
ALLOWED_IPS=192.168.1.100
```
Only allows one specific device.

**Option 2: Multiple IP Addresses**
```env
ALLOWED_IPS=192.168.1.100,192.168.1.101,192.168.1.102
```
Allows specific devices (comma-separated).

**Option 3: IP Range (CIDR Notation) - Recommended**
```env
ALLOWED_IPS=192.168.1.0/24
```
Allows all devices on the network (192.168.1.0 to 192.168.1.255).

**Option 4: Multiple Ranges**
```env
ALLOWED_IPS=192.168.1.0/24,10.0.0.0/8
```
Allows multiple networks.

---

### Step 3: Restart the Backend Server

After updating the `.env` file:

```bash
# Stop the server (Ctrl+C)
# Then restart it
npm start
```

---

## Testing the Configuration

### Test 1: Access from Authorized Network
1. Connect your device to the authorized WiFi network
2. Open the application in your browser
3. You should be able to access normally ✅

### Test 2: Access from Unauthorized Network
1. Connect your device to a different WiFi network (or use mobile data)
2. Try to access the application
3. You should see the "Network Restricted" error page ❌

---

## Common Network Ranges

| CIDR | Subnet Mask | Address Range | # of IPs |
|------|-------------|---------------|----------|
| /24 | 255.255.255.0 | 192.168.1.0 - 192.168.1.255 | 256 |
| /23 | 255.255.254.0 | 192.168.0.0 - 192.168.1.255 | 512 |
| /22 | 255.255.252.0 | 192.168.0.0 - 192.168.3.255 | 1,024 |
| /16 | 255.255.0.0 | 192.168.0.0 - 192.168.255.255 | 65,536 |

---

## Troubleshooting

### Issue: "Access Denied" even on authorized network

**Possible Causes:**
1. Your IP is not in the allowed range
2. You're behind a proxy or VPN
3. The router assigns dynamic IPs outside the configured range

**Solutions:**
1. Check your current IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Update `ALLOWED_IPS` in `.env` to include your IP or use a broader range
3. Restart the backend server after making changes

### Issue: Can't access from any network

**Solution:**
Temporarily disable the IP whitelist to test:
```env
IP_WHITELIST_ENABLED=false
```
Then restart the server.

### Issue: Need to allow multiple office locations

**Solution:**
Add all office network ranges:
```env
ALLOWED_IPS=192.168.1.0/24,192.168.2.0/24,10.0.0.0/8
```

---

## Security Best Practices

1. **Use CIDR ranges** instead of single IPs for WiFi networks (devices may get different IPs)
2. **Keep the range as narrow as possible** to maintain security
3. **Document allowed ranges** and update them when network changes occur
4. **Regularly audit access** by checking server logs
5. **Use HTTPS** in production to encrypt data in transit

---

## Disabling Network Restriction

If you need to disable the network restriction (e.g., for remote access):

1. Edit `.env`:
```env
IP_WHITELIST_ENABLED=false
```

2. Restart the backend server

⚠️ **Warning**: Disabling this feature allows access from any network. Only do this if you have other security measures in place.

---

## Advanced Configuration

### Using Environment Variables for Different Deployments

#### Development:
```env
IP_WHITELIST_ENABLED=false
```

#### Production (Office Network):
```env
IP_WHITELIST_ENABLED=true
ALLOWED_IPS=192.168.1.0/24
```

#### Production (Multiple Offices):
```env
IP_WHITELIST_ENABLED=true
ALLOWED_IPS=192.168.1.0/24,192.168.2.0/24,10.20.30.0/24
```

---

## Support

If you encounter issues:
1. Check backend logs for IP address information
2. Verify your network configuration
3. Test with `IP_WHITELIST_ENABLED=false` to isolate the issue
4. Contact your system administrator for network-specific questions

