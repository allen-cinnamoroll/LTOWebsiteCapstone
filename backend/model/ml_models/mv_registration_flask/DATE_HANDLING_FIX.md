# Date Handling Fix for SARIMA Predictions

## Problem Summary

The time series forecasting system was generating predictions for dates within the historical period instead of future dates. For example, if historical data ended on **July 31, 2025**, the system was generating predictions starting from **July 28, 2025** (a date within the historical period) instead of **August 2025**.

## Root Causes Identified

### 1. **Using Week_Start Dates Instead of Actual Last Registration Date**

**Issue**: The code was using `self.all_data.index.max()`, which returns the `week_start` date (Sunday) from the aggregated weekly data, not the actual last registration date.

**Example**:
- Last registration: **July 31, 2025** (Thursday)
- Week_start for that week: **July 27, 2025** (Sunday)
- Code was using: **July 27, 2025** ❌
- Should use: **July 31, 2025** ✅

**Location**: `sarima_model.py`, `predict()` method, line 505 (old code)

---

### 2. **Incorrect Next Week Calculation**

**Issue**: The code was adding `timedelta(weeks=1)` to the last date, which doesn't properly align with the next week_start (Sunday) after the actual last registration date.

**Example**:
- Last registration: **July 31, 2025** (Thursday)
- Old code: `July 27 + 7 days = August 3, 2025` ❌
- Correct: Next Sunday after July 31 = **August 3, 2025** ✅ (but should be calculated properly)

**Location**: `sarima_model.py`, `predict()` method, line 529 (old code)

---

### 3. **Not Storing Actual Last Registration Date in Metadata**

**Issue**: The `save_model()` method was storing `last_data_date` as the week_start date, not the actual last registration date from `processing_info['actual_date_range']['end']`.

**Location**: `sarima_model.py`, `save_model()` method, line 610 (old code)

---

## Solutions Implemented

### Fix 1: Store Actual Last Registration Date During Training

**File**: `sarima_model.py`, `train()` method

**Code Added** (lines 194-199):
```python
# Store actual last registration date from processing_info for correct prediction start
if processing_info and 'actual_date_range' in processing_info:
    self.actual_last_date = pd.to_datetime(processing_info['actual_date_range']['end'])
else:
    # Fallback to week_start date if actual_date_range not available
    self.actual_last_date = pd.to_datetime(series.index.max())
```

**What This Does**:
- Extracts the actual last registration date from `processing_info` (e.g., July 31, 2025)
- Stores it as `self.actual_last_date` for use in predictions
- Falls back to week_start date if `actual_date_range` not available (backward compatibility)

---

### Fix 2: Use Actual Last Date in Predictions

**File**: `sarima_model.py`, `predict()` method

**Code Replaced** (lines 505-532):
```python
# Generate dates for predictions
# CRITICAL: Use the ACTUAL last registration date, not the week_start date
# This ensures predictions start from the correct future period
actual_last_date = None

# Priority 1: Use actual_last_date if available (from freshly trained model)
if hasattr(self, 'actual_last_date') and self.actual_last_date is not None:
    actual_last_date = pd.to_datetime(self.actual_last_date)
    print(f"Using actual last registration date: {actual_last_date}")
# Priority 2: Check if we have metadata with actual_last_date (from loaded model)
elif hasattr(self, '_metadata') and self._metadata and 'actual_last_date' in self._metadata:
    actual_last_date_str = self._metadata['actual_last_date']
    if actual_last_date_str:
        actual_last_date = pd.to_datetime(actual_last_date_str)
        print(f"Using actual last registration date from metadata: {actual_last_date}")
# Priority 3-5: Fallbacks for backward compatibility...
```

**What This Does**:
- Prioritizes using the actual last registration date
- Falls back to metadata if model was loaded from disk
- Provides warnings when using week_start dates as fallback

---

### Fix 3: Properly Calculate Next Week_Start (Sunday)

**File**: `sarima_model.py`, `predict()` method

**Code Added** (lines 539-551):
```python
# Calculate the next week_start (Sunday) after the actual last registration date
# If actual_last_date is already a Sunday, start from the next Sunday
# If actual_last_date is not a Sunday, find the next Sunday
days_until_next_sunday = (6 - actual_last_date.weekday()) % 7
if days_until_next_sunday == 0:
    # If it's already Sunday, start from next Sunday
    next_week_start = actual_last_date + timedelta(weeks=1)
else:
    # Find the next Sunday
    next_week_start = actual_last_date + timedelta(days=days_until_next_sunday)

print(f"Actual last registration date: {actual_last_date}")
print(f"Next week start (Sunday) for predictions: {next_week_start}")

# Generate forecast dates starting from the next week_start
forecast_dates = pd.date_range(
    start=next_week_start,
    periods=weeks,
    freq='W-SUN'
)
```

**What This Does**:
- Calculates days until next Sunday using `(6 - weekday()) % 7`
- If last date is Sunday (weekday=6), adds 7 days to get next Sunday
- If last date is not Sunday, adds the calculated days to reach next Sunday
- Generates forecast dates starting from the correctly calculated next Sunday

**Example Calculation**:
- Last registration: **July 31, 2025** (Thursday, weekday=3)
- Days until Sunday: `(6 - 3) % 7 = 3`
- Next Sunday: `July 31 + 3 days = August 3, 2025` ✅

---

### Fix 4: Store Actual Last Date in Metadata

**File**: `sarima_model.py`, `save_model()` method

**Code Replaced** (lines 632-666):
```python
# Save metadata
# CRITICAL: Store ACTUAL last registration date, not week_start date
# This ensures predictions start from the correct future period
actual_last_date = None
if hasattr(self, 'actual_last_date') and self.actual_last_date is not None:
    actual_last_date = str(self.actual_last_date)
elif self.all_data is not None and len(self.all_data) > 0:
    # Fallback to week_start date if actual_last_date not available (backward compatibility)
    actual_last_date = str(self.all_data.index.max())
# ... more fallbacks ...

metadata = {
    'model_params': self.model_params,
    'accuracy_metrics': self.accuracy_metrics,
    'last_trained': datetime.now().isoformat(),
    'training_weeks': len(self.training_data) if self.training_data is not None else None,
    'date_range': {
        'start': str(self.training_data.index.min()) if self.training_data is not None else None,
        'end': str(self.training_data.index.max()) if self.training_data is not None else None
    },
    'actual_last_date': actual_last_date,  # ACTUAL last registration date (CRITICAL)
    'last_data_date': week_start_last_date  # Week_start date (for backward compatibility)
}
```

**What This Does**:
- Stores `actual_last_date` in metadata (the actual last registration date)
- Also stores `last_data_date` for backward compatibility
- Ensures loaded models have access to the correct last date

---

### Fix 5: Restore Actual Last Date When Loading Model

**File**: `sarima_model.py`, `load_model()` method

**Code Added** (lines 693-702):
```python
# Restore actual_last_date if available
if 'actual_last_date' in metadata and metadata['actual_last_date']:
    self.actual_last_date = pd.to_datetime(metadata['actual_last_date'])

print(f"Model loaded from {self.model_file}")
print(f"Model parameters: {self.model_params}")
if 'actual_last_date' in metadata:
    print(f"Actual last registration date from metadata: {metadata['actual_last_date']}")
elif 'last_data_date' in metadata:
    print(f"Last data date from metadata (week_start): {metadata['last_data_date']}")
```

**What This Does**:
- Restores `actual_last_date` from metadata when loading model
- Provides informative logging about which date is being used

---

## Expected Behavior After Fix

### Before Fix:
```
Last registration: July 31, 2025
Week_start used: July 27, 2025
Prediction start: July 27 + 7 days = August 3, 2025
❌ But July 28, 2025 was also generated (incorrect)
```

### After Fix:
```
Last registration: July 31, 2025 (Thursday)
Actual last date stored: July 31, 2025
Days until next Sunday: 3 days
Next week_start: August 3, 2025 (Sunday)
Prediction start: August 3, 2025 ✅
Predictions: August 3, 10, 17, 24, ... (all future dates) ✅
```

---

## Testing the Fix

### Test Case 1: Last Registration on Thursday
```python
# Last registration: July 31, 2025 (Thursday)
# Expected next week_start: August 3, 2025 (Sunday)
# Expected predictions: August 3, 10, 17, 24, ...

actual_last_date = pd.to_datetime('2025-07-31')  # Thursday
days_until_next_sunday = (6 - actual_last_date.weekday()) % 7  # (6-3)%7 = 3
next_week_start = actual_last_date + timedelta(days=3)  # August 3, 2025 ✅
```

### Test Case 2: Last Registration on Sunday
```python
# Last registration: July 27, 2025 (Sunday)
# Expected next week_start: August 3, 2025 (next Sunday)
# Expected predictions: August 3, 10, 17, 24, ...

actual_last_date = pd.to_datetime('2025-07-27')  # Sunday
days_until_next_sunday = (6 - actual_last_date.weekday()) % 7  # (6-6)%7 = 0
next_week_start = actual_last_date + timedelta(weeks=1)  # August 3, 2025 ✅
```

### Test Case 3: Last Registration on Monday
```python
# Last registration: July 28, 2025 (Monday)
# Expected next week_start: August 3, 2025 (Sunday)
# Expected predictions: August 3, 10, 17, 24, ...

actual_last_date = pd.to_datetime('2025-07-28')  # Monday
days_until_next_sunday = (6 - actual_last_date.weekday()) % 7  # (6-0)%7 = 6
next_week_start = actual_last_date + timedelta(days=6)  # August 3, 2025 ✅
```

---

## Backward Compatibility

The fix maintains backward compatibility:

1. **Old models without `actual_last_date`**: Falls back to `week_start` date with warning
2. **Metadata structure**: Still stores `last_data_date` for old code compatibility
3. **Priority system**: Multiple fallback levels ensure it works even if some data is missing

---

## Key Takeaways

1. ✅ **Always use actual last registration date**, not week_start date
2. ✅ **Properly calculate next week_start** using weekday arithmetic
3. ✅ **Store actual dates in metadata** for persistence across model reloads
4. ✅ **Provide informative logging** to help debug date issues
5. ✅ **Maintain backward compatibility** with fallback mechanisms

---

## Files Modified

- `backend/model/ml_models/mv_registration_flask/sarima_model.py`
  - `train()` method: Store actual_last_date
  - `predict()` method: Use actual_last_date and calculate next week_start correctly
  - `save_model()` method: Store actual_last_date in metadata
  - `load_model()` method: Restore actual_last_date from metadata

---

## Verification Steps

1. **Retrain the model** to ensure `actual_last_date` is stored:
   ```python
   model.train(data=weekly_data, force=True, processing_info=processing_info)
   ```

2. **Check metadata** to verify `actual_last_date` is saved:
   ```python
   import json
   with open('trained/sarima_metadata.json', 'r') as f:
       metadata = json.load(f)
   print(f"Actual last date: {metadata.get('actual_last_date')}")
   ```

3. **Generate predictions** and verify dates are in the future:
   ```python
   predictions = model.predict(weeks=4)
   print(f"Prediction start: {predictions['prediction_start_date']}")
   print(f"First prediction date: {predictions['weekly_predictions'][0]['date']}")
   ```

4. **Verify dates are after last registration date**:
   ```python
   last_date = pd.to_datetime(metadata['actual_last_date'])
   first_pred = pd.to_datetime(predictions['weekly_predictions'][0]['date'])
   assert first_pred > last_date, "Predictions should start after last date!"
   ```

---

**End of Fix Documentation**

