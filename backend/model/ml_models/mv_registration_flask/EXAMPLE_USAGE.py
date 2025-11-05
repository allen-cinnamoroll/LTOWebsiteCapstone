"""
Simple Example: How to Use the Optimized SARIMA Model
This file shows step-by-step how to use the optimized model
"""

# ============================================================================
# STEP 1: Import the necessary modules
# ============================================================================
from sarima_model_optimized import OptimizedSARIMAModel
from data_preprocessor_daily import DailyDataPreprocessor
import os

print("=" * 60)
print("OPTIMIZED SARIMA MODEL - SIMPLE USAGE EXAMPLE")
print("=" * 60)

# ============================================================================
# STEP 2: Set up file paths
# ============================================================================
base_dir = os.path.dirname(os.path.abspath(__file__))
data_dir = os.path.join(base_dir, '../mv registration training')
model_dir = os.path.join(base_dir, '../trained')
csv_path = os.path.join(data_dir, 'DAVOR_data.csv')

print(f"\n📁 Data file: {csv_path}")
print(f"📁 Model directory: {model_dir}")

# ============================================================================
# STEP 3: Load and process your data
# ============================================================================
print("\n" + "=" * 60)
print("STEP 1: Loading and Processing Data")
print("=" * 60)

preprocessor = DailyDataPreprocessor(csv_path)
daily_data, exogenous_vars, processing_info = preprocessor.load_and_process_daily_data(
    fill_missing_days=True,
    fill_method='zero'  # Fill weekends/holidays with 0
)

print(f"✅ Data loaded!")
print(f"   - Total days: {len(daily_data)}")
print(f"   - Days with registrations: {processing_info['days_with_registrations']}")
print(f"   - Total registrations: {processing_info['total_registrations']}")
print(f"   - Mean per day: {processing_info['mean_per_day']:.2f}")

# ============================================================================
# STEP 4: Initialize the optimized model
# ============================================================================
print("\n" + "=" * 60)
print("STEP 2: Initializing Model")
print("=" * 60)

model = OptimizedSARIMAModel(
    model_dir=model_dir,
    municipality=None,  # Aggregated model (all municipalities)
    use_normalization=False,  # Set to True if you want normalization
    scaler_type='minmax'
)

print("✅ Model initialized!")

# ============================================================================
# STEP 5: Train or load the model
# ============================================================================
print("\n" + "=" * 60)
print("STEP 3: Training or Loading Model")
print("=" * 60)

if model.model_exists():
    print("📂 Model found! Loading existing model...")
    model.load_model()
    print("✅ Model loaded!")
else:
    print("🔧 No existing model found. Training new model...")
    print("⏳ This will take 5-10 minutes (auto parameter selection)...")
    
    training_info = model.train(
        data=daily_data,
        exogenous=exogenous_vars[['is_weekend_or_holiday']],  # Use weekend/holiday indicator
        force=False
    )
    
    print("✅ Model trained!")

# ============================================================================
# STEP 6: View model performance
# ============================================================================
print("\n" + "=" * 60)
print("STEP 4: Model Performance")
print("=" * 60)

model.print_model_summary()

# ============================================================================
# STEP 7: Make predictions
# ============================================================================
print("\n" + "=" * 60)
print("STEP 5: Making Predictions")
print("=" * 60)

# Predict next 30 days
predictions = model.predict(days=30)

print(f"✅ Predictions generated!")
print(f"\n📊 Monthly Summary:")
print(f"   - Total predicted: {predictions['monthly_aggregation']['total_predicted']} registrations")
print(f"   - Lower bound (95% CI): {predictions['monthly_aggregation']['lower_bound']}")
print(f"   - Upper bound (95% CI): {predictions['monthly_aggregation']['upper_bound']}")

print(f"\n📅 First 5 Daily Predictions:")
for i, pred in enumerate(predictions['daily_predictions'][:5]):
    print(f"   {i+1}. {pred['date']}: {pred['predicted_count']} registrations")

print(f"\n📅 Weekly Predictions (first week):")
if predictions['weekly_predictions']:
    first_week = predictions['weekly_predictions'][0]
    print(f"   Week starting {first_week['week_start']}: {first_week['total_predicted']} registrations")

# ============================================================================
# STEP 8: Access detailed metrics (optional)
# ============================================================================
print("\n" + "=" * 60)
print("STEP 6: Detailed Metrics (Optional)")
print("=" * 60)

if model.test_accuracy_metrics:
    print("📈 Out-of-Sample Performance:")
    print(f"   - MAPE: {model.test_accuracy_metrics['mape']:.2f}%")
    print(f"   - R²: {model.test_accuracy_metrics['r2']:.4f}")
    print(f"   - MAE: {model.test_accuracy_metrics['mae']:.2f}")
    print(f"   - RMSE: {model.test_accuracy_metrics['rmse']:.2f}")

if model.cv_results:
    print(f"\n🔄 Cross-Validation Results:")
    print(f"   - Mean MAPE: {model.cv_results['mean_mape']:.2f}%")
    print(f"   - Std MAPE: {model.cv_results['std_mape']:.2f}%")

print("\n" + "=" * 60)
print("✅ EXAMPLE COMPLETE!")
print("=" * 60)
print("\n💡 Next Steps:")
print("   1. Use these predictions in your application")
print("   2. Integrate with app.py (see integration example)")
print("   3. Retrain periodically as new data arrives")
print("   4. Check sarima_model.log for detailed logs")

