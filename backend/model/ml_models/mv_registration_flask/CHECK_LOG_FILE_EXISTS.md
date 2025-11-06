# Log File Doesn't Exist - Troubleshooting

## Why the Log File Doesn't Exist

The `sarima_model.log` file is **only created** when the optimized SARIMA model runs for the first time. If you see "No such file or directory", it means:

1. **The model hasn't been retrained yet** on this server
2. **The model hasn't been initialized** on this server
3. **The log file is being created in a different location** (different working directory)

---

## Quick Checks

### 1. Check if the model has been run at all:
```bash
# Check if there are any model files
ls -lh /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/*.pkl
ls -lh /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/*.json
```

### 2. Check if log file is in a different location:
```bash
# Search for the log file
find /var/www/LTOWebsiteCapstone -name "sarima_model.log" 2>/dev/null

# Or check the current working directory when Flask runs
# The log file is created relative to where Python runs from
```

### 3. Check Flask app logs (if running as a service):
```bash
# Check systemd service logs
journalctl -u mv-prediction-api -n 50

# Or check if there's a different log location
ps aux | grep python | grep app.py
```

---

## Solution: Create the Log File by Retraining

The log file will be created automatically when you **retrain the model** through the web interface or API.

### Option 1: Retrain via Web Interface
1. Go to your web application
2. Click the "Retrain Model" button
3. Wait for training to complete
4. The log file will be created in the same directory as the Python script

### Option 2: Check Flask Working Directory

The log file is created relative to where Python runs. If Flask runs from a different directory, the log might be elsewhere:

```bash
# Find where Flask is actually running from
ps aux | grep "python.*app.py" | grep -v grep

# Check the process working directory
pwdx $(pgrep -f "python.*app.py")
```

### Option 3: Check for Logs in Flask Output

If the model hasn't been retrained, check if there are any logs in:
- Flask console output
- Systemd service logs
- Application error logs

```bash
# Check systemd service logs
journalctl -u mv-prediction-api -f

# Or if running manually, check the terminal where Flask is running
```

---

## Understanding Log File Location

The log file is created using:
```python
logging.FileHandler('sarima_model.log')
```

This creates the file in the **current working directory** when Python runs, which might be:
- The directory where you started Flask (`python app.py`)
- The directory where systemd runs the service from
- The user's home directory if run from there

---

## Fix: Ensure Log File is Created in Correct Location

If you want to ensure the log file is always in the correct location, you can modify the logging setup to use an absolute path. But first, let's see where it should be:

```bash
# The log should be created here when model runs:
/var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/sarima_model.log

# But if Flask runs from a different directory, it might be created there instead
```

---

## Next Steps

1. **Retrain the model** - This will create the log file
2. **Check Flask service logs** - See if there are any errors:
   ```bash
   journalctl -u mv-prediction-api -n 100
   ```
3. **Check if model files exist** - If model exists, logs should have been created:
   ```bash
   ls -lh /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/
   ```

---

## After Retraining

Once you retrain the model, the log file will be created and you can check it with:

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
tail -n 50 sarima_model.log
grep -i "R²\|R2\|DEBUG" sarima_model.log
```

