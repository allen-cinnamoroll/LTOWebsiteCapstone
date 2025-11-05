# LTO Incident Case Status Prediction - ML Training

This directory contains the machine learning training pipeline for predicting incident case status based on incident characteristics.

## 🎯 Purpose

The ML model predicts the **case status** (Pending, Ongoing, Solved, Closed) of traffic incidents based on various features like:
- Incident type
- Offense type
- Location (municipality, barangay, region, province)
- Temporal features (date, time, day of week)
- Stage of felony
- Geographic coordinates (lat/lng)

## 📁 Updated Data Structure

The training pipeline now works with the **new incident data structure**:

### Key Fields:
- `blotterNo` - Unique incident identifier
- `dateCommited` - Date when incident occurred
- `caseStatus` - **Target variable** (Pending, Ongoing, Solved, Closed)
- `incidentType` - Type of incident
- `offenseType` - Classification of offense
- `vehiclePlateNo`, `vehicleMCPlateNo`, `vehicleChassisNo` - Vehicle identifiers
- `suspect`, `stageOfFelony`, `offense`, `narrative` - Case details
- `municipality`, `barangay`, `street`, `region`, `province` - Location
- `lat`, `lng` - Geographic coordinates

## 🚀 How to Use

### Step 1: Export Data from MongoDB

First, export the incident data from MongoDB to CSV format:

```bash
cd backend/scripts
node export_incidents_for_ml.cjs
```

This creates: `backend/data/raw/accidents_data.csv`

### Step 2: Train the Model

Navigate to the training directory and run the training script:

```bash
cd backend/model/ml_models/training
python train_models.py
```

### Step 3: Review Results

Training outputs will be saved to:
- `backend/model/ml_models/trained/` - Trained models
- `backend/logs/` - Training logs

## 📊 Model Components

### 1. Random Forest Classifier
- Predicts case status based on incident features
- Uses cross-validation for robust evaluation
- Provides feature importance analysis

### 2. Rule-Based System
- Prescriptive analytics for incident management
- Risk thresholds: high, medium, low
- Actionable recommendations for each risk level

## ⚙️ Configuration

Edit `model_config.yaml` to customize:

```yaml
features:
  categorical_features:
    - incidentType
    - offenseType
    - municipality
    - stageOfFelony
    - province
    - region
  numerical_features:
    - lat
    - lng
  target_feature: caseStatus
  date_feature: dateCommited
```

### Case Status Mapping:
```yaml
case_status_mapping:
  Pending: 1
  Ongoing: 2
  Solved: 3
  Closed: 4
```

## 📈 Model Evaluation Metrics

The training process reports:
- **Accuracy** - Overall prediction accuracy
- **Precision** - Positive prediction reliability
- **Recall** - True positive detection rate
- **F1-Score** - Harmonic mean of precision and recall
- **Confusion Matrix** - Detailed prediction breakdown
- **Feature Importance** - Most influential features

## 🔧 Dependencies

```bash
pip install pandas numpy scikit-learn pyyaml joblib
```

## 📝 Files

- `train_models.py` - Main training script
- `feature_engineering.py` - Feature extraction and preprocessing
- `model_config.yaml` - Training configuration
- `README.md` - This file

## 🎓 Model Output

After training, the following files are created:

- `accident_rf_model.pkl` - Trained Random Forest model
- `accident_rule_system.pkl` - Rule-based prescriptive system
- `feature_encoders.pkl` - Label encoders for categorical features
- `scaler.pkl` - Standard scaler for numerical features
- `feature_columns.pkl` - List of feature columns
- `model_metadata.json` - Model configuration and metadata

## 🚨 Troubleshooting

### Issue: "No data found"
**Solution:** Run the export script first to generate CSV data

### Issue: "KeyError: caseStatus"
**Solution:** Ensure your CSV has the `caseStatus` column

### Issue: "Too few samples"
**Solution:** Need at least 10-20 incidents per case status category

## 📞 Support

For issues or questions, refer to the main project documentation.

