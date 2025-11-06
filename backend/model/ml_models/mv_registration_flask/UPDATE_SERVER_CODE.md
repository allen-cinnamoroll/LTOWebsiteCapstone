# Server is Running Old Code - Update Instructions

## Problem Identified

Your server is running the **OLD version** of the code, not the optimized version. Evidence:

1. ✅ Flask service is running
2. ❌ No log file exists (old code doesn't create it)
3. ❌ No optimized model files (`.pkl`, `.json`)
4. ❌ Logs show weekly aggregation (old code)
5. ❌ Logs don't show "DEBUG" messages or daily processing

The logs show:
```
Finding optimal SARIMA parameters  ← Old code
Training Accuracy (In-Sample)      ← Old code format
Training set: 21 weeks            ← Weekly aggregation (old)
```

---

## Solution: Update to Optimized Code

### Step 1: Pull Latest Code from Git

```bash
cd /var/www/LTOWebsiteCapstone
git pull origin main
# or git pull origin master (depending on your branch)
```

### Step 2: Verify Optimized Code is Present

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask

# Check if optimized files exist
ls -lh sarima_model_optimized.py
ls -lh data_preprocessor_daily.py

# Check app.py imports optimized version
grep -i "OptimizedSARIMAModel\|DailyDataPreprocessor" app.py
```

**Expected output:**
```python
from sarima_model_optimized import OptimizedSARIMAModel
from data_preprocessor_daily import DailyDataPreprocessor
```

### Step 3: Restart Flask Service

```bash
# Restart the service to load new code
systemctl restart mv-prediction-api

# Check status
systemctl status mv-prediction-api

# Watch logs to see if it loads optimized version
journalctl -u mv-prediction-api -f
```

**Look for these messages (optimized version):**
```
Initializing Vehicle Registration Prediction API (Optimized Version)...
Features: Daily data, auto_arima, exogenous variables, cross-validation
```

### Step 4: Retrain Model

After restarting, retrain the model through the web interface. The new code will:
- Process daily data (not weekly)
- Create the log file automatically
- Calculate R² values
- Show DEBUG messages

---

## Alternative: Manual Code Update (If Not Using Git)

If you're not using Git, you need to manually copy the updated files:

### Files to Update:
1. `app.py` - Must import optimized version
2. `sarima_model_optimized.py` - Optimized model code
3. `data_preprocessor_daily.py` - Daily data preprocessing

### Check Current Code:

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask

# Check what app.py is importing
head -40 app.py | grep -A 5 "import\|from"

# Should show:
# from sarima_model_optimized import OptimizedSARIMAModel
# from data_preprocessor_daily import DailyDataPreprocessor
```

If it shows:
```python
from sarima_model import SARIMAModel  # ❌ OLD CODE
```

Then you need to update it.

---

## Verify Update Worked

After updating and restarting, check:

### 1. Check Service Logs:
```bash
journalctl -u mv-prediction-api -n 50 | grep -i "optimized\|daily\|DEBUG"
```

Should show:
```
Initializing Vehicle Registration Prediction API (Optimized Version)...
Loading daily data...
Processing daily data with missing day filling...
DEBUG: Metrics calculated - R² value: ...
```

### 2. Check Log File Created:
```bash
ls -lh /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/sarima_model.log
```

### 3. Check Model Files:
```bash
ls -lh /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/optimized_*
```

### 4. Retrain and Check R²:
After retraining, check log file:
```bash
tail -n 100 sarima_model.log | grep -i "R²\|R2\|DEBUG"
```

---

## Quick Update Commands

**Complete sequence:**
```bash
# 1. Navigate to project root
cd /var/www/LTOWebsiteCapstone

# 2. Pull latest code
git pull origin main

# 3. Navigate to Flask directory
cd backend/model/ml_models/mv_registration_flask

# 4. Verify optimized code
grep "OptimizedSARIMAModel" app.py

# 5. Restart service
systemctl restart mv-prediction-api

# 6. Check status
systemctl status mv-prediction-api

# 7. Watch logs
journalctl -u mv-prediction-api -f
```

---

## After Update

Once updated, the log file will be created when you retrain. Then you can check it:

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
tail -n 50 sarima_model.log
grep -i "R²\|R2\|DEBUG" sarima_model.log
```

