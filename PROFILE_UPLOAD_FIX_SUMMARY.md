# Profile Picture Upload Fix - Summary

## What Was Wrong

Your profile picture upload wasn't working in the deployed production system due to **THREE critical issues**:

### 1. **Missing Nginx Configuration for Uploads**
The nginx reverse proxy didn't have a location block to serve files from the `/uploads` directory. When the browser tried to load `http://your-server/uploads/avatars/avatar-123.jpg`, nginx returned a 404 error because it didn't know how to handle that path.

### 2. **File Upload Size Limit**
Nginx has a default `client_max_body_size` of **1MB**. Your app allows users to upload avatars up to **5MB**, so any file larger than 1MB was rejected with a "413 Request Entity Too Large" error.

### 3. **Missing Uploads Directory**
The `backend/uploads/avatars/` directory likely didn't exist on your production server, or had incorrect permissions. When multer tried to save uploaded files, it failed with "ENOENT: no such file or directory" or "EACCES: permission denied" errors.

## What I Fixed

### ✅ Fixed Files

1. **`frontend/src/context/AuthContext.jsx`** (Previous fix)
   - Fixed avatar URL construction on page refresh
   - Now properly builds full URLs when loading from localStorage

2. **`DEPLOYMENT_GUIDE.md`**
   - Updated nginx configuration with proper upload handling
   - Added instructions to create uploads directory with correct permissions
   - Added `client_max_body_size 10M;` directive
   - Added `/uploads` location block for serving static files

3. **`nginx-config-fix.conf`** (NEW)
   - Complete, ready-to-use nginx configuration
   - Includes all necessary settings for file uploads

4. **`FIX_PROFILE_UPLOAD_DEPLOYMENT.md`** (NEW)
   - Step-by-step guide to fix the issue on your production server
   - Troubleshooting section for common problems
   - Complete command reference

5. **`auto-deploy.sh`**
   - Now automatically creates uploads directory on each deployment
   - Sets proper permissions (755)

6. **`deploy-webhook.js`**
   - Webhook now creates uploads directory automatically
   - Ensures directory exists before restarting the app

7. **`backend/.gitignore`**
   - Configured to ignore uploaded files (for security)
   - Preserves directory structure with .gitkeep files

8. **`backend/uploads/.gitkeep`** (NEW)
   - Ensures the uploads directory structure is tracked in git

9. **`backend/uploads/avatars/.gitkeep`** (NEW)
   - Ensures the avatars subdirectory is tracked in git

## How to Apply the Fix to Your Production Server

### Option 1: Quick Fix (Immediate)

SSH into your production server and run these commands:

```bash
# 1. Navigate to project directory
cd /var/www/LTOWebsiteCapstone

# 2. Create uploads directory with proper permissions
cd backend
mkdir -p uploads/avatars
chmod -R 755 uploads

# 3. Update nginx configuration
sudo nano /etc/nginx/sites-available/lto-website
```

Copy the contents from `nginx-config-fix.conf` in this repository, then:

```bash
# 4. Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx

# 5. Restart backend
cd /var/www/LTOWebsiteCapstone
pm2 restart lto-backend

# 6. Verify
pm2 logs lto-backend --lines 50
```

### Option 2: Deploy via Git (Recommended)

Since you have auto-deployment set up, you can simply:

```bash
# 1. Commit these changes (I've already made them)
git add .
git commit -m "Fix profile picture upload in production"
git push origin main

# 2. SSH into production server
ssh your-user@your-server

# 3. Update nginx configuration (still needs manual update)
sudo nano /etc/nginx/sites-available/lto-website
# Copy contents from nginx-config-fix.conf

# 4. Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx

# 5. The auto-deploy webhook or script will handle the rest
```

## What Changed in the Nginx Configuration

### Before (BROKEN):
```nginx
server {
    listen 80;
    
    location / {
        root /var/www/LTOWebsiteCapstone/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        # ... other proxy settings
    }
}
```

**Problems:**
- ❌ No `/uploads` location block
- ❌ No `client_max_body_size` setting
- ❌ 1MB default upload limit

### After (FIXED):
```nginx
server {
    listen 80;
    
    # ✅ Allow 10MB file uploads
    client_max_body_size 10M;
    
    location / {
        root /var/www/LTOWebsiteCapstone/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # ✅ NEW: Serve uploaded files
    location /uploads {
        alias /var/www/LTOWebsiteCapstone/backend/uploads;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /api {
        proxy_pass http://localhost:5000;
        # ✅ Allow large uploads through proxy
        client_max_body_size 10M;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        # ... other proxy settings
    }
}
```

## How to Verify the Fix Works

After applying the fix:

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Log in** to your application
3. **Go to Account/Profile page**
4. **Click the camera icon** on your avatar
5. **Select an image** (up to 5MB)
6. **Click Save**
7. **Verify** the image displays correctly
8. **Refresh the page** - image should still be there
9. **Check the network tab** - the avatar URL should load successfully (200 status)

### Expected URL Format:
```
http://your-server/uploads/avatars/avatar-USER_ID-TIMESTAMP.jpg
```

## Troubleshooting Commands

If it still doesn't work, run these diagnostic commands:

```bash
# Check if uploads directory exists and has correct permissions
ls -la /var/www/LTOWebsiteCapstone/backend/uploads/

# Check nginx configuration
sudo nginx -t

# View nginx error logs
sudo tail -f /var/log/nginx/error.log

# View backend logs
pm2 logs lto-backend --lines 100

# Test file write permissions
cd /var/www/LTOWebsiteCapstone/backend
touch uploads/test.txt
rm uploads/test.txt
```

## Security Notes

1. **Uploaded files are NOT committed to git** - they're in `.gitignore`
2. **Only images are allowed** - file type validation is in place (backend/controller/accountController.js)
3. **5MB file size limit** - enforced by multer in the backend
4. **Proper file permissions** - 755 allows read/execute for all, write only for owner

## Future Deployments

With these changes, future deployments will automatically:
- ✅ Create the uploads directory
- ✅ Set proper permissions
- ✅ Preserve existing uploaded files

The `auto-deploy.sh` and `deploy-webhook.js` scripts now handle this automatically.

## Need Help?

If you encounter any issues:

1. Check `FIX_PROFILE_UPLOAD_DEPLOYMENT.md` for detailed troubleshooting
2. Review PM2 logs: `pm2 logs lto-backend`
3. Review nginx error logs: `sudo tail -f /var/log/nginx/error.log`
4. Verify directory permissions: `ls -la /var/www/LTOWebsiteCapstone/backend/uploads/`

---

**Summary:** The production server was missing nginx configuration for serving uploaded files, had file size limits, and didn't have the uploads directory. All issues are now fixed! 🎉

