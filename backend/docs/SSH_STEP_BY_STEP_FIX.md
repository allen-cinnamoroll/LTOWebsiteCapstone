# Step-by-Step SSH Commands to Fix Avatar Issue

Follow these commands **exactly** in order. Copy and paste each command one at a time.

---

## Step 1: Connect to Your Production Server

Open your terminal/command prompt and run:

```bash
ssh user@ltodatamanager.com
```

**Note:** Replace `user` with your actual SSH username (could be `root`, `ubuntu`, `admin`, or your server username)

If you use a specific SSH key, use:
```bash
ssh -i /path/to/your/key.pem user@ltodatamanager.com
```

---

## Step 2: Navigate to Your Project Directory

Once connected, run:

```bash
cd /var/www/LTOWebsiteCapstone
```

Verify you're in the right place:
```bash
pwd
```
Should output: `/var/www/LTOWebsiteCapstone`

---

## Step 3: Backup Current Nginx Configuration

**IMPORTANT:** Always backup before making changes!

```bash
sudo cp /etc/nginx/sites-available/lto-website /etc/nginx/sites-available/lto-website.backup
```

Verify backup was created:
```bash
ls -la /etc/nginx/sites-available/lto-website*
```
Should show both `lto-website` and `lto-website.backup`

---

## Step 4: Get the Updated Configuration File

You have two options:

### Option A: If you use Git (Recommended)

```bash
# Pull latest changes from your repository
git pull origin main
```

**Or if you're on a different branch:**
```bash
git pull origin master
# or
git pull origin your-branch-name
```

### Option B: Manual Copy (If not using Git)

If you don't use git or haven't pushed the changes yet:

1. **On your local machine**, copy the file:
   ```bash
   scp nginx-production.conf user@ltodatamanager.com:/tmp/nginx-production.conf
   ```

2. **Back on SSH** (still connected), copy it to nginx directory:
   ```bash
   sudo cp /tmp/nginx-production.conf /etc/nginx/sites-available/lto-website
   ```

---

## Step 5: Verify the Configuration File is Updated

Check that the `/uploads` location has the `^~` modifier:

```bash
sudo grep -A 5 "location.*uploads" /etc/nginx/sites-available/lto-website
```

**Expected output should show:**
```
location ^~ /uploads {
    alias /var/www/LTOWebsiteCapstone/backend/uploads;
    ...
}
```

You should see `^~` after `location`. If you don't see it, the file wasn't updated correctly.

---

## Step 6: Test Nginx Configuration Syntax

**CRITICAL STEP** - This will catch any errors before reloading:

```bash
sudo nginx -t
```

**Expected output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

✅ **If you see "syntax is ok" and "test is successful"** → Continue to Step 7

❌ **If you see errors** → Don't proceed! Check the error messages and fix them. If needed, restore the backup:
```bash
sudo cp /etc/nginx/sites-available/lto-website.backup /etc/nginx/sites-available/lto-website
```

---

## Step 7: Reload Nginx

**Graceful reload** (no downtime):

```bash
sudo nginx -s reload
```

**If that doesn't work, try:**
```bash
sudo systemctl reload nginx
```

**Or restart (slight downtime):**
```bash
sudo systemctl restart nginx
```

**Check nginx status:**
```bash
sudo systemctl status nginx
```

Should show: `Active: active (running)`

---

## Step 8: Verify the Fix Works

### 8a. Test with a Real Avatar URL

Get a recent avatar filename from your logs or database, then:

```bash
# Replace FILENAME with an actual avatar filename from your server
curl -I https://ltodatamanager.com/uploads/avatars/FILENAME.jpg
```

**Or list available avatars first:**
```bash
ls -la /var/www/LTOWebsiteCapstone/backend/uploads/avatars/ | tail -5
```

Then use one of the filenames:
```bash
# Example (replace with actual filename):
curl -I https://ltodatamanager.com/uploads/avatars/avatar-68f3982c34bbe8923b851d13-1763325575965-146587224.jpg
```

**Expected output:**
```
HTTP/1.1 200 OK
Server: nginx/...
Content-Type: image/jpeg    ← Should say "image/jpeg", NOT "text/html"
Content-Length: [file size]
...
```

✅ **Success if:** `Content-Type: image/jpeg`  
❌ **Still broken if:** `Content-Type: text/html`

### 8b. Check Nginx Error Logs

```bash
sudo tail -n 20 /var/log/nginx/error.log
```

Should not show any errors related to `/uploads`.

### 8c. Check Nginx Access Logs

```bash
sudo tail -f /var/log/nginx/access.log
```

Then in your browser, try to load an avatar. You should see a 200 status with the image file.

Press `Ctrl+C` to stop watching the log.

---

## Step 9: Test in Browser

1. **Clear your browser cache:**
   - Chrome/Edge: `Ctrl+Shift+Delete` → Clear cached images and files
   - Or do a hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

2. **Open browser DevTools:**
   - Press `F12` or right-click → Inspect

3. **Go to Console tab**

4. **Navigate to Account page** in your app

5. **Upload a new avatar** or refresh the page

6. **Check console output:**
   - ✅ Should see: `✅ Avatar image is accessible: { contentType: 'image/jpeg' }`
   - ❌ Should NOT see: `❌ PRODUCTION ISSUE: Server returned HTML instead of image!`

7. **Check Network tab:**
   - Find the avatar image request
   - Status should be `200`
   - Type should be `jpeg` or `image/jpeg`
   - Size should be the actual file size (not ~100KB which would indicate HTML)

---

## Step 10: Verify File Permissions (If Still Not Working)

If avatars still don't load after the fix, check file permissions:

```bash
# Check current permissions
ls -ld /var/www/LTOWebsiteCapstone/backend/uploads/avatars/

# Check file permissions
ls -la /var/www/LTOWebsiteCapstone/backend/uploads/avatars/ | head -5
```

**If permissions are wrong, fix them:**

```bash
# Set ownership (replace 'www-data' with your nginx user if different)
sudo chown -R www-data:www-data /var/www/LTOWebsiteCapstone/backend/uploads

# Set directory permissions
sudo chmod -R 755 /var/www/LTOWebsiteCapstone/backend/uploads

# Set file permissions
sudo find /var/www/LTOWebsiteCapstone/backend/uploads -type f -exec chmod 644 {} \;
```

**Check what user nginx runs as:**
```bash
ps aux | grep nginx | grep master
```
Look for the user in the first column (usually `root` or `www-data`).

---

## Quick Troubleshooting Commands

### If nginx won't reload:

```bash
# Check nginx status
sudo systemctl status nginx

# Check for syntax errors
sudo nginx -t

# View full error messages
sudo journalctl -u nginx -n 50
```

### If you need to rollback:

```bash
# Restore backup
sudo cp /etc/nginx/sites-available/lto-website.backup /etc/nginx/sites-available/lto-website

# Test
sudo nginx -t

# Reload
sudo nginx -s reload
```

### Check if file exists:

```bash
# Replace FILENAME with actual filename
ls -la /var/www/LTOWebsiteCapstone/backend/uploads/avatars/FILENAME.jpg
```

### View current nginx config:

```bash
sudo cat /etc/nginx/sites-available/lto-website
```

---

## Complete Command Sequence (Copy-Paste Ready)

Here's the complete sequence if you want to copy-paste everything at once:

```bash
# Step 1: Navigate to project
cd /var/www/LTOWebsiteCapstone

# Step 2: Backup
sudo cp /etc/nginx/sites-available/lto-website /etc/nginx/sites-available/lto-website.backup

# Step 3: Update config (choose one):
# Option A - Git:
git pull origin main

# Option B - Manual (if not using git, do this on local machine first):
# scp nginx-production.conf user@ltodatamanager.com:/tmp/nginx-production.conf
# Then on server:
# sudo cp /tmp/nginx-production.conf /etc/nginx/sites-available/lto-website

# Step 4: Verify ^~ is present
sudo grep -A 2 "location.*uploads" /etc/nginx/sites-available/lto-website

# Step 5: Test config
sudo nginx -t

# Step 6: Reload nginx
sudo nginx -s reload

# Step 7: Verify (replace FILENAME with actual avatar filename)
curl -I https://ltodatamanager.com/uploads/avatars/FILENAME.jpg
```

---

## Verification Checklist

After completing all steps, verify:

- [ ] `sudo nginx -t` shows "syntax is ok"
- [ ] `sudo nginx -s reload` completed without errors
- [ ] `curl -I` shows `Content-Type: image/jpeg` (not `text/html`)
- [ ] Browser console shows avatar loaded successfully
- [ ] Avatar displays in the UI
- [ ] Network tab shows correct content-type

---

## If Something Goes Wrong

1. **Don't panic!** The backup is at `/etc/nginx/sites-available/lto-website.backup`

2. **Restore backup:**
   ```bash
   sudo cp /etc/nginx/sites-available/lto-website.backup /etc/nginx/sites-available/lto-website
   sudo nginx -t
   sudo nginx -s reload
   ```

3. **Check logs:**
   ```bash
   sudo tail -50 /var/log/nginx/error.log
   ```

4. **Ask for help** with the error messages from the logs

---

**You're all set!** Follow these steps in order and your avatar issue should be fixed.

