# Avatar Upload - Production Deployment Checklist

## Pre-Deployment Checklist

### 1. Build Frontend with Correct Environment Variable

The frontend needs to know your production URL. Check if you have a `.env.production` file:

```bash
# In frontend directory
cd frontend

# Create .env.production if it doesn't exist
cat > .env.production << 'EOF'
VITE_BASE_URL=https://ltodatamanager.com/api
VITE_MV_PREDICTION_API_URL=http://72.60.198.244:5001
EOF

# Build the frontend
npm run build
```

### 2. Verify Nginx Configuration on Server

SSH into your production server and check:

```bash
# Check if nginx config has the /uploads location block
sudo cat /etc/nginx/sites-available/lto-website | grep -A 5 "location /uploads"
```

**Expected output:**
```nginx
location /uploads {
    alias /var/www/LTOWebsiteCapstone/backend/uploads;
    access_log off;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

**If NOT present**, update it:
```bash
# Backup current config
sudo cp /etc/nginx/sites-available/lto-website /etc/nginx/sites-available/lto-website.backup

# Edit the config
sudo nano /etc/nginx/sites-available/lto-website
```

Copy the configuration from `nginx-production.conf` in your repository.

### 3. Create Uploads Directory on Server

```bash
# Navigate to backend
cd /var/www/LTOWebsiteCapstone/backend

# Create uploads directory structure
mkdir -p uploads/avatars

# Set correct permissions (replace 'lto' with your server user if different)
sudo chown -R $USER:$USER uploads
chmod -R 755 uploads

# Verify
ls -la uploads/
```

### 4. Deploy Your Code Changes

**Option A: If you have auto-deploy webhook:**
```bash
# From your local machine, push to GitHub
git add .
git commit -m "Fix avatar upload and display functionality"
git push origin main

# The webhook should automatically deploy
# Wait 1-2 minutes, then check pm2 logs
```

**Option B: Manual deployment:**
```bash
# SSH into server
ssh your-server

# Navigate to project
cd /var/www/LTOWebsiteCapstone

# Pull latest changes
git pull origin main

# Rebuild frontend
cd frontend
npm run build
cd ..

# Restart backend
pm2 restart lto-backend

# Check logs
pm2 logs lto-backend --lines 50
```

### 5. Verify Nginx and Restart Services

```bash
# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx

# Restart backend
pm2 restart lto-backend
```

## Post-Deployment Testing

### Test 1: Check if uploads directory is accessible

```bash
# From server
curl -I https://ltodatamanager.com/uploads/

# Should return 200 or 403 (forbidden is OK if directory is empty)
# Should NOT return 404
```

### Test 2: Upload Avatar

1. Open browser and go to: https://ltodatamanager.com
2. Clear browser cache (Ctrl+Shift+Delete)
3. Clear localStorage: 
   - Open DevTools (F12)
   - Console tab
   - Run: `localStorage.clear()` 
   - Refresh page
4. Log in to your account
5. Go to Account page
6. Click "Edit Profile"
7. Click camera icon on avatar
8. Select an image (up to 5MB)
9. Click "Save Changes"

### Test 3: Verify Avatar Displays

**Check in browser:**
- Avatar should appear immediately after save
- Avatar should appear in sidebar (NavUser component)
- Refresh page - avatar should persist

**Check in DevTools:**
- Open Network tab (F12)
- Look for requests to `/uploads/avatars/`
- Should see 200 status code
- Should see image loading

**Check on server:**
```bash
# List uploaded files
ls -lh /var/www/LTOWebsiteCapstone/backend/uploads/avatars/

# Should see files like: avatar-USER_ID-TIMESTAMP.jpg
```

## Troubleshooting

### Issue: 404 for avatar images

**Check nginx:**
```bash
sudo nginx -t
sudo systemctl status nginx
sudo journalctl -u nginx -n 50
```

**Check uploads path:**
```bash
# Verify path in nginx config matches actual path
ls -la /var/www/LTOWebsiteCapstone/backend/uploads
```

### Issue: 413 Request Entity Too Large

**Fix:**
```bash
# Edit nginx config
sudo nano /etc/nginx/sites-available/lto-website

# Ensure these lines exist:
# client_max_body_size 10M;  (at top level)
# client_max_body_size 10M;  (inside location /api block)

# Reload nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Issue: Permission Denied

**Fix:**
```bash
cd /var/www/LTOWebsiteCapstone/backend

# Check current permissions
ls -la uploads/

# Fix permissions
sudo chown -R $USER:$USER uploads
chmod -R 755 uploads

# Restart backend
pm2 restart lto-backend
```

### Issue: Avatar doesn't persist after refresh

**Check browser console:**
- Open DevTools (F12) → Console
- Look for errors when avatar loads
- Check what URL is being used for the avatar

**Check localStorage:**
```javascript
// In browser console
JSON.parse(localStorage.getItem('userData'))

// Should show avatar as relative path like:
// { ..., avatar: "uploads/avatars/avatar-123-456.jpg", ... }

// NOT a full URL with old domain
```

**If avatar has wrong domain, clear and re-login:**
```javascript
localStorage.clear()
// Then login again
```

## Success Indicators

✅ Avatar uploads without errors
✅ Avatar displays immediately after upload  
✅ Avatar shows in sidebar
✅ Avatar persists after page refresh
✅ Avatar URL in Network tab shows 200 status
✅ Files exist in `/var/www/LTOWebsiteCapstone/backend/uploads/avatars/`
✅ No errors in browser console
✅ No errors in `pm2 logs lto-backend`

## Quick Commands Reference

```bash
# Check nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Restart backend
pm2 restart lto-backend

# View logs
pm2 logs lto-backend

# Check uploads directory
ls -lh /var/www/LTOWebsiteCapstone/backend/uploads/avatars/

# Check file permissions
ls -la /var/www/LTOWebsiteCapstone/backend/uploads/

# Test avatar URL (replace with actual filename)
curl -I https://ltodatamanager.com/uploads/avatars/avatar-123-456.jpg
```

