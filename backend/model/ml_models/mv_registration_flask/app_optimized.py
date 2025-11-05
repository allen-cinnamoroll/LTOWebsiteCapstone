"""
Optimized Flask API for Vehicle Registration Prediction
Uses the optimized SARIMA model with daily data, auto_arima, and exogenous variables
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import sys
from datetime import datetime, timedelta
import traceback
import logging
import pandas as pd

# Import optimized components
from data_preprocessor_daily import DailyDataPreprocessor
from sarima_model_optimized import OptimizedSARIMAModel

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB

# Enable CORS
CORS(app, 
     resources={
         r"/api/*": {
             "origins": "*",
             "methods": ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
             "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
             "expose_headers": ["Content-Type"],
             "supports_credentials": False
         }
     },
     supports_credentials=False,
     automatic_options=True)

@app.after_request
def after_request(response):
    """Ensure CORS headers are always present"""
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,PUT,DELETE')
    return response

# Initialize models
optimized_model = None
preprocessor = None

def initialize_optimized_model():
    """Initialize the optimized SARIMA model"""
    global optimized_model, preprocessor
    
    try:
        # Get directory paths
        base_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(base_dir, '../mv registration training')
        if not os.path.exists(data_dir):
            data_dir_alt = os.path.join(base_dir, '../mv_registration_training')
            if os.path.exists(data_dir_alt):
                data_dir = data_dir_alt
        
        model_dir = os.path.join(base_dir, '../trained')
        csv_path = os.path.join(data_dir, 'DAVOR_data.csv')
        
        # Initialize preprocessor
        preprocessor = DailyDataPreprocessor(csv_path)
        
        # Initialize optimized model
        optimized_model = OptimizedSARIMAModel(
            model_dir=model_dir,
            municipality=None,
            use_normalization=False,  # Can be enabled if needed
            scaler_type='minmax'
        )
        
        # Check if model exists
        if optimized_model.model_exists():
            logger.info("Loading existing optimized model...")
            optimized_model.load_model()
        else:
            logger.info("No existing model found. Training new optimized model...")
            # Load data
            daily_data, exogenous_vars, _ = preprocessor.load_and_process_daily_data(
                fill_missing_days=True,
                fill_method='zero'
            )
            # Train model
            optimized_model.train(
                data=daily_data,
                exogenous=exogenous_vars[['is_weekend_or_holiday']],
                force=False
            )
        
        logger.info("Optimized model initialized successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Error initializing optimized model: {str(e)}")
        traceback.print_exc()
        return False

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_initialized': optimized_model is not None,
        'model_type': 'optimized_sarima_daily'
    }), 200

@app.route('/api/predict/registrations/optimized', methods=['GET'])
def predict_registrations_optimized():
    """
    Get vehicle registration predictions using optimized model
    
    Query Parameters:
    - days (int, optional): Number of days to predict (default: 30, max: 365)
    
    Returns:
    - daily_predictions: List of daily predictions
    - weekly_predictions: Aggregated weekly predictions
    - monthly_aggregation: Aggregated monthly prediction
    """
    try:
        if optimized_model is None:
            return jsonify({
                'success': False,
                'error': 'Model not initialized'
            }), 500
        
        # Get parameters
        days = request.args.get('days', default=30, type=int)
        
        # Validate days parameter
        if days < 1 or days > 365:
            return jsonify({
                'success': False,
                'error': 'Days must be between 1 and 365'
            }), 400
        
        # Generate future exogenous variables for prediction period
        # Get last date from model
        last_date = pd.to_datetime(optimized_model.all_data.index.max())
        future_dates = pd.date_range(
            start=last_date + timedelta(days=1),
            periods=days,
            freq='D'
        )
        
        # Create future exogenous variables
        future_exog = preprocessor._create_exogenous_variables(future_dates)
        future_exog = future_exog[['is_weekend_or_holiday']]  # Use only the combined indicator
        
        # Make predictions
        predictions = optimized_model.predict(days=days, exogenous=future_exog)
        
        return jsonify({
            'success': True,
            'data': predictions,
            'model_info': {
                'model_type': 'optimized_sarima_daily',
                'parameters': optimized_model.model_params,
                'accuracy': optimized_model.test_accuracy_metrics
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error generating predictions: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/model/accuracy/optimized', methods=['GET'])
def get_model_accuracy_optimized():
    """Get optimized model accuracy metrics"""
    try:
        if optimized_model is None:
            return jsonify({
                'success': False,
                'error': 'Model not initialized'
            }), 500
        
        accuracy_data = {
            'in_sample': optimized_model.accuracy_metrics,
            'out_of_sample': optimized_model.test_accuracy_metrics,
            'cross_validation': optimized_model.cv_results,
            'diagnostics': optimized_model.diagnostics,
            'model_parameters': optimized_model.model_params
        }
        
        return jsonify({
            'success': True,
            'data': accuracy_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/model/retrain/optimized', methods=['POST'])
def retrain_model_optimized():
    """Retrain the optimized model"""
    try:
        global optimized_model
        
        force = request.json.get('force', False) if request.json else False
        
        # Load data
        daily_data, exogenous_vars, _ = preprocessor.load_and_process_daily_data(
            fill_missing_days=True,
            fill_method='zero'
        )
        
        # Train model
        training_info = optimized_model.train(
            data=daily_data,
            exogenous=exogenous_vars[['is_weekend_or_holiday']],
            force=force
        )
        
        return jsonify({
            'success': True,
            'data': training_info
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

if __name__ == '__main__':
    # Initialize model on startup
    if initialize_optimized_model():
        logger.info("Starting optimized Flask API server...")
        app.run(host='0.0.0.0', port=5002, debug=True)
    else:
        logger.error("Failed to initialize model. Exiting.")
        sys.exit(1)

