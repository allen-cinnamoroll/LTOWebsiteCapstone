# Production Avatar Issue - Troubleshooting Guide

## Problem

Avatar uploads work in development but not in production. The browser receives:
- Status: 200 ✅
- Content-Type: `text/html` ❌ (should be `image/jpeg`)

This means nginx is serving an HTML page (likely the React app's `index.html`) instead of the actual image file.

## Root Causes

1. **File doesn't exist on the server** - The uploaded file wasn't saved to disk
2. **Nginx location block not matching** - The `/uploads` location isn't catching the request
3. **Location block order** - The root location (`/`) is catching requests before `/uploads`
4. **Nginx not reloaded** - Configuration changes weren't applied
5. **File permissions** - Nginx can't read the files

## Quick Diagnostics

### 1. Check if the file exists on the server

SSH into your production server and run:

```bash
# Check if the file exists
ls -la /var/www/LTOWebsiteCapstone/backend/uploads/avatars/avatar-68f3982c34bbe8923b851d13-1763325400810-508095726.jpg

# Check all avatars
ls -la /var/www/LTOWebsiteCapstone/backend/uploads/avatars/

# Check directory permissions
ls -ld /var/www/LTOWebsiteCapstone/backend/uploads/avatars/
```

**Expected output:**
- File should exist and be readable
- Permissions should be `-rw-r--r--` or similar (644 or 755)
- Owner should be your server user or `www-data`

### 2. Verify nginx configuration

```bash
# Check nginx config syntax
sudo nginx -t

# View current config
sudo cat /etc/nginx/sites-available/lto-website

# Check if config is enabled
sudo ls -la /etc/nginx/sites-enabled/lto-website
```

**Key things to verify:**

1. **Location block order** - `/uploads` should come BEFORE the root `/` location:

```nginx
# ✅ CORRECT ORDER
location /uploads {
    alias /var/www/LTOWebsiteCapstone/backend/uploads;
    ...
}

location / {
    root /var/www/LTOWebsiteCapstone/frontend/dist;
    ...
}
```

2. **Location block syntax** - Should use `alias`, not `root`:

```nginx
# ✅ CORRECT
location /uploads {
    alias /var/www/LTOWebsiteCapstone/backend/uploads;
}

# ❌ WRONG
location /uploads {
    root /var/www/LTOWebsiteCapstone/backend;
}
```

### 3. Test nginx directly

```bash
# Test if nginx can serve the file
curl -I https://ltodatamanager.com/uploads/avatars/avatar-68f3982c34bbe8923b851d13-1763325400810-508095726.jpg

# Expected output:
# HTTP/1.1 200 OK
# Content-Type: image/jpeg  ← Should be image/jpeg, NOT text/html
```

### 4. Check nginx error logs

```bash
# View recent errors
sudo tail -f /var/log/nginx/error.log

# View access logs
sudo tail -f /var/log/nginx/access.log
```

## Solutions

### Solution 1: Verify File Exists

If the file doesn't exist:

1. **Check backend uploads are working:**
   ```bash
   # Check if uploads directory exists
   ls -la /var/www/LTOWebsiteCapstone/backend/uploads/
   
   # Check permissions
   sudo chown -R $USER:$USER /var/www/LTOWebsiteCapstone/backend/uploads
   sudo chmod -R 755 /var/www/LTOWebsiteCapstone/backend/uploads
   ```

2. **Test file upload again** - Upload a new avatar and verify it saves:
   - Check console logs in browser for the saved path
   - Verify file exists on server at that path

### Solution 2: Fix Nginx Configuration

If the file exists but nginx isn't serving it:

1. **Ensure location block order is correct:**

```bash
sudo nano /etc/nginx/sites-available/lto-website
```

Make sure `/uploads` comes **BEFORE** `/`:

```nginx
server {
    listen 80;
    
    client_max_body_size 10M;

    # ✅ MUST COME FIRST - More specific location
    location /uploads {
        alias /var/www/LTOWebsiteCapstone/backend/uploads;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # ✅ MUST COME AFTER - Less specific location
    location / {
        root /var/www/LTOWebsiteCapstone/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # ... rest of config
}
```

2. **Test and reload nginx:**

```bash
# Test configuration
sudo nginx -t

# If test passes, reload
sudo nginx -s reload

# Or restart if reload doesn't work
sudo systemctl reload nginx
```

### Solution 3: Fix File Permissions

If nginx can't read the files:

```bash
# Set ownership (replace 'lto' with your server user)
sudo chown -R lto:www-data /var/www/LTOWebsiteCapstone/backend/uploads

# Or use www-data (nginx user)
sudo chown -R www-data:www-data /var/www/LTOWebsiteCapstone/backend/uploads

# Set permissions
sudo chmod -R 755 /var/www/LTOWebsiteCapstone/backend/uploads
sudo chmod -R 644 /var/www/LTOWebsiteCapstone/backend/uploads/avatars/*.jpg
```

### Solution 4: Use More Specific Location Match

If location order doesn't work, make the match more explicit:

```nginx
# Use exact prefix match
location ^~ /uploads {
    alias /var/www/LTOWebsiteCapstone/backend/uploads;
    access_log off;
    expires 30d;
    add_header Cache-Control "public, immutable";
    
    # Ensure it only matches files, not directories
    try_files $uri =404;
}
```

The `^~` prefix makes it a priority match that won't fall through to the root location.

## Verification Steps

After applying fixes:

1. **Clear browser cache** (Ctrl+Shift+Delete)

2. **Upload a new avatar** or wait for cache-buster to update

3. **Check browser console** - Should now see:
   ```
   ✅ Avatar image is accessible: {
     url: 'https://ltodatamanager.com/uploads/avatars/...',
     status: 200,
     contentType: 'image/jpeg'  ← Should be image/jpeg
   }
   ```

4. **Check Network tab** - Avatar request should show:
   - Status: 200
   - Type: `jpeg` or `image/jpeg`
   - Size: Actual file size (not HTML size ~100KB)

5. **Test directly:**
   ```bash
   curl -I https://ltodatamanager.com/uploads/avatars/[FILENAME]
   ```
   Should return `Content-Type: image/jpeg`

## Common Issues

### Issue: "File exists but still getting HTML"

**Cause:** Location block order or nginx not reloaded

**Fix:**
1. Ensure `/uploads` location comes before `/` location
2. Add `^~` prefix to `/uploads` location
3. Reload nginx: `sudo nginx -s reload`

### Issue: "Permission denied" in nginx logs

**Cause:** Nginx can't read the files

**Fix:**
```bash
sudo chown -R www-data:www-data /var/www/LTOWebsiteCapstone/backend/uploads
sudo chmod -R 755 /var/www/LTOWebsiteCapstone/backend/uploads
```

### Issue: "File not found" (404)

**Cause:** File wasn't saved or wrong path

**Fix:**
1. Check backend saves files correctly
2. Verify path in database matches file system
3. Check multer configuration in `backend/controller/accountController.js`

## Still Not Working?

If none of the above works:

1. **Check backend logs:**
   ```bash
   # Check Node.js backend logs
   pm2 logs
   # or
   journalctl -u your-backend-service -f
   ```

2. **Test backend static file serving directly:**
   ```bash
   # Backend should serve files at /uploads
   curl http://localhost:5000/uploads/avatars/[FILENAME]
   ```

3. **Check if backend is running:**
   ```bash
   pm2 status
   # or
   sudo systemctl status your-backend-service
   ```

4. **Verify nginx is forwarding uploads correctly:**
   - Check if nginx should proxy `/uploads` to backend instead of serving directly
   - Some setups require: `location /uploads { proxy_pass http://localhost:5000; }`

