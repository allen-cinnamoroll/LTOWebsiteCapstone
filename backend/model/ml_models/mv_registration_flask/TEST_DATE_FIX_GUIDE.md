# Testing Date Handling Fix on VPS Backend

## Quick Test Guide

This guide helps you test the date handling fix on your VPS backend to ensure predictions start from correct future dates.

---

## Prerequisites

1. **SSH access to your VPS**
2. **Python environment** with required packages:
   - pandas
   - numpy
   - statsmodels
   - scipy
3. **Data files** in the correct location

---

## Step 1: Navigate to Backend Directory

```bash
cd /path/to/your/backend/model/ml_models/mv_registration_flask
```

Or if using the full path:
```bash
cd ~/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
```

---

## Step 2: Run the Test Script

**Option A: Use python3 directly**
```bash
python3 test_date_fix.py
```

**Option B: Activate virtual environment first (recommended)**
```bash
# Activate virtual environment
source venv/bin/activate

# Then run test
python test_date_fix.py
```

**Note:** On most Linux systems, use `python3` instead of `python`.

**Expected Output:**
```
🧪 Date Handling Fix Test Script
This script verifies that predictions start from correct future dates.

======================================================================
TESTING DATE HANDLING FIX
======================================================================

📁 Data directory: /path/to/data
📁 Model directory: /path/to/trained

Step 1: Loading and preprocessing data...
✅ Data loaded successfully
   - Total weeks: 21
   - Date range: 2025-01-05 to 2025-07-06
   - Actual registration date range: 2025-01-02 to 2025-07-31

Step 2: Initializing SARIMA model...
✅ Model initialized

Step 3: Training/loading model...
   - Existing model found. Loading...
   ✅ Model loaded from disk
   - Actual last date from metadata: 2025-07-31

Step 4: Checking date information...
   ✅ Model has actual_last_date: 2025-07-31
   ✅ Metadata has actual_last_date: 2025-07-31
   - Week_start date (from all_data): 2025-07-27

Step 5: Generating predictions...
   ✅ Predictions generated successfully
   - Number of weekly predictions: 4

Step 6: Verifying prediction dates...

   📅 Actual last registration date: 2025-07-31 (Thursday)
   📅 First prediction date: 2025-08-03 (Sunday)
   📅 Last prediction date: 2025-08-24 (Sunday)

   Verifying dates are in the future...
   ✅ PASS: First prediction date is after last registration date
   ✅ First prediction date is a Sunday (correct week_start)

   All prediction dates:
   ✅ Week 1: 2025-08-03 (Sunday) - 415 registrations
   ✅ Week 2: 2025-08-10 (Sunday) - 420 registrations
   ✅ Week 3: 2025-08-17 (Sunday) - 410 registrations
   ✅ Week 4: 2025-08-24 (Sunday) - 405 registrations

======================================================================
✅ ALL TESTS PASSED!
   Predictions are correctly starting from future dates.
======================================================================
```

---

## Step 3: If Test Fails - Retrain the Model

If the test shows warnings like:
```
⚠️  Warning: actual_last_date not in metadata (old model)
```

You need to **retrain the model** to store the actual last date:

```bash
python3 -c "
from data_preprocessor import DataPreprocessor
from sarima_model import SARIMAModel
import os

# Setup paths
base_dir = os.path.dirname(os.path.abspath('.'))
data_dir = os.path.join(base_dir, '../mv registration training')
model_dir = os.path.join(base_dir, '../trained')
csv_path = os.path.join(data_dir, 'DAVOR_data.csv')

# Load data
preprocessor = DataPreprocessor(csv_path)
weekly_data, processing_info = preprocessor.load_and_process_data()

# Initialize and train model
model = SARIMAModel(model_dir=model_dir, municipality=None)
model.train(data=weekly_data, force=True, processing_info=processing_info)

print('✅ Model retrained successfully!')
"
```

Or create a simple retrain script:

**File: `retrain_model.py`**
```python
from data_preprocessor import DataPreprocessor
from sarima_model import SARIMAModel
import os

base_dir = os.path.dirname(os.path.abspath(__file__))
data_dir = os.path.join(base_dir, '../mv registration training')
model_dir = os.path.join(base_dir, '../trained')
csv_path = os.path.join(data_dir, 'DAVOR_data.csv')

print("Loading data...")
preprocessor = DataPreprocessor(csv_path)
weekly_data, processing_info = preprocessor.load_and_process_data()

print("Training model...")
model = SARIMAModel(model_dir=model_dir, municipality=None)
model.train(data=weekly_data, force=True, processing_info=processing_info)

print("✅ Model retrained successfully!")
```

Run it:
```bash
python3 retrain_model.py
```

---

## Step 4: Verify Metadata

Check that `actual_last_date` is stored in metadata:

```bash
cat trained/sarima_metadata.json | grep actual_last_date
```

Should show:
```json
"actual_last_date": "2025-07-31 00:00:00",
```

---

## Step 5: Test via API (Optional)

If your Flask API is running, test the prediction endpoint:

```bash
curl "http://localhost:5000/api/predict/registrations?weeks=4" | python -m json.tool
```

Check the response:
```json
{
  "success": true,
  "data": {
    "prediction_start_date": "2025-08-03",
    "last_data_date": "2025-07-31",
    "weekly_predictions": [
      {
        "date": "2025-08-03",
        "predicted_count": 415
      },
      ...
    ]
  }
}
```

**Verify:**
- `prediction_start_date` should be **after** `last_data_date`
- All dates in `weekly_predictions` should be in the future

---

## Common Issues and Solutions

### Issue 1: "actual_last_date not in metadata"

**Solution:** Retrain the model with `force=True`:
```python
model.train(data=weekly_data, force=True, processing_info=processing_info)
```

### Issue 2: "Predictions still starting from past dates"

**Solution:** 
1. Check that `processing_info` contains `actual_date_range`
2. Verify the data preprocessing is working correctly
3. Retrain the model

### Issue 3: "Module not found" errors

**Solution:** Install required packages:
```bash
pip install pandas numpy statsmodels scipy
```

### Issue 4: "Data file not found"

**Solution:** Check the path to your CSV files:
```bash
ls -la "../mv registration training/"
```

---

## Expected Results

### ✅ Success Criteria:

1. **Actual last date is stored**: Model metadata contains `actual_last_date`
2. **Predictions start after last date**: First prediction date > last registration date
3. **Predictions are on Sundays**: All prediction dates are week_start (Sunday)
4. **All dates are in future**: No prediction dates fall within historical period

### Example Success Output:

```
📅 Actual last registration date: 2025-07-31 (Thursday)
📅 First prediction date: 2025-08-03 (Sunday)  ✅
📅 Last prediction date: 2025-08-24 (Sunday)  ✅

✅ ALL TESTS PASSED!
```

---

## Manual Verification

If you want to manually verify, you can use Python:

```python
import json
import pandas as pd
from datetime import datetime

# Load metadata
with open('trained/sarima_metadata.json', 'r') as f:
    metadata = json.load(f)

# Check actual_last_date
if 'actual_last_date' in metadata:
    last_date = pd.to_datetime(metadata['actual_last_date'])
    print(f"Last registration date: {last_date}")
    
    # Calculate next Sunday
    days_until_sunday = (6 - last_date.weekday()) % 7
    if days_until_sunday == 0:
        next_sunday = last_date + pd.Timedelta(weeks=1)
    else:
        next_sunday = last_date + pd.Timedelta(days=days_until_sunday)
    
    print(f"Expected first prediction: {next_sunday} (Sunday)")
else:
    print("❌ actual_last_date not found in metadata")
```

---

## Next Steps

After successful testing:

1. ✅ **Deploy to production** if tests pass
2. ✅ **Monitor predictions** to ensure dates remain correct
3. ✅ **Retrain periodically** as new data comes in

---

## Troubleshooting

If you encounter issues, check:

1. **Logs**: Look for error messages in the test output
2. **Metadata**: Verify `sarima_metadata.json` contains `actual_last_date`
3. **Data**: Ensure CSV files have correct date format (MM/DD/YYYY)
4. **Model**: Check if model file exists and is valid

---

**End of Test Guide**

