# Setup Accident Prediction API Service (Same as MV Prediction)

This guide will set up the Accident Prediction API to run automatically, exactly like the MV Prediction API.

## Important Note About Python

**Flask is a Python framework, so Python is required.** However, you can use either:
- `python` command (usually points to Python 3 on modern systems)
- `python3` command (explicitly Python 3)

In a virtual environment, after creation, `venv/bin/python` will point to whatever Python version you used. The service file uses `venv/bin/python` which will work with either.

## Quick Setup Commands

Run these commands on your VPS (SSH):

```bash
# 1. Navigate to accident prediction directory
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/accident_prediction

# 2. Check if virtual environment exists
ls -la venv

# 3. If venv doesn't exist, create it
python3 -m venv venv

# 4. Activate virtual environment
source venv/bin/activate

# 5. Install dependencies
pip install -r requirements.txt

# 8. Check what Python command your venv uses
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/accident_prediction
ls venv/bin/python*

# 9. Update service file if venv uses 'python' instead of 'python3'
# If venv/bin/python exists (not python3), edit the service file:
sudo nano accident-prediction-api.service
# Change 'venv/bin/python3' to 'venv/bin/python' in ExecStart line if needed

# 10. Copy service file to systemd
sudo cp accident-prediction-api.service /etc/systemd/system/

# 11. Reload systemd to recognize the new service
sudo systemctl daemon-reload

# 12. Enable the service to start on boot
sudo systemctl enable accident-prediction-api

# 13. Start the service now
sudo systemctl start accident-prediction-api

# 14. Check the status
sudo systemctl status accident-prediction-api
```

## Verify It's Working

### Check Service Status
```bash
sudo systemctl status accident-prediction-api
```

You should see:
- `Active: active (running)`
- The service is running

### Check if Flask is Running on Port 5004
```bash
# Check if port 5004 is listening
sudo ss -tlnp | grep :5004
# or
sudo netstat -tlnp | grep :5004
```

### Test the API
```bash
# Test health endpoint directly
curl http://localhost:5004/api/accidents/health

# Test through nginx
curl http://localhost/accident-prediction-api/api/accidents/health
```

## Useful Commands

### Start/Stop/Restart Service
```bash
# Start the service
sudo systemctl start accident-prediction-api

# Stop the service
sudo systemctl stop accident-prediction-api

# Restart the service
sudo systemctl restart accident-prediction-api

# Check status
sudo systemctl status accident-prediction-api
```

### View Logs
```bash
# View recent logs
sudo journalctl -u accident-prediction-api -n 50

# Follow logs in real-time
sudo journalctl -u accident-prediction-api -f

# View logs since boot
sudo journalctl -u accident-prediction-api --since boot
```

### Disable Auto-Start (if needed)
```bash
sudo systemctl disable accident-prediction-api
```

## Troubleshooting

### Service Won't Start

1. **Check the logs:**
   ```bash
   sudo journalctl -u accident-prediction-api -n 100
   ```

2. **Verify Python path:**
   ```bash
   ls -la /var/www/LTOWebsiteCapstone/backend/model/ml_models/accident_prediction/venv/bin/python3
   ```

3. **Check if port 5004 is already in use:**
   ```bash
   sudo lsof -i :5004
   # If something is using it, kill it:
   sudo kill -9 <PID>
   ```

4. **Test manual start:**
   ```bash
   cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/accident_prediction
   source venv/bin/activate
   python3 app.py
   ```

### Service Keeps Restarting

If the service keeps restarting, check the logs for errors:
```bash
sudo journalctl -u accident-prediction-api -n 100 --no-pager
```

Common issues:
- Missing dependencies (run `pip install -r requirements.txt`)
- Port already in use
- Python virtual environment issues
- Model files missing (need to train the model first)

### Update Service After Code Changes

After updating the code, restart the service:
```bash
sudo systemctl restart accident-prediction-api
```

## Verification Checklist

After setup, verify:

- [ ] Service is enabled: `sudo systemctl is-enabled accident-prediction-api` should return `enabled`
- [ ] Service is running: `sudo systemctl is-active accident-prediction-api` should return `active`
- [ ] Port 5004 is listening: `sudo ss -tlnp | grep :5004` should show Python process
- [ ] Health endpoint works: `curl http://localhost:5004/api/accidents/health` should return JSON
- [ ] Through nginx works: `curl http://localhost/accident-prediction-api/api/accidents/health` should return JSON

