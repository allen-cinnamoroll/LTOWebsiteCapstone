# Setup Automatic Flask API Startup

This guide will help you set up the Flask API to automatically start on server boot and keep running.

## Quick Setup (Recommended)

Run these commands on your VPS:

```bash
# 1. Navigate to Flask app directory
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask

# 2. Copy the service file to systemd
sudo cp mv-prediction-api.service /etc/systemd/system/

# 3. Reload systemd to recognize the new service
sudo systemctl daemon-reload

# 4. Enable the service to start on boot
sudo systemctl enable mv-prediction-api

# 5. Start the service now
sudo systemctl start mv-prediction-api

# 6. Check the status
sudo systemctl status mv-prediction-api
```

## Verify It's Working

### Check Service Status
```bash
sudo systemctl status mv-prediction-api
```

You should see:
- `Active: active (running)`
- The service is running

### Check if Flask is Running on Port 5001
```bash
# Check if port 5001 is listening
sudo netstat -tlnp | grep 5001
# or
sudo ss -tlnp | grep 5001
```

### Test the API
```bash
# Test health endpoint
curl http://localhost:5001/api/health

# Test from external IP (if accessible)
curl http://72.60.198.244:5001/api/health
```

## Useful Commands

### Start/Stop/Restart Service
```bash
# Start the service
sudo systemctl start mv-prediction-api

# Stop the service
sudo systemctl stop mv-prediction-api

# Restart the service
sudo systemctl restart mv-prediction-api

# Check status
sudo systemctl status mv-prediction-api
```

### View Logs
```bash
# View recent logs
sudo journalctl -u mv-prediction-api -n 50

# Follow logs in real-time
sudo journalctl -u mv-prediction-api -f

# View logs since boot
sudo journalctl -u mv-prediction-api --since boot
```

### Disable Auto-Start (if needed)
```bash
sudo systemctl disable mv-prediction-api
```

## Firewall Configuration

Make sure port 5001 is open:

```bash
# Check firewall status
sudo ufw status

# Allow port 5001
sudo ufw allow 5001

# Check if port is open
sudo ufw status | grep 5001
```

## Troubleshooting

### Service Won't Start

1. **Check the logs:**
   ```bash
   sudo journalctl -u mv-prediction-api -n 100
   ```

2. **Verify Python path:**
   ```bash
   ls -la /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/venv/bin/python3
   ```

3. **Check if port 5001 is already in use:**
   ```bash
   sudo lsof -i :5001
   # If something is using it, kill it:
   sudo kill -9 <PID>
   ```

4. **Test manual start:**
   ```bash
   cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
   source venv/bin/activate
   python3 app.py
   ```

### Service Keeps Restarting

If the service keeps restarting, check the logs for errors:
```bash
sudo journalctl -u mv-prediction-api -n 100 --no-pager
```

Common issues:
- Missing dependencies (run `pip install -r requirements.txt`)
- Port already in use
- Python virtual environment issues

### Update Service After Code Changes

After updating the code, restart the service:
```bash
sudo systemctl restart mv-prediction-api
```

## Alternative: Using PM2 (if you prefer)

If you prefer PM2 over systemd:

```bash
# Install PM2 globally
npm install -g pm2

# Navigate to Flask directory
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask

# Start with PM2
source venv/bin/activate
pm2 start app.py --name "mv-prediction-api" --interpreter python3

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions it provides
```

## Verification Checklist

After setup, verify:

- [ ] Service is enabled: `sudo systemctl is-enabled mv-prediction-api` should return `enabled`
- [ ] Service is running: `sudo systemctl is-active mv-prediction-api` should return `active`
- [ ] Port 5001 is listening: `sudo netstat -tlnp | grep 5001` should show Python process
- [ ] API responds: `curl http://localhost:5001/api/health` should return JSON
- [ ] Firewall allows port: `sudo ufw status | grep 5001` should show `5001/tcp ALLOW`
- [ ] External access works: `curl http://72.60.198.244:5001/api/health` should return JSON

## Next Steps

Once the service is running:

1. Test the upload endpoint from the frontend
2. Verify retraining works
3. Monitor logs for any issues
4. Set up log rotation if needed (optional)

## Notes

- The service will automatically restart if it crashes
- The service will start automatically when the server reboots
- Logs are managed by systemd (use `journalctl` to view)
- Port 5001 is used (as per CONTINUATION_PROMPT.md)

