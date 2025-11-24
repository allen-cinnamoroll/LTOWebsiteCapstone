# Deployment Fix: Retraining Feature

## Problem
The "Retrain Model" feature worked correctly in localhost but failed in production deployment. The error message indicated: "Cannot connect to prediction API server for retraining. Please ensure the Flask API is running on http://72.60.198.244:5001."

## Root Causes Identified

1. **Direct IP Connection**: Frontend was trying to connect directly to `http://72.60.198.244:5001`, which can cause:
   - CORS issues (different origin)
   - Firewall blocking
   - Service not accessible from browser
   - Network connectivity issues

2. **Missing Nginx Proxy**: No reverse proxy route was configured in nginx to route Flask API requests through the same domain as the frontend.

3. **Hardcoded IP Address**: Frontend code had a hardcoded IP fallback that didn't work in production.

## Solutions Implemented

### 1. Added Nginx Reverse Proxy Route

**File**: `nginx-production.conf`

Added a new location block that routes `/mv-prediction-api/*` requests to the Flask API on `localhost:5001`:

```nginx
# Flask MV Prediction API (port 5001)
location /mv-prediction-api {
    proxy_pass http://localhost:5001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # Important: Allow large file uploads (CSV files) through the proxy
    client_max_body_size 50M;
    proxy_read_timeout 600;  # 10 minutes for model training
    proxy_connect_timeout 30;
    proxy_send_timeout 600;
    
    # Remove /mv-prediction-api prefix when forwarding to Flask
    rewrite ^/mv-prediction-api(.*)$ $1 break;
}
```

**Key Features**:
- Routes requests from `/mv-prediction-api/*` to Flask API
- Allows 50MB file uploads (for CSV files)
- 10-minute timeout for model training operations
- Strips the `/mv-prediction-api` prefix when forwarding to Flask

### 2. Updated Frontend API Configuration

**Files**: 
- `frontend/src/pages/MVPredictionPage.jsx`
- `frontend/src/api/predictionApi.js`

Changed from hardcoded IP to environment-aware configuration:

```javascript
const getMVPredictionAPIBase = () => {
  // If environment variable is explicitly set, use it (highest priority)
  if (import.meta.env.VITE_MV_PREDICTION_API_URL) {
    return import.meta.env.VITE_MV_PREDICTION_API_URL;
  }
  
  // In development mode, use localhost
  if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
    return 'http://localhost:5001';
  }
  
  // In production, use relative path through nginx proxy
  // This avoids CORS issues and works with the nginx reverse proxy
  return '/mv-prediction-api';
};

const MV_PREDICTION_API_BASE = getMVPredictionAPIBase();
```

**Benefits**:
- **Development**: Uses `http://localhost:5001` (works with local Flask API)
- **Production**: Uses `/mv-prediction-api` (relative path, same origin, no CORS issues)
- **Override**: Can still use `VITE_MV_PREDICTION_API_URL` environment variable if needed

## Deployment Steps

### Step 1: Update Nginx Configuration on VPS

1. **SSH into your VPS**:
   ```bash
   ssh user@your-vps-ip
   ```

2. **Edit the nginx configuration**:
   ```bash
   sudo nano /etc/nginx/sites-available/lto-website
   ```

3. **Add the Flask API proxy block** (copy from `nginx-production.conf` in the repository)

4. **Test the nginx configuration**:
   ```bash
   sudo nginx -t
   ```

5. **Reload nginx**:
   ```bash
   sudo systemctl reload nginx
   ```

### Step 2: Verify Flask API is Running

1. **Check if the Flask API service is running**:
   ```bash
   sudo systemctl status mv-prediction-api
   ```

2. **If not running, start it**:
   ```bash
   sudo systemctl start mv-prediction-api
   ```

3. **Check if port 5001 is listening**:
   ```bash
   sudo netstat -tlnp | grep 5001
   # or
   sudo ss -tlnp | grep 5001
   ```

4. **Test the Flask API directly**:
   ```bash
   curl http://localhost:5001/api/health
   ```

### Step 3: Rebuild and Deploy Frontend

1. **On your local machine**, rebuild the frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. **Upload the built files to VPS**:
   ```bash
   # From your local machine
   scp -r frontend/dist/* user@your-vps-ip:/var/www/LTOWebsiteCapstone/frontend/dist/
   ```

   Or use your preferred deployment method (git pull, rsync, etc.)

### Step 4: Test the Fix

1. **Access your production website** in a browser

2. **Navigate to the MV Prediction Model page**

3. **Try to retrain the model** (with or without uploading a CSV file)

4. **Verify**:
   - No CORS errors in browser console
   - No connection errors
   - Retraining completes successfully
   - Success modal appears with accuracy metrics

## Testing the Nginx Proxy

You can test the nginx proxy route directly:

```bash
# From your VPS
curl http://localhost/mv-prediction-api/api/health

# Should return JSON response from Flask API
```

## Troubleshooting

### Issue: 502 Bad Gateway

**Cause**: Flask API is not running or not accessible on port 5001

**Solution**:
```bash
# Check Flask API service status
sudo systemctl status mv-prediction-api

# Check logs
sudo journalctl -u mv-prediction-api -n 50

# Restart the service
sudo systemctl restart mv-prediction-api
```

### Issue: 504 Gateway Timeout

**Cause**: Model training is taking longer than the timeout

**Solution**: Increase the timeout in nginx config (already set to 600 seconds = 10 minutes)

### Issue: 413 Request Entity Too Large

**Cause**: CSV file is larger than 50MB

**Solution**: Either split the CSV file or increase `client_max_body_size` in nginx config

### Issue: CORS Errors Still Occurring

**Cause**: Frontend is still using absolute URL instead of relative path

**Solution**: 
1. Check browser console for the actual URL being called
2. Verify frontend build includes the updated code
3. Clear browser cache and hard refresh (Ctrl+Shift+R)

### Issue: Flask API Not Starting

**Check**:
```bash
# Check service logs
sudo journalctl -u mv-prediction-api -n 100

# Common issues:
# - Missing dependencies: Run `pip install -r requirements.txt` in venv
# - Port already in use: Check with `sudo lsof -i :5001`
# - Python path issues: Verify venv path in service file
```

## Verification Checklist

After deployment, verify:

- [ ] Nginx configuration is valid (`sudo nginx -t`)
- [ ] Nginx is reloaded (`sudo systemctl reload nginx`)
- [ ] Flask API service is running (`sudo systemctl status mv-prediction-api`)
- [ ] Port 5001 is listening (`sudo netstat -tlnp | grep 5001`)
- [ ] Nginx proxy works (`curl http://localhost/mv-prediction-api/api/health`)
- [ ] Frontend is rebuilt and deployed
- [ ] Browser console shows no CORS errors
- [ ] Retraining feature works in production

## Benefits of This Approach

1. **No CORS Issues**: All requests go through the same domain (via nginx)
2. **Security**: Flask API doesn't need to be directly exposed to the internet
3. **Flexibility**: Can easily change Flask API port without frontend changes
4. **Consistency**: Same pattern as the main backend API (`/api` route)
5. **Environment-Aware**: Automatically uses correct URL based on environment

## Additional Notes

- The Flask API should still be accessible on `localhost:5001` for direct testing
- The nginx proxy forwards requests to Flask, so Flask sees them as coming from localhost
- All Flask API endpoints remain the same (e.g., `/api/upload-csv`, `/api/model/retrain`)
- The frontend just uses `/mv-prediction-api` as the base URL instead of the direct IP

