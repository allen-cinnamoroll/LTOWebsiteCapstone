# Nginx Avatar Fix - Deployment Instructions

## Problem Fixed

The nginx configuration was serving the React app's `index.html` for `/uploads/avatars/...jpg` requests instead of the actual image files.

**Root Cause:** The root location `/` block was catching requests before the `/uploads` location block could serve the files.

## Solution Applied

The `nginx-production.conf` file has been updated with:

1. **Priority location matching** - Added `^~` modifier to `/uploads` location to give it priority
2. **Correct location order** - Moved `/uploads` location BEFORE the root `/` location
3. **File existence check** - Added `try_files $uri =404;` to ensure only actual files are served

## Deployment Steps

### 1. Copy the fixed configuration to your production server

**Option A: Using git (recommended if you use version control)**
```bash
# SSH into your production server
ssh user@ltodatamanager.com

# Navigate to your project directory
cd /var/www/LTOWebsiteCapstone

# Pull the latest changes
git pull origin main  # or whatever your branch is
```

**Option B: Manual copy**
```bash
# On your local machine, copy the file to the server
scp nginx-production.conf user@ltodatamanager.com:/tmp/nginx-production.conf

# SSH into server
ssh user@ltodatamanager.com

# Backup the current config
sudo cp /etc/nginx/sites-available/lto-website /etc/nginx/sites-available/lto-website.backup

# Copy the new config
sudo cp /tmp/nginx-production.conf /etc/nginx/sites-available/lto-website
```

### 2. Verify the configuration syntax

```bash
# Test the nginx configuration
sudo nginx -t
```

**Expected output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

If you see errors, fix them before proceeding.

### 3. Reload nginx to apply the changes

```bash
# Reload nginx (graceful reload, no downtime)
sudo nginx -s reload

# Or if that doesn't work:
sudo systemctl reload nginx

# Or restart:
sudo systemctl restart nginx
```

### 4. Verify the fix works

**A. Test directly via curl:**
```bash
# Test with a recent avatar file
curl -I https://ltodatamanager.com/uploads/avatars/avatar-68f3982c34bbe8923b851d13-1763325575965-146587224.jpg

# Expected output:
# HTTP/1.1 200 OK
# Content-Type: image/jpeg  ← Should be image/jpeg, NOT text/html
```

**B. Test in browser:**
1. Open browser console
2. Go to Account page
3. Upload a new avatar or refresh the page
4. Check console for:
   ```
   ✅ Avatar image is accessible: {
     url: 'https://ltodatamanager.com/uploads/avatars/...',
     status: 200,
     contentType: 'image/jpeg'  ← Should be image/jpeg
   }
   ```

**C. Check Network tab:**
1. Open browser DevTools → Network tab
2. Look for the avatar image request
3. Should show:
   - Status: 200
   - Type: `jpeg` or `image/jpeg`
   - Size: Actual file size (not ~100KB which would indicate HTML)

## Key Changes in Configuration

### Before (BROKEN):
```nginx
location / {
    root /var/www/LTOWebsiteCapstone/frontend/dist;
    try_files $uri $uri/ /index.html;  # ← This catches /uploads/... requests
}

location /uploads {
    alias /var/www/LTOWebsiteCapstone/backend/uploads;
}
```

### After (FIXED):
```nginx
# ✅ Priority match - comes FIRST
location ^~ /uploads {
    alias /var/www/LTOWebsiteCapstone/backend/uploads;
    try_files $uri =404;  # ← Only serves actual files, 404 if missing
}

# ✅ Catch-all - comes LAST
location / {
    root /var/www/LTOWebsiteCapstone/frontend/dist;
    try_files $uri $uri/ /index.html;
}
```

## What the `^~` modifier does

- `^~` tells nginx: "If request matches this prefix, use this location and STOP checking other locations"
- This prevents `/uploads/...` requests from falling through to the root location
- Without it, nginx would check the root location first and serve `index.html`

## Troubleshooting

### If avatars still don't load:

**1. Check if file exists on server:**
```bash
ls -la /var/www/LTOWebsiteCapstone/backend/uploads/avatars/avatar-*.jpg
```

**2. Check nginx error logs:**
```bash
sudo tail -f /var/log/nginx/error.log
```

**3. Check nginx access logs:**
```bash
sudo tail -f /var/log/nginx/access.log
```

**4. Verify file permissions:**
```bash
# Check permissions
ls -ld /var/www/LTOWebsiteCapstone/backend/uploads/avatars/

# Fix if needed (replace 'www-data' with your nginx user if different)
sudo chown -R www-data:www-data /var/www/LTOWebsiteCapstone/backend/uploads
sudo chmod -R 755 /var/www/LTOWebsiteCapstone/backend/uploads
```

**5. Clear browser cache:**
- Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- Or clear cache completely in browser settings

**6. Test with a new avatar upload:**
- The cache-busting query parameter (`?t=timestamp`) should force a fresh request
- Try uploading a new avatar and verify it displays

## Rollback (if needed)

If something goes wrong, you can rollback:

```bash
# Restore the backup
sudo cp /etc/nginx/sites-available/lto-website.backup /etc/nginx/sites-available/lto-website

# Test
sudo nginx -t

# Reload
sudo nginx -s reload
```

## Verification Checklist

- [ ] Nginx config syntax test passes (`sudo nginx -t`)
- [ ] Nginx reloaded successfully (`sudo nginx -s reload`)
- [ ] `curl -I` shows `Content-Type: image/jpeg` (not `text/html`)
- [ ] Browser console shows avatar loaded successfully
- [ ] Avatar displays in browser UI
- [ ] No errors in nginx error log
- [ ] Network tab shows correct content-type for avatar requests

## Expected Behavior After Fix

✅ Requests to `/uploads/avatars/...jpg` → Serve actual image file  
✅ Requests to `/api/...` → Proxy to backend  
✅ Requests to `/mv-prediction-api/...` → Proxy to Flask API  
✅ All other requests → Serve React app (`index.html`)

The fix ensures nginx checks location blocks in the correct order, with specific paths (`/uploads`, `/api`) matched before the catch-all root location.

