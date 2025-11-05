"""
Training Script for Optimized SARIMA Model
Trains the optimized daily SARIMA model with all enhancements
"""

import os
import sys
from data_preprocessor_daily import DailyDataPreprocessor
from sarima_model_optimized import OptimizedSARIMAModel
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Main training function"""
    logger.info("=" * 60)
    logger.info("OPTIMIZED SARIMA MODEL TRAINING")
    logger.info("=" * 60)
    
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
        logger.error(f"Data file not found: {csv_path}")
        return
    
    # Initialize preprocessor
    logger.info("Initializing data preprocessor...")
    preprocessor = DailyDataPreprocessor(csv_path)
    
    # Load and process daily data
    logger.info("Loading and processing daily data...")
    daily_data, exogenous_vars, processing_info = preprocessor.load_and_process_daily_data(
        fill_missing_days=True,
        fill_method='zero'  # Fill weekends/holidays with 0
    )
    
    logger.info(f"\nData Summary:")
    logger.info(f"  Total days: {len(daily_data)}")
    logger.info(f"  Days with registrations: {processing_info['days_with_registrations']}")
    logger.info(f"  Days with zero: {processing_info['days_with_zero']}")
    logger.info(f"  Total registrations: {processing_info['total_registrations']}")
    logger.info(f"  Mean per day: {processing_info['mean_per_day']:.2f}")
    
    # Initialize optimized model
    logger.info("\nInitializing optimized SARIMA model...")
    model = OptimizedSARIMAModel(
        model_dir=model_dir,
        municipality=None,  # Aggregated model
        use_normalization=False,  # Set to True if needed
        scaler_type='minmax'
    )
    
    # Train model
    logger.info("\nStarting model training...")
    training_info = model.train(
        data=daily_data,
        exogenous=exogenous_vars[['is_weekend_or_holiday']],  # Use combined weekend/holiday indicator
        force=True  # Force retraining
    )
    
    # Print summary
    logger.info("\n")
    model.print_model_summary()
    
    # Generate sample predictions
    logger.info("\nGenerating 30-day forecast...")
    predictions = model.predict(days=30)
    
    logger.info(f"\nForecast Summary:")
    logger.info(f"  Prediction start: {predictions['prediction_start_date']}")
    logger.info(f"  Monthly total: {predictions['monthly_aggregation']['total_predicted']}")
    logger.info(f"  Confidence interval: [{predictions['monthly_aggregation']['lower_bound']}, {predictions['monthly_aggregation']['upper_bound']}]")
    
    logger.info("\n" + "=" * 60)
    logger.info("TRAINING COMPLETED")
    logger.info("=" * 60)
    
    return model, training_info, predictions

if __name__ == '__main__':
    try:
        model, training_info, predictions = main()
        logger.info("\nTraining successful!")
    except Exception as e:
        logger.error(f"Training failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

