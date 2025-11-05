# Prediction API Documentation - LTO Accident Prediction System

## Overview

The Prediction API provides endpoints for accident severity prediction and risk assessment using trained Machine Learning models. The system combines **Random Forest Classifier** for predictive analytics and **Rule-Based System** for prescriptive recommendations.

## Base URL
```
http://localhost:3000/api/predictions
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Single Prediction

**Endpoint**: `POST /predict`

**Description**: Predict accident severity and get risk assessment for a single accident record.

**Request Body**:
```json
{
  "accident_id": "ACC-2024-001",
  "plateNo": "ABC-1234",
  "accident_date": "2024-01-15T10:30:00.000Z",
  "street": "Rizal Street",
  "barangay": "Poblacion",
  "municipality": "Mati",
  "vehicle_type": "car",
  "latitude": 6.95,
  "longitude": 126.20,
  "notes": "Optional additional notes"
}
```

**Required Fields**:
- `accident_date`: ISO 8601 datetime format
- `vehicle_type`: One of: car, motorcycle, truck, bus, van, jeepney, tricycle
- `municipality`: Municipality name
- `latitude`: GPS latitude (6.0 - 8.0)
- `longitude`: GPS longitude (125.0 - 127.0)

**Optional Fields**:
- `accident_id`: Unique identifier
- `plateNo`: Vehicle plate number
- `street`: Street name
- `barangay`: Barangay name
- `notes`: Additional information

**Response** (Success):
```json
{
  "success": true,
  "data": {
    "prediction": {
      "predicted_severity": "minor",
      "severity_code": 1,
      "confidence": 0.5567,
      "probabilities": {
        "minor": 0.5567,
        "moderate": 0.3333,
        "severe": 0.1100
      }
    },
    "risk_assessment": {
      "risk_level": "medium_risk",
      "confidence": 0.5567,
      "prescriptive_actions": [
        "Regular patrol monitoring",
        "Maintain existing signage",
        "Monitor traffic patterns"
      ],
      "severity_prediction": {
        "predicted_severity": "minor",
        "severity_code": 1,
        "confidence": 0.5567,
        "probabilities": {
          "minor": 0.5567,
          "moderate": 0.3333,
          "severe": 0.1100
        }
      }
    },
    "model_info": {
      "model_type": "RandomForestClassifier",
      "rule_system_type": "PrescriptiveRuleBased",
      "training_date": "2024-09-16T22:21:30.912374",
      "feature_count": 13
    }
  },
  "timestamp": "2024-09-16T22:30:00.000Z"
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": "Invalid input data",
  "details": [
    "Missing required field: latitude",
    "Invalid value for vehicle_type: invalid_type. Allowed values: car, motorcycle, truck, bus, van, jeepney, tricycle"
  ],
  "timestamp": "2024-09-16T22:30:00.000Z"
}
```

### 2. Batch Prediction

**Endpoint**: `POST /predict/batch`

**Description**: Predict accident severity for multiple records in a single request.

**Request Body**:
```json
{
  "records": [
    {
      "accident_id": "ACC-2024-001",
      "plateNo": "ABC-1234",
      "accident_date": "2024-01-15T10:30:00.000Z",
      "street": "Rizal Street",
      "barangay": "Poblacion",
      "municipality": "Mati",
      "vehicle_type": "car",
      "latitude": 6.95,
      "longitude": 126.20
    },
    {
      "accident_id": "ACC-2024-002",
      "plateNo": "XYZ-5678",
      "accident_date": "2024-01-15T14:30:00.000Z",
      "street": "Mabini Street",
      "barangay": "Dahican",
      "municipality": "Manay",
      "vehicle_type": "motorcycle",
      "latitude": 7.02,
      "longitude": 126.40
    }
  ]
}
```

**Response** (Success):
```json
{
  "success": true,
  "data": {
    "total_records": 2,
    "valid_records": 2,
    "invalid_records": 0,
    "predictions": [
      {
        "accident_id": "ACC-2024-001",
        "prediction": {
          "predicted_severity": "minor",
          "severity_code": 1,
          "confidence": 0.5567,
          "probabilities": {
            "minor": 0.5567,
            "moderate": 0.3333,
            "severe": 0.1100
          }
        },
        "risk_assessment": {
          "risk_level": "medium_risk",
          "confidence": 0.5567,
          "prescriptive_actions": [
            "Regular patrol monitoring",
            "Maintain existing signage",
            "Monitor traffic patterns"
          ]
        },
        "timestamp": "2024-09-16T22:30:00.000Z"
      }
    ],
    "validation_results": [
      {
        "index": 0,
        "record_id": "ACC-2024-001",
        "is_valid": true,
        "errors": [],
        "warnings": []
      }
    ]
  },
  "timestamp": "2024-09-16T22:30:00.000Z"
}
```

### 3. Model Information

**Endpoint**: `GET /model/info`

**Description**: Get information about the currently loaded models.

**Response**:
```json
{
  "success": true,
  "data": {
    "model_info": {
      "model_name": "accident_rf_model",
      "rule_system_name": "accident_rule_system",
      "training_date": "2024-09-16T22:21:30.912374",
      "model_type": "RandomForestClassifier",
      "rule_system_type": "PrescriptiveRuleBased",
      "feature_count": 13,
      "config": {
        "data": {
          "train_test_split": 0.7,
          "random_state": 42
        },
        "random_forest": {
          "n_estimators": 100,
          "max_depth": 10
        }
      }
    },
    "model_available": true
  },
  "timestamp": "2024-09-16T22:30:00.000Z"
}
```

### 4. Train Models

**Endpoint**: `POST /model/train`

**Description**: Retrain the models with current data. This is an admin-only endpoint.

**Response** (Success):
```json
{
  "success": true,
  "message": "Model training completed",
  "logs": [
    "Starting complete training pipeline...",
    "Loading and preparing data...",
    "Training Random Forest Classifier...",
    "Models saved successfully"
  ],
  "timestamp": "2024-09-16T22:30:00.000Z"
}
```

**Response** (Training in Progress):
```json
{
  "success": false,
  "error": "Training already in progress",
  "timestamp": "2024-09-16T22:30:00.000Z"
}
```

### 5. Health Check

**Endpoint**: `GET /health`

**Description**: Check if the prediction service is healthy and ready.

**Response**:
```json
{
  "success": true,
  "message": "Prediction service is healthy",
  "timestamp": "2024-09-16T22:30:00.000Z"
}
```

## Data Validation

### Input Validation Rules

| Field | Type | Validation Rules | Example |
|-------|------|------------------|---------|
| accident_id | String | Format: XXX-YYYY-ZZZ | ACC-2024-001 |
| plateNo | String | Format: XXX-YYYY | ABC-1234 |
| accident_date | DateTime | ISO 8601 format | 2024-01-15T10:30:00.000Z |
| street | String | 3-100 characters | Rizal Street |
| barangay | String | 2-50 characters | Poblacion |
| municipality | String | 2-50 characters | Mati |
| vehicle_type | String | Enum values | car, motorcycle, truck, bus, van, jeepney, tricycle |
| latitude | Float | Range: 6.0 - 8.0 | 6.95 |
| longitude | Float | Range: 125.0 - 127.0 | 126.20 |
| severity | String | Enum values | minor, moderate, severe |
| notes | String | Max 500 characters | Optional |

### Validation Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Model metadata not found |
| 409 | Conflict - Training already in progress |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Models not available |

## Risk Assessment

### Risk Levels

#### High Risk (≥70% confidence)
- **Actions**: Increase patrol frequency, install additional signage, implement speed limit reduction, add traffic calming measures
- **Use Case**: Areas with high accident probability

#### Medium Risk (40-70% confidence)
- **Actions**: Regular patrol monitoring, maintain existing signage, monitor traffic patterns
- **Use Case**: Areas requiring standard attention

#### Low Risk (<40% confidence)
- **Actions**: Standard monitoring, routine maintenance
- **Use Case**: Areas with low accident probability

### Severity Levels

| Code | Severity | Description |
|------|----------|-------------|
| 1 | Minor | Low impact accidents |
| 2 | Moderate | Medium impact accidents |
| 3 | Severe | High impact accidents |

## Error Handling

### Common Error Scenarios

#### 1. Invalid Input Data
```json
{
  "success": false,
  "error": "Invalid input data",
  "details": [
    "Missing required field: latitude",
    "Invalid value for vehicle_type: invalid_type"
  ],
  "timestamp": "2024-09-16T22:30:00.000Z"
}
```

#### 2. Models Not Available
```json
{
  "success": false,
  "error": "Models not available. Please train models first.",
  "timestamp": "2024-09-16T22:30:00.000Z"
}
```

#### 3. Service Unavailable
```json
{
  "success": false,
  "error": "Prediction service temporarily unavailable",
  "timestamp": "2024-09-16T22:30:00.000Z"
}
```

## Rate Limiting

- **Single Predictions**: 100 requests per minute per user
- **Batch Predictions**: 10 requests per minute per user
- **Model Training**: 1 request per hour per user

## Examples

### cURL Examples

#### Single Prediction
```bash
curl -X POST http://localhost:3000/api/predictions/predict \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "accident_id": "ACC-2024-001",
    "plateNo": "ABC-1234",
    "accident_date": "2024-01-15T10:30:00.000Z",
    "street": "Rizal Street",
    "barangay": "Poblacion",
    "municipality": "Mati",
    "vehicle_type": "car",
    "latitude": 6.95,
    "longitude": 126.20
  }'
```

#### Batch Prediction
```bash
curl -X POST http://localhost:3000/api/predictions/predict/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "records": [
      {
        "accident_id": "ACC-2024-001",
        "accident_date": "2024-01-15T10:30:00.000Z",
        "municipality": "Mati",
        "vehicle_type": "car",
        "latitude": 6.95,
        "longitude": 126.20
      }
    ]
  }'
```

#### Get Model Info
```bash
curl -X GET http://localhost:3000/api/predictions/model/info \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### JavaScript Examples

#### Single Prediction
```javascript
const response = await fetch('/api/predictions/predict', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    accident_id: 'ACC-2024-001',
    plateNo: 'ABC-1234',
    accident_date: '2024-01-15T10:30:00.000Z',
    street: 'Rizal Street',
    barangay: 'Poblacion',
    municipality: 'Mati',
    vehicle_type: 'car',
    latitude: 6.95,
    longitude: 126.20
  })
});

const result = await response.json();
console.log(result.data.prediction.predicted_severity);
```

#### Batch Prediction
```javascript
const response = await fetch('/api/predictions/predict/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    records: [
      {
        accident_id: 'ACC-2024-001',
        accident_date: '2024-01-15T10:30:00.000Z',
        municipality: 'Mati',
        vehicle_type: 'car',
        latitude: 6.95,
        longitude: 126.20
      }
    ]
  })
});

const result = await response.json();
result.data.predictions.forEach(prediction => {
  console.log(`${prediction.accident_id}: ${prediction.prediction.predicted_severity}`);
});
```

## Performance Metrics

### Model Performance Requirements
- **Minimum Accuracy**: 70% (80/20 train-test split)
- **Minimum Precision**: 68%
- **Minimum Recall**: 68%
- **Minimum F1-Score**: 65%

### API Performance
- **Average Response Time**: <500ms for single predictions
- **Average Response Time**: <2s for batch predictions (10 records)
- **Uptime**: 99.9%

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Input Validation**: Comprehensive validation of all input data
3. **Rate Limiting**: Protection against abuse and DoS attacks
4. **Data Privacy**: No sensitive data is logged or stored
5. **HTTPS**: Use HTTPS in production environments

## Monitoring and Logging

### Logs Location
- **Application Logs**: `backend/logs/application.log`
- **Prediction Logs**: `backend/logs/ml_predictions.log`
- **Model Training Logs**: `backend/logs/model_training.log`

### Key Metrics to Monitor
- API response times
- Prediction accuracy
- Error rates
- Model performance degradation
- Resource usage

---

**Last Updated**: September 2024
**Version**: 1.0
**Status**: Production Ready