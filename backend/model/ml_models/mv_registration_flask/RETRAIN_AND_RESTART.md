# How to Retrain and Restart - Quick Guide

## Step-by-Step Instructions

### Step 1: Pull Latest Code (if needed)

```bash
cd /var/www/LTOWebsiteCapstone
git pull
```

### Step 2: Navigate to Flask Directory

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
source venv/bin/activate
```

You should see `(venv)` in your prompt.

### Step 3: Retrain the Optimized Model

Run the retraining script:

```bash
python3 retrain_optimized_model.py
```

**What this does:**
- Loads your data (DAVOR_data.csv)
- Retrains the optimized SARIMA model
- Stores `actual_last_date` (July 31, 2025) in metadata
- Takes 5-15 minutes depending on your data size

**Expected output:**
```
==========================================================
RETRAINING OPTIMIZED SARIMA MODEL WITH DATE FIX
==========================================================

📁 Data directory: ...
📁 Model directory: ...

Step 1: Loading and preprocessing daily data...
✅ Data loaded successfully
   - Total days: ...
   - Date range: ... to ...
   - Actual last registration date: 2025-07-31

Step 2: Initializing and training optimized model...
   - Training model with force=True (will overwrite existing model)...
   ✅ Model trained successfully!
   - Model parameters: ...
   - Training accuracy (MAPE): ...%
   - Test accuracy (MAPE): ...%

Step 3: Verifying metadata...
   ✅ actual_last_date found in metadata: 2025-07-31 00:00:00

==========================================================
✅ RETRAINING COMPLETE!
==========================================================
```

### Step 4: Restart the Flask API

**Option A: If using systemd (most common)**

```bash
sudo systemctl restart mv-prediction-api
```

**Option B: If using PM2**

```bash
pm2 restart mv-prediction-api
# or
pm2 restart all
```

**Option C: If running manually (not recommended for production)**

```bash
# Find and kill the process
ps aux | grep "python.*app.py"
kill <PID>

# Restart
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
source venv/bin/activate
python3 app.py
```

### Step 5: Verify It's Working

**Check API status:**

```bash
# If using systemd
sudo systemctl status mv-prediction-api

# If using PM2
pm2 status
```

**Test the API:**

```bash
curl "http://localhost:5002/api/predict/registrations?weeks=4" | python3 -m json.tool | head -30
```

**Look for:**
- `"prediction_start_date": "2025-08-01"` or later
- `"last_data_date": "2025-07-31"`
- Weekly predictions starting from August dates (not July)

### Step 6: Clear Browser Cache

After restarting:
1. **Hard refresh**: Press `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
2. Or clear browser cache manually
3. Refresh the frontend page

---

## Quick Command Summary

```bash
# 1. Navigate and activate venv
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
source venv/bin/activate

# 2. Retrain model
python3 retrain_optimized_model.py

# 3. Restart API (choose one)
sudo systemctl restart mv-prediction-api    # systemd
# OR
pm2 restart mv-prediction-api                # PM2

# 4. Test API
curl "http://localhost:5002/api/predict/registrations?weeks=4" | python3 -m json.tool | grep -A 3 "prediction_start_date"

# 5. Check status
sudo systemctl status mv-prediction-api     # systemd
# OR
pm2 status                                  # PM2
```

---

## Troubleshooting

### Model retraining fails?

1. **Check if data file exists:**
   ```bash
   ls -la "../mv registration training/DAVOR_data.csv"
   ```

2. **Check Python version:**
   ```bash
   python3 --version  # Should be 3.8+
   ```

3. **Check dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

### API won't restart?

1. **Check logs:**
   ```bash
   # systemd
   sudo journalctl -u mv-prediction-api -n 50
   
   # PM2
   pm2 logs mv-prediction-api --lines 50
   ```

2. **Check if port is in use:**
   ```bash
   sudo lsof -i :5002
   # If something is using it, kill it:
   sudo kill -9 <PID>
   ```

3. **Try manual start to see errors:**
   ```bash
   cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
   source venv/bin/activate
   python3 app.py
   ```

### Still seeing July dates?

1. **Verify metadata was updated:**
   ```bash
   cat ../trained/sarima_metadata.json | grep actual_last_date
   ```
   Should show: `"actual_last_date": "2025-07-31 00:00:00"`

2. **Check API response:**
   ```bash
   curl "http://localhost:5002/api/predict/registrations?weeks=4" | python3 -m json.tool | grep -A 5 "weekly_predictions"
   ```

3. **Clear browser cache** and hard refresh

---

## Expected Result

After retraining and restarting:

✅ **First weekly prediction**: Shows "Aug 3" (or later) instead of "Jul 28"  
✅ **All predictions**: Start from August 2025 onwards  
✅ **No historical dates**: No predictions for July 31 or earlier  
✅ **Correct week numbers**: Week numbers match the actual dates  

---

**That's it!** Your model should now predict correctly starting from August 1, 2025.


