"""
Quick script to retrain the SARIMA model with the date fix
This will store the actual_last_date in metadata for correct future predictions
"""

import os
import sys
from data_preprocessor import DataPreprocessor
from sarima_model import SARIMAModel

def main():
    print("=" * 70)
    print("RETRAINING SARIMA MODEL WITH DATE FIX")
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
    csv_path = os.path.join(data_dir, 'DAVOR_data.csv')
    
    # Check if data exists
    if not os.path.exists(csv_path):
        print(f"❌ ERROR: Data file not found: {csv_path}")
        return False
    
    print(f"📁 Data directory: {data_dir}")
    print(f"📁 Model directory: {model_dir}")
    print()
    
    # Load data
    print("Step 1: Loading and preprocessing data...")
    try:
        preprocessor = DataPreprocessor(csv_path)
        weekly_data, processing_info = preprocessor.load_and_process_data()
        
        print(f"✅ Data loaded successfully")
        print(f"   - Total weeks: {len(weekly_data)}")
        print(f"   - Date range: {weekly_data.index.min()} to {weekly_data.index.max()}")
        
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
    print("Step 2: Initializing and training model...")
    try:
        model = SARIMAModel(model_dir=model_dir, municipality=None)
        
        print("   - Training model with force=True (will overwrite existing model)...")
        training_info = model.train(
            data=weekly_data,
            force=True,  # Force retraining to update metadata
            processing_info=processing_info
        )
        
        if training_info:
            print("   ✅ Model trained successfully!")
            print(f"   - Model parameters: {training_info['model_params']}")
            print(f"   - Training accuracy (MAPE): {training_info['accuracy_metrics']['mape']:.2f}%")
            if training_info.get('test_accuracy_metrics'):
                print(f"   - Test accuracy (MAPE): {training_info['test_accuracy_metrics']['mape']:.2f}%")
        else:
            print("   ⚠️  Model already exists and force=False")
        
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
                print(f"   - last_data_date (week_start): {metadata['last_data_date']}")
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
    print("1. Run the test script: python3 test_date_fix.py")
    print("2. Verify predictions start from correct future dates")
    print()
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

