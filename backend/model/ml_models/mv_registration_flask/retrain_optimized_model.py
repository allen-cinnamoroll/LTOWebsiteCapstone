"""
Retrain Optimized SARIMA Model with Date Fix
This script retrains the optimized model to store actual_last_date for correct future predictions
"""

from data_preprocessor_daily import DailyDataPreprocessor
from sarima_model_optimized import OptimizedSARIMAModel
from mongo_to_csv_exporter import export_mongo_to_csv
import os
import sys

# Fix encoding for Windows console (cp1252 can't handle emojis)
if sys.platform == 'win32':
    # Try to set UTF-8 encoding for stdout/stderr
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except (AttributeError, ValueError):
        # If reconfigure is not available, use a safe print function
        pass

# Safe print function that handles encoding errors
def safe_print(text):
    """Print text safely, handling encoding errors"""
    try:
        print(text)
    except UnicodeEncodeError:
        # Replace emojis with ASCII alternatives
        text_safe = text.replace('✅', '[OK]').replace('❌', '[ERROR]').replace('⚠️', '[WARNING]').replace('📁', '[DIR]')
        print(text_safe)

def main():
    safe_print("=" * 70)
    safe_print("RETRAINING OPTIMIZED SARIMA MODEL WITH DATE FIX")
    safe_print("=" * 70)
    safe_print("")
    
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
    safe_print("Step 0: Exporting registration data from MongoDB to CSV...")
    try:
        csv_path = export_mongo_to_csv(data_dir, filename="DAVOR_data.csv")
        safe_print(f"   [OK] Mongo export complete: {csv_path}")
    except Exception as e:
        safe_print(f"[ERROR] Failed to export data from MongoDB: {str(e)}")
        return False
    
    safe_print(f"[DIR] Data directory: {data_dir}")
    safe_print(f"[DIR] Model directory: {model_dir}")
    safe_print("")
    
    # Load data
    safe_print("Step 1: Loading and preprocessing daily data...")
    try:
        preprocessor = DailyDataPreprocessor(csv_path)
        daily_data, exogenous_vars, processing_info = preprocessor.load_and_process_daily_data(
            fill_missing_days=True,
            fill_method='zero'
        )
        
        safe_print(f"[OK] Data loaded successfully")
        safe_print(f"   - Total days: {len(daily_data)}")
        safe_print(f"   - Date range: {daily_data.index.min()} to {daily_data.index.max()}")
        
        if 'actual_date_range' in processing_info:
            actual_last_date = processing_info['actual_date_range']['end']
            safe_print(f"   - Actual last registration date: {actual_last_date}")
        
        safe_print("")
    except Exception as e:
        safe_print(f"[ERROR] Failed to load data: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    # Initialize and train model
    safe_print("Step 2: Initializing and training optimized model...")
    try:
        model = OptimizedSARIMAModel(
            model_dir=model_dir,
            municipality=None,
            use_normalization=False,
            scaler_type='minmax'
        )
        
        safe_print("   - Training model with force=True (will overwrite existing model)...")
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
            safe_print("   [OK] Model trained successfully!")
            safe_print(f"   - Model parameters: {training_info['model_params']}")
            if training_info.get('accuracy_metrics'):
                safe_print(f"   - Training accuracy (MAPE): {training_info['accuracy_metrics'].get('mape', 'N/A'):.2f}%")
            if training_info.get('test_accuracy_metrics'):
                safe_print(f"   - Test accuracy (MAPE): {training_info['test_accuracy_metrics'].get('mape', 'N/A'):.2f}%")
        else:
            safe_print("   [WARNING] Model training returned None")
        
        safe_print("")
    except Exception as e:
        safe_print(f"[ERROR] Failed to train model: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    # Verify metadata
    safe_print("Step 3: Verifying metadata...")
    try:
        import json
        metadata_file = os.path.join(model_dir, 'sarima_metadata.json')
        if os.path.exists(metadata_file):
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
            
            if 'actual_last_date' in metadata:
                safe_print(f"   [OK] actual_last_date found in metadata: {metadata['actual_last_date']}")
            else:
                safe_print(f"   [WARNING] actual_last_date not in metadata")
            
            if 'last_data_date' in metadata:
                safe_print(f"   - last_data_date (daily data): {metadata['last_data_date']}")
        else:
            safe_print(f"   [WARNING] Metadata file not found")
        
        safe_print("")
    except Exception as e:
        safe_print(f"   [WARNING] Could not verify metadata: {str(e)}")
        safe_print("")
    
    safe_print("=" * 70)
    safe_print("[OK] RETRAINING COMPLETE!")
    safe_print("=" * 70)
    safe_print("")
    safe_print("Next steps:")
    safe_print("1. Restart Flask API: pm2 restart mv-prediction-api (or your method)")
    safe_print("2. Test API: curl http://localhost:5002/api/predict/registrations?weeks=4")
    safe_print("3. Clear browser cache and refresh frontend")
    safe_print("")
    
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)

