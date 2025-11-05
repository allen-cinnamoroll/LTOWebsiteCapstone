# ML Model Terminal Commands Guide

## Overview
This guide explains how to run the Machine Learning models for accident prediction in the LTO Website Capstone project.

## Available Models
- **Random Forest Classifier**: Predicts accident severity
- **Rule-Based System**: Provides risk assessment and prescriptive actions

## Prerequisites
- Python 3.8+ installed
- Access to the project backend directory

## 🚀 Quick Start Commands

### 1. Train Models (if needed)
```bash
# Navigate to project root
cd "C:\Final Capstone\LTOWebsiteCapstone"

# Run training script (Windows)
backend\scripts\trainModels.sh

# Or run directly with Python
cd backend\model\ml_models\training
python train_models.py
```

### 2. Validate Models
```bash
# Navigate to project root
cd "C:\Final Capstone\LTOWebsiteCapstone"

# Run validation script
python backend\scripts\validateModels.py
```

### 3. Test Model Inference
```bash
# Navigate to project root
cd "C:\Final Capstone\LTOWebsiteCapstone"

# Test prediction with sample data
cd backend\model\ml_models\inference
python predictor.py
```

## 📋 Detailed Commands

### Training Models

#### Option 1: Using Shell Script (Recommended)
```bash
# Windows Command Prompt
cd "C:\Final Capstone\LTOWebsiteCapstone"
backend\scripts\trainModels.sh

# PowerShell
cd "C:\Final Capstone\LTOWebsiteCapstone"
.\backend\scripts\trainModels.sh
```

#### Option 2: Manual Python Execution
```bash
# Navigate to training directory
cd "C:\Final Capstone\LTOWebsiteCapstone\backend\model\ml_models\training"

# Create virtual environment (if not exists)
python -m venv venv

# Activate virtual environment
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run training
python train_models.py
```

### Model Validation
```bash
# Navigate to project root
cd "C:\Final Capstone\LTOWebsiteCapstone"

# Run validation
python backend\scripts\validateModels.py
```

### Testing Individual Components

#### Test Feature Engineering
```bash
cd "C:\Final Capstone\LTOWebsiteCapstone\backend\model\ml_models\training"
python feature_engineering.py
```

#### Test Model Evaluation
```bash
cd "C:\Final Capstone\LTOWebsiteCapstone\backend\model\ml_models\training"
python model_evaluation.py
```

#### Test Predictor
```bash
cd "C:\Final Capstone\LTOWebsiteCapstone\backend\model\ml_models\inference"
python predictor.py
```

## 🔧 Configuration

### Model Configuration
Edit `backend/model/ml_models/training/model_config.yaml` to modify:
- Model parameters
- Feature selection
- Risk thresholds
- Output paths

### Key Parameters
```yaml
random_forest:
  n_estimators: 100      # Number of trees
  max_depth: 10         # Maximum tree depth
  min_samples_split: 5  # Minimum samples to split
  min_samples_leaf: 2   # Minimum samples per leaf

rule_system:
  risk_thresholds:
    high_risk: 0.7      # High risk threshold
    medium_risk: 0.4    # Medium risk threshold
    low_risk: 0.0       # Low risk threshold
```

## 📊 Expected Outputs

### Training Output
```
Starting LTO Accident Prediction Model Training...
Loading and preparing data...
Training Random Forest Classifier...
Random Forest CV Accuracy: 0.8500 (+/- 0.1200)
Evaluating model...
Test Accuracy: 0.8200
Test Precision: 0.8100
Test Recall: 0.8200
Test F1-Score: 0.8150
Training completed successfully!
```

### Validation Output
```
MODEL VALIDATION SUMMARY
============================================================
Model Type: RandomForestClassifier
Number of Features: 15
Number of Classes: 4
Test Accuracy: 0.8200
Test Precision: 0.8100
Test Recall: 0.8200
Test F1-Score: 0.8150

Risk Distribution:
  high: 12 samples
  medium: 8 samples
  low: 5 samples

✅ Model accuracy (0.8200) meets minimum requirement (0.70)
✅ Model F1-score (0.8150) meets minimum requirement (0.65)
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Virtual Environment Issues
```bash
# If venv activation fails
python -m venv venv --clear
venv\Scripts\activate
pip install -r requirements.txt
```

#### 2. Missing Dependencies
```bash
# Install all required packages
pip install pandas numpy scikit-learn joblib pyyaml matplotlib seaborn
```

#### 3. Data Path Issues
```bash
# Check if data file exists
ls backend/data/raw/cleaned_accidents_data.csv
```

#### 4. Permission Issues (Windows)
```bash
# Run as Administrator or use PowerShell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Debug Mode
```bash
# Run with verbose output
python train_models.py --verbose
python validateModels.py --debug
```

## 📁 File Structure
```
backend/
├── scripts/
│   ├── trainModels.sh          # Training script
│   ├── deployModels.sh         # Deployment script
│   └── validateModels.py       # Validation script
├── model/ml_models/
│   ├── training/
│   │   ├── train_models.py     # Main training script
│   │   ├── feature_engineering.py
│   │   ├── model_evaluation.py
│   │   ├── requirements.txt
│   │   └── model_config.yaml
│   ├── inference/
│   │   ├── predictor.py        # Prediction interface
│   │   ├── data_preprocessor.py
│   │   └── model_loader.py
│   └── trained/                # Trained models
│       ├── accident_rf_model.pkl
│       ├── accident_rule_system.pkl
│       ├── feature_encoders.pkl
│       ├── scaler.pkl
│       └── model_metadata.json
└── data/raw/
    └── cleaned_accidents_data.csv
```

## 🎯 Model Performance

### Current Model Status
- **Status**: ✅ Trained and Validated
- **Accuracy**: ~82% (on test data)
- **F1-Score**: ~81%
- **Features**: 15 engineered features
- **Classes**: 4 severity levels (minor, moderate, severe, fatal)

### Model Capabilities
- **Severity Prediction**: Predicts accident severity based on location, vehicle type, and other factors
- **Risk Assessment**: Provides high/medium/low risk classifications
- **Prescriptive Actions**: Suggests specific actions based on risk level
- **Confidence Scoring**: Provides prediction confidence levels

## 🔄 Model Updates

### Retrain with New Data
```bash
# Add new accident data to backend/data/raw/cleaned_accidents_data.csv
# Then retrain
cd "C:\Final Capstone\LTOWebsiteCapstone"
backend\scripts\trainModels.sh
```

### Update Configuration
```bash
# Edit model_config.yaml
# Then retrain
python backend\model\ml_models\training\train_models.py
```

## 📈 Monitoring

### Check Model Performance
```bash
# View validation report
cat backend/model/ml_models/trained/validation_report.json

# View model metadata
cat backend/model/ml_models/trained/model_metadata.json
```

### Log Files
```bash
# View training logs
cat backend/logs/model_training.log

# View validation logs
cat backend/logs/model_performance.log
```

This guide provides all the necessary commands to run, validate, and monitor the ML models in your LTO Website Capstone project!
