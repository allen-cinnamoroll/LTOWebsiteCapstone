# Fix Profile Picture Upload in Deployed System

## Problem
Profile pictures cannot be uploaded in the deployed production system due to:
1. Missing nginx configuration for serving uploaded files
2. Default nginx file upload size limit (1MB) being too small
3. No proper directory permissions for the uploads folder

## Solution

### Step 1: Update Nginx Configuration

SSH into your production server and edit the nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/lto-website
```

Replace the entire configuration with the updated one (see `nginx-config-fix.conf` in this repository).

**Key changes:**
- Added `client_max_body_size 10M;` globally and in the `/api` location
- Added new `/uploads` location block to serve uploaded files
- Added proper cache headers for uploaded files

### Step 2: Create Uploads Directory with Proper Permissions

```bash
# Navigate to backend directory
cd /var/www/LTOWebsiteCapstone/backend

# Create uploads directory if it doesn't exist
mkdir -p uploads/avatars

# Set proper ownership (replace 'lto' with your server user if different)
sudo chown -R lto:lto uploads

# Set proper permissions
sudo chmod -R 755 uploads
```

### Step 3: Verify Directory Structure

Make sure the directory structure is correct:

```bash
ls -la /var/www/LTOWebsiteCapstone/backend/uploads/
```

You should see:
```
drwxr-xr-x  3 lto lto 4096 ... avatars
```

### Step 4: Test Nginx Configuration

```bash
sudo nginx -t
```

You should see:
```
nginx: configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Step 5: Reload Nginx

```bash
sudo systemctl reload nginx
```

### Step 6: Restart Backend Application

```bash
cd /var/www/LTOWebsiteCapstone
pm2 restart lto-backend
pm2 logs lto-backend
```

### Step 7: Verify in Browser

1. Clear your browser cache
2. Log in to your application
3. Go to Account/Profile page
4. Try uploading a profile picture
5. Check that it displays correctly
6. Refresh the page - it should still be there

## Troubleshooting

### Issue: "413 Request Entity Too Large"
**Solution:** The nginx configuration wasn't updated properly. Double-check `client_max_body_size` is set in both the server block and the `/api` location block.

### Issue: "404 Not Found" when loading avatar
**Solution:** The `/uploads` location block is missing. Make sure you added it to nginx config and reloaded nginx.

### Issue: Upload succeeds but file is not saved
**Solution:** Check directory permissions:
```bash
sudo chown -R lto:lto /var/www/LTOWebsiteCapstone/backend/uploads
sudo chmod -R 755 /var/www/LTOWebsiteCapstone/backend/uploads
```

### Issue: "Permission denied" errors in PM2 logs
**Solution:** The Node.js process doesn't have write permissions:
```bash
# Check who owns the PM2 process
pm2 status

# Fix permissions for that user
sudo chown -R $(whoami):$(whoami) /var/www/LTOWebsiteCapstone/backend/uploads
```

### Check PM2 Logs for Errors

```bash
pm2 logs lto-backend --lines 100
```

Look for errors like:
- "EACCES: permission denied"
- "ENOENT: no such file or directory"
- Multer errors

### Check Nginx Error Logs

```bash
sudo tail -f /var/log/nginx/error.log
```

### Test File Upload from Backend

To verify the backend is working, test the upload directly:

```bash
cd /var/www/LTOWebsiteCapstone/backend
node -e "const fs = require('fs'); const path = require('path'); const dir = path.join(process.cwd(), 'uploads', 'avatars'); console.log('Directory exists:', fs.existsSync(dir)); console.log('Directory writable:', fs.accessSync(dir, fs.constants.W_OK) === undefined);"
```

## Complete Quick Fix Commands

Run these commands in sequence on your production server:

```bash
# 1. Create directories with proper permissions
cd /var/www/LTOWebsiteCapstone/backend
mkdir -p uploads/avatars
sudo chown -R $USER:$USER uploads
chmod -R 755 uploads

# 2. Update nginx configuration
sudo nano /etc/nginx/sites-available/lto-website
# (paste the updated configuration from nginx-config-fix.conf)

# 3. Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx

# 4. Restart backend
cd /var/www/LTOWebsiteCapstone
pm2 restart lto-backend

# 5. Verify
pm2 logs lto-backend --lines 50
```

## Verification Checklist

- [ ] `/uploads` directory exists in backend folder
- [ ] Directory has proper permissions (755)
- [ ] Nginx config includes `client_max_body_size 10M;`
- [ ] Nginx config includes `/uploads` location block
- [ ] Nginx configuration test passes (`sudo nginx -t`)
- [ ] Nginx has been reloaded
- [ ] Backend has been restarted via PM2
- [ ] No errors in PM2 logs
- [ ] No errors in Nginx error logs
- [ ] Profile picture upload works in browser
- [ ] Profile picture displays after upload
- [ ] Profile picture persists after page refresh

## Important Notes

1. **File Permissions:** Linux file permissions are critical. The user running PM2 (usually your server user) must have write access to the uploads directory.

2. **Nginx as Reverse Proxy:** Even though Express serves static files, nginx sits in front and needs to know about the `/uploads` path.

3. **Client Max Body Size:** This must be set in TWO places:
   - Server block (affects all locations)
   - `/api` location block (specific to API calls)

4. **SELinux (if enabled):** On some systems, SELinux might block file writes:
   ```bash
   # Check if SELinux is enabled
   getenforce
   
   # If enabled, you may need to set proper context
   sudo chcon -R -t httpd_sys_rw_content_t /var/www/LTOWebsiteCapstone/backend/uploads
   ```

5. **Firewall:** Ensure your firewall allows HTTP/HTTPS traffic:
   ```bash
   sudo ufw status
   sudo ufw allow 'Nginx Full'
   ```

