# ML Training Guide - LTO Accident Prediction System

## Overview

This guide explains how to train and deploy the Machine Learning models for the LTO Accident Prediction System. The system uses a **Random Forest Classifier** for predictive analytics and a **Rule-Based System** for prescriptive analytics.

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Raw Data      │───▶│  Feature         │───▶│  Model Training │
│   (CSV)         │    │  Engineering     │    │  (80/20 Split)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Predictions   │◀───│  Model Inference │◀───│  Trained Models │
│   & Actions     │    │  & Validation    │    │  (.pkl files)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Prerequisites

### System Requirements
- Python 3.8+
- Node.js 14+
- Windows/Linux/MacOS

### Python Dependencies
```bash
pandas==2.1.4
numpy==1.24.3
scikit-learn==1.3.2
joblib==1.3.2
pyyaml==6.0.1
matplotlib==3.7.2
seaborn==0.12.2
```

## Data Requirements

### Input Data Format
The system expects accident data in CSV format with the following columns:

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| accident_id | String | Unique identifier | ACC-2024-001 |
| plateNo | String | Vehicle plate number | ABC-1234 |
| accident_date | DateTime | ISO 8601 format | 2024-01-15T10:30:00.000Z |
| street | String | Street name | Rizal Street |
| barangay | String | Barangay name | Poblacion |
| municipality | String | Municipality name | Mati |
| vehicle_type | String | Type of vehicle | car, motorcycle, truck, bus, van, jeepney, tricycle |
| severity | String | Accident severity | minor, moderate, severe |
| latitude | Float | GPS latitude | 6.95 |
| longitude | Float | GPS longitude | 126.20 |
| notes | String | Additional notes | Optional |

### Data Quality Requirements
- **Minimum Records**: 100+ for basic training
- **Class Balance**: Try to maintain balanced severity classes
- **Geographic Coverage**: Include diverse locations
- **Time Range**: Cover multiple months/years for temporal patterns

## Training Process

### 1. Data Preparation

Place your accident data in:
```
backend/data/raw/accidents_dummy_data.csv
```

### 2. Configuration

Edit the training configuration in:
```
backend/model/ml_models/training/model_config.yaml
```

Key configuration parameters:
```yaml
data:
  train_test_split: 0.7  # 70% training, 30% testing
  random_state: 42

random_forest:
  n_estimators: 100
  max_depth: 10
  min_samples_split: 5
  min_samples_leaf: 2

rule_system:
  risk_thresholds:
    high_risk: 0.7
    medium_risk: 0.4
    low_risk: 0.0
```

### 3. Training Execution

#### Option A: Using Training Script (Recommended)
```bash
cd backend/model/ml_models/training
python train_models.py
```

#### Option B: Using Shell Script
```bash
cd backend
bash scripts/trainModels.sh
```

#### Option C: Via API Endpoint
```bash
POST /api/predictions/model/train
```

### 4. Training Output

After successful training, the following files will be created:

```
backend/model/ml_models/trained/
├── accident_rf_model.pkl          # Random Forest model
├── accident_rule_system.pkl       # Rule-based system
├── feature_encoders.pkl           # Label encoders
├── scaler.pkl                     # Feature scaler
├── feature_columns.pkl            # Feature column names
└── model_metadata.json            # Model metadata
```

## Model Validation

### Automatic Validation
```bash
cd backend/scripts
python validateModels.py
```

### Validation Criteria
- **Accuracy**: ≥50% (for demo data)
- **F1-Score**: ≥40% (for demo data)
- **Model Loading**: All files present and loadable
- **Inference Test**: Real-time prediction working

### Validation Output
```
✅ Model accuracy (0.5161) meets minimum requirement (0.5)
✅ Model F1-score (0.4525) meets minimum requirement (0.4)
✅ Inference test successful!
✅ ALL VALIDATIONS PASSED - Models are ready for deployment!
```

## Feature Engineering

### Temporal Features
- Year, Month, Day, Day of Week, Hour
- Weekend indicator
- Rush hour indicator

### Location Features
- GPS coordinates (latitude, longitude)
- Location clustering
- Road type extraction from street names

### Categorical Encoding
- Label encoding for categorical variables
- Handling of unseen categories during inference

### Feature Scaling
- StandardScaler for numerical features
- Preserves feature distribution

## Model Performance

### Current Performance (Demo Data)
- **Accuracy**: 51.6%
- **Precision**: 44.6%
- **Recall**: 51.6%
- **F1-Score**: 45.3%

### Risk Distribution
- **Medium Risk**: 90.3% (Regular monitoring)
- **High Risk**: 6.5% (Increased patrols, signage)
- **Low Risk**: 3.2% (Standard monitoring)

### Feature Importance (Top 5)
1. **Latitude** (16.7%) - Geographic location
2. **Longitude** (10.2%) - Geographic location
3. **Hour** (9.1%) - Time of day
4. **Street** (8.6%) - Road characteristics
5. **Month** (8.2%) - Seasonal patterns

## Prescriptive Analytics

### Risk-Based Actions

#### High Risk (≥70% confidence)
- Increase patrol frequency
- Install additional signage
- Implement speed limit reduction
- Add traffic calming measures

#### Medium Risk (40-70% confidence)
- Regular patrol monitoring
- Maintain existing signage
- Monitor traffic patterns

#### Low Risk (<40% confidence)
- Standard monitoring
- Routine maintenance

## Troubleshooting

### Common Issues

#### 1. Training Fails
**Error**: `FileNotFoundError: No such file or directory`
**Solution**: Check data file path in `model_config.yaml`

#### 2. Low Performance
**Issue**: Accuracy below 50%
**Solutions**:
- Increase training data size
- Improve data quality
- Adjust model parameters
- Try different algorithms

#### 3. Inference Errors
**Error**: `y contains previously unseen labels`
**Solution**: Ensure all categorical values in training data are present in inference data

#### 4. Memory Issues
**Error**: Out of memory during training
**Solutions**:
- Reduce `n_estimators` in Random Forest
- Use data sampling for large datasets
- Increase system RAM

### Performance Optimization

#### For Better Accuracy
1. **More Data**: Collect 1000+ accident records
2. **Feature Engineering**: Add weather, traffic, road condition data
3. **Algorithm Tuning**: Try XGBoost, Neural Networks
4. **Ensemble Methods**: Combine multiple models

#### For Production Deployment
1. **Model Versioning**: Track model performance over time
2. **A/B Testing**: Compare model versions
3. **Monitoring**: Set up performance alerts
4. **Retraining**: Schedule regular model updates

## API Usage

### Single Prediction
```bash
POST /api/predictions/predict
Content-Type: application/json

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
}
```

### Batch Prediction
```bash
POST /api/predictions/predict/batch
Content-Type: application/json

{
  "records": [
    { /* accident record 1 */ },
    { /* accident record 2 */ }
  ]
}
```

### Model Information
```bash
GET /api/predictions/model/info
```

## Best Practices

### Data Collection
1. **Consistent Format**: Maintain consistent data structure
2. **Quality Control**: Validate data before training
3. **Regular Updates**: Keep data current and relevant
4. **Privacy**: Ensure data privacy compliance

### Model Management
1. **Version Control**: Track model versions and performance
2. **Backup**: Keep backup copies of trained models
3. **Documentation**: Document model changes and improvements
4. **Testing**: Always validate before deployment

### Monitoring
1. **Performance Tracking**: Monitor accuracy over time
2. **Data Drift**: Watch for changes in input data patterns
3. **Feedback Loop**: Collect prediction feedback for improvement
4. **Alerting**: Set up alerts for model degradation

## Support

For technical support or questions:
1. Check the troubleshooting section above
2. Review the validation logs in `backend/logs/`
3. Examine model metadata in `model_metadata.json`
4. Contact the development team

---

**Last Updated**: September 2024
**Version**: 1.0
**Status**: Production Ready
