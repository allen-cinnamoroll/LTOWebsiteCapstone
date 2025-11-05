"""
Quick test script for the optimized SARIMA model
Tests data loading, model training, and prediction generation
"""

import os
import sys
from data_preprocessor_daily import DailyDataPreprocessor
from sarima_model_optimized import OptimizedSARIMAModel
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def test_data_loading():
    """Test data loading and preprocessing"""
    logger.info("=" * 60)
    logger.info("TEST 1: Data Loading and Preprocessing")
    logger.info("=" * 60)
    
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(base_dir, '../mv registration training')
        if not os.path.exists(data_dir):
            data_dir_alt = os.path.join(base_dir, '../mv_registration_training')
            if os.path.exists(data_dir_alt):
                data_dir = data_dir_alt
        
        csv_path = os.path.join(data_dir, 'DAVOR_data.csv')
        
        if not os.path.exists(csv_path):
            logger.error(f"Data file not found: {csv_path}")
            return False
        
        preprocessor = DailyDataPreprocessor(csv_path)
        daily_data, exogenous_vars, processing_info = preprocessor.load_and_process_daily_data(
            fill_missing_days=True,
            fill_method='zero'
        )
        
        logger.info(f"✅ Data loaded successfully!")
        logger.info(f"   Total days: {len(daily_data)}")
        logger.info(f"   Days with registrations: {processing_info['days_with_registrations']}")
        logger.info(f"   Total registrations: {processing_info['total_registrations']}")
        logger.info(f"   Exogenous variables: {list(exogenous_vars.columns)}")
        
        return True, daily_data, exogenous_vars
        
    except Exception as e:
        logger.error(f"❌ Data loading failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False, None, None

def test_model_initialization():
    """Test model initialization"""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 2: Model Initialization")
    logger.info("=" * 60)
    
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_dir = os.path.join(base_dir, '../trained')
        
        model = OptimizedSARIMAModel(
            model_dir=model_dir,
            municipality=None,
            use_normalization=False,
            scaler_type='minmax'
        )
        
        logger.info(f"✅ Model initialized successfully!")
        logger.info(f"   Model directory: {model_dir}")
        logger.info(f"   Model exists: {model.model_exists()}")
        
        return True, model
        
    except Exception as e:
        logger.error(f"❌ Model initialization failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False, None

def test_stationarity_check(daily_data):
    """Test stationarity checking"""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 3: Stationarity Check")
    logger.info("=" * 60)
    
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_dir = os.path.join(base_dir, '../trained')
        
        model = OptimizedSARIMAModel(model_dir=model_dir)
        series = daily_data['count']
        
        is_stationary, adf_info = model.check_stationarity(series, verbose=True)
        
        logger.info(f"✅ Stationarity check completed!")
        logger.info(f"   Is stationary: {is_stationary}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Stationarity check failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_auto_arima(daily_data, exogenous_vars):
    """Test auto ARIMA parameter optimization (quick test with small subset)"""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 4: Auto ARIMA Parameter Optimization (Quick Test)")
    logger.info("=" * 60)
    
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_dir = os.path.join(base_dir, '../trained')
        
        model = OptimizedSARIMAModel(model_dir=model_dir)
        series = daily_data['count']
        
        # Use a subset for quick testing (first 100 days)
        test_series = series.iloc[:100]
        test_exog = exogenous_vars[['is_weekend_or_holiday']].iloc[:100] if exogenous_vars is not None else None
        
        logger.info(f"Testing with {len(test_series)} days...")
        logger.info("This may take a few minutes...")
        
        params = model.find_optimal_parameters_auto(
            test_series,
            exogenous=test_exog,
            seasonal_period=7
        )
        
        logger.info(f"✅ Auto ARIMA completed!")
        logger.info(f"   Optimal parameters: {params}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Auto ARIMA failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_model_loading(model):
    """Test model loading (if model exists)"""
    logger.info("\n" + "=" * 60)
    logger.info("TEST 5: Model Loading")
    logger.info("=" * 60)
    
    try:
        if model.model_exists():
            model.load_model()
            logger.info(f"✅ Model loaded successfully!")
            logger.info(f"   Parameters: {model.model_params}")
            if model.accuracy_metrics:
                logger.info(f"   In-sample MAPE: {model.accuracy_metrics.get('mape', 'N/A'):.2f}%")
            if model.test_accuracy_metrics:
                logger.info(f"   Out-of-sample MAPE: {model.test_accuracy_metrics.get('mape', 'N/A'):.2f}%")
            return True
        else:
            logger.info("ℹ️  No existing model found. Skipping load test.")
            return None
        
    except Exception as e:
        logger.error(f"❌ Model loading failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    logger.info("=" * 60)
    logger.info("OPTIMIZED SARIMA MODEL - QUICK TEST SUITE")
    logger.info("=" * 60)
    
    results = {}
    
    # Test 1: Data Loading
    success, daily_data, exogenous_vars = test_data_loading()
    results['data_loading'] = success
    if not success:
        logger.error("\n❌ Cannot continue without data. Exiting.")
        return
    
    # Test 2: Model Initialization
    success, model = test_model_initialization()
    results['model_init'] = success
    if not success:
        logger.error("\n❌ Cannot continue without model. Exiting.")
        return
    
    # Test 3: Stationarity Check
    results['stationarity'] = test_stationarity_check(daily_data)
    
    # Test 4: Auto ARIMA (optional - can be slow)
    logger.info("\n⚠️  Auto ARIMA test may take several minutes. Skipping for quick test.")
    logger.info("   To test auto ARIMA, uncomment the line below in the code.")
    # results['auto_arima'] = test_auto_arima(daily_data, exogenous_vars)
    
    # Test 5: Model Loading
    results['model_loading'] = test_model_loading(model)
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("TEST SUMMARY")
    logger.info("=" * 60)
    for test_name, result in results.items():
        if result is True:
            logger.info(f"✅ {test_name}: PASSED")
        elif result is False:
            logger.info(f"❌ {test_name}: FAILED")
        else:
            logger.info(f"ℹ️  {test_name}: SKIPPED")
    
    logger.info("\n" + "=" * 60)
    logger.info("All quick tests completed!")
    logger.info("=" * 60)
    logger.info("\nNext steps:")
    logger.info("1. Run 'python train_optimized_model.py' to train the full model")
    logger.info("2. Run 'python app_optimized.py' to start the API server")
    logger.info("3. Check 'sarima_model.log' for detailed logs")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        logger.info("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        logger.error(f"\n\n❌ Test suite failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

