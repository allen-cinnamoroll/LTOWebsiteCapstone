# Testing Backend Prediction Fixes

## Overview
This guide helps you test the backend fixes to ensure all municipality models use the same date logic and predictions start from August (not July).

## Step 1: Restart the Flask API

On your VPS, restart the Flask API to load the new code:

```bash
# Check if Flask API is running with PM2
pm2 list

# Restart the Flask API
pm2 restart mv-prediction-api

# Or if it's named differently, check the process name:
pm2 list | grep flask

# View logs to ensure it started correctly
pm2 logs mv-prediction-api --lines 50
```

## Step 2: Test the API Endpoints

### Test 1: Check "All Municipalities" (Aggregated Model)

```bash
# Test aggregated model predictions
curl "http://127.0.0.1:5002/api/predict/registrations?weeks=4" | python3 -m json.tool | head -50
```

**What to check:**
- Look for `"last_data_date"` - should show July 31, 2025 (or your actual last training date)
- Look for `"prediction_start_date"` - should show August 1, 2025 (or first day of next month)
- Check `"weekly_predictions"` - first prediction date should be in August, NOT July

**Expected output snippet:**
```json
{
  "success": true,
  "data": {
    "last_data_date": "2025-07-31 00:00:00",
    "prediction_start_date": "2025-08-01",
    "weekly_predictions": [
      {
        "date": "2025-08-03",  // Should be August, not July
        "predicted_count": 123,
        ...
      }
    ]
  }
}
```

### Test 2: Test Municipality-Specific Models

Test each municipality that was showing July predictions:

```bash
# Test Caraga
curl "http://127.0.0.1:5002/api/predict/registrations?weeks=4&municipality=CARAGA" | python3 -m json.tool | grep -A 10 "weekly_predictions"

# Test Boston
curl "http://127.0.0.1:5002/api/predict/registrations?weeks=4&municipality=BOSTON" | python3 -m json.tool | grep -A 10 "weekly_predictions"

# Test Cateel
curl "http://127.0.0.1:5002/api/predict/registrations?weeks=4&municipality=CATEEL" | python3 -m json.tool | grep -A 10 "weekly_predictions"

# Test Baganga
curl "http://127.0.0.1:5002/api/predict/registrations?weeks=4&municipality=BAGANGA" | python3 -m json.tool | grep -A 10 "weekly_predictions"

# Test Governor Generoso
curl "http://127.0.0.1:5002/api/predict/registrations?weeks=4&municipality=GOVERNOR%20GENEROSO" | python3 -m json.tool | grep -A 10 "weekly_predictions"

# Test Lupon
curl "http://127.0.0.1:5002/api/predict/registrations?weeks=4&municipality=LUPON" | python3 -m json.tool | grep -A 10 "weekly_predictions"
```

**What to check for each municipality:**
1. `"last_data_date"` should be the same as the aggregated model (July 31, 2025)
2. `"prediction_start_date"` should be August 1, 2025
3. First prediction in `"weekly_predictions"` should have a date in August (e.g., "2025-08-03"), NOT July

### Test 3: Check Model Metadata

Check if municipality models have different `actual_last_date` in their metadata:

```bash
# Check aggregated model metadata
cat /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/trained/sarima_metadata.json | python3 -m json.tool | grep -A 2 "actual_last_date"

# Check a municipality model metadata (e.g., Caraga)
cat /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/trained/optimized_municipality_CARAGA_metadata.json | python3 -m json.tool | grep -A 2 "actual_last_date"
```

**What to check:**
- Municipality models might have different `actual_last_date` in their metadata
- This is OK - the fix overrides it during prediction
- The important thing is that predictions start from August regardless of metadata

## Step 3: Check Backend Logs

Monitor the Flask API logs to see the fix in action:

```bash
# Watch logs in real-time
pm2 logs mv-prediction-api --lines 0

# Or check recent logs
pm2 logs mv-prediction-api --lines 100 | grep -i "actual_last_date\|next_month\|Temporarily overriding"
```

**What to look for:**
- Log message: `"Temporarily overriding model's actual_last_date to: 2025-07-31"`
- Log message: `"Using dates from exogenous DataFrame: 2025-08-01 to ..."`
- These confirm the fix is working

## Step 4: Test via Frontend

After verifying backend, test through the frontend:

1. **Rebuild frontend:**
   ```bash
   cd /var/www/LTOWebsiteCapstone/frontend
   npm run build
   ```

2. **Restart nginx (if needed):**
   ```bash
   sudo systemctl reload nginx
   ```

3. **Test in browser:**
   - Go to `https://ltodatamanager.com/analytics/registration`
   - Select different municipalities
   - Check that:
     - No July predictions appear
     - All predictions start from August
     - Baganga shows predictions (if it had 4 in July, they should now be in August)

## Step 5: Verify Specific Issues

### Issue 1: Baganga showing 0 predictions
**Test:**
```bash
curl "http://127.0.0.1:5002/api/predict/registrations?weeks=52&municipality=BAGANGA" | python3 -m json.tool | grep -E "date|predicted_count" | head -20
```

**Expected:** Should see predictions with dates in August, not July

### Issue 2: Caraga showing July
**Test:**
```bash
curl "http://127.0.0.1:5002/api/predict/registrations?weeks=52&municipality=CARAGA" | python3 -m json.tool | grep -E "date|predicted_count" | head -20
```

**Expected:** First prediction date should be in August (e.g., "2025-08-03"), NOT July

## Troubleshooting

### If predictions still show July:

1. **Check if Flask API restarted:**
   ```bash
   pm2 list
   pm2 restart mv-prediction-api
   ```

2. **Check if code changes were deployed:**
   ```bash
   cd /var/www/LTOWebsiteCapstone
   git status
   git log --oneline -5
   ```

3. **Check logs for errors:**
   ```bash
   pm2 logs mv-prediction-api --err --lines 50
   ```

4. **Verify the fix is in the code:**
   ```bash
   grep -n "Temporarily overriding" /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/app.py
   grep -n "Using dates from exogenous" /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/sarima_model_optimized.py
   ```

### If you see errors:

- **Import errors:** Make sure all Python dependencies are installed
- **Date errors:** Check that `actual_last_date` is being parsed correctly
- **Model errors:** Verify models are loaded correctly with `pm2 logs`

## Success Criteria

✅ All municipalities show predictions starting from August  
✅ No July predictions appear in any municipality  
✅ `last_data_date` is consistent across all models  
✅ `prediction_start_date` is August 1 (or first day of next month)  
✅ Baganga shows predictions (not 0) if it had predictions in July  

## Quick Test Script

Save this as `test_predictions.sh` and run it:

```bash
#!/bin/bash

echo "Testing Backend Predictions..."
echo "================================"

MUNICIPALITIES=("CARAGA" "BOSTON" "CATEEL" "BAGANGA" "GOVERNOR GENEROSO" "LUPON")

for MUN in "${MUNICIPALITIES[@]}"; do
    echo ""
    echo "Testing: $MUN"
    echo "-------------------"
    curl -s "http://127.0.0.1:5002/api/predict/registrations?weeks=4&municipality=${MUN// /%20}" | \
        python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    preds = data['data'].get('weekly_predictions', [])
    if preds:
        first_date = preds[0].get('date', 'N/A')
        last_date = data['data'].get('last_data_date', 'N/A')
        start_date = data['data'].get('prediction_start_date', 'N/A')
        print(f'  Last training date: {last_date}')
        print(f'  Prediction start: {start_date}')
        print(f'  First prediction date: {first_date}')
        if '07-' in first_date or '2025-07' in first_date:
            print('  ❌ ERROR: First prediction is in July!')
        else:
            print('  ✅ OK: First prediction is after July')
    else:
        print('  ⚠️  No predictions returned')
else:
    print(f'  ❌ Error: {data.get(\"error\", \"Unknown\")}')
"
done

echo ""
echo "================================"
echo "Test complete!"
```

Make it executable and run:
```bash
chmod +x test_predictions.sh
./test_predictions.sh
```

