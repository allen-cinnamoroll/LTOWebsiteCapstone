# VPS Update Instructions - Date Fix for Optimized Model

## Problem

The Flask API was showing **July 28** dates instead of August dates because:

1. Weekly aggregation was using **Monday as week_start** instead of **Sunday**
2. August 1 (Friday) was being grouped into the week starting July 28 (Monday)
3. That week includes historical dates (July 28-31)

## Files Updated

1. ✅ `sarima_model_optimized.py` - Fixed date handling AND weekly aggregation (Sunday as week_start)
2. ✅ `app.py` - Fixed date logic to match model
3. ✅ `data_preprocessor_daily.py` - Added `actual_date_range` to processing_info
4. ✅ `WeeklyPredictionsChart.jsx` - Fixed frontend date display

## Steps to Fix on VPS

### Step 1: Pull Latest Changes

```bash
cd /var/www/LTOWebsiteCapstone
git pull origin main  # or your branch name
```

### Step 2: Restart Flask API

**If using systemd service:**

```bash
sudo systemctl restart mv-prediction-api
# or whatever your service name is
```

**If running directly:**

```bash
# Find and kill the process
ps aux | grep "python.*app.py"
kill <PID>

# Restart
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
source venv/bin/activate
python3 app.py
```

**If using PM2:**

```bash
pm2 restart mv-prediction-api
# or
pm2 restart all
```

### Step 3: Retrain the Optimized Model

The optimized model needs to be retrained to store `actual_last_date` and use the new weekly aggregation logic:

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
source venv/bin/activate

# Run the retraining script (already exists in the repo)
python3 retrain_optimized_model.py
```

**This will:**

- Load your data
- Retrain the model with the date fix
- Store `actual_last_date` in metadata
- Takes 5-15 minutes

**See `RETRAIN_AND_RESTART.md` for detailed instructions.**

### Step 4: Verify the Fix

```bash
# Test the API endpoint
curl "http://localhost:5002/api/predict/registrations?weeks=4" | python3 -m json.tool | grep -A 5 "weekly_predictions"
```

**Expected output:**

- First prediction date should be **August 1, 2025** or later
- No dates in July 2025

### Step 5: Clear Frontend Cache

After restarting the backend:

1. Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Or clear browser cache
3. The frontend should now show August dates

## What Was Fixed

### Backend (`sarima_model_optimized.py`):

- ✅ Stores `actual_last_date` during training
- ✅ Uses `actual_last_date` in predictions
- ✅ Starts predictions from **first day of next month** (August 1, 2025)
- ✅ Saves `actual_last_date` in metadata

### Backend (`app.py`):

- ✅ Uses same date logic as model
- ✅ Generates exogenous variables for correct date range
- ✅ Returns correct `last_data_date` in API response

### Backend (`data_preprocessor_daily.py`):

- ✅ Adds `actual_date_range` to `processing_info`
- ✅ Tracks actual last registration date (not filled date range)

### Frontend (`WeeklyPredictionsChart.jsx`):

- ✅ Uses ISO week numbers correctly
- ✅ Displays actual dates from backend
- ✅ Shows correct week numbers and years

## Expected Result

After retraining and restarting:

- **Last registration**: July 31, 2025
- **Daily predictions start**: August 1, 2025 ✅
- **Weekly predictions start**: August 3, 2025 (Sunday on/after Aug 1) ✅
- **No more "Jul 28"**: First week shows "Aug 3" instead ✅
- **All predictions**: Future dates only (August 2025 onwards) ✅

## Troubleshooting

### Still seeing July dates?

1. **Check if model was retrained:**

   ```bash
   cat ../trained/sarima_metadata.json | grep actual_last_date
   ```

   Should show: `"actual_last_date": "2025-07-31 00:00:00"`

2. **Check API logs:**

   ```bash
   # If using systemd
   sudo journalctl -u mv-prediction-api -f

   # If using PM2
   pm2 logs mv-prediction-api
   ```

   Look for: "Using actual last registration date: 2025-07-31"

3. **Test API directly:**

   ```bash
   curl "http://localhost:5002/api/predict/registrations?weeks=4"
   ```

   Check the `prediction_start_date` field

4. **Clear browser cache** and hard refresh

---

**End of Instructions**
