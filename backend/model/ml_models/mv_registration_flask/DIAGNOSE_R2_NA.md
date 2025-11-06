# How to Diagnose Why R² Shows as "N/A"

## Quick Steps to Diagnose

### Step 1: Check the Log File

The model logs all R² calculation attempts. Check the log file at:

**Location:** `backend/model/ml_models/mv_registration_flask/sarima_model.log`

**What to look for:**

1. **Success messages** (R² was calculated):
   ```
   R² calculated successfully: 0.8543 (variance: 1234.56)
   Test set R² calculated successfully: 0.8234 (variance: 1456.78)
   ```

2. **Warning messages** (R² couldn't be calculated):
   ```
   Cannot calculate R²: actual values have zero variance (all values are the same)
   R² calculation resulted in NaN/Inf. Actual variance: 0.0000, len: 150
   Could not calculate R²: [error message]
   Not enough data points to calculate R²
   ```

### Step 2: Check During Model Retraining

When you retrain the model, watch the console output or log file in real-time. You should see:

**Success case:**
```
In-Sample Performance:
  MAE: 86.31
  RMSE: 113.98
  MAPE: 29.07%
  R²: 0.8543

Test Set Performance (Out-of-Sample):
  MAE: 93.69
  RMSE: 117.43
  MAPE: 28.30%
  R²: 0.8234
```

**Failure case:**
```
In-Sample Performance:
  MAE: 86.31
  RMSE: 113.98
  MAPE: 29.07%
  R²: N/A
```

### Step 3: Common Reasons and Solutions

#### Reason 1: Model Not Retrained After Code Changes
**Symptom:** R² shows N/A even though other metrics are fine
**Solution:** **Retrain the model** - The current saved model was trained before R² calculation was added
**How to check:** Look at the model's metadata file or check if you've retrained after the latest code changes

#### Reason 2: Zero Variance in Data
**Symptom:** Log shows: `"Cannot calculate R²: actual values have zero variance (all values are the same)"`
**Meaning:** All actual values in your training/test set are identical (e.g., all zeros or all the same number)
**Solution:** 
- Check your data preprocessing - ensure data is not being incorrectly aggregated
- Verify the date range has actual variation in registration counts
- Check if missing value filling is creating constant values

#### Reason 3: NaN/Inf Values
**Symptom:** Log shows: `"R² calculation resulted in NaN/Inf. Actual variance: X.XXXX, len: XXX"`
**Meaning:** The calculation resulted in invalid numbers (Not a Number or Infinity)
**Possible causes:**
- Division by zero in calculations
- Numerical instability in inverse normalization
- Data alignment issues
**Solution:**
- Check if inverse normalization is working correctly
- Verify data alignment between actual and fitted/forecast values
- Check for extreme outliers in the data

#### Reason 4: Insufficient Data Points
**Symptom:** Log shows: `"Not enough data points to calculate R²"` or `"Insufficient valid data points"`
**Meaning:** After removing NaN/Inf values, there are fewer than 2 valid data points
**Solution:**
- Check your data for missing values
- Verify the date range has enough data
- Ensure data preprocessing is not removing too many values

#### Reason 5: Index Mismatch
**Symptom:** Log shows: `"Index mismatch between actual and fitted values, using position-based alignment"`
**Meaning:** The indices of actual and fitted values don't match, so alignment falls back to position-based
**Solution:**
- This is usually handled automatically, but if R² is still N/A, check the data alignment in the logs

### Step 4: Manual Debugging (Advanced)

If logs don't show the issue, you can add temporary debug code:

**In `sarima_model_optimized.py`, around line 530-531, add:**
```python
logger.info(f"DEBUG - actual_aligned stats: len={len(actual_aligned)}, mean={np.mean(actual_aligned):.2f}, var={np.var(actual_aligned):.4f}, min={np.min(actual_aligned):.2f}, max={np.max(actual_aligned):.2f}")
logger.info(f"DEBUG - fitted_aligned stats: len={len(fitted_aligned)}, mean={np.mean(fitted_aligned):.2f}, var={np.var(fitted_aligned):.4f}")
```

This will show you the actual values being used for R² calculation.

### Step 5: Check the API Response

You can also check what the backend is actually returning:

**Method 1: Browser Developer Tools**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Retrain the model
4. Look for the `/api/model/retrain` request
5. Check the response - look for `accuracy_metrics.r2` and `test_accuracy_metrics.r2`

**Method 2: Direct API Call**
```bash
curl http://localhost:5000/api/model/accuracy
```

Look for:
```json
{
  "data": {
    "in_sample": {
      "r2": 0.8543  // or null if N/A
    },
    "out_of_sample": {
      "r2": 0.8234  // or null if N/A
    }
  }
}
```

## Quick Diagnostic Checklist

- [ ] Model has been retrained after latest code changes
- [ ] Checked `sarima_model.log` for R² calculation messages
- [ ] Verified data has variation (not all same values)
- [ ] Checked for NaN/Inf values in data
- [ ] Verified sufficient data points (at least 2 after cleaning)
- [ ] Checked API response includes R² values
- [ ] Checked browser console for any frontend errors

## Expected Behavior

After retraining with the latest code:

1. **If R² can be calculated:** You should see a numeric value between -∞ and 1.0
   - R² = 1.0: Perfect fit
   - R² > 0.8: Excellent model
   - R² > 0.6: Good model
   - R² < 0.4: Poor model
   - R² < 0: Model performs worse than predicting the mean

2. **If R² cannot be calculated:** The log will tell you exactly why:
   - Zero variance warning
   - NaN/Inf warning
   - Insufficient data warning
   - Exception traceback

## Most Common Issue

**90% of the time**, R² shows N/A because:
- The model was trained **before** the R² calculation code was fixed
- **Solution:** Simply **retrain the model** and it should work

## Still Having Issues?

If R² is still N/A after retraining and checking logs:

1. Share the relevant log messages from `sarima_model.log`
2. Check the API response to see what value is actually returned
3. Verify your data has sufficient variation (check min/max values)
4. Ensure you're using the optimized model (`sarima_model_optimized.py`)

