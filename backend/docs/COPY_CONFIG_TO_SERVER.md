        # How to Copy nginx-production.conf to Server

## Option 1: Copy from Local Machine (Recommended)

### On Windows (using PowerShell or Command Prompt):

1. **Open a NEW terminal/command prompt** (keep your SSH session open in another window)

2. **Navigate to your project directory:**
   ```cmd
   cd "C:\Final na ni\LTOWebsiteCapstone"
   ```

3. **Copy the file to server:**
   ```cmd
   scp nginx-production.conf root@srv1030173.hostinger.com:/tmp/nginx-production.conf
   ```
   
   **Or if using IP address:**
   ```cmd
   scp nginx-production.conf root@YOUR_IP_ADDRESS:/tmp/nginx-production.conf
   ```

4. **Go back to your SSH session** and continue with:
   ```bash
   sudo cp /tmp/nginx-production.conf /etc/nginx/sites-available/lto-website
   ```

---

## Option 2: Use Git (If Using Version Control)

### On SSH Session (current one):

```bash
# Pull latest changes
git pull origin main

# Or if on a different branch:
git pull origin master

# Then copy the updated file
sudo cp /var/www/LTOWebsiteCapstone/nginx-production.conf /etc/nginx/sites-available/lto-website
```

---

## Option 3: Manual Edit on Server (If Above Don't Work)

Edit the file directly on the server:

```bash
# Open the file in nano editor
sudo nano /etc/nginx/sites-available/lto-website
```

**Then find this section (around line 18-24):**
```nginx
    # Serve uploaded files (avatars, etc.)
    location /uploads {
        alias /var/www/LTOWebsiteCapstone/backend/uploads;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
```

**Change it to:**
```nginx
    # Serve uploaded files (avatars, etc.)
    # IMPORTANT: This MUST come BEFORE the root location / block
    # The ^~ modifier gives this location priority and stops further matching
    # try_files ensures only actual files are served (404 if file doesn't exist)
    location ^~ /uploads {
        alias /var/www/LTOWebsiteCapstone/backend/uploads;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
```

**Key changes:**
1. Add `^~` after `location` → `location ^~ /uploads`
2. Add `try_files $uri =404;` at the end

**Then find the root location block and make sure it comes AFTER the `/uploads` block:**
```nginx
    # Frontend (React app) - MUST come LAST as catch-all
    location / {
        root /var/www/LTOWebsiteCapstone/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
```

**To save in nano:**
1. Press `Ctrl + O` (save)
2. Press `Enter` (confirm filename)
3. Press `Ctrl + X` (exit)

---

## Continue After Copying/Editing

After you've copied or edited the file, continue with:

```bash
# Verify the fix is there
sudo grep -A 5 "location.*uploads" /etc/nginx/sites-available/lto-website

# Should show: location ^~ /uploads {

# Test nginx config
sudo nginx -t

# If test passes, reload nginx
sudo nginx -s reload
```

---

## Quick Check: What's Your Setup?

**If you're using Git:**
```bash
cd /var/www/LTOWebsiteCapstone
git status
```
If this works, use **Option 2** (Git pull)

**If you're NOT using Git or haven't committed:**
Use **Option 1** (SCP from local) or **Option 3** (Manual edit)

