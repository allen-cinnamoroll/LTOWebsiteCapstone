# Weekly Aggregation Fix - What We Actually Predict

## Problem

The frontend was showing **"Jul 28"** for the first weekly prediction, even though:
- Historical data ends: **July 31, 2025**
- Daily predictions start: **August 1, 2025**

## Root Cause

The weekly aggregation was using **Monday as week_start** instead of **Sunday**, and it was grouping August 1 (Friday) into the week starting July 28 (Monday), which includes historical dates.

### Example:
- **August 1, 2025** = Friday
- **Old logic**: `week_start = August 1 - 4 days = July 28 (Monday)` ❌
- **Problem**: July 28-31 are historical dates, not predictions!

## Solution

### Fix 1: Use Sunday as Week Start
Changed the week_start calculation to use Sunday (matching historical data aggregation):
```python
# Calculate Sunday of the week
days_since_sunday = (date_obj.weekday() + 1) % 7
week_start = date_obj - timedelta(days=days_since_sunday)
```

### Fix 2: Ensure First Week Starts On or After Prediction Start Date
If a day's calculated week_start is before `next_month_start` (August 1), assign it to the week starting on the **Sunday on or after August 1**:

```python
# Calculate the Sunday on or after next_month_start for the first week
next_month_start_weekday = next_month_start.weekday()
days_until_sunday = (6 - next_month_start_weekday) % 7
if days_until_sunday == 0 and next_month_start_weekday != 6:
    days_until_sunday = 7
first_week_start = next_month_start + timedelta(days=days_until_sunday)

# If week_start is before next_month_start, use first_week_start instead
if week_start < next_month_start:
    week_start = first_week_start
```

## What We Actually Predict

### Daily Predictions
- **Start Date**: August 1, 2025 (first day of next month)
- **Frequency**: Daily (`freq='D'`)
- **Example**: August 1, 2, 3, 4, 5, ... (all future dates)

### Weekly Predictions
- **First Week Start**: August 3, 2025 (Sunday on or after August 1)
- **Frequency**: Weekly, Sunday as week_start
- **Example**: 
  - Week 1: August 3-9, 2025 (includes Aug 1-2 from previous week)
  - Week 2: August 10-16, 2025
  - Week 3: August 17-23, 2025
  - etc.

### Why August 3, Not August 1?
- Historical data uses **Sunday as week_start** (`freq='W-SUN'`)
- August 1, 2025 is a **Friday**
- The week containing August 1 starts on **July 27 (Sunday)**, which includes historical dates
- To maintain consistency and avoid including historical dates, the first week starts on **August 3 (Sunday)**, which is the next Sunday after August 1

## Expected Result

After this fix:
- ✅ First weekly prediction shows: **"Aug 3"** (or "Week 31 of 2025 (Aug 3)")
- ✅ No more "Jul 28" in predictions
- ✅ All predictions are for future dates (August 2025 onwards)
- ✅ Weekly aggregation uses Sunday as week_start (consistent with historical data)

## Files Changed

- `backend/model/ml_models/mv_registration_flask/sarima_model_optimized.py`
  - Line 1025-1047: Fixed weekly aggregation to use Sunday as week_start
  - Line 1026-1031: Added logic to ensure first week starts on or after prediction start date

