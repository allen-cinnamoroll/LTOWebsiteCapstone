# Accident Prediction API

Random Forest regression model for predicting monthly accident counts per barangay.

## 📁 Project Structure

```
accident_prediction/
├── data_loader.py          # MongoDB data loader and aggregator
├── train_rf_model.py       # Model training script
├── app.py                  # Flask API server
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend/model/ml_models/accident_prediction
pip install -r requirements.txt
```

### 2. Train the Model

First, train the Random Forest regression model:

```bash
python train_rf_model.py
```

This will:
- Connect to MongoDB and load accident data
- Aggregate monthly counts per barangay
- Create features (time-based, lag features, rolling statistics)
- Train a Random Forest regressor
- Save the model to `../trained/accident_rf_regression_model.pkl`
- Save encoders and metadata

**Expected Output:**
- Model files saved in `backend/model/ml_models/trained/`:
  - `accident_rf_regression_model.pkl` - Trained model
  - `municipality_encoder.pkl` - Municipality label encoder
  - `barangay_encoder.pkl` - Barangay label encoder
  - `accident_rf_feature_columns.pkl` - Feature column names
  - `accident_rf_regression_metadata.json` - Model metadata

### 3. Run the Flask API

```bash
python app.py
```

The API will start on `http://0.0.0.0:5004` (or port specified by `PORT` environment variable)

## 📡 API Endpoints

### 1. Health Check

**GET** `/api/accidents/health`

Check if the service is running and model is loaded.

**Response:**
```json
{
  "status": "ok",
  "model_loaded": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "model_info": {
    "model_type": "RandomForestRegressor",
    "training_date": "2024-01-10T08:00:00.000Z",
    "feature_count": 10
  }
}
```

### 2. Predict Single Barangay

**GET** `/api/accidents/predict/count`

Predict accident count for a specific month and barangay.

**Query Parameters:**
- `year` (int, required): Year (e.g., 2024)
- `month` (int, required): Month (1-12)
- `municipality` (string, required): Municipality name (e.g., "MATI (CAPITAL)")
- `barangay` (string, required): Barangay name (e.g., "DAWAN")

**Example:**
```bash
curl "http://localhost:5004/api/accidents/predict/count?year=2024&month=6&municipality=MATI%20(CAPITAL)&barangay=DAWAN"
```

**Response:**
```json
{
  "success": true,
  "prediction": 3.5,
  "year": 2024,
  "month": 6,
  "municipality": "MATI (CAPITAL)",
  "barangay": "DAWAN",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 3. Predict All Barangays

**GET** `/api/accidents/predict/all`

Predict accident counts for all barangays for a given month.

**Query Parameters:**
- `year` (int, required): Year
- `month` (int, required): Month (1-12)

**Example:**
```bash
curl "http://localhost:5004/api/accidents/predict/all?year=2024&month=6"
```

**Response:**
```json
{
  "success": true,
  "year": 2024,
  "month": 6,
  "predictions": [
    {
      "municipality": "MATI (CAPITAL)",
      "barangay": "DAWAN",
      "predicted_count": 3.5
    },
    {
      "municipality": "MATI (CAPITAL)",
      "barangay": "CENTRAL",
      "predicted_count": 2.1
    }
  ],
  "total_barangays": 150,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 4. Batch Prediction

**POST** `/api/accidents/predict/batch`

Predict accident counts for multiple barangays.

**Request Body:**
```json
{
  "year": 2024,
  "month": 6,
  "locations": [
    {"municipality": "MATI (CAPITAL)", "barangay": "DAWAN"},
    {"municipality": "MATI (CAPITAL)", "barangay": "CENTRAL"}
  ]
}
```

**Example:**
```bash
curl -X POST "http://localhost:5004/api/accidents/predict/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "year": 2024,
    "month": 6,
    "locations": [
      {"municipality": "MATI (CAPITAL)", "barangay": "DAWAN"}
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "year": 2024,
  "month": 6,
  "predictions": [
    {
      "municipality": "MATI (CAPITAL)",
      "barangay": "DAWAN",
      "predicted_count": 3.5
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🔧 Configuration

### MongoDB Connection

The data loader uses the MongoDB connection string from:
1. Environment variable `DATABASE`
2. Default: `mongodb://lto_user:jessa_allen_kent@72.60.198.244:27017/lto_website?authSource=lto_website`

To use a different database:
```bash
export DATABASE="mongodb://user:password@host:port/database?authSource=..."
```

### Model Parameters

Default Random Forest parameters (in `train_rf_model.py`):
- `n_estimators`: 100
- `max_depth`: 20
- `min_samples_split`: 5
- `min_samples_leaf`: 2

You can modify these in the `AccidentRFTrainer.train()` method.

## 📊 Model Features

The model uses the following features:

1. **Time Features:**
   - `year`: Year
   - `month`: Month (1-12)
   - `month_sin`: Sinusoidal encoding of month (seasonality)
   - `month_cos`: Cosine encoding of month (seasonality)
   - `year_normalized`: Normalized year

2. **Location Features:**
   - `municipality_encoded`: Encoded municipality name
   - `barangay_encoded`: Encoded barangay name

3. **Historical Features:**
   - `accident_count_lag1`: Previous month's accident count
   - `accident_count_rolling_mean_3`: 3-month rolling average
   - `accident_count_rolling_std_3`: 3-month rolling standard deviation

## 📈 Model Evaluation

After training, the model provides:
- **R² Score**: Coefficient of determination
- **RMSE**: Root Mean Squared Error
- **MAE**: Mean Absolute Error
- **Cross-Validation**: 5-fold CV R² score

## 🔄 Retraining

To retrain the model with new data:

```bash
python train_rf_model.py
```

The new model will overwrite the existing model files.

## 🐛 Troubleshooting

### Model Not Found Error

If you see "Model not found" error:
1. Make sure you've run `train_rf_model.py` first
2. Check that model files exist in `../trained/` directory
3. Verify file permissions

### MongoDB Connection Error

If connection fails:
1. Check MongoDB connection string
2. Verify network connectivity
3. Check authentication credentials
4. Ensure MongoDB is running

### Prediction Returns 0 or Negative Values

The model ensures predictions are non-negative. If you see unexpected values:
1. Check if the barangay/municipality exists in training data
2. Verify input parameters (year, month)
3. Check model metadata for training date range

## 📝 Notes

- Predictions are for **monthly accident counts** (regression, not classification)
- The model uses historical patterns to predict future counts
- Lag features require historical data; if unavailable, defaults to 0
- Barangays not in training data will use default encoding (may affect accuracy)

## 🔗 Integration

To integrate with the main backend:

1. Start the Flask API server
2. Call endpoints from your Node.js backend using `axios` or `fetch`
3. Example integration:

```javascript
const axios = require('axios');

async function getAccidentPrediction(year, month, municipality, barangay) {
  try {
    const response = await axios.get('http://localhost:5004/api/accidents/predict/count', {
      params: { year, month, municipality, barangay }
    });
    return response.data.prediction;
  } catch (error) {
    console.error('Prediction error:', error);
    return null;
  }
}
```

