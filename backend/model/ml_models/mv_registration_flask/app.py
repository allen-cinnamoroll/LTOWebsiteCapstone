"""
Flask API for Vehicle Registration Prediction using Optimized SARIMA
This standalone Flask application provides endpoints for:
- GET /api/predict/registrations - Get prediction results
- GET /api/model/accuracy - Get model accuracy metrics
- POST /api/model/retrain - Retrain the model

Uses optimized SARIMA model with:
- Daily data processing (s=7 for weekly seasonality)
- Auto parameter optimization (pmdarima.auto_arima)
- Exogenous variables (weekends/holidays)
- Cross-validation (TimeSeriesSplit)
- Enhanced metrics (MAE, RMSE, MAPE, R²)
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import sys
from datetime import datetime, timedelta
import traceback
from werkzeug.utils import secure_filename
import pandas as pd
import logging

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sarima_model_optimized import OptimizedSARIMAModel
from data_preprocessor_daily import DailyDataPreprocessor
from config import ENABLE_PER_MUNICIPALITY, DAVAO_ORIENTAL_MUNICIPALITIES

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Set maximum upload size to 50MB
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB

# Enable CORS for all routes with more permissive settings
# Allow all origins, methods, and headers to fix CORS issues
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

# Add after_request handler to ensure CORS headers are always set
@app.after_request
def after_request(response):
    """Ensure CORS headers are always present"""
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,PUT,DELETE')
    return response

# Initialize models
aggregated_model = None  # Main aggregated model (always used)
municipality_models = {}  # Dictionary of per-municipality models (when enabled)
preprocessor = None

def initialize_model():
    """Initialize the Optimized SARIMA model(s) and preprocessor with daily data"""
    global aggregated_model, municipality_models, preprocessor
    try:
        # Get the directory paths
        base_dir = os.path.dirname(os.path.abspath(__file__))
        # Handle directory name with spaces - the CSV is in a sibling directory
        # mv_registration_flask and "mv registration training" are siblings in ml_models/
        data_dir = os.path.join(base_dir, '../mv registration training')
        if not os.path.exists(data_dir):
            # Try alternative path without spaces (if renamed)
            data_dir_alt = os.path.join(base_dir, '../mv_registration_training')
            if os.path.exists(data_dir_alt):
                data_dir = data_dir_alt
            else:
                # Try absolute path from project root
                project_root = os.path.join(base_dir, '../../../..')
                data_dir_abs = os.path.join(project_root, 'backend/model/ml_models/mv registration training')
                if os.path.exists(data_dir_abs):
                    data_dir = data_dir_abs
        
        model_dir = os.path.join(base_dir, '../trained')
        
        # Create directories if they don't exist
        os.makedirs(model_dir, exist_ok=True)
        
        # Initialize daily preprocessor
        csv_path = os.path.join(data_dir, 'DAVOR_data.csv')
        preprocessor = DailyDataPreprocessor(csv_path)
        
        # Initialize aggregated model (always needed) - using optimized version
        logger.info("Initializing optimized aggregated model...")
        aggregated_model = OptimizedSARIMAModel(
            model_dir=model_dir,
            municipality=None,
            use_normalization=False,  # Can be enabled if needed
            scaler_type='minmax'
        )
        
        if aggregated_model.model_exists():
            logger.info("Loading existing optimized aggregated model...")
            aggregated_model.load_model()
        else:
            logger.info("Training new optimized aggregated model...")
            # Load daily data with exogenous variables
            daily_data, exogenous_vars, processing_info = preprocessor.load_and_process_daily_data(
                fill_missing_days=True,
                fill_method='zero'
            )
            # Train with exogenous variables (weekends/holidays)
            aggregated_model.train(
                data=daily_data,
                exogenous=exogenous_vars[['is_weekend_or_holiday']],  # Use combined indicator
                force=False,
                processing_info=processing_info
            )
        
        # Initialize per-municipality models if enabled
        # Note: Per-municipality models are not yet implemented for optimized version
        # This would require updating DailyDataPreprocessor to support per-municipality
        if ENABLE_PER_MUNICIPALITY:
            logger.warning("Per-municipality mode is not yet fully implemented for optimized daily model.")
            logger.info("Using aggregated model for all predictions.")
            municipality_models = {}  # Keep empty for now
        else:
            logger.info("Per-municipality mode disabled. Using aggregated optimized model only.")
        
        logger.info("Optimized model initialized successfully!")
        return True
    except Exception as e:
        logger.error(f"Error initializing optimized model: {str(e)}")
        traceback.print_exc()
        return False

@app.route('/api/predict/registrations', methods=['GET'])
def predict_registrations():
    """
    Get vehicle registration predictions for Davao Oriental (Optimized Daily Model)
    
    Query Parameters:
    - weeks (int, optional): Number of weeks to predict (default: 4, max: 52)
    - municipality (str, optional): Specific municipality (not yet supported for optimized model)
    
    Returns:
    - weekly_predictions: List of weekly predictions (aggregated from daily predictions)
    - monthly_aggregation: Aggregated monthly prediction
    - prediction_dates: List of dates for predictions
    """
    try:
        if aggregated_model is None:
            return jsonify({
                'success': False,
                'error': 'Model not initialized'
            }), 500
        
        # Get parameters
        weeks = request.args.get('weeks', default=4, type=int)
        municipality = request.args.get('municipality', default=None, type=str)
        
        # Validate weeks parameter
        if weeks < 1 or weeks > 52:
            return jsonify({
                'success': False,
                'error': 'Weeks must be between 1 and 52'
            }), 400
        
        # Convert weeks to days for optimized model (which uses daily data)
        days = weeks * 7
        
        # Note: Per-municipality models not yet implemented for optimized version
        if municipality:
            logger.warning(f"Municipality filter '{municipality}' requested but not yet supported for optimized model. Using aggregated model.")
        
        # Generate future exogenous variables for prediction period
        # Get last date from model
        if aggregated_model.all_data is not None and len(aggregated_model.all_data) > 0:
            last_date = pd.to_datetime(aggregated_model.all_data.index.max())
        elif hasattr(aggregated_model, '_metadata') and aggregated_model._metadata and 'last_data_date' in aggregated_model._metadata:
            last_date = pd.to_datetime(aggregated_model._metadata['last_data_date'])
            else:
            last_date = pd.to_datetime(aggregated_model.training_data.index.max())
        
        # Create future dates for exogenous variables
        future_dates = pd.date_range(
            start=last_date + timedelta(days=1),
            periods=days,
            freq='D'
        )
        
        # Create future exogenous variables
        future_exog = preprocessor._create_exogenous_variables(future_dates)
        future_exog = future_exog[['is_weekend_or_holiday']]  # Use only the combined indicator
        
        # Make predictions using optimized model (returns daily, weekly, and monthly aggregations)
        predictions = aggregated_model.predict(days=days, exogenous=future_exog)
        
        # Format response to match expected API format (backward compatibility)
        # The optimized model already provides weekly_predictions and monthly_aggregation
        formatted_predictions = {
            'weekly_predictions': predictions.get('weekly_predictions', []),
            'monthly_aggregation': predictions.get('monthly_aggregation', {}),
            'prediction_dates': predictions.get('prediction_dates', []),
            'prediction_weeks': weeks,
            'last_training_date': str(last_date),
            'last_data_date': str(last_date),
            'prediction_start_date': predictions.get('prediction_start_date', future_dates[0].strftime('%Y-%m-%d'))
        }
        
        # Add metadata about which model was used
        formatted_predictions['model_used'] = 'optimized_aggregated'
        formatted_predictions['per_municipality_enabled'] = False  # Not yet supported
        formatted_predictions['model_type'] = 'optimized_sarima_daily'
        
        return jsonify({
            'success': True,
            'data': formatted_predictions
        }), 200
        
    except Exception as e:
        logger.error(f"Error generating predictions: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/model/accuracy', methods=['GET'])
def get_model_accuracy():
    """
    Get optimized model accuracy metrics
    
    Returns:
    - in_sample: Training metrics (MAE, RMSE, MAPE, R²)
    - out_of_sample: Test metrics (MAE, RMSE, MAPE, R²)
    - cross_validation: CV results (mean/std MAPE across folds)
    - model_params: SARIMA model parameters (p, d, q, P, D, Q, s)
    - diagnostics: Model diagnostic checks
    """
    try:
        if aggregated_model is None:
            return jsonify({
                'success': False,
                'error': 'Model not initialized'
            }), 500
        
        # Get municipality parameter (not yet supported for optimized model)
        municipality = request.args.get('municipality', default=None, type=str)
        if municipality:
            logger.warning(f"Municipality filter '{municipality}' requested but not yet supported for optimized model.")
        
        # Build accuracy response with all optimized metrics
        accuracy_data = {
            'mae': aggregated_model.accuracy_metrics.get('mae') if aggregated_model.accuracy_metrics else None,
            'rmse': aggregated_model.accuracy_metrics.get('rmse') if aggregated_model.accuracy_metrics else None,
            'mape': aggregated_model.accuracy_metrics.get('mape') if aggregated_model.accuracy_metrics else None,
            'r2': aggregated_model.accuracy_metrics.get('r2') if aggregated_model.accuracy_metrics else None,
            'model_parameters': aggregated_model.model_params,
            'in_sample': aggregated_model.accuracy_metrics,
            'out_of_sample': aggregated_model.test_accuracy_metrics,
            'cross_validation': aggregated_model.cv_results,
            'diagnostics': aggregated_model.diagnostics,
            'model_type': 'optimized_sarima_daily',
            'per_municipality_enabled': False
        }
        
        # Add test metrics for backward compatibility
        if aggregated_model.test_accuracy_metrics:
            accuracy_data['test_accuracy_metrics'] = {
                'mae': aggregated_model.test_accuracy_metrics.get('mae'),
                'rmse': aggregated_model.test_accuracy_metrics.get('rmse'),
                'mape': aggregated_model.test_accuracy_metrics.get('mape'),
                'r2': aggregated_model.test_accuracy_metrics.get('r2')
            }
        
        if accuracy_data['mae'] is None:
            return jsonify({
                'success': False,
                'error': 'Model not trained yet. Please train the model first.'
            }), 404
        
        return jsonify({
            'success': True,
            'data': accuracy_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting accuracy metrics: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/upload-csv', methods=['OPTIONS'])
def upload_csv_options():
    """Handle CORS preflight requests for upload endpoint"""
    return '', 200

@app.route('/api/upload-csv', methods=['POST'])
def upload_csv():
    """
    Upload a CSV file to the training data directory
    
    Form Data:
    - file: CSV file to upload
    
    Returns:
    - success: Boolean indicating success
    - message: Status message
    - filename: Name of the saved file
    """
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        if not file.filename.lower().endswith('.csv'):
            return jsonify({
                'success': False,
                'error': 'File must be a CSV file'
            }), 400
        
        # Get the training data directory
        base_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(base_dir, '../mv registration training')
        
        # Try alternative paths if directory doesn't exist
        if not os.path.exists(data_dir):
            data_dir_alt = os.path.join(base_dir, '../mv_registration_training')
            if os.path.exists(data_dir_alt):
                data_dir = data_dir_alt
            else:
                project_root = os.path.join(base_dir, '../../../..')
                data_dir_abs = os.path.join(project_root, 'backend/model/ml_models/mv registration training')
                if os.path.exists(data_dir_abs):
                    data_dir = data_dir_abs
                else:
                    return jsonify({
                        'success': False,
                        'error': 'Training data directory not found'
                    }), 500
        
        # Create directory if it doesn't exist
        os.makedirs(data_dir, exist_ok=True)
        
        # Secure the filename
        filename = secure_filename(file.filename)
        
        # Add timestamp to avoid overwriting existing files
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        name, ext = os.path.splitext(filename)
        filename = f"{name}_{timestamp}{ext}"
        
        # Save the file
        file_path = os.path.join(data_dir, filename)
        file.save(file_path)
        
        print(f"CSV file uploaded successfully: {filename}")
        print(f"Saved to: {file_path}")
        
        return jsonify({
            'success': True,
            'message': 'CSV file uploaded successfully',
            'filename': filename,
            'path': file_path
        }), 200
        
    except Exception as e:
        print(f"Error uploading CSV file: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'Failed to upload file: {str(e)}'
        }), 500

@app.route('/api/model/retrain', methods=['POST'])
def retrain_model():
    """
    Retrain the Optimized SARIMA model with updated data
    
    Optional JSON Body:
    - force (bool): Force retrain even if model exists (default: false)
    
    Returns:
    - success: Boolean indicating success
    - message: Status message
    - training_info: Information about the training process (including CV results)
    """
    try:
        if aggregated_model is None or preprocessor is None:
            return jsonify({
                'success': False,
                'error': 'Model or preprocessor not initialized'
            }), 500
        
        # Get request body
        data = request.get_json() or {}
        force = data.get('force', False)
        municipality = data.get('municipality', None)  # Not yet supported for optimized model
        
        if municipality:
            logger.warning(f"Municipality-specific retraining not yet supported for optimized model. Retraining aggregated model.")
        
        # Check if model exists and force is required
        if aggregated_model.model_exists() and not force:
            return jsonify({
                'success': False,
                'error': 'Model already exists. Use force=true to retrain.',
                'message': 'Set "force": true in request body to retrain existing model'
            }), 400
        
        # Retrain aggregated optimized model
        logger.info("Retraining optimized aggregated model...")
        daily_data, exogenous_vars, processing_info = preprocessor.load_and_process_daily_data(
            fill_missing_days=True,
            fill_method='zero'
        )
        
        training_info = aggregated_model.train(
            data=daily_data,
            exogenous=exogenous_vars[['is_weekend_or_holiday']],  # Use combined indicator
            force=force,
            processing_info=processing_info
        )
        
        # Add processing info to training results
        if training_info:
            training_info['processing_info'] = processing_info
            training_info['model_type'] = 'optimized_sarima_daily'
        
        return jsonify({
            'success': True,
            'message': 'Optimized model retrained successfully',
            'data': {
                'aggregated': training_info
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error retraining model: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    municipality_models_count = len(municipality_models) if municipality_models else 0
    
    return jsonify({
        'success': True,
        'status': 'healthy',
        'model_type': 'optimized_sarima_daily',
        'aggregated_model_initialized': aggregated_model is not None,
        'aggregated_model_trained': aggregated_model.model_exists() if aggregated_model else False,
        'per_municipality_enabled': False,  # Not yet implemented for optimized model
        'municipality_models_count': municipality_models_count,
        'available_municipality_models': list(municipality_models.keys()) if municipality_models else [],
        'timestamp': datetime.now().isoformat()
    }), 200

# Error handlers
@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file size too large errors"""
    return jsonify({
        'success': False,
        'error': 'File size too large. Maximum size is 50MB.'
    }), 413

@app.errorhandler(403)
def forbidden(error):
    """Handle forbidden errors"""
    return jsonify({
        'success': False,
        'error': 'Access forbidden. Please check CORS and server configuration.'
    }), 403

@app.route('/', methods=['GET'])
def index():
    """API information endpoint"""
    return jsonify({
        'name': 'Vehicle Registration Prediction API',
        'version': '1.0.0',
        'endpoints': {
            'predict': '/api/predict/registrations',
            'accuracy': '/api/model/accuracy',
            'retrain': '/api/model/retrain',
            'upload': '/api/upload-csv',
            'health': '/api/health'
        },
        'description': 'Optimized SARIMA-based prediction API for vehicle registration volumes in Davao Oriental',
        'features': [
            'Daily data processing (s=7 for weekly seasonality)',
            'Auto parameter optimization (pmdarima.auto_arima)',
            'Exogenous variables (weekends/holidays)',
            'Cross-validation (TimeSeriesSplit)',
            'Enhanced metrics (MAE, RMSE, MAPE, R²)'
        ]
    }), 200

if __name__ == '__main__':
    # Check for debug mode from environment variable
    # Set FLASK_DEBUG=1 to enable auto-reload on code changes (development only!)
    debug_mode = os.getenv('FLASK_DEBUG', '0').lower() in ('1', 'true', 'yes')
    
    logger.info("Initializing Vehicle Registration Prediction API (Optimized Version)...")
    logger.info("Features: Daily data, auto_arima, exogenous variables, cross-validation")
    if initialize_model():
        logger.info("Optimized model initialized successfully!")
        logger.info("Starting Flask server...")
        if debug_mode:
            logger.warning("⚠️  DEBUG MODE ENABLED - Auto-reload is ON (not recommended for production)")
        # Run on all interfaces, port 5001 
        # Frontend expects port 5001
        try:
            app.run(host='0.0.0.0', port=5001, debug=debug_mode)
        except OSError as e:
            if "Address already in use" in str(e):
                logger.error(f"\n⚠️  Port 5001 is in use. Error: {str(e)}")
                logger.error("To kill the process on port 5001, run: sudo lsof -i :5001 && kill -9 <PID>")
                sys.exit(1)
            else:
                raise
    else:
        logger.error("Failed to initialize optimized model. Please check the error messages above.")
        sys.exit(1)

