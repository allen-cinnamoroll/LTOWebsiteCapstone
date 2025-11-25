# Commands to Check and Fix Prediction Dates

## Step 1: Check What Date the Aggregated Model Has

```bash
# Check the aggregated model's metadata
cat /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/../trained/sarima_metadata.json | python3 -m json.tool | grep -A 2 "actual_last_date"
```

**If it shows June 30 instead of July 31**, that's the problem!

## Step 2: Check What Date Should Be Used

Since you said the test date range ends on **July 31, 2025**, that should be the `actual_last_date`.

## Step 3: Fix Option 1 - Hardcode July 31 in the Code

If the aggregated model also has June 30, we can hardcode July 31 directly in `app.py`:

```python
# In app.py, around line 288, replace the date detection with:
actual_last_date = pd.Timestamp(year=2025, month=7, day=31)
logger.info(f"Using hardcoded actual_last_date: {actual_last_date} (test date range end)")
```

## Step 4: Fix Option 2 - Update the Aggregated Model's Metadata

If you want to fix the metadata file directly:

```bash
# Backup first
cp /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/../trained/sarima_metadata.json /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/../trained/sarima_metadata.json.backup

# Edit the metadata (replace June 30 with July 31)
python3 << 'EOF'
import json

metadata_file = "/var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/../trained/sarima_metadata.json"

with open(metadata_file, 'r') as f:
    metadata = json.load(f)

# Update actual_last_date to July 31, 2025
metadata['actual_last_date'] = "2025-07-31 00:00:00"

with open(metadata_file, 'w') as f:
    json.dump(metadata, f, indent=2)

print("Updated actual_last_date to 2025-07-31")
EOF
```

## Step 5: Quick Fix - Force July 31 in Code

The easiest fix is to hardcode it. Here's what to change in `app.py`:

**Find this section (around line 288-324):**
```python
# CRITICAL FIX: Always use the aggregated model's actual_last_date for consistency
actual_last_date = None

# Priority 1: Use aggregated model's actual_last_date (most recent training data)
if aggregated_model is not None:
    ...
```

**Replace with:**
```python
# CRITICAL FIX: Force July 31, 2025 as the last training date
# This ensures all predictions start from August 1, 2025
# The test date range ends on July 31, 2025, so predictions must start from August
actual_last_date = pd.Timestamp(year=2025, month=7, day=31)
logger.info(f"Using hardcoded actual_last_date: {actual_last_date} (test date range end: July 31, 2025)")
```

## Step 6: Test After Fix

After making the change:

```bash
# Restart Flask API
sudo systemctl restart mv-prediction-api

# Test
curl "http://127.0.0.1:5002/api/predict/registrations?weeks=4&municipality=CARAGA" | python3 -m json.tool | grep -E "last_data_date|prediction_start_date"
```

**Expected:**
- `"last_data_date": "2025-07-31"`
- `"prediction_start_date": "2025-08-01"`

## Quick Command to Check All Models' Dates

```bash
# Check all municipality models' dates
for file in /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/../trained/optimized_municipality_*_metadata.json; do
    echo "=== $(basename $file) ==="
    cat "$file" | python3 -m json.tool | grep "actual_last_date" | head -1
done
```

This will show you what dates each model has stored.

