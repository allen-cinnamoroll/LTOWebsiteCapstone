"""
Retrain Optimized SARIMA Model with Date Fix
This script retrains the optimized model to store actual_last_date for correct future predictions
"""

from data_preprocessor_daily import DailyDataPreprocessor
from sarima_model_optimized import OptimizedSARIMAModel
from mongo_to_csv_exporter import export_mongo_to_csv
import os

def main():
    print("=" * 70)
    print("RETRAINING OPTIMIZED SARIMA MODEL WITH DATE FIX")
    print("=" * 70)
    print()
    
    # Get paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, '../mv registration training')
    if not os.path.exists(data_dir):
        data_dir_alt = os.path.join(base_dir, '../mv_registration_training')
        if os.path.exists(data_dir_alt):
            data_dir = data_dir_alt
    
    model_dir = os.path.join(base_dir, '../trained')

    # Always export fresh data from MongoDB into the training directory.
    # This will create/overwrite DAVOR_data.csv based on the latest DB state.
    print("Step 0: Exporting registration data from MongoDB to CSV...")
    try:
        csv_path = export_mongo_to_csv(data_dir, filename="DAVOR_data.csv")
        print(f"   ✅ Mongo export complete: {csv_path}")
    except Exception as e:
        print(f"❌ ERROR: Failed to export data from MongoDB: {str(e)}")
        return False
    
    print(f"📁 Data directory: {data_dir}")
    print(f"📁 Model directory: {model_dir}")
    print()
    
    # Load data
    print("Step 1: Loading and preprocessing daily data...")
    try:
        preprocessor = DailyDataPreprocessor(csv_path)
        daily_data, exogenous_vars, processing_info = preprocessor.load_and_process_daily_data(
            fill_missing_days=True,
            fill_method='zero'
        )
        
        print(f"✅ Data loaded successfully")
        print(f"   - Total days: {len(daily_data)}")
        print(f"   - Date range: {daily_data.index.min()} to {daily_data.index.max()}")
        
        if 'actual_date_range' in processing_info:
            actual_last_date = processing_info['actual_date_range']['end']
            print(f"   - Actual last registration date: {actual_last_date}")
        
        print()
    except Exception as e:
        print(f"❌ ERROR loading data: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    # Initialize and train model
    print("Step 2: Initializing and training optimized model...")
    try:
        model = OptimizedSARIMAModel(
            model_dir=model_dir,
            municipality=None,
            use_normalization=False,
            scaler_type='minmax'
        )
        
        print("   - Training model with force=True (will overwrite existing model)...")
        # Use multiple exogenous features, including LTO schedule-based ones
        exog_cols = [
            'is_weekend_or_holiday',
            'day_of_week',
            'month',
            'is_scheduled_month',
            'is_scheduled_week',
        ]
        available_exog = [c for c in exog_cols if c in exogenous_vars.columns]

        training_info = model.train(
            data=daily_data,
            exogenous=exogenous_vars[available_exog],
            force=True,  # Force retraining to update metadata
            processing_info=processing_info
        )
        
        if training_info:
            print("   ✅ Model trained successfully!")
            print(f"   - Model parameters: {training_info['model_params']}")
            if training_info.get('accuracy_metrics'):
                print(f"   - Training accuracy (MAPE): {training_info['accuracy_metrics'].get('mape', 'N/A'):.2f}%")
            if training_info.get('test_accuracy_metrics'):
                print(f"   - Test accuracy (MAPE): {training_info['test_accuracy_metrics'].get('mape', 'N/A'):.2f}%")
        else:
            print("   ⚠️  Model training returned None")
        
        print()
    except Exception as e:
        print(f"❌ ERROR training model: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    # Verify metadata
    print("Step 3: Verifying metadata...")
    try:
        import json
        metadata_file = os.path.join(model_dir, 'sarima_metadata.json')
        if os.path.exists(metadata_file):
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
            
            if 'actual_last_date' in metadata:
                print(f"   ✅ actual_last_date found in metadata: {metadata['actual_last_date']}")
            else:
                print(f"   ⚠️  Warning: actual_last_date not in metadata")
            
            if 'last_data_date' in metadata:
                print(f"   - last_data_date (daily data): {metadata['last_data_date']}")
        else:
            print(f"   ⚠️  Warning: Metadata file not found")
        
        print()
    except Exception as e:
        print(f"   ⚠️  Warning: Could not verify metadata: {str(e)}")
        print()
    
    print("=" * 70)
    print("✅ RETRAINING COMPLETE!")
    print("=" * 70)
    print()
    print("Next steps:")
    print("1. Restart Flask API: pm2 restart mv-prediction-api (or your method)")
    print("2. Test API: curl http://localhost:5002/api/predict/registrations?weeks=4")
    print("3. Clear browser cache and refresh frontend")
    print()
    
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)

