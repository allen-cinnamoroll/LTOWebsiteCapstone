# VPS Update Instructions - Date Fix for Optimized Model

## Problem

The Flask API is using `OptimizedSARIMAModel` (not the weekly `SARIMAModel`), and it was still showing July 28 dates instead of August dates.

## Files Updated

1. ✅ `sarima_model_optimized.py` - Fixed date handling
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

The optimized model needs to be retrained to store `actual_last_date`:

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
source venv/bin/activate

# Create retrain script for optimized model
cat > retrain_optimized_model.py << 'EOF'
from data_preprocessor_daily import DailyDataPreprocessor
from sarima_model_optimized import OptimizedSARIMAModel
import os

base_dir = os.path.dirname(os.path.abspath(__file__))
data_dir = os.path.join(base_dir, '../mv registration training')
model_dir = os.path.join(base_dir, '../trained')
csv_path = os.path.join(data_dir, 'DAVOR_data.csv')

print("Loading data...")
preprocessor = DailyDataPreprocessor(csv_path)
daily_data, exogenous_vars, processing_info = preprocessor.load_and_process_daily_data(
    fill_missing_days=True,
    fill_method='zero'
)

print("Training optimized model...")
model = OptimizedSARIMAModel(
    model_dir=model_dir,
    municipality=None,
    use_normalization=False,
    scaler_type='minmax'
)
model.train(
    data=daily_data,
    exogenous=exogenous_vars[['is_weekend_or_holiday']],
    force=True,
    processing_info=processing_info
)

print("✅ Optimized model retrained successfully!")
EOF

python3 retrain_optimized_model.py
```

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
- **First prediction**: August 1, 2025 ✅
- **All predictions**: August 1, 2, 3, ... (future dates) ✅

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
