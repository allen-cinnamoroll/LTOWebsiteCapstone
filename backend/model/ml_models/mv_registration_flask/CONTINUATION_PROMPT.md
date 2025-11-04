# Continuation Prompt for Next Chat Session

## Project Context

**Project**: Predictive Vehicle Registration using SARIMA (Backend-First Phase with Flask)
**Status**: ✅ System is working and deployed on Hostinger VPS
**Current Accuracy**: MAPE 29.81% (~70% accuracy) with 5 months of data
**Target Accuracy**: 90% accuracy (MAPE <10%) - requires 1.5-2 years of data

## What Has Been Accomplished

### ✅ Completed Features:

1. **Flask API Created** - Complete SARIMA prediction API

   - Location: `backend/model/ml_models/mv_registration_flask/`
   - Endpoints: `/api/predict/registrations`, `/api/model/accuracy`, `/api/model/retrain`, `/api/health`

2. **SARIMA Model Implementation**

   - Automatic parameter selection
   - Weekly to monthly aggregation
   - Model saving/loading

3. **Data Preprocessing**

   - Filters for Davao Oriental municipalities
   - Weekly aggregation
   - Handles sparse data (removes zero-filled weeks)
   - **NEW**: Automatically loads and combines multiple CSV files

4. **Per-Municipality Structure** (Ready but disabled)

   - Code structure complete
   - Feature flag: `ENABLE_PER_MUNICIPALITY = False` in `config.py`
   - Will enable when 6+ months of data per municipality

5. **Deployment on Hostinger VPS**
   - Running on port 5001
   - Model trained with 18 weeks (5 months) of data
   - Current MAPE: 29.81% (down from 108% with 1 month)

## Current System Status

### VPS Deployment:

- **Location**: `/var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask`
- **Port**: 5001 (5000 was in use)
- **Status**: ✅ Running and functional
- **Model**: Trained with 18 weeks of data (Feb-Jun 2025)

### Data Location:

- **CSV Directory**: `backend/model/ml_models/mv registration training/`
- **Current File**: `DAVOR_data.csv` (5,999 rows = 5 months)
- **Feature**: Automatically combines ALL CSV files in this directory

### Model Files:

- **Location**: `backend/model/ml_models/trained/`
- **Files**: `sarima_model.pkl`, `sarima_metadata.json`

## Key Files Created/Modified

1. **`app.py`** - Main Flask application
2. **`data_preprocessor.py`** - Data loading and processing (now auto-loads multiple CSVs)
3. **`sarima_model.py`** - SARIMA model implementation
4. **`config.py`** - Configuration (feature flags, thresholds)
5. **`requirements.txt`** - Python dependencies
6. **Documentation files** - Various guides in the directory

## How to Run on VPS

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
source venv/bin/activate
python3 app.py
```

**API URL**: `http://localhost:5001` or `http://72.60.198.244:5001`

## How to Add New Data

### Method: Automatic Multi-CSV Loading (Implemented)

1. **Add new CSV files** to:

   ```
   /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv registration training/
   ```

2. **Retrain model** (automatically combines all CSVs):
   ```bash
   curl -X POST http://localhost:5001/api/model/retrain \
     -H "Content-Type: application/json" \
     -d '{"force": true}'
   ```

The system will:

- Find all CSV files in the directory
- Load and combine them
- Remove duplicates automatically
- Retrain with all data

## Current Accuracy Metrics

- **MAPE**: 29.81% (~70% accuracy)
- **MAE**: 80.64 registrations
- **RMSE**: 109.66
- **Training Data**: 18 weeks (Feb 10 - Jun 30, 2025)
- **Average**: 331 registrations/week

## Next Steps to Reach 90% Accuracy

1. **Continue collecting weekly data** (most important)
2. **Add new CSV files monthly** to the training directory
3. **Retrain monthly** using the retrain endpoint
4. **Monitor accuracy** - should improve as more data is collected
5. **Target**: 1.5-2 years of data for 90% accuracy (MAPE <10%)

## Timeline to 90% Accuracy

- **Current (5 months)**: 70% accuracy (MAPE 29.81%)
- **6 months**: ~75% accuracy (MAPE ~25%)
- **12 months**: ~85% accuracy (MAPE ~15%)
- **18 months**: ~90% accuracy (MAPE ~10%) ✅
- **24 months**: ~92%+ accuracy (MAPE ~8%) ✅✅

## API Endpoints

1. **Predictions**: `GET /api/predict/registrations?weeks=4`
2. **Accuracy**: `GET /api/model/accuracy`
3. **Retrain**: `POST /api/model/retrain` (body: `{"force": true}`)
4. **Health**: `GET /api/health`

## Per-Municipality Feature

- **Status**: Code ready, but disabled (`ENABLE_PER_MUNICIPALITY = False`)
- **When to enable**: When you have 6+ months of data per municipality
- **How to enable**: Change `config.py`: `ENABLE_PER_MUNICIPALITY = True`
- **Minimum requirements**: 12 weeks, 10 avg registrations/week per municipality

## Important Notes

- **CSV files**: All CSV files in `mv registration training/` are automatically combined
- **Duplicate handling**: System automatically removes duplicates based on plateNo + dateOfRenewal
- **Data format**: All CSVs must have same column structure
- **Port**: Currently using 5001 (5000 was in use)
- **Model**: SARIMA(1,1,1)(1,1,1,4) - conservative parameters, will improve with more data

## Questions/Issues to Address in Next Session

1. Monitor accuracy improvements as more data is added
2. Consider enabling per-municipality models when data is sufficient
3. Production deployment considerations (Gunicorn, Nginx)
4. Frontend integration (Phase 2 - not yet started)
5. Any other improvements or optimizations needed

## Quick Reference Commands

```bash
# Start Flask
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
source venv/bin/activate
python3 app.py

# Test API
curl http://localhost:5001/api/health
curl http://localhost:5001/api/model/accuracy | python3 -m json.tool
curl http://localhost:5001/api/predict/registrations?weeks=4 | python3 -m json.tool

# Retrain model
curl -X POST http://localhost:5001/api/model/retrain \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

---

**Next Session**: Continue monitoring accuracy improvements, add new data, and work towards 90% accuracy target.
