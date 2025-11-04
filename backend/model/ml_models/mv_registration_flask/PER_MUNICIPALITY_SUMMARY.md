# Per-Municipality Prediction Code Structure - Summary

## ✅ What's Been Implemented

I've prepared the complete code structure for per-municipality predictions. Here's what's ready:

### 1. Configuration System (`config.py`)

- ✅ Feature flag: `ENABLE_PER_MUNICIPALITY = False` (disabled by default)
- ✅ Minimum data thresholds:
  - `MIN_WEEKS_FOR_MUNICIPALITY_MODEL = 12` weeks
  - `MIN_AVG_REGISTRATIONS_PER_WEEK = 10` registrations
- ✅ Municipality list in one place

### 2. Enhanced Data Preprocessor (`data_preprocessor.py`)

- ✅ `load_and_process_data_by_municipality()` - Loads data per municipality
- ✅ `check_municipality_data_sufficiency()` - Validates if municipality has enough data
- ✅ Automatic filtering and validation

### 3. Enhanced SARIMA Model (`sarima_model.py`)

- ✅ Supports municipality parameter in constructor
- ✅ Separate model files per municipality: `sarima_model_CITY_OF_MATI.pkl`
- ✅ Works with both aggregated and per-municipality modes

### 4. Enhanced Flask App (`app.py`)

- ✅ Manages both aggregated and per-municipality models
- ✅ Smart model selection (uses municipality model if available, otherwise aggregated)
- ✅ Automatic fallback to aggregated model for municipalities with insufficient data
- ✅ Enhanced endpoints support municipality parameter

## 🔧 Current Status

**Mode**: Disabled (Default)

- System uses aggregated model only
- No per-municipality models trained
- All predictions use aggregated data

**To Enable**: Change one line in `config.py`

```python
ENABLE_PER_MUNICIPALITY = True
```

## 📋 How It Works (When Enabled)

### On Startup:

1. Always trains/loads aggregated model
2. If `ENABLE_PER_MUNICIPALITY = True`:
   - Loads data for each municipality
   - Checks data sufficiency (≥12 weeks, ≥10 avg/week)
   - Trains models only for municipalities meeting criteria
   - Stores models separately
   - Skips municipalities with insufficient data (uses aggregated as fallback)

### On Prediction Request:

```
GET /api/predict/registrations?weeks=4&municipality=CITY OF MATI
```

**Logic:**

- If municipality has model → use it
- If not → use aggregated model
- Response includes `model_used` field

### On Accuracy Request:

```
GET /api/model/accuracy?municipality=CITY OF MATI
```

**Returns:** Accuracy metrics for that municipality's model (if exists)

## 🎯 API Endpoints (Enhanced)

### 1. Predictions

```bash
# Aggregated (all municipalities)
curl "http://localhost:5000/api/predict/registrations?weeks=4"

# Per-municipality (when enabled)
curl "http://localhost:5000/api/predict/registrations?weeks=4&municipality=CITY OF MATI"
```

**Response includes:**

- `model_used`: "CITY OF MATI" or "aggregated"
- `per_municipality_enabled`: true/false

### 2. Accuracy

```bash
# Aggregated
curl "http://localhost:5000/api/model/accuracy"

# Per-municipality
curl "http://localhost:5000/api/model/accuracy?municipality=CITY OF MATI"
```

### 3. Retrain

```bash
# Retrain all models
curl -X POST "http://localhost:5000/api/model/retrain" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'

# Retrain specific municipality
curl -X POST "http://localhost:5000/api/model/retrain" \
  -H "Content-Type: application/json" \
  -d '{"force": true, "municipality": "CITY OF MATI"}'
```

### 4. Health Check

```bash
curl "http://localhost:5000/api/health"
```

**Returns:**

- `per_municipality_enabled`: true/false
- `municipality_models_count`: Number of municipality models trained
- `available_municipality_models`: List of municipalities with models

## 📁 Model Storage Structure

```
trained/
├── sarima_model.pkl              # Aggregated model (always)
├── sarima_metadata.json          # Aggregated metadata
├── sarima_model_CITY_OF_MATI.pkl    # Per-municipality (when enabled)
├── sarima_metadata_CITY_OF_MATI.json
├── sarima_model_LUPON.pkl
├── sarima_metadata_LUPON.json
└── ...
```

## 🚀 When to Enable

| Your Data         | Action                                 |
| ----------------- | -------------------------------------- |
| **Now (1 month)** | Keep `ENABLE_PER_MUNICIPALITY = False` |
| **6 months**      | Set `ENABLE_PER_MUNICIPALITY = True`   |
| **2 years**       | Set `ENABLE_PER_MUNICIPALITY = True`   |

## ✅ Benefits of This Structure

1. **Zero Breaking Changes**: Current system works exactly as before
2. **Easy Activation**: One config change when ready
3. **Automatic Handling**: System checks data sufficiency automatically
4. **Smart Fallback**: Uses aggregated model for insufficient municipalities
5. **Future-Proof**: Ready for when you have 2 years of data

## 🔍 Testing

Even with current limited data, you can test the structure:

1. Check which municipalities would qualify:

```python
# Add this to test (temporary)
municipalities_data = preprocessor.load_and_process_data_by_municipality()
for mun, data in municipalities_data.items():
    sufficiency = preprocessor.check_municipality_data_sufficiency(data)
    print(f"{mun}: {sufficiency}")
```

2. See what happens with insufficient data:

- System will skip municipalities
- Will show why they were skipped
- Predictions will use aggregated model

## 📝 Next Steps

1. **Now**: Keep collecting data, system works as-is
2. **When you have 6+ months**:
   - Change `ENABLE_PER_MUNICIPALITY = True` in `config.py`
   - Restart Flask app
   - System automatically trains municipality models
3. **When you have 2 years**:
   - All municipalities should have models
   - High accuracy per-municipality predictions

## 🎉 Summary

✅ **Code structure is complete and ready**
✅ **No changes to current functionality**
✅ **One-line activation when you have more data**
✅ **Automatic data validation and model selection**
✅ **Smart fallback for insufficient data**

The system is **future-ready** and will scale automatically when you have sufficient data!
