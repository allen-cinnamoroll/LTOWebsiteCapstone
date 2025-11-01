# Complete Step-by-Step Guide to Fix Profile Picture Upload in Production

## Prerequisites

Before you start, make sure you have:
- [ ] SSH access to your production server
- [ ] Root/sudo privileges
- [ ] Your server IP address or domain name
- [ ] 10-15 minutes of time

---

## STEP 1: Connect to Your Production Server

Open your terminal/PowerShell and connect via SSH:

```bash
ssh your-username@your-server-ip
```

**Example:**
```bash
ssh lto@72.60.198.244
```

Enter your password when prompted.

**✅ Verification:** You should see your server's command prompt.

---

## STEP 2: Navigate to Your Project Directory

```bash
cd /var/www/LTOWebsiteCapstone
```

**✅ Verification:** Check you're in the right place:
```bash
pwd
```
Should output: `/var/www/LTOWebsiteCapstone`

---

## STEP 3: Check Current Status

Let's see what's currently running:

```bash
pm2 status
```

**✅ Verification:** You should see `lto-backend` in the list, hopefully with status "online".

---

## STEP 4: Create Uploads Directory with Proper Permissions

```bash
# Navigate to backend folder
cd backend

# Create the uploads directory structure
mkdir -p uploads/avatars

# Set proper permissions (755 = owner can read/write/execute, others can read/execute)
chmod -R 755 uploads

# Check it was created successfully
ls -la uploads/
```

**✅ Verification:** You should see output like:
```
drwxr-xr-x  3 youruser youruser 4096 ... .
drwxr-xr-x 10 youruser youruser 4096 ... ..
drwxr-xr-x  2 youruser youruser 4096 ... avatars
```

The `drwxr-xr-x` means the directory has the correct permissions.

---

## STEP 5: Update Nginx Configuration

```bash
# Open the nginx configuration file
sudo nano /etc/nginx/sites-available/lto-website
```

**Now, completely replace the contents** with this configuration:

```nginx
server {
    listen 80;
    #server_name your-domain.com www.your-domain.com;

    # Increase file upload size limit to 10MB
    client_max_body_size 10M;

    # Frontend (React app)
    location / {
        root /var/www/LTOWebsiteCapstone/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Serve uploaded files (avatars, etc.) - THIS IS NEW!
    location /uploads {
        alias /var/www/LTOWebsiteCapstone/backend/uploads;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Allow large file uploads through the proxy - THIS IS NEW!
        client_max_body_size 10M;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'; img-src 'self' data: https: http:;" always;
}
```

**To save and exit nano:**
1. Press `Ctrl + X`
2. Press `Y` to confirm
3. Press `Enter` to save

**✅ Verification:** Test the nginx configuration:
```bash
sudo nginx -t
```

You should see:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

❌ **If you see errors**, open the file again (`sudo nano /etc/nginx/sites-available/lto-website`) and check for typos.

---

## STEP 6: Reload Nginx

```bash
sudo systemctl reload nginx
```

**✅ Verification:** Check nginx status:
```bash
sudo systemctl status nginx
```

You should see "active (running)" in green.

---

## STEP 7: Pull Latest Code Changes (Frontend Fix)

Navigate back to the project root and pull the latest changes:

```bash
cd /var/www/LTOWebsiteCapstone

# Pull latest changes from GitHub
git pull origin main
```

**✅ Verification:** You should see messages about files being updated, including:
- `frontend/src/context/AuthContext.jsx`
- `auto-deploy.sh`
- `deploy-webhook.js`
- And several new documentation files

---

## STEP 8: Rebuild Frontend

```bash
cd frontend

# Install any new dependencies (if any)
npm install

# Build the production frontend
npm run build
```

This might take 1-2 minutes. Wait for it to complete.

**✅ Verification:** You should see "Build completed" or similar success message, and the `dist` folder should be updated:
```bash
ls -la dist/
```

---

## STEP 9: Restart Backend with PM2

```bash
cd /var/www/LTOWebsiteCapstone

# Restart the backend application
pm2 restart lto-backend

# Wait a few seconds, then check status
pm2 status
```

**✅ Verification:** The `lto-backend` should show:
- Status: `online` (in green)
- No errors in the restart count

---

## STEP 10: Check Backend Logs

```bash
pm2 logs lto-backend --lines 50
```

**✅ Verification:** Look for:
- ✅ `Server is running on 5000` (or your configured port)
- ✅ `MongoDB connection` success messages
- ❌ NO error messages about "ENOENT" or "EACCES" or "permission denied"

Press `Ctrl + C` to exit the logs view.

---

## STEP 11: Check Nginx Error Logs (Optional but Recommended)

```bash
sudo tail -n 50 /var/log/nginx/error.log
```

**✅ Verification:** Ideally, you should see NO recent errors. If there are errors, they should be old (check the timestamps).

---

## STEP 12: Test File Permissions

Let's verify that the backend can write to the uploads directory:

```bash
cd /var/www/LTOWebsiteCapstone/backend/uploads/avatars

# Try to create a test file
touch test-file.txt

# Check if it was created
ls -la | grep test

# Remove the test file
rm test-file.txt
```

**✅ Verification:** If you successfully created and deleted `test-file.txt`, the permissions are correct!

❌ **If you get "Permission denied"**, run:
```bash
cd /var/www/LTOWebsiteCapstone/backend
sudo chown -R $(whoami):$(whoami) uploads
chmod -R 755 uploads
```

---

## STEP 13: Verify Directory Structure

Double-check the complete directory structure:

```bash
cd /var/www/LTOWebsiteCapstone/backend
tree uploads/ -L 2
```

**If `tree` is not installed, use:**
```bash
find uploads/ -type d
```

**✅ Verification:** You should see:
```
uploads/
uploads/avatars
```

---

## STEP 14: Test from Your Browser

Now it's time to test if everything works!

### A. Clear Your Browser Cache

**Chrome/Edge:**
1. Press `Ctrl + Shift + Delete`
2. Select "Cached images and files"
3. Click "Clear data"

**Firefox:**
1. Press `Ctrl + Shift + Delete`
2. Select "Cache"
3. Click "Clear Now"

### B. Log in to Your Application

1. Open your production website in the browser
2. Log in with your credentials
3. Navigate to the Account/Profile page

### C. Upload a Profile Picture

1. Click the **Edit Profile** button
2. Click the **camera icon** on the avatar
3. Select an image file (JPEG, PNG, GIF, or WebP, max 5MB)
4. The preview should show immediately
5. Click **Save Changes**

**✅ Verification:** 
- You should see a success message
- The profile picture should display in the profile card
- The image should be clear and not broken

### D. Test Persistence

1. **Refresh the page** (F5 or Ctrl+R)
2. The profile picture should **still be there**
3. Navigate to another page and come back - picture should persist

### E. Check Network Tab (Developer Tools)

1. Open Developer Tools (F12)
2. Go to the **Network** tab
3. Refresh the page
4. Look for a request to `/uploads/avatars/avatar-...jpg`

**✅ Verification:** The request should show:
- **Status: 200 OK** (not 404 or 413)
- **Type: image/jpeg** (or png, gif, etc.)
- The image should load in the preview

---

## STEP 15: Upload a Larger File (Optional Test)

Try uploading different file sizes to test the limits:

1. Upload a **small image** (~100 KB) - should work
2. Upload a **medium image** (~2 MB) - should work
3. Upload a **large image** (~4.5 MB) - should work
4. Try uploading a file **over 5MB** - should show an error (this is expected)

**✅ Verification:** Files up to 5MB should upload successfully. Files over 5MB should be rejected with a proper error message.

---

## STEP 16: Final Verification Checklist

Go through this checklist to ensure everything is working:

```
SERVER SIDE:
[ ] Uploads directory exists: /var/www/LTOWebsiteCapstone/backend/uploads/avatars
[ ] Directory permissions are 755 (drwxr-xr-x)
[ ] Can create/delete files in uploads/avatars directory
[ ] Nginx configuration test passes (nginx -t)
[ ] Nginx is running (systemctl status nginx)
[ ] Backend is running (pm2 status shows "online")
[ ] No errors in backend logs (pm2 logs)
[ ] No recent errors in nginx error logs

CLIENT SIDE:
[ ] Profile picture uploads successfully
[ ] Preview shows before saving
[ ] Success message appears after save
[ ] Profile picture displays on profile page
[ ] Profile picture persists after page refresh
[ ] Profile picture persists after navigating away and back
[ ] Network request shows 200 OK status
[ ] Can upload files up to 5MB
[ ] Files over 5MB are properly rejected

FUNCTIONALITY:
[ ] Multiple users can upload different profile pictures
[ ] Uploading a new picture replaces the old one
[ ] Old picture file is deleted from server
[ ] Logout and login shows the saved profile picture
```

---

## Troubleshooting

### Issue 1: "413 Request Entity Too Large"

**Cause:** Nginx file size limit not properly set.

**Fix:**
```bash
sudo nano /etc/nginx/sites-available/lto-website
```
Make sure you have `client_max_body_size 10M;` in BOTH:
- The main server block (line ~6)
- Inside the `/api` location block (line ~34)

Then reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### Issue 2: "404 Not Found" when loading avatar

**Cause:** Nginx `/uploads` location block is missing.

**Fix:**
```bash
sudo nano /etc/nginx/sites-available/lto-website
```
Make sure you have this block (around line 16-21):
```nginx
location /uploads {
    alias /var/www/LTOWebsiteCapstone/backend/uploads;
    access_log off;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

Then reload nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### Issue 3: Upload succeeds but image not saved

**Cause:** Backend doesn't have write permissions.

**Fix:**
```bash
cd /var/www/LTOWebsiteCapstone/backend
sudo chown -R $(whoami):$(whoami) uploads
chmod -R 755 uploads
pm2 restart lto-backend
```

---

### Issue 4: "ENOENT: no such file or directory"

**Cause:** Uploads directory doesn't exist.

**Fix:**
```bash
cd /var/www/LTOWebsiteCapstone/backend
mkdir -p uploads/avatars
chmod -R 755 uploads
pm2 restart lto-backend
```

---

### Issue 5: Image doesn't show after page refresh

**Cause:** Frontend code wasn't updated (the original issue we fixed).

**Fix:**
```bash
cd /var/www/LTOWebsiteCapstone
git pull origin main
cd frontend
npm run build
cd ..
pm2 restart lto-backend
```

Clear browser cache and try again.

---

### Issue 6: SELinux Blocking File Operations (CentOS/RHEL only)

Check if SELinux is enabled:
```bash
getenforce
```

If it shows "Enforcing", you may need to set the proper context:
```bash
sudo chcon -R -t httpd_sys_rw_content_t /var/www/LTOWebsiteCapstone/backend/uploads
```

---

## Useful Commands Reference

```bash
# Check PM2 status
pm2 status

# View backend logs (live)
pm2 logs lto-backend

# View backend logs (last 100 lines)
pm2 logs lto-backend --lines 100

# Restart backend
pm2 restart lto-backend

# Check nginx configuration
sudo nginx -t

# Reload nginx (apply new config)
sudo systemctl reload nginx

# Restart nginx (if reload doesn't work)
sudo systemctl restart nginx

# Check nginx status
sudo systemctl status nginx

# View nginx error logs
sudo tail -f /var/log/nginx/error.log

# View nginx access logs
sudo tail -f /var/log/nginx/access.log

# Check directory permissions
ls -la /var/www/LTOWebsiteCapstone/backend/uploads/

# Check disk space
df -h

# Check which user owns PM2 process
ps aux | grep node

# Fix permissions if needed
cd /var/www/LTOWebsiteCapstone/backend
sudo chown -R $(whoami):$(whoami) uploads
chmod -R 755 uploads
```

---

## Post-Fix Maintenance

After successfully fixing the issue:

### 1. Test with Multiple Users

If possible, have multiple users test uploading profile pictures to ensure:
- Different users can upload their own pictures
- Pictures don't overwrite each other
- Each user sees only their own picture

### 2. Monitor Disk Space

Profile pictures will accumulate over time. Monitor your disk space:

```bash
# Check overall disk usage
df -h

# Check uploads folder size
du -sh /var/www/LTOWebsiteCapstone/backend/uploads/
```

### 3. Set Up Automated Backups

Consider backing up the uploads folder periodically:

```bash
# Create a backup script
nano ~/backup-uploads.sh
```

Add this content:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf ~/backups/uploads_$DATE.tar.gz /var/www/LTOWebsiteCapstone/backend/uploads/
# Keep only last 7 days of backups
find ~/backups/ -name "uploads_*.tar.gz" -mtime +7 -delete
```

Make it executable and schedule:
```bash
chmod +x ~/backup-uploads.sh
crontab -e
# Add this line to run daily at 3 AM:
0 3 * * * ~/backup-uploads.sh
```

### 4. Monitor Logs

Regularly check for any errors:
```bash
# Check PM2 logs weekly
pm2 logs lto-backend --lines 100 | grep -i error

# Check nginx logs weekly
sudo grep -i error /var/log/nginx/error.log | tail -n 50
```

---

## Success Criteria

You'll know everything is working correctly when:

✅ **All these are true:**
1. You can upload a profile picture without errors
2. The picture displays immediately after upload
3. The picture persists after page refresh
4. The picture persists after logout/login
5. Multiple users can have different profile pictures
6. Files up to 5MB upload successfully
7. Files over 5MB are rejected with proper error message
8. No errors in PM2 logs
9. No errors in nginx logs
10. Avatar URL returns 200 OK in browser network tab

---

## Getting Help

If you're still having issues after following all steps:

1. **Collect diagnostic information:**
   ```bash
   # Create a diagnostic report
   echo "=== PM2 Status ===" > ~/diagnostic-report.txt
   pm2 status >> ~/diagnostic-report.txt
   echo "" >> ~/diagnostic-report.txt
   echo "=== PM2 Logs ===" >> ~/diagnostic-report.txt
   pm2 logs lto-backend --lines 50 --nostream >> ~/diagnostic-report.txt
   echo "" >> ~/diagnostic-report.txt
   echo "=== Nginx Status ===" >> ~/diagnostic-report.txt
   sudo systemctl status nginx >> ~/diagnostic-report.txt
   echo "" >> ~/diagnostic-report.txt
   echo "=== Nginx Error Log ===" >> ~/diagnostic-report.txt
   sudo tail -n 50 /var/log/nginx/error.log >> ~/diagnostic-report.txt
   echo "" >> ~/diagnostic-report.txt
   echo "=== Directory Permissions ===" >> ~/diagnostic-report.txt
   ls -laR /var/www/LTOWebsiteCapstone/backend/uploads/ >> ~/diagnostic-report.txt
   
   cat ~/diagnostic-report.txt
   ```

2. **Review the diagnostic report** for any obvious errors

3. **Check the documentation:**
   - `PROFILE_UPLOAD_FIX_SUMMARY.md` - Overview and explanation
   - `FIX_PROFILE_UPLOAD_DEPLOYMENT.md` - Alternative instructions and troubleshooting

---

## Summary

You've successfully:
1. ✅ Created the uploads directory with proper permissions
2. ✅ Updated nginx configuration to serve uploaded files
3. ✅ Increased file upload size limit to 10MB
4. ✅ Pulled and deployed the frontend fix
5. ✅ Restarted all services
6. ✅ Tested the profile picture upload functionality

**Congratulations!** Your profile picture upload feature is now fully functional in production! 🎉

---

**Document Version:** 1.0  
**Last Updated:** November 1, 2025  
**Tested On:** Ubuntu 20.04/22.04, Nginx 1.18+, Node.js 20.x, PM2 5.x

