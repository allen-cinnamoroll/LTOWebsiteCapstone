# Fix for Index.html Caching Issue

## Problem
The old content from `index.html` was being cached by browsers and the server, showing outdated content even after changes were made.

## Solution
Updated the nginx configuration to prevent caching of `index.html` while still allowing static assets (JS, CSS, images) to be cached for performance.

## Steps to Apply the Fix

### 1. Update Nginx Configuration on Production Server

Copy the updated `nginx-production.conf` to your server:

```bash
# On your production server
sudo nano /etc/nginx/sites-available/lto-website
```

Or copy the file:
```bash
sudo cp /var/www/LTOWebsiteCapstone/nginx-production.conf /etc/nginx/sites-available/lto-website
```

### 2. Test Nginx Configuration

```bash
sudo nginx -t
```

You should see:
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 3. Reload Nginx

```bash
sudo systemctl reload nginx
```

### 4. Rebuild Frontend (Important!)

Make sure the frontend is rebuilt after your `index.html` changes:

```bash
cd /var/www/LTOWebsiteCapstone/frontend
npm run build
```

### 5. Clear Browser Cache (For Testing)

After deploying, users should:
- **Hard refresh**: Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Or clear browser cache manually

### 6. Optional: Clear Server Cache

If you're using any caching layers (like Varnish or a CDN), clear those as well.

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

