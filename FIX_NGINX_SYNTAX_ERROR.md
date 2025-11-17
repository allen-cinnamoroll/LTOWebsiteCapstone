# Fix Nginx Syntax Error

## Error Message:
```
unknown directive "proxy_set" in /etc/nginx/sites-available/lto-website:68
```

This means line 68 has `proxy_set` instead of `proxy_set_header` (the "_header" part got cut off).

## Quick Fix on Server

**On your SSH session, run these commands:**

### Step 1: Check Line 68
```bash
sudo sed -n '68p' /etc/nginx/sites-available/lto-website
```

**If it shows:**
```
proxy_set Upgrade $http_upgrade;
```

**Then it's missing "_header"** - Continue to Step 2.

**If it shows:**
```
proxy_set_header Upgrade $http_upgrade;
```

**Then the error might be elsewhere** - Check all lines around 68:
```bash
sudo sed -n '65,75p' /etc/nginx/sites-available/lto-website
```

---

### Step 2: Fix Line 68

**Option A: Quick sed fix (recommended):**
```bash
sudo sed -i 's/proxy_set Upgrade/proxy_set_header Upgrade/g' /etc/nginx/sites-available/lto-website
```

**Option B: Manual edit with nano:**
```bash
sudo nano /etc/nginx/sites-available/lto-website
```

Then:
1. Press `Ctrl + _` (goto line number)
2. Type `68` and press Enter
3. Find the line with `proxy_set Upgrade` and change it to `proxy_set_header Upgrade`
4. Save: `Ctrl + O`, Enter, `Ctrl + X`

---

### Step 3: Verify the Fix
```bash
sudo sed -n '65,75p' /etc/nginx/sites-available/lto-website
```

**Should show:**
```
    location /accident-prediction-api {
        proxy_pass http://localhost:5004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;    ← Should say proxy_set_header
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
```

---

### Step 4: Test Configuration Again
```bash
sudo nginx -t
```

**Should now show:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

### Step 5: Reload Nginx
```bash
sudo nginx -s reload
```

---

## Alternative: Check for ALL instances of "proxy_set" (without "_header")

If you want to check for any other typos:

```bash
# Find all lines with "proxy_set" that don't have "_header"
sudo grep -n "proxy_set" /etc/nginx/sites-available/lto-website | grep -v "proxy_set_header"
```

If this returns any results, those lines need to be fixed.

---

## If Still Having Issues

Check the exact line causing the problem:

```bash
# Show line 68 with line number
sudo sed -n '68p' /etc/nginx/sites-available/lto-website | cat -A
```

This will show hidden characters. If you see `proxy_set` instead of `proxy_set_header`, that's the issue.

---

## One-Line Fix (Copy-Paste This):

```bash
sudo sed -i 's/proxy_set Upgrade/proxy_set_header Upgrade/g' /etc/nginx/sites-available/lto-website && sudo nginx -t && sudo nginx -s reload
```

This will:
1. Fix the typo
2. Test the config
3. Reload nginx (only if test passes)

