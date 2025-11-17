# Setup Automatic Model Retraining

This guide explains how to set up automatic retraining of the Accident Prediction Model at the end of each month.

## Overview

The system includes:
1. **Retraining Script** (`retrain_model.py`) - Handles training and service restart
2. **Systemd Service** (`accident-prediction-retrain.service`) - Runs the retraining script
3. **Systemd Timer** (`accident-prediction-retrain.timer`) - Schedules when to run

## Two Options for Timing

### Option 1: Run on 1st of Each Month (Recommended)
- **When**: Midnight (00:05) on the 1st day of each month
- **Why**: Ensures all data from the previous month is available
- **Default**: This is the default configuration

### Option 2: Run on Last Day of Each Month
- **When**: Midnight (00:00) on the last day of each month
- **Why**: Trains immediately when the month ends
- **Note**: Requires checking dates 28-31 (covers all months)

## Setup Instructions

### Step 1: Make Scripts Executable

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/accident_prediction
chmod +x retrain_model.py
chmod +x check_last_day.py
```

### Step 2: Copy Service and Timer Files

```bash
# Copy service file
sudo cp accident-prediction-retrain.service /etc/systemd/system/

# Copy timer file
sudo cp accident-prediction-retrain.timer /etc/systemd/system/
```

### Step 3: Reload Systemd

```bash
sudo systemctl daemon-reload
```

### Step 4: Enable and Start Timer

```bash
# Enable timer to start on boot
sudo systemctl enable accident-prediction-retrain.timer

# Start timer immediately
sudo systemctl start accident-prediction-retrain.timer
```

### Step 5: Verify Timer Status

```bash
# Check timer status
sudo systemctl status accident-prediction-retrain.timer

# List all timers
systemctl list-timers

# Check next run time
systemctl list-timers accident-prediction-retrain.timer
```

## Switching Between Options

### To Run on Last Day of Month (Option 2)

Edit the timer file:

```bash
sudo nano /etc/systemd/system/accident-prediction-retrain.timer
```

Change:
```ini
OnCalendar=*-*-01 00:05:00
```

To:
```ini
OnCalendar=*-*-28..31 00:00:00
```

Then reload:
```bash
sudo systemctl daemon-reload
sudo systemctl restart accident-prediction-retrain.timer
```

### To Run on 1st of Month (Option 1) - Default

Edit the timer file:

```bash
sudo nano /etc/systemd/system/accident-prediction-retrain.timer
```

Change:
```ini
OnCalendar=*-*-28..31 00:00:00
```

To:
```ini
OnCalendar=*-*-01 00:05:00
```

Then reload:
```bash
sudo systemctl daemon-reload
sudo systemctl restart accident-prediction-retrain.timer
```

## Monitoring

### View Logs

```bash
# View retraining logs
sudo journalctl -u accident-prediction-retrain.service -n 100 --no-pager

# Follow logs in real-time
sudo journalctl -u accident-prediction-retrain.service -f

# View timer logs
sudo journalctl -u accident-prediction-retrain.timer -n 50 --no-pager
```

### Check Training Log File

```bash
# View training log file
tail -f /var/log/accident-prediction-retrain.log

# View last 100 lines
tail -n 100 /var/log/accident-prediction-retrain.log
```

### Manual Testing

Test the retraining script manually:

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/accident_prediction
source venv/bin/activate
python retrain_model.py
```

Or trigger the service manually:

```bash
sudo systemctl start accident-prediction-retrain.service
sudo journalctl -u accident-prediction-retrain.service -f
```

## What Happens During Retraining

1. **Script checks if it's the right time** (last day of month or 1st of month)
2. **Runs training script** (`train_rf_model.py`) with a 1-hour timeout
3. **Saves new model** to the trained directory
4. **Attempts to reload model via API** endpoint (`/api/accidents/reload-model`)
5. **Falls back to service restart** if API reload fails
6. **Logs everything** to `/var/log/accident-prediction-retrain.log` and systemd journal

## Troubleshooting

### Timer Not Running

```bash
# Check if timer is enabled
sudo systemctl is-enabled accident-prediction-retrain.timer

# Check timer status
sudo systemctl status accident-prediction-retrain.timer

# Check when it will run next
systemctl list-timers accident-prediction-retrain.timer
```

### Training Fails

```bash
# Check training logs
tail -n 200 /var/log/accident-prediction-retrain.log

# Check if virtual environment exists
ls -la /var/www/LTOWebsiteCapstone/backend/model/ml_models/accident_prediction/venv

# Check if training script exists
ls -la /var/www/LTOWebsiteCapstone/backend/model/ml_models/accident_prediction/train_rf_model.py

# Test training manually
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/accident_prediction
source venv/bin/activate
python train_rf_model.py
```

### Service Restart Fails

```bash
# Check service status
sudo systemctl status accident-prediction-api

# Check service logs
sudo journalctl -u accident-prediction-api -n 100 --no-pager

# Manually restart service
sudo systemctl restart accident-prediction-api
```

### Permission Issues

```bash
# Ensure log directory exists and is writable
sudo mkdir -p /var/log
sudo touch /var/log/accident-prediction-retrain.log
sudo chmod 666 /var/log/accident-prediction-retrain.log

# Or run with sudo (already configured in service file)
```

## Disabling Automatic Retraining

If you need to disable automatic retraining:

```bash
# Stop timer
sudo systemctl stop accident-prediction-retrain.timer

# Disable timer (won't start on boot)
sudo systemctl disable accident-prediction-retrain.timer

# To re-enable later
sudo systemctl enable accident-prediction-retrain.timer
sudo systemctl start accident-prediction-retrain.timer
```

## Notes

- Training can take 15-60 minutes depending on data size
- The script has a 1-hour timeout to prevent hanging
- If training fails, the service will not be restarted
- Model is saved to `backend/model/trained/` directory
- Old model is overwritten (not backed up - consider adding backup if needed)

