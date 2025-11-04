# How to Enable Per-Municipality Predictions

## Quick Start Guide

When you have **6+ months of data per municipality**, follow these steps:

### Step 1: Update Configuration

Edit `config.py`:

```python
# Change this line:
ENABLE_PER_MUNICIPALITY = False

# To:
ENABLE_PER_MUNICIPALITY = True
```

### Step 2: Restart the Flask Application

The system will automatically:

- Train models for municipalities with sufficient data (≥12 weeks, ≥10 avg/week)
- Use aggregated model as fallback for municipalities with insufficient data
- Store each municipality model separately

### Step 3: Use Municipality-Specific Predictions

**Get predictions for a specific municipality:**

```bash
curl "http://localhost:5000/api/predict/registrations?weeks=4&municipality=CITY OF MATI"
```

**Get accuracy for a specific municipality:**

```bash
curl "http://localhost:5000/api/model/accuracy?municipality=CITY OF MATI"
```

**Get aggregated predictions (all municipalities):**

```bash
curl "http://localhost:5000/api/predict/registrations?weeks=4"
# (no municipality parameter = aggregated)
```

## Data Requirements

### Minimum Requirements Per Municipality:

- **12+ weeks** with actual registrations
- **10+ average registrations per week**

### What Happens:

✅ **Municipalities meeting requirements:**

- Get their own SARIMA model
- Accurate, municipality-specific predictions
- Separate accuracy metrics

⚠️ **Municipalities NOT meeting requirements:**

- Use aggregated model predictions (scaled proportionally)
- Still get predictions, but less accurate
- Will get their own models once data is sufficient

## Example Response

### Per-Municipality Prediction:

```json
{
  "success": true,
  "data": {
    "weekly_predictions": [...],
    "monthly_aggregation": {...},
    "model_used": "CITY OF MATI",
    "per_municipality_enabled": true
  }
}
```

### Aggregated Prediction (fallback):

```json
{
  "success": true,
  "data": {
    "weekly_predictions": [...],
    "monthly_aggregation": {...},
    "model_used": "aggregated",
    "per_municipality_enabled": true
  }
}
```

## Check Which Municipalities Have Models

When you restart the app, it will print which municipalities have models:

```
Training model for CITY OF MATI...
  - Weeks: 24
  - Avg/week: 45.2

Skipping BOSTON - Need 7 more weeks
  - Weeks: 5/12
  - Avg/week: 3.2/10
```

## Retraining

To retrain all models (including municipality models):

```bash
curl -X POST http://localhost:5000/api/model/retrain \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

To retrain a specific municipality:

```bash
curl -X POST http://localhost:5000/api/model/retrain \
  -H "Content-Type: application/json" \
  -d '{"force": true, "municipality": "CITY OF MATI"}'
```

## Current Status

- ✅ Code structure ready
- ✅ Automatic data sufficiency checking
- ✅ Per-municipality model training
- ✅ Smart fallback to aggregated model
- ⚠️ **Disabled by default** (waiting for more data)

## When to Enable

| Data Available | Recommendation                               |
| -------------- | -------------------------------------------- |
| **< 6 months** | Keep disabled (current)                      |
| **6 months**   | Enable for municipalities meeting thresholds |
| **1 year**     | Enable for most municipalities               |
| **2 years**    | All municipalities should have models        |

## Notes

- Models are stored separately: `sarima_model_CITY_OF_MATI.pkl`
- Each municipality model is independent
- You can have some municipalities with models, others without
- System automatically routes to appropriate model

