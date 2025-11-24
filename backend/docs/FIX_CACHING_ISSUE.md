# Fix for Index.html Caching Issue

## Problem
The old content from `index.html` was being cached by browsers and the server, showing outdated content even after changes were made.

## Solution
Updated the nginx configuration to prevent caching of `index.html` while still allowing static assets (JS, CSS, images) to be cached for performance.

## Steps to Apply the Fix

### Step 1: SSH into Your Production Server

```bash
ssh your-username@your-server-ip
# Example: ssh root@123.45.67.89
```

---

### Step 2: Navigate to Your Project Directory

```bash
cd /var/www/LTOWebsiteCapstone
```

**Verify you're in the right place:**
```bash
pwd
# Should output: /var/www/LTOWebsiteCapstone
ls -la
# Should show: backend, frontend, nginx-production.conf, etc.
```

---

### Step 3: Copy the Updated Nginx Config to Nginx Directory

```bash
# Copy the updated config file to nginx's sites-available directory
sudo cp /var/www/LTOWebsiteCapstone/nginx-production.conf /etc/nginx/sites-available/lto-website
```

**Verify the copy worked:**
```bash
# Check if file exists
ls -la /etc/nginx/sites-available/lto-website
```

**Or if you want to edit it manually first:**
```bash
# Open the nginx config file
sudo nano /etc/nginx/sites-available/lto-website
# Make your changes, then press Ctrl+X, then Y, then Enter to save
```

---

### Step 4: Check if Nginx Config File is Linked to sites-enabled

```bash
# Check if symlink exists
ls -la /etc/nginx/sites-enabled/lto-website

# If the file doesn't exist or shows an error, create the symlink:
sudo ln -s /etc/nginx/sites-available/lto-website /etc/nginx/sites-enabled/lto-website
```

---

### Step 5: Test Nginx Configuration (IMPORTANT - Don't Skip!)

```bash
sudo nginx -t
```

**You should see:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**If you see errors**, DO NOT reload nginx. Fix the errors first by checking the nginx config file.

---

### Step 6: Reload Nginx to Apply Changes

```bash
sudo systemctl reload nginx
```

**Verify nginx is running:**
```bash
sudo systemctl status nginx
# Should show: Active: active (running)
```

---

### Step 7: Rebuild Frontend (CRITICAL - Ensures Latest index.html is Built)

```bash
# Navigate to frontend directory
cd /var/www/LTOWebsiteCapstone/frontend

# Verify you're in the right place
pwd
# Should output: /var/www/LTOWebsiteCapstone/frontend

# Rebuild the frontend
npm run build
```

**This will create/update the `dist` folder with the latest `index.html`.**

**Wait for build to complete** - You should see something like:
```
✓ built in XX.XXs
```

---

### Step 8: Verify the Built index.html Has Your Changes

```bash
# Check the built index.html file
cat /var/www/LTOWebsiteCapstone/frontend/dist/index.html | head -20

# Or view it with less
less /var/www/LTOWebsiteCapstone/frontend/dist/index.html
# Press 'q' to exit
```

**Make sure the old text is NOT in this file.**

---

### Step 9: Test Your Website

1. **Open your website in a browser**
2. **Open Developer Tools** (F12 or Right-click > Inspect)
3. **Go to Network tab**
4. **Hard refresh the page** (Ctrl+Shift+R or Cmd+Shift+R)
5. **Click on `index.html` in the Network tab**
6. **Check Response Headers** - You should see:
   ```
   Cache-Control: no-cache, no-store, must-revalidate
   Pragma: no-cache
   Expires: 0
   ```

---

### Step 10: Verify the Fix is Working

**In a new incognito/private browser window:**
- Visit your website
- The old message should NOT appear
- Check that your updated content is showing

---

## Quick Reference: Directory Paths

| Purpose | Path |
|---------|------|
| Project root | `/var/www/LTOWebsiteCapstone` |
| Frontend source | `/var/www/LTOWebsiteCapstone/frontend` |
| Frontend build output | `/var/www/LTOWebsiteCapstone/frontend/dist` |
| Nginx config (source) | `/var/www/LTOWebsiteCapstone/nginx-production.conf` |
| Nginx config (active) | `/etc/nginx/sites-available/lto-website` |
| Nginx enabled config | `/etc/nginx/sites-enabled/lto-website` |

---

## Troubleshooting

### If nginx test fails:
```bash
# Check what the error is
sudo nginx -t

# View nginx error log
sudo tail -50 /var/log/nginx/error.log
```

### If website still shows old content:
1. **Check if you're viewing the built file:**
   ```bash
   cat /var/www/LTOWebsiteCapstone/frontend/dist/index.html
   ```

2. **Clear nginx cache (if any):**
   ```bash
   sudo systemctl reload nginx
   ```

3. **Try hard refresh in browser** (Ctrl+Shift+R)

4. **Check browser's Application/Storage tab** and clear all site data

### If you need to rollback:
```bash
# Restore from git (if you have the old config committed)
cd /var/www/LTOWebsiteCapstone
git checkout HEAD -- nginx-production.conf
sudo cp nginx-production.conf /etc/nginx/sites-available/lto-website
sudo nginx -t
sudo systemctl reload nginx
```

## What Changed

The nginx config now:
1. **Explicitly prevents caching of `/index.html`** - This ensures browsers always fetch the latest HTML
2. **Caches static assets** (JS, CSS, images) - These have version hashes and can be cached safely
3. **Prevents caching of all routes** - Since React Router serves index.html for all routes, we prevent caching to ensure users always get the latest version

## Key Nginx Directives Added

```nginx
# Prevent caching of index.html specifically
location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}
```

## Verification

After applying the fix:
1. Visit your website in an incognito/private window (to avoid browser cache)
2. Check the Network tab in browser DevTools
3. Look at the response headers for `index.html` - you should see `Cache-Control: no-cache, no-store, must-revalidate`
4. The old message should no longer appear

## Notes

- **Static assets** (like `main-abc123.js`) will still be cached for 1 year, which is fine because they have version hashes
- **index.html** will never be cached, ensuring users always get the latest version
- After deploying, existing users may still see cached content until they refresh, but new visits will get the fresh content

