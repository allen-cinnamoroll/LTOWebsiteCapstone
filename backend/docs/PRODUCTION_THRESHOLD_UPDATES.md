# Production Model Threshold Updates

## Summary
Updated all ML model validation thresholds from demo/test values to production-ready requirements, reflecting the use of cleaned accident data with an 80/20 train-test split.

## Changes Made

### 1. Backend Validation Script
**File**: `backend/scripts/validateModels.py`
- Updated minimum accuracy: 0.5 → 0.70 (70%)
- Updated minimum F1-score: 0.4 → 0.65 (65%)
- Updated data path: `accidents_dummy_data.csv` → `cleaned_accidents_data.csv`
- Removed references to "demo data" in comments

### 2. Training Configuration
**File**: `backend/model/ml_models/training/model_config.yaml`
- Updated raw data path to use `cleaned_accidents_data.csv`

### 3. Documentation Updates

#### ML Training Guide
**File**: `backend/docs/ml_training_guide.md`
- Updated validation criteria:
  - Accuracy: ≥50% (demo) → ≥70% (production with 80/20 split)
  - F1-Score: ≥40% (demo) → ≥65% (production with 80/20 split)
- Updated example validation output to show realistic metrics
- Updated performance section to show production thresholds
- Changed data file references from `accidents_dummy_data.csv` to `cleaned_accidents_data.csv`

#### ML Model Guide
**File**: `backend/docs/ML_MODEL_GUIDE.md`
- Updated validation requirements in examples
- Changed data file references from `accidents_dummy_data.csv` to `cleaned_accidents_data.csv`

#### Prediction API Documentation
**File**: `backend/docs/prediction_api_docs.md`
- Updated performance metrics section to show production requirements
- Removed "demo data" references

## Production Model Requirements

### Performance Thresholds
- **Minimum Accuracy**: 70%
- **Minimum Precision**: 68%
- **Minimum Recall**: 68%
- **Minimum F1-Score**: 65%

### Data Configuration
- **Training Data**: `cleaned_accidents_data.csv` (production-ready cleaned data)
- **Train-Test Split**: 80% training / 20% testing
- **Random State**: 42 (for reproducibility)

## Impact

### Before (Demo Configuration)
```python
min_accuracy = 0.5  # 50% - for demo/test data
min_f1 = 0.4        # 40% - for demo/test data
data_path = 'accidents_dummy_data.csv'
```

### After (Production Configuration)
```python
min_accuracy = 0.70  # 70% - production threshold
min_f1 = 0.65        # 65% - production threshold
data_path = 'cleaned_accidents_data.csv'
```

## Validation

The model validation script now checks against these production thresholds:
- ✅ Model accuracy must be ≥70%
- ✅ Model F1-score must be ≥65%
- ✅ All required model files must be present
- ✅ Inference test must pass successfully

## Next Steps

1. **Retrain Models**: Run the training pipeline with the updated configuration
   ```bash
   cd backend/scripts
   ./trainModels.sh
   ```

2. **Validate Models**: Verify models meet the new production thresholds
   ```bash
   cd backend/scripts
   python validateModels.py
   ```

3. **Monitor Performance**: Track model performance in production to ensure it maintains these thresholds

## Notes

- These thresholds are appropriate for production use with cleaned, real-world accident data
- The 80/20 train-test split provides a good balance for model training and evaluation
- Regular retraining may be needed as new data is collected to maintain performance
- Consider A/B testing when deploying new model versions

