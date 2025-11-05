# SARIMA Model Optimization Guide

## Overview

This guide documents the optimized SARIMA model implementation with all enhancements for improved accuracy and stability.

## Key Improvements

### 1. Daily Data Processing ✅

**Previous**: Weekly aggregated data (s=4 for monthly seasonality)  
**Optimized**: Daily data with complete date range (s=7 for weekly seasonality)

**Implementation**: `data_preprocessor_daily.py`

**Features:**
- Processes daily vehicle registration data
- Fills missing days (weekends/holidays) with 0 or forward-filled values
- Creates complete date range from min to max date
- Sets DateTime index properly sorted

**Code Reference:**
```python
# Location: data_preprocessor_daily.py, lines 105-155
daily_data = df_filtered.groupby('dateOfRenewal_parsed').agg({'plateNo': 'count'})
complete_date_range = pd.date_range(start=min_date, end=max_date, freq='D')
daily_data = daily_data.reindex(complete_date_range)
daily_data['count'] = daily_data['count'].fillna(0)  # Fill missing days
```

### 2. Seasonal Period (s=7) ✅

**Previous**: s=4 (monthly patterns in weekly data)  
**Optimized**: s=7 (weekly seasonality in daily data)

**Rationale:**
- Daily data shows clear weekly patterns (weekdays vs weekends)
- s=7 captures the 7-day weekly cycle
- Better captures business-day patterns

**Implementation:**
```python
# Location: sarima_model_optimized.py, line 127
seasonal_period=7  # Weekly seasonality for daily data
```

### 3. Stationarity and Differencing ✅

**Implementation**: `check_stationarity()` method

**Process:**
1. Performs Augmented Dickey-Fuller (ADF) test
2. Auto-detects differencing needs (d and D)
3. Uses auto_arima which automatically determines d and D

**Code Reference:**
```python
# Location: sarima_model_optimized.py, lines 89-115
is_stationary, adf_info = self.check_stationarity(series)
# auto_arima handles differencing automatically with d=None, D=None
```

### 4. Auto Parameter Optimization ✅

**Implementation**: `find_optimal_parameters_auto()` using `pmdarima.auto_arima()`

**Features:**
- Automatic parameter search
- Uses AIC for model selection
- Cross-validation within auto_arima
- Handles exogenous variables

**Configuration:**
```python
# Location: sarima_model_optimized.py, lines 130-170
auto_model = pm.auto_arima(
    series,
    exogenous=exogenous,
    start_p=0, max_p=3,
    start_q=0, max_q=3,
    d=None, D=None,  # Auto-detect
    seasonal=True,
    m=7,  # Weekly seasonality
    stepwise=True,
    information_criterion='aic',
    n_fits=50
)
```

**Output:**
- Optimal (p, d, q, P, D, Q, s) parameters
- AIC and BIC values
- Model selection rationale

### 5. Exogenous Variables ✅

**Implementation**: `_create_exogenous_variables()` in `data_preprocessor_daily.py`

**Variables Created:**
1. **is_weekend**: Binary (1 = Saturday/Sunday, 0 = weekday)
2. **is_holiday**: Binary (1 = Philippine holiday, 0 = not holiday)
3. **is_weekend_or_holiday**: Combined indicator (1 = weekend or holiday, 0 = otherwise)
4. **day_of_week**: 0-6 (Monday-Sunday)
5. **month**: 1-12 (for seasonal patterns)

**Usage:**
```python
# Location: train_optimized_model.py, line 45
exogenous=exogenous_vars[['is_weekend_or_holiday']]  # Use combined indicator
```

**Holiday Calendar:**
- Uses `holidays.Philippines()` library
- Automatically detects Philippine national holidays
- Updates annually

### 6. Model Training and Testing ✅

**Split Method**: 80-20 chronological split

**Implementation:**
```python
# Location: sarima_model_optimized.py, lines 285-300
split_idx = int(len(series) * 0.8)
train_series = series.iloc[:split_idx]  # First 80%
test_series = series.iloc[split_idx:]   # Last 20%
```

**Key Points:**
- No shuffling (maintains temporal order)
- Test set represents most recent 20% of days
- Ensures predictions are truly out-of-sample

### 7. Enhanced Model Evaluation ✅

**Metrics Implemented:**
1. **MAE** (Mean Absolute Error)
2. **RMSE** (Root Mean Square Error)
3. **MAPE** (Mean Absolute Percentage Error)
4. **R²** (Coefficient of Determination) - NEW

**Implementation:**
```python
# Location: sarima_model_optimized.py, lines 390-420
mae = mean_absolute_error(actual, predicted)
rmse = np.sqrt(mean_squared_error(actual, predicted))
mape = np.mean(np.abs((actual - predicted) / actual)) * 100
r2 = r2_score(actual, predicted)  # NEW METRIC
```

**R² Interpretation:**
- R² = 1.0: Perfect predictions
- R² > 0.8: Excellent model
- R² > 0.6: Good model
- R² < 0.4: Poor model

### 8. Forecast and Confidence Intervals ✅

**Implementation**: `predict()` method

**Features:**
- Generates 30-day forecasts (configurable)
- 95% confidence intervals
- Daily, weekly, and monthly aggregations
- Handles normalization inverse transformation

**Code:**
```python
# Location: sarima_model_optimized.py, lines 650-720
forecast_result = self.fitted_model.get_forecast(steps=days, exog=exogenous)
forecast = forecast_result.predicted_mean
forecast_ci = forecast_result.conf_int()  # 95% CI
```

**Visualization:**
- Use `visualize_forecasts.py` to create plots
- Shows historical data, forecast, and confidence bands

### 9. Cross-Validation ✅

**Implementation**: TimeSeriesSplit (walk-forward validation)

**Method**: `_perform_cross_validation()`

**Process:**
1. Splits data into n folds chronologically
2. For each fold:
   - Train on earlier data
   - Test on later data
   - Calculate MAPE
3. Reports mean and std MAPE across folds

**Configuration:**
```python
# Location: sarima_model_optimized.py, lines 540-600
tscv = TimeSeriesSplit(n_splits=3)  # 3-fold CV
```

**Output:**
- Mean MAPE across folds
- Standard deviation of MAPE
- Fold-by-fold results

### 10. Normalization (Optional) ✅

**Implementation**: `apply_normalization()` and `inverse_normalize()`

**Options:**
- **MinMaxScaler**: Scales to [0, 1] range
- **StandardScaler**: Standardizes to mean=0, std=1

**Usage:**
```python
# Initialize model with normalization
model = OptimizedSARIMAModel(
    model_dir=model_dir,
    use_normalization=True,  # Enable normalization
    scaler_type='minmax'     # or 'standard'
)
```

**Note**: Normalization is optional. Current implementation defaults to `False`.

### 11. Model Retraining and Saving ✅

**Saving:**
- Model: Pickle file (`.pkl`)
- Metadata: JSON file (`.json`)
- Scaler: Pickle file (if normalization used)

**Loading:**
- Automatically loads model, metadata, and scaler
- Restores all parameters and metrics

**Retraining:**
```python
# Via API endpoint
POST /api/model/retrain/optimized
Body: {"force": true}
```

### 12. Comprehensive Documentation ✅

**Logging:**
- All steps logged to `sarima_model.log`
- Console output for real-time monitoring
- Structured logging with timestamps

**Model Summary:**
```python
model.print_model_summary()
# Prints: parameters, metrics, diagnostics, CV results
```

## Usage

### Training the Optimized Model

```bash
cd backend/model/ml_models/mv_registration_flask
python train_optimized_model.py
```

### Using the API

```bash
# Start optimized API server
python app_optimized.py

# Get predictions
curl http://localhost:5002/api/predict/registrations/optimized?days=30

# Get accuracy metrics
curl http://localhost:5002/api/model/accuracy/optimized

# Retrain model
curl -X POST http://localhost:5002/api/model/retrain/optimized \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

## Expected Performance Improvements

### Current Performance (Weekly Model):
- MAPE: ~28-29%
- Accuracy: ~71-72%

### Expected Performance (Optimized Daily Model):
- **Target**: MAPE < 15% (85%+ accuracy)
- **Improvements from**:
  - Daily granularity (more data points)
  - Weekly seasonality (s=7 captures patterns better)
  - Exogenous variables (accounts for weekends/holidays)
  - Auto parameter optimization (better model fit)
  - Cross-validation (more robust model selection)

## File Structure

```
backend/model/ml_models/mv_registration_flask/
├── data_preprocessor_daily.py      # Daily data preprocessing
├── sarima_model_optimized.py        # Optimized SARIMA model
├── train_optimized_model.py        # Training script
├── app_optimized.py                 # Optimized API server
├── visualize_forecasts.py           # Visualization utilities
├── requirements.txt                 # Updated dependencies
└── OPTIMIZATION_GUIDE.md           # This file
```

## Dependencies

**New Dependencies Added:**
- `pmdarima>=2.0.0`: Auto ARIMA
- `holidays>=0.34`: Holiday calendar
- `scikit-learn>=1.3.0`: Cross-validation, metrics, scalers
- `matplotlib>=3.7.0`: Visualization

**Installation:**
```bash
pip install -r requirements.txt
```

## Migration Notes

### From Weekly to Daily Model

**Changes Required:**
1. Use `DailyDataPreprocessor` instead of `DataPreprocessor`
2. Use `OptimizedSARIMAModel` instead of `SARIMAModel`
3. Update API endpoints (new `/optimized` endpoints)
4. Expect daily predictions instead of weekly

**Backward Compatibility:**
- Original weekly model still available
- Can run both models in parallel
- Different API endpoints for each

## Performance Comparison

| Metric | Weekly Model | Optimized Daily Model (Expected) |
|--------|--------------|----------------------------------|
| Data Granularity | Weekly | Daily |
| Seasonal Period | s=4 (monthly) | s=7 (weekly) |
| Parameters | Manual/Grid Search | Auto (pmdarima) |
| Exogenous Vars | None | Weekends/Holidays |
| Cross-Validation | None | TimeSeriesSplit |
| Normalization | None | Optional |
| MAPE | ~28-29% | <15% (target) |
| Accuracy | ~71-72% | >85% (target) |

## Troubleshooting

### Issue: Auto ARIMA takes too long
**Solution**: Reduce `n_fits` parameter or use `stepwise=True` (already enabled)

### Issue: Memory errors with large datasets
**Solution**: Enable normalization or process data in chunks

### Issue: Predictions have negative values
**Solution**: Already handled with `max(0, value)` in prediction code

### Issue: Missing holidays
**Solution**: `holidays` library may need updates. Check `holidays.Philippines()` coverage.

## Next Steps

1. **Train the optimized model**: Run `train_optimized_model.py`
2. **Evaluate performance**: Compare metrics with original model
3. **Integrate with frontend**: Update API calls to use optimized endpoints
4. **Monitor and retrain**: Retrain periodically as new data arrives

