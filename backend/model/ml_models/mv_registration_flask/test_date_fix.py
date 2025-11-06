"""
Test Script for Date Handling Fix
Tests that predictions start from correct future dates after the last registration date.

Run this script on your VPS backend to verify the fix works correctly.
"""

import os
import sys
import pandas as pd
from datetime import datetime, timedelta
import json

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data_preprocessor import DataPreprocessor
from sarima_model import SARIMAModel

def test_date_handling_fix():
    """
    Test that predictions start from correct future dates
    """
    print("=" * 70)
    print("TESTING DATE HANDLING FIX")
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
    
    # Step 1: Load and preprocess data
    print("Step 1: Loading and preprocessing data...")
    try:
        preprocessor = DataPreprocessor(csv_path)
        weekly_data, processing_info = preprocessor.load_and_process_data()
        
        print(f"✅ Data loaded successfully")
        print(f"   - Total weeks: {len(weekly_data)}")
        print(f"   - Date range: {weekly_data.index.min()} to {weekly_data.index.max()}")
        
        # Get actual last registration date
        if 'actual_date_range' in processing_info:
            actual_last_date = pd.to_datetime(processing_info['actual_date_range']['end'])
            actual_first_date = pd.to_datetime(processing_info['actual_date_range']['start'])
            print(f"   - Actual registration date range: {actual_first_date} to {actual_last_date}")
        else:
            print("   ⚠️  Warning: actual_date_range not found in processing_info")
            actual_last_date = None
        
        print()
        
    except Exception as e:
        print(f"❌ ERROR loading data: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    # Step 2: Initialize model
    print("Step 2: Initializing SARIMA model...")
    try:
        model = SARIMAModel(model_dir=model_dir, municipality=None)
        print(f"✅ Model initialized")
        print()
    except Exception as e:
        print(f"❌ ERROR initializing model: {str(e)}")
        return False
    
    # Step 3: Train model (or load existing)
    print("Step 3: Training/loading model...")
    try:
        if model.model_exists():
            print("   - Existing model found. Loading...")
            model.load_model()
            print("   ✅ Model loaded from disk")
            
            # Check if actual_last_date is in metadata
            if hasattr(model, '_metadata') and model._metadata:
                if 'actual_last_date' in model._metadata:
                    stored_date = pd.to_datetime(model._metadata['actual_last_date'])
                    print(f"   - Actual last date from metadata: {stored_date}")
                else:
                    print("   ⚠️  Warning: actual_last_date not in metadata (old model)")
        else:
            print("   - No existing model. Training new model...")
            training_info = model.train(
                data=weekly_data,
                force=False,
                processing_info=processing_info
            )
            print("   ✅ Model trained successfully")
        
        print()
    except Exception as e:
        print(f"❌ ERROR training/loading model: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    # Step 4: Check what date the model is using
    print("Step 4: Checking date information...")
    try:
        # Check actual_last_date attribute
        if hasattr(model, 'actual_last_date') and model.actual_last_date is not None:
            model_actual_date = pd.to_datetime(model.actual_last_date)
            print(f"   ✅ Model has actual_last_date: {model_actual_date}")
        else:
            print(f"   ⚠️  Warning: Model does not have actual_last_date attribute")
            model_actual_date = None
        
        # Check metadata
        if hasattr(model, '_metadata') and model._metadata:
            if 'actual_last_date' in model._metadata:
                metadata_date = pd.to_datetime(model._metadata['actual_last_date'])
                print(f"   ✅ Metadata has actual_last_date: {metadata_date}")
            else:
                print(f"   ⚠️  Warning: actual_last_date not in metadata")
                metadata_date = None
        
        # Check all_data (week_start date)
        if model.all_data is not None and len(model.all_data) > 0:
            week_start_date = pd.to_datetime(model.all_data.index.max())
            print(f"   - Week_start date (from all_data): {week_start_date}")
        
        print()
    except Exception as e:
        print(f"❌ ERROR checking dates: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    # Step 5: Generate predictions
    print("Step 5: Generating predictions...")
    try:
        predictions = model.predict(weeks=4)
        
        if not predictions or 'weekly_predictions' not in predictions:
            print("❌ ERROR: Invalid predictions returned")
            return False
        
        print(f"   ✅ Predictions generated successfully")
        print(f"   - Number of weekly predictions: {len(predictions['weekly_predictions'])}")
        print()
    except Exception as e:
        print(f"❌ ERROR generating predictions: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    # Step 6: Verify dates are correct
    print("Step 6: Verifying prediction dates...")
    print()
    
    # Get dates
    if actual_last_date is None:
        # Try to get from model
        if hasattr(model, 'actual_last_date') and model.actual_last_date is not None:
            actual_last_date = pd.to_datetime(model.actual_last_date)
        elif hasattr(model, '_metadata') and model._metadata and 'actual_last_date' in model._metadata:
            actual_last_date = pd.to_datetime(model._metadata['actual_last_date'])
        else:
            print("   ⚠️  Warning: Cannot determine actual_last_date. Using week_start date.")
            if model.all_data is not None and len(model.all_data) > 0:
                actual_last_date = pd.to_datetime(model.all_data.index.max())
            else:
                print("   ❌ ERROR: Cannot determine last date")
                return False
    
    first_prediction_date = pd.to_datetime(predictions['weekly_predictions'][0]['date'])
    last_prediction_date = pd.to_datetime(predictions['weekly_predictions'][-1]['date'])
    
    print(f"   📅 Actual last registration date: {actual_last_date.strftime('%Y-%m-%d (%A)')}")
    print(f"   📅 First prediction date: {first_prediction_date.strftime('%Y-%m-%d (%A)')}")
    print(f"   📅 Last prediction date: {last_prediction_date.strftime('%Y-%m-%d (%A)')}")
    print()
    
    # Verify predictions are in the future
    print("   Verifying dates are in the future...")
    all_dates_correct = True
    
    if first_prediction_date <= actual_last_date:
        print(f"   ❌ FAIL: First prediction date ({first_prediction_date}) is NOT after last registration date ({actual_last_date})")
        all_dates_correct = False
    else:
        print(f"   ✅ PASS: First prediction date is after last registration date")
    
    # Check if first prediction is on a Sunday (week_start)
    if first_prediction_date.weekday() != 6:  # 6 = Sunday
        print(f"   ⚠️  WARNING: First prediction date is not a Sunday (week_start should be Sunday)")
    else:
        print(f"   ✅ First prediction date is a Sunday (correct week_start)")
    
    # Check all prediction dates
    print()
    print("   All prediction dates:")
    for i, pred in enumerate(predictions['weekly_predictions'], 1):
        pred_date = pd.to_datetime(pred['date'])
        is_future = pred_date > actual_last_date
        status = "✅" if is_future else "❌"
        print(f"   {status} Week {i}: {pred_date.strftime('%Y-%m-%d (%A)')} - {pred['predicted_count']} registrations")
        if not is_future:
            all_dates_correct = False
    
    print()
    
    # Final verification
    print("=" * 70)
    if all_dates_correct:
        print("✅ ALL TESTS PASSED!")
        print("   Predictions are correctly starting from future dates.")
    else:
        print("❌ TESTS FAILED!")
        print("   Some predictions are in the past. Please check the fix.")
    print("=" * 70)
    print()
    
    # Additional info
    print("Additional Information:")
    print(f"   - Prediction start date: {predictions.get('prediction_start_date', 'N/A')}")
    print(f"   - Last data date (reported): {predictions.get('last_data_date', 'N/A')}")
    print(f"   - Last training date: {predictions.get('last_training_date', 'N/A')}")
    print()
    
    return all_dates_correct


if __name__ == "__main__":
    print()
    print("🧪 Date Handling Fix Test Script")
    print("This script verifies that predictions start from correct future dates.")
    print()
    
    success = test_date_handling_fix()
    
    if success:
        print("✅ Test completed successfully!")
        sys.exit(0)
    else:
        print("❌ Test failed. Please review the errors above.")
        sys.exit(1)

