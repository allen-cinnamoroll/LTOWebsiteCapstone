# How to Integrate Optimized Model into Your Existing App

## Option 1: Quick Integration - Add Toggle to Existing App

Add this to the top of `app.py`:

```python
# Add this near the top of app.py
USE_OPTIMIZED_MODEL = True  # Set to False to use original model

if USE_OPTIMIZED_MODEL:
    from sarima_model_optimized import OptimizedSARIMAModel as SARIMAModel
    from data_preprocessor_daily import DailyDataPreprocessor as DataPreprocessor
else:
    from sarima_model import SARIMAModel
    from data_preprocessor import DataPreprocessor
```

Then update the `initialize_model()` function:

```python
def initialize_model():
    """Initialize the SARIMA model(s) and preprocessor"""
    global aggregated_model, municipality_models, preprocessor
    
    # ... existing path setup code ...
    
    if USE_OPTIMIZED_MODEL:
        # Use optimized daily model
        preprocessor = DailyDataPreprocessor(csv_path)
        aggregated_model = OptimizedSARIMAModel(model_dir, municipality=None)
        
        if aggregated_model.model_exists():
            aggregated_model.load_model()
        else:
            # Load daily data and train
            daily_data, exogenous_vars, _ = preprocessor.load_and_process_daily_data()
            aggregated_model.train(
                data=daily_data,
                exogenous=exogenous_vars[['is_weekend_or_holiday']]
            )
    else:
        # Use original weekly model (existing code)
        preprocessor = DataPreprocessor(csv_path)
        aggregated_model = SARIMAModel(model_dir, municipality=None)
        # ... rest of original code ...
```

## Option 2: Add New Endpoint (Keep Both Models)

Add this to `app.py` to have both models available:

```python
# Add optimized model initialization
optimized_model = None

def initialize_optimized_model():
    """Initialize optimized model separately"""
    global optimized_model
    # ... same as Option 1 initialization ...

# Add new endpoint
@app.route('/api/predict/registrations/optimized', methods=['GET'])
def predict_optimized():
    """Get predictions from optimized model"""
    days = request.args.get('days', default=30, type=int)
    
    if optimized_model is None:
        return jsonify({'error': 'Model not initialized'}), 500
    
    predictions = optimized_model.predict(days=days)
    return jsonify({'success': True, 'data': predictions})
```

## Option 3: Replace Entirely (Recommended for Production)

Replace the imports in `app.py`:

```python
# OLD:
from sarima_model import SARIMAModel
from data_preprocessor import DataPreprocessor

# NEW:
from sarima_model_optimized import OptimizedSARIMAModel as SARIMAModel
from data_preprocessor_daily import DailyDataPreprocessor as DataPreprocessor
```

Update `initialize_model()`:

```python
def initialize_model():
    global aggregated_model, preprocessor
    
    # ... path setup ...
    
    preprocessor = DataPreprocessor(csv_path)
    aggregated_model = SARIMAModel(model_dir, municipality=None)
    
    if aggregated_model.model_exists():
        aggregated_model.load_model()
    else:
        # Load daily data
        daily_data, exogenous_vars, _ = preprocessor.load_and_process_daily_data(
            fill_missing_days=True,
            fill_method='zero'
        )
        
        # Train with exogenous variables
        aggregated_model.train(
            data=daily_data,
            exogenous=exogenous_vars[['is_weekend_or_holiday']]
        )
```

Update prediction endpoint:

```python
@app.route('/api/predict/registrations', methods=['GET'])
def predict_registrations():
    # Change from 'weeks' to 'days'
    days = request.args.get('days', default=30, type=int)
    
    predictions = aggregated_model.predict(days=days)
    
    # Response format is already compatible
    return jsonify({'success': True, 'data': predictions})
```

## Frontend Integration

If your frontend calls the API, update the endpoint:

**Before:**
```javascript
fetch('/api/predict/registrations?weeks=12')
```

**After:**
```javascript
fetch('/api/predict/registrations/optimized?days=30')
// Or if you replaced the endpoint:
fetch('/api/predict/registrations?days=30')
```

## Testing the Integration

1. **Test the model:**
   ```bash
   python EXAMPLE_USAGE.py
   ```

2. **Start the app:**
   ```bash
   python app.py
   ```

3. **Test the API:**
   ```bash
   curl http://localhost:5000/api/predict/registrations?days=30
   ```

## What Changes in Your Frontend?

The response format is similar but with more detail:

**Before (Weekly):**
```json
{
  "weekly_predictions": [
    {"week": "2025-08-04", "predicted": 45}
  ]
}
```

**After (Optimized Daily):**
```json
{
  "daily_predictions": [
    {"date": "2025-08-04", "predicted_count": 8}
  ],
  "weekly_predictions": [
    {"week_start": "2025-08-04", "total_predicted": 52}
  ]
}
```

You can still use `weekly_predictions` if your frontend expects weekly data!

## Quick Checklist

- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Train model: `python train_optimized_model.py`
- [ ] Choose integration option (1, 2, or 3)
- [ ] Update `app.py` with chosen option
- [ ] Test: `python app.py`
- [ ] Update frontend if needed
- [ ] Deploy!

## Need Help?

- Check `sarima_model.log` for errors
- Run `python test_optimized_model.py` to test
- See `HOW_TO_USE_OPTIMIZED_MODEL.md` for more details

