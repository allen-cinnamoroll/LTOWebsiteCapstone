# Quick Start: WiFi Network Restriction

## ✅ What's Already Set Up

The system already has network restriction functionality built-in! Here's what's included:

1. ✅ **Backend IP Whitelist Middleware** (`backend/middleware/ipWhitelistMiddleware.js`)
2. ✅ **Frontend Error Page** (`frontend/src/pages/NetworkRestrictedPage.jsx`)
3. ✅ **Axios Interceptor** - Automatically redirects blocked users
4. ✅ **Route Configuration** - `/network-restricted` path added

---

## 🚀 How to Enable (3 Simple Steps)

### Step 1: Find Your WiFi Network IP Range

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" (e.g., `192.168.1.50`)

**Mac/Linux:**
```bash
ifconfig
```

Your network is likely `192.168.1.0/24` or `192.168.0.0/24`

---

### Step 2: Configure Backend

Edit your `backend/.env` file and add/update these lines:

```env
# Enable WiFi restriction
IP_WHITELIST_ENABLED=true

# Allow your WiFi network (replace with your network range)
ALLOWED_IPS=192.168.1.0/24
```

**Important:** Replace `192.168.1.0/24` with your actual WiFi network range!

---

### Step 3: Restart Backend Server

```bash
cd backend
npm start
```

---

## 🎯 That's It!

Now the system will:
- ✅ Allow access ONLY from devices connected to your specified WiFi
- ❌ Block access from other networks with a friendly error page
- 🔒 Show "Network Restricted" message to unauthorized users

---

## 📝 Configuration Examples

### Allow Single WiFi Network (Most Common)
```env
IP_WHITELIST_ENABLED=true
ALLOWED_IPS=192.168.1.0/24
```

### Allow Multiple WiFi Networks (Office + Branch)
```env
IP_WHITELIST_ENABLED=true
ALLOWED_IPS=192.168.1.0/24,192.168.2.0/24
```

### Allow Specific Devices Only
```env
IP_WHITELIST_ENABLED=true
ALLOWED_IPS=192.168.1.100,192.168.1.101,192.168.1.102
```

### Temporarily Disable (Development)
```env
IP_WHITELIST_ENABLED=false
```

---

## 🧪 Testing

### Test 1: On Your WiFi ✅
1. Connect to your authorized WiFi
2. Open the app → Should work normally

### Test 2: On Different Network ❌
1. Connect to mobile data or different WiFi
2. Open the app → Should show "Network Restricted" page

---

## ❓ FAQ

**Q: I'm on the right WiFi but still blocked?**
A: Check if your IP is actually in the range. Run `ipconfig` and compare with your `ALLOWED_IPS`.

**Q: My router changes IPs often?**
A: Use CIDR notation (e.g., `/24`) to allow a range instead of single IPs.

**Q: Can I access from multiple locations?**
A: Yes! Add all network ranges separated by commas.

**Q: How do I disable this temporarily?**
A: Set `IP_WHITELIST_ENABLED=false` in `.env` and restart server.

---

## 📚 More Details

See `NETWORK_RESTRICTION_SETUP.md` for comprehensive documentation including:
- Detailed configuration options
- Troubleshooting guide
- Security best practices
- Advanced scenarios

---

## 🔧 Current Network Info

To see your current IP and test the configuration:

**Windows:**
```bash
ipconfig
```

**Mac/Linux:**
```bash
ifconfig | grep "inet "
```

**Or check backend logs** when accessing the app - it logs the client IP address!

