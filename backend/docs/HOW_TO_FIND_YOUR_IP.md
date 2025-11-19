# How to Find Your IP Address for IP Whitelisting

This guide explains how to find your IP address to add it to the `ALLOWED_IPS` configuration.

## Understanding IP Addresses

There are **two types of IP addresses** you might need:

1. **Private/Local IP** (e.g., `192.168.1.100`) - For accessing from within the same network
2. **Public IP** (e.g., `203.0.113.50`) - For accessing from the internet

## Quick Method: Find Your IP Address

### For Windows:

**Option 1: Using Command Prompt**
1. Press `Windows + R` to open Run dialog
2. Type `cmd` and press Enter
3. Type: `ipconfig`
4. Look for **"IPv4 Address"** under your active network adapter (Wi-Fi or Ethernet)
   - Example: `192.168.1.100`

**Option 2: Using PowerShell**
1. Press `Windows + X` and select "Windows PowerShell"
2. Type: `ipconfig`
3. Look for **"IPv4 Address"**

### For Mac:

**Option 1: Using Terminal**
1. Press `Command + Space` to open Spotlight
2. Type `Terminal` and press Enter
3. Type: `ifconfig | grep "inet "`
4. Look for the IP address (usually starts with `192.168.x.x` or `10.x.x.x`)

**Option 2: Using System Preferences**
1. Click Apple menu → System Preferences → Network
2. Select your active connection (Wi-Fi or Ethernet)
3. Your IP address will be shown on the right

### For Linux:

1. Open Terminal
2. Type: `ip addr show` or `ifconfig`
3. Look for your network interface (usually `wlan0` for Wi-Fi or `eth0` for Ethernet)
4. Find the `inet` address

## Finding Your Public IP Address (For Internet Access)

If you need to access the system from the **internet** (not just your local network), you need your **public IP**:

### Method 1: Using Browser
1. Visit: https://whatismyipaddress.com/
2. Copy the **IPv4 Address** shown

### Method 2: Using Command Line

**Windows (PowerShell):**
```powershell
(Invoke-WebRequest -Uri "https://ifconfig.me" -UseBasicParsing).Content
```

**Mac/Linux:**
```bash
curl ifconfig.me
```

Or:
```bash
curl https://api.ipify.org
```

## Which IP to Use?

### Use **Private/Local IP** (`192.168.x.x` or `10.x.x.x`) when:
- ✅ Accessing the server from the **same local network**
- ✅ Server is on the same Wi-Fi/LAN
- ✅ Development/testing on same network

**Example:**
```env
ALLOWED_IPS=192.168.1.100
```

### Use **Public IP** when:
- ✅ Accessing the server from **different networks**
- ✅ Accessing from home to office server
- ✅ Server is on the internet
- ✅ Using VPN

**Example:**
```env
ALLOWED_IPS=203.0.113.50
```

### Use **CIDR Range** when:
- ✅ Allowing access from an **entire network**
- ✅ Multiple devices on the same network need access
- ✅ Your IP changes frequently (DHCP)

**Examples:**
```env
# Allow entire local network (192.168.1.0 to 192.168.1.255)
ALLOWED_IPS=192.168.1.0/24

# Allow larger network (192.168.0.0 to 192.168.255.255)
ALLOWED_IPS=192.168.0.0/16
```

## Common Scenarios

### Scenario 1: Same Building/Network
If you and the server are on the same Wi-Fi/router:
- Use your **private IP**: `192.168.1.100`
- Configuration: `ALLOWED_IPS=192.168.1.100`

### Scenario 2: Different Locations
If accessing from home to office server:
- Use your **public IP**: `203.0.113.50`
- Configuration: `ALLOWED_IPS=203.0.113.50`

### Scenario 3: Dynamic IP (Changes Frequently)
If your IP changes often:
- Use **CIDR range** for your network: `192.168.1.0/24`
- Or update `ALLOWED_IPS` each time your IP changes
- Configuration: `ALLOWED_IPS=192.168.1.0/24`

### Scenario 4: Multiple Devices Same Network
If multiple devices need access:
- Use **CIDR range**: `192.168.1.0/24`
- Configuration: `ALLOWED_IPS=192.168.1.0/24`

## Step-by-Step: Adding Your IP to Whitelist

### Step 1: Find Your IP
Use one of the methods above to find your IP address.

**Example result:**
- Local IP: `192.168.1.100`
- Public IP: `203.0.113.50`

### Step 2: Edit `.env` File
Open `backend/.env` file and add:

```env
IP_WHITELIST_ENABLED=true
ALLOWED_IPS=192.168.1.100
```

### Step 3: Restart Server
After changing `.env`, restart your Node.js server:

**If using PM2:**
```bash
pm2 restart lto-backend
```

**If using npm:**
```bash
# Stop server (Ctrl+C) and restart
npm start
```

### Step 4: Test Access
Try accessing the system. If your IP is correct, you should have access!

## Troubleshooting

### "Access Denied" Even After Adding IP

1. **Check if IP whitelisting is enabled:**
   ```env
   IP_WHITELIST_ENABLED=true
   ```

2. **Verify your IP is correct:**
   - Check server logs for the detected IP
   - The log will show: `Access attempt from IP: XXX.XXX.XXX.XXX`

3. **Check for typos:**
   - Make sure there are no spaces: `192.168.1.100` ✅ (not `192.168.1.100 ` ❌)

4. **Restart server** after changing `.env`

### IP Keeps Changing (Dynamic IP)

**Solution 1: Use CIDR Range**
```env
# Allow entire network
ALLOWED_IPS=192.168.1.0/24
```

**Solution 2: Check Your Router Settings**
- Some routers allow setting static IPs for specific devices
- Check router admin panel (usually `192.168.1.1`)

**Solution 3: Disable Whitelisting Temporarily**
```env
IP_WHITELIST_ENABLED=false
```
Then add your IP each time it changes.

## Quick Reference Commands

### Windows:
```cmd
ipconfig                    # Find local IP
curl ifconfig.me            # Find public IP (if curl installed)
```

### Mac/Linux:
```bash
ifconfig | grep "inet "     # Find local IP
curl ifconfig.me            # Find public IP
ip addr show                # Find local IP (Linux)
```

### Online Tools:
- https://whatismyipaddress.com/
- https://ifconfig.me/
- https://api.ipify.org

## Example Configurations

### Single IP (Most Common):
```env
IP_WHITELIST_ENABLED=true
ALLOWED_IPS=192.168.1.100
```

### Multiple IPs:
```env
IP_WHITELIST_ENABLED=true
ALLOWED_IPS=192.168.1.100,192.168.1.101,192.168.1.102
```

### IP Range (Entire Network):
```env
IP_WHITELIST_ENABLED=true
ALLOWED_IPS=192.168.1.0/24
```

### Mixed (IPs and Ranges):
```env
IP_WHITELIST_ENABLED=true
ALLOWED_IPS=192.168.1.100,10.0.0.0/8,172.16.0.0/12
```

## Need Help?

If you're still having issues:
1. Check server logs to see what IP was detected
2. Temporarily disable IP whitelisting to test: `IP_WHITELIST_ENABLED=false`
3. Use a CIDR range if your IP changes frequently
4. Contact your network administrator for network-specific IPs

