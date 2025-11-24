# Testing Guide - Production Deployment

This guide helps you verify that avatar URLs and model info fetching work correctly in production.

## ✅ Test 1: Avatar URLs Work Correctly in Production

### **Objective:**
Verify that all avatar images load without mixed content warnings (HTTP resources on HTTPS pages).

### **Test Steps:**

1. **Open Production Site:**
   - Navigate to: `https://ltodatamanager.com`
   - Open browser DevTools (F12)
   - Go to Console tab

2. **Check Avatar Display:**
   - Look for user avatar in:
     - **Sidebar** (NavUser component)
     - **Account Page** (`/account`)
     - Any other pages showing user avatars

3. **Verify Console:**
   - **✅ PASS:** No "Mixed Content" warnings
   - **❌ FAIL:** If you see warnings like:
     ```
     Mixed Content: The page at 'https://ltodatamanager.com/vehicle' was loaded over HTTPS,
     but requested an insecure element 'http://localhost:5000/uploads/avatars/...'
     ```

4. **Check Network Tab:**
   - Open Network tab in DevTools
   - Filter by "Img"
   - Look for avatar requests
   - **✅ PASS:** All avatar URLs start with `https://ltodatamanager.com/`
   - **❌ FAIL:** Any URLs starting with `http://` or `http://localhost:`

5. **Inspect Avatar Source:**
   - Right-click on avatar → Inspect
   - Check the `src` attribute
   - **✅ PASS:** Should be: `https://ltodatamanager.com/uploads/avatars/avatar-xxx.jpg`
   - **❌ FAIL:** Should NOT be: `http://localhost:5000/uploads/avatars/...`

### **Expected Results:**

✅ **Avatar URLs are correctly constructed:**
- Development: Uses `VITE_BASE_URL` env var
- Production: Uses `https://ltodatamanager.com` (no hardcoded localhost)

✅ **No mixed content warnings:**
- All images load over HTTPS
- Browser console is clean

✅ **Avatar images display correctly:**
- Images load and display properly
- Fallback shows user initial if image fails

### **Debugging if Test Fails:**

1. **Check Environment Variables:**
   ```bash
   # In your production build, verify:
   echo $VITE_BASE_URL
   # Should output: https://ltodatamanager.com/api
   ```

2. **Check Browser Console:**
   ```javascript
   // Run in browser console:
   console.log('VITE_BASE_URL:', import.meta.env.VITE_BASE_URL);
   console.log('Current userData:', localStorage.getItem('userData'));
   ```

3. **Verify Avatar URL Construction:**
   - Check `frontend/src/utils/urlUtils.js` is in the build
   - Verify `getAvatarURL()` function is working

---

## ✅ Test 2: Model Info Fetching with Proper Error Messages

### **Objective:**
Verify that the Accident Prediction Model page handles API errors gracefully and shows clear error messages.

### **Test Scenario A: Flask API is Running**

1. **Navigate to Accident Model Page:**
   - Go to: `https://ltodatamanager.com/trained-models/accident`
   - Open browser DevTools (F12)
   - Go to Console tab

2. **Expected Behavior:**
   - ✅ Page loads model information successfully
   - ✅ Shows model status, accuracy metrics, training data info
   - ✅ No errors in console
   - ✅ Check console for log: `[AccidentPredictionPage] Fetching model info from: https://ltodatamanager.com/accident-prediction-api/api/accidents/health`

3. **Verify Response:**
   - Open Network tab
   - Find request to `/api/accidents/health`
   - Check Response tab
   - **✅ PASS:** Should return JSON:
     ```json
     {
       "status": "ok",
       "model_loaded": true,
       "model_info": { ... }
     }
     ```

### **Test Scenario B: Flask API is NOT Running**

1. **Stop Flask API** (if testing locally) or verify it's down in production

2. **Navigate to Accident Model Page:**
   - Go to: `https://ltodatamanager.com/trained-models/accident`
   - Open browser DevTools (F12)

3. **Expected Error Behavior:**
   - ✅ Page shows error card with clear message
   - ✅ Error message should say:
     ```
     Server returned HTML instead of JSON. The Flask API may not be running or the URL is incorrect.
     ```
     OR
     ```
     HTTP 503: Server returned non-OK response. Check if the Flask API is running on the correct port.
     ```

4. **Verify Console Logs:**
   - Check console for:
     - `[AccidentPredictionPage] Fetching model info from: [URL]`
     - `Non-JSON response received: <!doctype...` (first 200 chars)
   - **✅ PASS:** Clear logging of what went wrong
   - **❌ FAIL:** If you see: `SyntaxError: Unexpected token '<', "<!doctype "...`

5. **Check Network Tab:**
   - Find the failed request
   - Check Status: Should be `(failed)` or `404`/`503`
   - Check Response: Should show HTML (error page) not JSON

### **Test Scenario C: Wrong URL Configuration**

1. **If testing locally with wrong env var:**
   ```env
   # Wrong:
   VITE_ACCIDENT_PRED_API=http://localhost:5000
   # Should be:
   VITE_ACCIDENT_PRED_API=http://localhost:5004
   ```

2. **Expected Error:**
   - Clear error message explaining the issue
   - Console log shows the actual URL being called
   - Network tab shows where the request went

### **Expected Results:**

✅ **No more "Unexpected token '<'" errors:**
- Previous error: `SyntaxError: Unexpected token '<', "<!doctype "...`
- New behavior: Clear error message explaining what happened

✅ **Proper error handling:**
- Checks `Content-Type` header before parsing JSON
- Reads response as text if not JSON
- Logs helpful debugging information

✅ **User-friendly error messages:**
- Shows actionable error messages
- Explains what might be wrong
- Suggests what to check

### **Debugging if Test Fails:**

1. **Check Environment Variables:**
   ```bash
   # Verify Flask API URL:
   echo $VITE_ACCIDENT_PRED_API
   # Should output: https://ltodatamanager.com/accident-prediction-api
   ```

2. **Test Flask API Endpoint Directly:**
   ```bash
   # In browser or curl:
   curl https://ltodatamanager.com/accident-prediction-api/api/accidents/health
   
   # Should return JSON, not HTML
   ```

3. **Check Console Logs:**
   - Look for `[AccidentPredictionPage] Fetching model info from:` log
   - Verify the URL is correct
   - Check what the actual response was

4. **Verify Flask API is Running:**
   - Check if Flask process is running
   - Verify port configuration
   - Check nginx reverse proxy (if using)

---

## 🔍 **Quick Verification Checklist**

### **Before Deploying:**
- [ ] Environment variables set correctly (`.env` file)
- [ ] `VITE_BASE_URL` uses `https://` in production
- [ ] No hardcoded `http://localhost` URLs in code
- [ ] All avatar URL construction uses `getAvatarURL()` utility
- [ ] Flask APIs are configured and accessible

### **After Deploying:**
- [ ] No mixed content warnings in console
- [ ] Avatar images load correctly
- [ ] Model info page loads successfully (if Flask API is running)
- [ ] Error messages are clear and helpful (if Flask API is down)
- [ ] All URLs use HTTPS in production

### **Browser Console Checks:**
```javascript
// Run these in browser console to verify:

// 1. Check environment variables
console.log('VITE_BASE_URL:', import.meta.env.VITE_BASE_URL);
console.log('VITE_ACCIDENT_PRED_API:', import.meta.env.VITE_ACCIDENT_PRED_API);

// 2. Check avatar URL construction
import { getAvatarURL } from './utils/urlUtils';
console.log('Sample avatar URL:', getAvatarURL('uploads/avatars/test.jpg'));

// 3. Check user data
const userData = JSON.parse(localStorage.getItem('userData') || '{}');
console.log('User avatar URL:', userData.avatar);
console.log('Avatar starts with https?:', userData.avatar?.startsWith('https://'));
```

---

## 📝 **Success Criteria**

✅ **Avatar URLs:**
- All avatar images use HTTPS URLs
- No mixed content warnings
- Images load and display correctly
- Fallback works if image fails

✅ **Model Info Fetching:**
- Gracefully handles API unavailability
- Shows clear, actionable error messages
- No confusing JSON parse errors
- Helpful console logs for debugging

---

## 🚨 **Common Issues & Solutions**

### **Issue: Still seeing "localhost:5000" in avatar URLs**
**Solution:**
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+Shift+R)
- Verify `VITE_BASE_URL` is set correctly
- Check that old userData in localStorage isn't cached

### **Issue: "Unexpected token '<'" error still appears**
**Solution:**
- Check Flask API is running
- Verify `VITE_ACCIDENT_PRED_API` URL is correct
- Check nginx/reverse proxy configuration
- Clear browser cache and reload

### **Issue: Mixed content warnings persist**
**Solution:**
- Ensure all environment variables use `https://`
- Verify no hardcoded HTTP URLs in code
- Check backend is serving static files over HTTPS
- Clear browser cache

---

## 📞 **Need Help?**

If tests fail:
1. Check browser console for specific error messages
2. Verify environment variables are set correctly
3. Test Flask API endpoints directly
4. Check network tab for failed requests
5. Review `ENV_VARIABLES.md` for configuration details

