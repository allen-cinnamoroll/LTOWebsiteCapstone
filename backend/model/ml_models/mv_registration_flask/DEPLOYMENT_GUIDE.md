# Deployment Guide: Vehicle Registration Prediction API

## Quick Start Commands for Hostinger VPS

### Step 1: Navigate to Flask Application Directory

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
```

### Step 2: Create Python Virtual Environment

```bash
python3 -m venv venv
```

### Step 3: Activate Virtual Environment

```bash
source venv/bin/activate
```

### Step 4: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 5: Run Flask Application

**Option A: Direct Run (Development/Testing)**

```bash
python3 app.py
```

**Option B: Run in Background with nohup**

```bash
nohup python3 app.py > flask_api.log 2>&1 &
```

**Option C: Run with Gunicorn (Production - Recommended)**

```bash
# First, install Gunicorn
pip install gunicorn

# Then run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

**Option D: Run with PM2**

```bash
# Install PM2 if not already installed
npm install -g pm2

# Start with PM2
pm2 start app.py --name "registration-prediction-api" --interpreter python3
pm2 save
```

## Complete Setup Script (One-Time Setup)

```bash
#!/bin/bash

# Navigate to Flask app directory
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create trained models directory if it doesn't exist
mkdir -p ../trained

# Run the application
python3 app.py
```

## Verifying the API is Running

After starting the application, test the endpoints:

```bash
# Health check
curl http://localhost:5000/api/health

# Get predictions
curl http://localhost:5000/api/predict/registrations?weeks=4

# Get accuracy metrics
curl http://localhost:5000/api/model/accuracy
```

## Accessing from External Network

If you need to access the API from outside the VPS:

1. **Check if port 5000 is open in firewall:**

```bash
sudo ufw status
sudo ufw allow 5000
```

2. **Access via VPS IP:**

```bash
curl http://YOUR_VPS_IP:5000/api/health
```

## Running as a Service (Systemd)

For production, create a systemd service:

### 1. Create Service File

```bash
sudo nano /etc/systemd/system/registration-prediction-api.service
```

### 2. Add Service Configuration

```ini
[Unit]
Description=Vehicle Registration Prediction API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
Environment="PATH=/var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/venv/bin"
ExecStart=/var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/venv/bin/python3 app.py
Restart=always

[Install]
WantedBy=multi-user.target
```

### 3. Enable and Start Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable registration-prediction-api
sudo systemctl start registration-prediction-api
```

### 4. Check Service Status

```bash
sudo systemctl status registration-prediction-api
```

### 5. View Logs

```bash
sudo journalctl -u registration-prediction-api -f
```

## Nginx Reverse Proxy (Optional)

If you want to access the API via a domain name or subdomain:

### 1. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/registration-api
```

### 2. Add Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com api.your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Enable and Reload Nginx

```bash
sudo ln -s /etc/nginx/sites-available/registration-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Troubleshooting

### Issue: Port 5000 Already in Use

**Solution:**

```bash
# Find process using port 5000
lsof -i :5000
# or
netstat -tulpn | grep 5000

# Kill the process
kill -9 <PID>

# Or change port in app.py (modify last line)
app.run(host='0.0.0.0', port=5001, debug=False)
```

### Issue: Python Dependencies Not Found

**Solution:**

```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt

# Verify installation
pip list
```

### Issue: CSV File Not Found

**Solution:**

```bash
# Verify CSV file exists
ls -la "../../mv registration training/DAVOR_data.csv"

# Check file path in data_preprocessor.py if needed
```

### Issue: Model Training Fails

**Solution:**

- Ensure CSV file has valid data
- Check date format is MM/DD/YYYY
- Verify municipality names match expected values
- Check disk space: `df -h`

### Issue: Permission Denied

**Solution:**

```bash
# Make sure you have write permissions
chmod -R 755 /var/www/LTOWebsiteCapstone/backend/model/ml_models

# If needed, change ownership
sudo chown -R $USER:$USER /var/www/LTOWebsiteCapstone
```

## Monitoring

### Check if API is Running

```bash
# Check process
ps aux | grep app.py

# Check port
netstat -tulpn | grep 5000

# Test endpoint
curl http://localhost:5000/api/health
```

### View Logs

**If using nohup:**

```bash
tail -f flask_api.log
```

**If using systemd:**

```bash
sudo journalctl -u registration-prediction-api -f
```

**If using PM2:**

```bash
pm2 logs registration-prediction-api
```

## Stopping the Application

**If running directly:**

```bash
# Press Ctrl+C or find and kill process
ps aux | grep app.py
kill <PID>
```

**If using nohup:**

```bash
ps aux | grep app.py
kill <PID>
```

**If using systemd:**

```bash
sudo systemctl stop registration-prediction-api
```

**If using PM2:**

```bash
pm2 stop registration-prediction-api
```

## Updating the Application

1. **Pull latest changes (if using git):**

```bash
cd /var/www/LTOWebsiteCapstone
git pull
```

2. **Restart the service:**

```bash
# If using systemd
sudo systemctl restart registration-prediction-api

# If using PM2
pm2 restart registration-prediction-api

# If using nohup
# Kill old process and start new one
```

3. **Test the API:**

```bash
curl http://localhost:5000/api/health
```

## Environment Variables (Future Use)

If you need to configure different settings, you can use environment variables. Create a `.env` file:

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
nano .env
```

Add variables like:

```
FLASK_PORT=5000
FLASK_DEBUG=False
MODEL_DIR=/var/www/LTOWebsiteCapstone/backend/model/ml_models/trained
```

## Security Considerations

1. **Firewall**: Only open necessary ports
2. **Authentication**: Consider adding API keys for production
3. **HTTPS**: Use SSL/TLS certificates for production
4. **Rate Limiting**: Implement rate limiting for public APIs

## Next Steps

1. Test all API endpoints
2. Verify predictions are reasonable
3. Monitor model accuracy over time
4. Retrain model as new data becomes available
5. Consider integrating with main backend API (future phase)
