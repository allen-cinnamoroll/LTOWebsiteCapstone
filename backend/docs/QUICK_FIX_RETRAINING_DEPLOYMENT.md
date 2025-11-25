# Quick Fix: Retraining Feature Deployment Issue

## Problem
Retraining feature works in localhost but fails in production with error: "Cannot connect to prediction API server for retraining."

## Quick Fix (5 Steps)

### 1. Update Nginx Configuration

SSH into your VPS and edit nginx config:

```bash
sudo nano /etc/nginx/sites-available/lto-website
```

Add this block **after** the existing `/api` location block:

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
        
        client_max_body_size 50M;
        proxy_read_timeout 600;
        proxy_connect_timeout 30;
        proxy_send_timeout 600;
        
        rewrite ^/mv-prediction-api(.*)$ $1 break;
    }
```

Save and test:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Verify Flask API is Running

```bash
# Check service status
sudo systemctl status mv-prediction-api

# If not running, start it
sudo systemctl start mv-prediction-api

# Check if port 5001 is listening
sudo netstat -tlnp | grep 5001
```

### 3. Rebuild Frontend

On your local machine:
```bash
cd frontend
npm run build
```

### 4. Deploy Frontend

Upload the built files to VPS:
```bash
scp -r frontend/dist/* user@your-vps:/var/www/LTOWebsiteCapstone/frontend/dist/
```

Or use your deployment method (git pull, etc.)

### 5. Test

1. Open your production website
2. Navigate to MV Prediction Model page
3. Try retraining (with or without CSV)
4. Should work without connection errors!

## What Changed?

- **Frontend**: Now uses `/mv-prediction-api` (relative path) in production instead of hardcoded IP
- **Nginx**: Added reverse proxy route for Flask API
- **Benefits**: No CORS issues, same origin, more secure

## Still Not Working?

Check these:
1. Flask API service is running: `sudo systemctl status mv-prediction-api`
2. Port 5001 is open: `sudo netstat -tlnp | grep 5001`
3. Nginx config is valid: `sudo nginx -t`
4. Browser console for errors (F12 → Console tab)
5. Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

For detailed troubleshooting, see `DEPLOYMENT_FIX_RETRAINING.md`

