# Step-by-Step VPS Update Guide - Date Fix

Follow these steps **in order** on your VPS to fix the July 28 date issue.

---

## Step 1: Navigate to Flask Directory

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
```

**Expected:** You should see files like `app.py`, `sarima_model_optimized.py`, etc.

---

## Step 2: Pull Latest Code Changes

```bash
cd /var/www/LTOWebsiteCapstone
git pull
```

**Expected:** Code updates are pulled from repository.

**If you get errors:**
- Make sure you're in the right directory
- Check if you have uncommitted changes: `git status`
- If needed, stash changes: `git stash` then `git pull`

---

## Step 3: Activate Virtual Environment

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
source venv/bin/activate
```

**Expected:** Your prompt should show `(venv)` at the beginning:
```
(venv) root@srv1030173:/var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask#
```

---

## Step 4: Create Retrain Script for Optimized Model

```bash
cat > retrain_optimized_model.py << 'EOF'
from data_preprocessor_daily import DailyDataPreprocessor
from sarima_model_optimized import OptimizedSARIMAModel
import os

base_dir = os.path.dirname(os.path.abspath(__file__))
data_dir = os.path.join(base_dir, '../mv registration training')
model_dir = os.path.join(base_dir, '../trained')
csv_path = os.path.join(data_dir, 'DAVOR_data.csv')

print("=" * 70)
print("RETRAINING OPTIMIZED SARIMA MODEL WITH DATE FIX")
print("=" * 70)
print()

print("Step 1: Loading data...")
preprocessor = DailyDataPreprocessor(csv_path)
daily_data, exogenous_vars, processing_info = preprocessor.load_and_process_daily_data(
    fill_missing_days=True,
    fill_method='zero'
)

print()
print("Step 2: Training optimized model...")
model = OptimizedSARIMAModel(
    model_dir=model_dir,
    municipality=None,
    use_normalization=False,
    scaler_type='minmax'
)

training_info = model.train(
    data=daily_data,
    exogenous=exogenous_vars[['is_weekend_or_holiday']],
    force=True,  # Force retraining to update metadata
    processing_info=processing_info
)

print()
print("=" * 70)
if training_info:
    print("✅ OPTIMIZED MODEL RETRAINED SUCCESSFULLY!")
    print(f"   - Training accuracy (MAPE): {training_info.get('accuracy_metrics', {}).get('mape', 'N/A'):.2f}%")
    if training_info.get('test_accuracy_metrics'):
        print(f"   - Test accuracy (MAPE): {training_info['test_accuracy_metrics'].get('mape', 'N/A'):.2f}%")
else:
    print("⚠️  Model training returned None")
print("=" * 70)
EOF
```

**Expected:** Script file created successfully.

---

## Step 5: Run Retrain Script

```bash
python3 retrain_optimized_model.py
```

**Expected Output:**
- Data loads successfully
- Model trains
- Shows "✅ OPTIMIZED MODEL RETRAINED SUCCESSFULLY!"
- Takes 5-15 minutes depending on data size

**What to look for:**
- ✅ "Stored actual last registration date: 2025-07-31"
- ✅ Training completes without errors
- ✅ Model saved successfully

---

## Step 6: Verify Metadata Was Saved

```bash
cat ../trained/sarima_metadata.json | grep -A 2 "actual_last_date"
```

**Expected Output:**
```json
"actual_last_date": "2025-07-31 00:00:00",
```

**If you see this:** ✅ Metadata is correct!

**If you don't see `actual_last_date`:** The model needs to be retrained again.

---

## Step 7: Test Predictions Locally (Optional)

```bash
python3 -c "
from sarima_model_optimized import OptimizedSARIMAModel
import os

model_dir = os.path.join(os.path.dirname(os.path.abspath('.')), 'trained')
model = OptimizedSARIMAModel(model_dir=model_dir, municipality=None)
model.load_model()

predictions = model.predict(days=28)  # 4 weeks
print('First prediction date:', predictions['prediction_start_date'])
print('First 3 weekly predictions:')
for i, wp in enumerate(predictions['weekly_predictions'][:3], 1):
    print(f'  Week {i}: {wp[\"date\"]} - {wp[\"predicted_count\"]} registrations')
"
```

**Expected Output:**
```
First prediction date: 2025-08-01
First 3 weekly predictions:
  Week 1: 2025-08-03 - XXX registrations
  Week 2: 2025-08-10 - XXX registrations
  Week 3: 2025-08-17 - XXX registrations
```

**Verify:** All dates should be in **August 2025** or later, **NOT July**.

---

## Step 8: Restart Flask API

**Option A: If using PM2**
```bash
pm2 restart mv-prediction-api
# or
pm2 restart all
pm2 logs mv-prediction-api  # Check logs
```

**Option B: If using systemd service**
```bash
sudo systemctl restart mv-prediction-api
sudo systemctl status mv-prediction-api  # Check status
```

**Option C: If running directly**
```bash
# Find the process
ps aux | grep "python.*app.py"

# Kill it (replace PID with actual process ID)
kill <PID>

# Restart
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
source venv/bin/activate
nohup python3 app.py > flask_api.log 2>&1 &
```

---

## Step 9: Test API Endpoint

```bash
curl "http://localhost:5002/api/predict/registrations?weeks=4" | python3 -m json.tool | head -30
```

**Expected Output:**
```json
{
  "success": true,
  "data": {
    "weekly_predictions": [
      {
        "date": "2025-08-03",
        "predicted_count": 415
      },
      ...
    ],
    "prediction_start_date": "2025-08-01",
    "last_data_date": "2025-07-31 00:00:00"
  }
}
```

**Verify:**
- ✅ `prediction_start_date` is **2025-08-01** or later
- ✅ `last_data_date` is **2025-07-31**
- ✅ All dates in `weekly_predictions` are in **August 2025**

---

## Step 10: Clear Frontend Cache

**In your browser:**
1. Open Developer Tools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
   
**OR**

1. Press `Ctrl + Shift + R` (Windows/Linux)
2. Or `Cmd + Shift + R` (Mac)

---

## Step 11: Verify in Frontend

1. Go to your prediction page
2. Check the tooltip on the first data point
3. **Expected:** Should show "Aug 3" or later, **NOT "Jul 28"**
4. **Expected:** Week number should be correct (e.g., "Week 31 of 2025")

---

## Troubleshooting

### Issue: "Module not found" errors

**Solution:**
```bash
source venv/bin/activate
pip install -r requirements.txt
```

---

### Issue: "Model training failed"

**Check:**
1. Data file exists: `ls -la "../mv registration training/DAVOR_data.csv"`
2. Enough disk space: `df -h`
3. Check error messages in the output

---

### Issue: Still seeing July dates after restart

**Check:**
1. **API is using new code:**
   ```bash
   # Check if app.py has the new code
   grep -n "actual_last_date" app.py
   ```
   Should show multiple lines with `actual_last_date`

2. **Model has actual_last_date:**
   ```bash
   cat ../trained/sarima_metadata.json | grep actual_last_date
   ```

3. **API logs show correct date:**
   ```bash
   # Check PM2 logs
   pm2 logs mv-prediction-api --lines 50
   
   # Or if using systemd
   sudo journalctl -u mv-prediction-api -n 50
   ```
   Look for: "Using actual last registration date: 2025-07-31"

4. **Hard refresh browser** (Ctrl+Shift+R)

---

### Issue: API won't start

**Check:**
1. Port 5002 is available: `netstat -tulpn | grep 5002`
2. Python dependencies: `pip list | grep -E "pandas|statsmodels|numpy"`
3. Check error logs: `tail -50 flask_api.log` (if using nohup)

---

## Quick Verification Checklist

After completing all steps, verify:

- [ ] Model metadata contains `actual_last_date: "2025-07-31"`
- [ ] API endpoint returns `prediction_start_date: "2025-08-01"`
- [ ] API endpoint returns dates in August 2025
- [ ] Frontend shows August dates (not July)
- [ ] Tooltip shows correct week numbers

---

## Summary

**What we fixed:**
1. ✅ Optimized model now stores actual last date (July 31, 2025)
2. ✅ Predictions start from August 1, 2025 (first day of next month)
3. ✅ Flask API uses correct date logic
4. ✅ Frontend displays dates correctly

**After these steps:**
- Predictions will start from **August 1, 2025** ✅
- No more July dates in predictions ✅
- Frontend will show correct dates ✅

---

**End of Step-by-Step Guide**

