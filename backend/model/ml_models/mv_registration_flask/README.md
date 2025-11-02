# Vehicle Registration Prediction API - SARIMA Model

## Overview

This Flask API provides vehicle registration volume predictions for the municipality of Davao Oriental using the Seasonal ARIMA (SARIMA) time series forecasting algorithm. The system is designed to generate weekly forecasts that are aggregated into monthly predictions.

## Current Data Status

**Dataset**: 3 months of vehicle registration data (limited dataset)

- **Location**: `backend/model/ml_models/mv registration training/DAVOR_data.csv`
- **Note**: This is a small dataset for initial model training. The system is designed to improve as more data is collected (target: ~2 years for optimal performance).

## API Endpoints

### 1. GET `/api/predict/registrations`

Get vehicle registration predictions for Davao Oriental.

**Query Parameters:**

- `weeks` (int, optional): Number of weeks to predict (default: 4, max: 52)
- `municipality` (str, optional): Specific municipality (currently not implemented, reserved for future use)

**Response:**

```json
{
  "success": true,
  "data": {
    "weekly_predictions": [
      {
        "date": "2025-03-02",
        "week": 10,
        "predicted_count": 150,
        "lower_bound": 120,
        "upper_bound": 180
      },
      ...
    ],
    "monthly_aggregation": {
      "total_predicted": 600,
      "lower_bound": 480,
      "upper_bound": 720
    },
    "prediction_dates": ["2025-03-02", "2025-03-09", ...],
    "prediction_weeks": 4,
    "last_training_date": "2025-02-25",
    "prediction_start_date": "2025-03-02"
  }
}
```

**Example:**

```bash
curl http://localhost:5000/api/predict/registrations?weeks=4
```

### 2. GET `/api/model/accuracy`

Get model accuracy metrics and performance information.

**Response:**

```json
{
  "success": true,
  "data": {
    "mae": 12.5,
    "rmse": 15.3,
    "mape": 8.2,
    "mean_actual": 145.0,
    "std_actual": 25.5,
    "model_parameters": {
      "order": [1, 1, 1],
      "seasonal_order": [1, 1, 1, 4],
      "full_params": [1, 1, 1, 1, 1, 1, 4]
    },
    "last_trained": "2025-02-25"
  }
}
```

**Example:**

```bash
curl http://localhost:5000/api/model/accuracy
```

### 3. POST `/api/model/retrain`

Retrain the SARIMA model with updated data.

**Request Body (optional):**

```json
{
  "force": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "Model retrained successfully",
  "data": {
    "model_params": {...},
    "training_weeks": 12,
    "date_range": {
      "start": "2024-11-01",
      "end": "2025-02-25"
    },
    "accuracy_metrics": {...},
    "aic": 245.6,
    "bic": 252.3
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:5000/api/model/retrain \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

### 4. GET `/api/health`

Health check endpoint.

**Response:**

```json
{
  "success": true,
  "status": "healthy",
  "model_initialized": true,
  "model_trained": true,
  "timestamp": "2025-02-25T10:30:00"
}
```

### 5. GET `/`

API information and endpoint list.

## Installation & Setup

### 1. Navigate to the Flask App Directory

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
```

### 2. Create Python Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

## Running the Flask Application

### Development Mode (Hostinger VPS)

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
source venv/bin/activate
python3 app.py
```

The API will be available at: `http://localhost:5000` or `http://YOUR_VPS_IP:5000`

### Production Mode (Using Gunicorn - Recommended)

For production deployment, use Gunicorn:

```bash
# Install Gunicorn
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Running in Background (using nohup)

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
source venv/bin/activate
nohup python3 app.py > flask_api.log 2>&1 &
```

### Running with PM2 (Alternative)

```bash
# Install PM2 globally if not already installed
npm install -g pm2

# Create PM2 ecosystem file or add to existing ecosystem.config.js
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
source venv/bin/activate

# Run with PM2
pm2 start app.py --name "registration-prediction-api" --interpreter python3
pm2 save
```

## Data Preprocessing

The system processes the CSV data through the following steps:

1. **Loading**: Reads the CSV file from `mv registration training/DAVOR_data.csv`
2. **Filtering**: Filters for Davao Oriental municipalities only
3. **Date Parsing**: Parses `dateOfRenewal` field (format: MM/DD/YYYY)
4. **Weekly Aggregation**: Groups registrations by week (starting on Sunday)
5. **Time Series Creation**: Creates a continuous weekly time series

### Municipality Filtering

The system automatically filters for these Davao Oriental municipalities:

- BAGANGA
- BANAYBANAY
- BOSTON
- CARAGA
- CATEEL
- GOVERNOR GENEROSO
- LUPON
- MANAY
- SAN ISIDRO
- TARRAGONA
- CITY OF MATI

## SARIMA Model Parameters

### Parameter Selection

The model uses automatic parameter selection with a grid search approach. For the current 3-month dataset, the system uses conservative parameters suitable for limited data:

- **ARIMA Parameters (p, d, q)**: Determined based on stationarity tests and AIC minimization
- **Seasonal Parameters (P, D, Q, s)**:
  - `s = 4`: Weekly data with 4-week seasonal cycle
  - `P, D, Q`: Optimized through grid search

### Parameter Tuning Process

1. **Stationarity Test**: Uses Augmented Dickey-Fuller (ADF) test
2. **Grid Search**: Tests multiple parameter combinations
3. **Model Selection**: Chooses parameters with lowest AIC (Akaike Information Criterion)

### Default Parameters (Small Dataset)

For datasets with less than 20 weeks:

- **Order**: (1, 1, 1) - ARIMA(1,1,1)
- **Seasonal Order**: (1, 1, 1, 4) - 4-week seasonal cycle

## Model Accuracy Metrics

The model provides the following accuracy metrics:

1. **MAE (Mean Absolute Error)**: Average absolute difference between predicted and actual values
2. **RMSE (Root Mean Squared Error)**: Square root of average squared differences
3. **MAPE (Mean Absolute Percentage Error)**: Percentage-based accuracy metric

These metrics are calculated on in-sample predictions (training data).

## Weekly to Monthly Aggregation

The system generates weekly predictions and automatically aggregates them into monthly totals:

- Weekly predictions are summed to get the monthly total
- Confidence intervals are also aggregated accordingly

## Model Training & Retraining

### Initial Training

When the Flask app starts for the first time:

1. Checks if a trained model exists
2. If not, automatically loads and processes data
3. Trains the SARIMA model
4. Saves the model for future use

### Retraining

To retrain with new data:

1. Update the CSV file with new registration data
2. Call the `/api/model/retrain` endpoint with `{"force": true}`
3. The model will be retrained with all available data

## File Structure

```
mv_registration_flask/
├── app.py                 # Main Flask application
├── data_preprocessor.py   # Data loading and preprocessing
├── sarima_model.py        # SARIMA model implementation
├── requirements.txt       # Python dependencies
├── README.md             # This file
└── venv/                 # Virtual environment (created during setup)
```

## Model Storage

Trained models are saved in:

```
backend/model/ml_models/trained/
├── sarima_model.pkl      # Pickled SARIMA model
└── sarima_metadata.json  # Model metadata and parameters
```

## Troubleshooting

### Model Not Training

- Check if CSV file exists at the correct path
- Verify CSV has valid `dateOfRenewal` column
- Ensure data contains Davao Oriental municipalities

### Prediction Errors

- Verify model has been trained (check `/api/health`)
- Ensure sufficient training data (minimum 4 weeks recommended)
- Check model files exist in `trained/` directory

### Port Already in Use

If port 5000 is in use:

```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or change port in app.py
```

## Future Improvements

As more data becomes available:

1. Extend prediction horizon (currently: 1 month, target: 3-12 months)
2. Municipality-specific predictions
3. Additional seasonality patterns (yearly cycles)
4. Model ensemble approaches
5. Real-time data integration from MongoDB

## Notes on Limited Data

With only 3 months of data:

- Predictions are best for short-term forecasts (1 month)
- Model parameters are conservative to avoid overfitting
- Accuracy will improve as more historical data is collected
- Target: ~2 years of data for optimal performance

## Deployment Commands Summary (Hostinger VPS)

```bash
# 1. Navigate to directory
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask

# 2. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run Flask application
python3 app.py

# OR run in background with nohup
nohup python3 app.py > flask_api.log 2>&1 &

# OR run with Gunicorn (production)
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## API Testing Examples

```bash
# Get predictions for 4 weeks
curl http://localhost:5000/api/predict/registrations?weeks=4

# Get model accuracy
curl http://localhost:5000/api/model/accuracy

# Retrain model
curl -X POST http://localhost:5000/api/model/retrain \
  -H "Content-Type: application/json" \
  -d '{"force": true}'

# Health check
curl http://localhost:5000/api/health
```

## Support

For issues or questions, check the logs:

- Flask application logs: `flask_api.log` (if using nohup)
- Check console output when running directly
