# Accident Analytics Flask API

Flask-based API service for accident analytics and risk prediction. This service loads trained machine learning models from the `training` folder and exposes endpoints for accident severity prediction, risk assessment, and forecasting.

## 📁 Project Structure

```
accident_analytics/
├── app.py                      # Main Flask application
├── inference_preprocessor.py   # Data preprocessing for inference
├── requirements.txt            # Python dependencies
└── README.md                   # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend/model/ml_models/accident_analytics
pip install -r requirements.txt
```

### 2. Ensure Models Are Trained

Make sure the trained models exist in `backend/model/ml_models/trained/`:
- `accident_rf_model.pkl` - Random Forest model
- `accident_rule_system.pkl` - Rule-based system
- `feature_encoders.pkl` - Label encoders
- `scaler.pkl` - Standard scaler
- `feature_columns.pkl` - Feature columns list
- `model_metadata.json` - Model metadata

To train the models:
```bash
cd backend/model/ml_models/training
python train_models.py
```

### 3. Run the Flask API

```bash
python app.py
```

The API will start on `http://0.0.0.0:5003`

## 📡 API Endpoints

### 1. Health Check

**GET** `/api/accidents/health`

Check if the service is running and models are loaded.

**Response:**
```json
{
  "status": "ok",
  "model_loaded": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "model_info": {
    "model_type": "RandomForestClassifier",
    "training_date": "2024-01-10T08:00:00.000Z",
    "feature_count": 15
  }
}
```

### 2. Predict Accident Severity/Risk

**POST** `/api/accidents/predict`

Predict accident severity and risk level for a given accident record.

**Request Body:**
```json
{
  "incidentType": "Traffic Accident",
  "municipality": "Mati",
  "barangay": "Poblacion",
  "street": "Rizal Street",
  "stageOfFelony": "Unknown",
  "province": "Davao Oriental",
  "region": "Region XI",
  "lat": 6.95,
  "lng": 126.20,
  "dateCommited": "2024-01-15T10:30:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "prediction": {
    "severity_index": 0.82,
    "risk_level": "High",
    "predicted_offense_type": "Crimes Against Persons",
    "predicted_class": 1,
    "confidence": 0.82,
    "probabilities": {
      "Crimes Against Persons": 0.82,
      "Crimes Against Property": 0.18
    }
  },
  "prescriptive_actions": [
    "Deploy traffic enforcers at identified hotspots during peak hours (7-9 AM, 5-7 PM)",
    "Establish sobriety checkpoints during weekends and evenings",
    "Install traffic lights at high-risk intersections"
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 3. Forecast Accidents (Placeholder)

**GET** `/api/accidents/forecast?months=6&municipality=Mati`

Forecast accident counts for the next N months.

**Query Parameters:**
- `months` (int, optional): Number of months to forecast (1-24). Default: 6
- `municipality` (string, optional): Filter by municipality

**Response:**
```json
{
  "success": true,
  "forecast": [
    {
      "period": "2024-02",
      "predicted_accidents": null,
      "note": "Forecasting requires time-series model implementation"
    }
  ],
  "municipality": "Mati",
  "note": "This is a placeholder endpoint. Implement time-series forecasting model for actual predictions.",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Note:** The forecast endpoint is a placeholder. To implement actual forecasting, you would need:
- Historical accident data aggregated by time period
- A time-series forecasting model (ARIMA, SARIMA, Prophet, etc.)
- Municipality-specific models if filtering by municipality

## 🔧 Model Details

### Features

The model uses the following features:

**Categorical Features:**
- `incidentType` - Type of incident
- `municipality` - Municipality name
- `barangay` - Barangay name
- `street` - Street name
- `stageOfFelony` - Stage of felony
- `province` - Province name
- `region` - Region name
- `road_type` - Derived from street name (highway, avenue, street, road, purok, other)

**Numerical Features:**
- `lat` - Latitude
- `lng` - Longitude
- `year` - Year (extracted from date)
- `month` - Month (extracted from date)
- `day` - Day (extracted from date)
- `day_of_week` - Day of week (0=Monday, 6=Sunday)
- `hour` - Hour of day (extracted from date)

### Target Variable

The model predicts `offenseType`:
- `Crimes Against Persons` (Class 1) - High risk
- `Crimes Against Property` (Class 2) - Lower risk

### Risk Levels

Risk levels are determined based on prediction confidence:
- **High**: Confidence ≥ 0.7
- **Medium**: 0.4 ≤ Confidence < 0.7
- **Low**: Confidence < 0.4

## 🐛 Troubleshooting

### Issue: Models not loading

**Error:** `Model directory not found` or `Random Forest model not found`

**Solution:** 
1. Ensure models are trained: `cd training && python train_models.py`
2. Check that `backend/model/ml_models/trained/` contains the required `.pkl` files
3. Verify the path in `app.py` points to the correct model directory

### Issue: Preprocessing errors

**Error:** `Missing required fields` or `Feature encoders not found`

**Solution:**
1. Ensure all required input fields are provided in the request
2. Check that `feature_encoders.pkl` exists in the trained folder
3. Verify that the input data matches the training data schema

### Issue: Port already in use

**Error:** `Address already in use`

**Solution:** Change the port in `app.py`:
```python
app.run(host="0.0.0.0", port=5004, debug=True)  # Use different port
```

## 🔗 Integration with Node.js Backend

To integrate this Flask API with the Node.js backend:

```javascript
// Example: Call accident prediction API
const response = await fetch('http://localhost:5003/api/accidents/predict', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    incidentType: accident.incidentType,
    municipality: accident.municipality,
    barangay: accident.barangay,
    street: accident.street,
    stageOfFelony: accident.stageOfFelony,
    province: accident.province,
    region: accident.region,
    lat: accident.lat,
    lng: accident.lng,
    dateCommited: accident.dateCommited
  })
});

const result = await response.json();
console.log('Risk Level:', result.prediction.risk_level);
console.log('Severity Index:', result.prediction.severity_index);
```

## 📝 Notes

- The API runs on port **5003** by default (to avoid conflicts with the registration API on port 5000)
- All dates should be in ISO 8601 format: `YYYY-MM-DDTHH:MM:SS.000Z`
- The forecast endpoint is a placeholder and requires time-series model implementation
- Prescriptive actions are returned based on risk level and predicted offense type

## 🚀 Production Deployment

For production deployment, use a WSGI server like Gunicorn:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5003 app:app
```

Or use systemd service (create `/etc/systemd/system/accident-analytics.service`):

```ini
[Unit]
Description=Accident Analytics Flask API
After=network.target

[Service]
User=www-data
WorkingDirectory=/path/to/backend/model/ml_models/accident_analytics
Environment="PATH=/path/to/venv/bin"
ExecStart=/path/to/venv/bin/gunicorn -w 4 -b 0.0.0.0:5003 app:app

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable accident-analytics
sudo systemctl start accident-analytics
```

