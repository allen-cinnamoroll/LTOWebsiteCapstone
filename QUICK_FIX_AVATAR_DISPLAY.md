# Quick Fix for Avatar Display Issue

## Problem
- Profile picture uploads successfully (200 OK)
- File is accessible at the URL
- But the image doesn't display on the page

## Root Causes
1. **Content Security Policy (CSP)** might be blocking images
2. **Frontend not simplifying the avatar URL logic** 
3. **Missing debugging to see what's happening**

## Solution Applied

### ✅ Frontend Changes Made:
1. **Simplified avatar URL logic** - removed complex URL construction, now using `userData.avatar` directly
2. **Added error handling** - `onError` and `onLoad` callbacks on `AvatarImage` components
3. **Added console logging** - to debug what URLs are being used
4. **Fixed URL consistency** - avatar URL is now fully constructed in AuthContext and stored in localStorage

### ✅ Nginx Changes Made:
1. **Updated CSP header** to explicitly allow images from all sources:
   ```nginx
   Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'; img-src 'self' data: https: http:;"
   ```

## Deploy the Fix

### Step 1: Update Your Code on Production

SSH into your server and run:

```bash
cd /var/www/LTOWebsiteCapstone

# Pull latest changes (includes frontend fixes)
git pull origin main

# Rebuild frontend
cd frontend
npm run build
cd ..
```

### Step 2: Update Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/lto-website
```

Find the line:
```nginx
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

**Replace it with:**
```nginx
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'; img-src 'self' data: https: http:;" always;
```

Save and exit (Ctrl+X, Y, Enter).

### Step 3: Test and Reload

```bash
# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Restart backend
pm2 restart lto-backend
```

### Step 4: Clear Browser Cache and Test

In your browser:
1. **Open Developer Tools** (F12)
2. **Go to Console tab**
3. **Clear browser cache** (Ctrl+Shift+Delete)
4. **Log in and go to profile page**
5. **Look for console messages:**
   - "AccountPage - Current userData.avatar: [URL]"
   - "Avatar image loaded successfully: [URL]"
   - OR "Avatar image failed to load: [URL]"

### Step 5: Upload a New Profile Picture

1. Click Edit Profile
2. Click camera icon
3. Select an image
4. Click Save
5. **Check console logs:**
   - "Backend response avatar: uploads/avatars/..."
   - "Constructed avatar URL: https://..."
   - "Saving to localStorage: {avatar: ...}"
   - "Avatar preview loaded: https://..."

### Step 6: Refresh and Verify

1. Refresh the page (F5)
2. **Check console logs:**
   - "AccountPage - Current userData.avatar: https://..."
   - "Avatar image loaded successfully: https://..."
3. **The image should now display!**

## What to Check if Still Not Working

### Check 1: Is the URL in localStorage Correct?

In browser console:
```javascript
JSON.parse(localStorage.getItem('userData'))
```

**Expected output:**
```javascript
{
  avatar: "https://ltodatamanager.com/uploads/avatars/avatar-xxx.jpg",
  email: "...",
  // ... other fields
}
```

❌ **If avatar is NOT a full URL (doesn't start with https://):**
```bash
# Log out and log in again
# The login process will construct the full URL
```

### Check 2: Is the Image Loading?

In browser Developer Tools → Network tab:
1. Filter by "Img"
2. Look for your avatar filename
3. Click on it
4. Check:
   - **Status:** Should be `200 OK`
   - **Response Headers:** Should have `Content-Type: image/jpeg` (or png, etc.)
   - **Preview:** Should show the image

❌ **If Status is 404:**
- The file doesn't exist on the server
- Check: `ls -la /var/www/LTOWebsiteCapstone/backend/uploads/avatars/`

❌ **If Status is 403:**
- Permission issue
- Fix: `chmod -R 755 /var/www/LTOWebsiteCapstone/backend/uploads`

❌ **If it's blocked by CSP:**
- You'll see an error in Console like "Refused to load the image because it violates CSP"
- Double-check nginx CSP header was updated

### Check 3: Is the Avatar Component Working?

In browser console:
```javascript
// Check if there are any Radix UI Avatar errors
console.log(document.querySelector('img[alt*="@"]')?.src)
```

This should output your avatar URL.

### Check 4: Clear localStorage and Re-login

If avatar URL in localStorage is wrong:
```javascript
// In browser console
localStorage.removeItem('userData');
localStorage.removeItem('token');
// Then log in again
```

## Debugging Commands

### On Server:

```bash
# Check if uploaded files exist
ls -la /var/www/LTOWebsiteCapstone/backend/uploads/avatars/

# Check nginx error logs
sudo tail -n 50 /var/log/nginx/error.log

# Check backend logs
pm2 logs lto-backend --lines 50

# Test if nginx is serving the file
curl -I https://ltodatamanager.com/uploads/avatars/avatar-xxx.jpg
# Should return: HTTP/1.1 200 OK
```

### In Browser Console:

```javascript
// Check current userData
console.log(JSON.parse(localStorage.getItem('userData')));

// Check if avatar is visible in DOM
document.querySelector('img[alt*="@"]');

// Force reload avatar
const avatarImg = document.querySelector('img[alt*="@"]');
if (avatarImg) {
  console.log('Current src:', avatarImg.src);
  avatarImg.src = avatarImg.src + '?t=' + Date.now(); // Force reload
}
```

## Expected Console Output (Success)

When everything is working, you should see:

```
AccountPage - Current userData.avatar: https://ltodatamanager.com/uploads/avatars/avatar-68f3982c34bbe8923b851d13-1762029613316-335135811.jpg
AccountPage - Full userData: {userId: '...', email: '...', avatar: 'https://...', ...}
Avatar image loaded successfully: https://ltodatamanager.com/uploads/avatars/avatar-...jpg
```

**No errors about:**
- ❌ "Avatar image failed to load"
- ❌ "Refused to load the image"
- ❌ "CSP violation"
- ❌ "404 Not Found"

## Summary of Changes

| File | Change | Reason |
|------|--------|--------|
| `frontend/src/pages/AccountPage.jsx` | Simplified avatar URL logic | Removed complex conditional URL construction |
| `frontend/src/pages/AccountPage.jsx` | Added `onError`/`onLoad` handlers | Debug image loading issues |
| `frontend/src/pages/AccountPage.jsx` | Added console logging | See what URLs are being used |
| `nginx config` | Updated CSP `img-src` directive | Allow images from all HTTPS sources |
| `frontend/src/context/AuthContext.jsx` | Already fixed (previous commit) | Constructs full URL on page load |

## Still Having Issues?

If the avatar still doesn't display after all this:

1. **Take a screenshot** of:
   - Browser console (F12 → Console tab)
   - Network tab filtered to "Img"
   - The profile page showing the issue

2. **Collect this info:**
   ```bash
   # On server
   ls -la /var/www/LTOWebsiteCapstone/backend/uploads/avatars/
   sudo tail -n 20 /var/log/nginx/error.log
   pm2 logs lto-backend --lines 20
   ```

3. **Check browser console** and look for:
   - "AccountPage - Current userData.avatar: ..."
   - Any red error messages
   - What the avatar URL is

The issue is likely one of:
- ✅ CSP blocking (fixed with new nginx config)
- ✅ Wrong URL in localStorage (fixed with AuthContext update)
- ✅ No debugging info (fixed with console logs)
- ❓ Something else we'll see in the logs

---

**After deploying these changes, you should see your avatar display correctly!** 🎉

