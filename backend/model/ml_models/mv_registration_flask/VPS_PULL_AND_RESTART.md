# Fix: Pull Latest Code and Restart API

## Problem

The API is still returning `"date": "2025-07-28"` (Monday) because the VPS doesn't have the latest code with the weekly aggregation fix.

## Solution: Pull Latest Code

Run these commands **in order** on your VPS:

```bash
# 1. Navigate to project root
cd /var/www/LTOWebsiteCapstone

# 2. Pull latest code (this includes the weekly aggregation fix)
git pull

# 3. Navigate to Flask directory
cd backend/model/ml_models/mv_registration_flask

# 4. Clear Python cache (just in case)
find . -type d -name __pycache__ -exec rm -r {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true

# 5. Restart the API
sudo systemctl restart mv-prediction-api

# 6. Wait for API to start
sleep 5

# 7. Check API status
sudo systemctl status mv-prediction-api

# 8. Test the API
curl "http://localhost:5002/api/predict/registrations?weeks=4" | python3 -m json.tool | grep -A 5 "weekly_predictions"
```

## Expected Result

After pulling and restarting, the first weekly prediction should show:

```json
{
    "date": "2025-08-03",  // ✅ August 3 (Sunday), NOT July 28
    "week_start": "2025-08-03",
    "week": 31,
    ...
}
```

## Verification

Check the first weekly prediction date:
```bash
curl "http://localhost:5002/api/predict/registrations?weeks=4" | python3 -m json.tool | grep -A 3 '"date"' | head -5
```

Should show `"2025-08-03"` or later, **NOT** `"2025-07-28"`.

## If Still Not Working

1. **Check if code was pulled:**
   ```bash
   cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
   grep -n "days_since_sunday = (date_obj.weekday() + 1) % 7" sarima_model_optimized.py
   ```
   Should show line 1040.

2. **Check API logs for errors:**
   ```bash
   sudo journalctl -u mv-prediction-api -n 50 --no-pager
   ```

3. **Force reload Python modules:**
   ```bash
   sudo systemctl stop mv-prediction-api
   sleep 2
   sudo systemctl start mv-prediction-api
   ```

