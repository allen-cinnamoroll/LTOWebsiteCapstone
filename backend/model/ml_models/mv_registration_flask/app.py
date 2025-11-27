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
import numpy as np
import logging
from dotenv import load_dotenv

# Set up basic logging first
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
# Try multiple locations: current directory, backend directory, and parent directories
base_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(base_dir, '../../..')  # Go up to backend directory
project_root = os.path.join(backend_dir, '..')

# Try loading .env from multiple locations
env_loaded = False
for env_path in [
    os.path.join(backend_dir, '.env'),  # backend/.env
    os.path.join(project_root, '.env'),  # project root/.env
    os.path.join(base_dir, '.env'),      # current directory/.env
]:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        logger.info(f"Loaded environment variables from: {env_path}")
        env_loaded = True
        break

if not env_loaded:
    # Try loading from backend directory even if file doesn't exist (dotenv will just skip)
    load_dotenv(os.path.join(backend_dir, '.env'))
    logger.warning(
        "No .env file found. Make sure DATABASE environment variable is set, "
        "or create a .env file in the backend directory with: DATABASE=mongodb://..."
    )

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sarima_model_optimized import OptimizedSARIMAModel
from data_preprocessor_daily import DailyDataPreprocessor
from mongo_to_csv_exporter import export_mongo_to_csv
from barangay_predictor import BarangayPredictor
from config import ENABLE_PER_MUNICIPALITY, DAVAO_ORIENTAL_MUNICIPALITIES, MIN_WEEKS_FOR_MUNICIPALITY_MODEL

def convert_to_native_types(obj):
    """
    Recursively convert NumPy/pandas types to native Python types for JSON serialization.
    
    Handles:
    - numpy int64, int32, etc. -> int
    - numpy float64, float32, etc. -> float
    - numpy bool_ -> bool
    - numpy arrays -> lists
    - pandas Series -> lists
    - pandas Timestamp -> str
    - dict and list (recursive)
    """
    if isinstance(obj, (np.integer, np.int64, np.int32, np.int16, np.int8)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32, np.float16)):
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return [convert_to_native_types(item) for item in obj]
    elif isinstance(obj, pd.Series):
        return [convert_to_native_types(item) for item in obj]
    elif isinstance(obj, pd.Timestamp):
        return str(obj)
    elif isinstance(obj, dict):
        return {key: convert_to_native_types(value) for key, value in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [convert_to_native_types(item) for item in obj]
    elif pd.isna(obj):
        return None
    else:
        return obj

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
barangay_predictor = None  # Barangay-level predictor

def initialize_model():
    """Initialize the Optimized SARIMA model(s) and preprocessor with daily data"""
    global aggregated_model, municipality_models, preprocessor, barangay_predictor
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
        
        # Try to export latest data from MongoDB into the training directory
        # If DATABASE is not set, skip export and use existing CSV files
        csv_path = os.path.join(data_dir, 'DAVOR_data.csv')
        if os.getenv("DATABASE"):
            try:
                export_mongo_to_csv(data_dir, filename="DAVOR_data.csv")
                logger.info("Exported latest registration data from MongoDB to DAVOR_data.csv")
            except Exception as e:
                logger.warning(f"Failed to export data from MongoDB: {str(e)}")
                logger.warning("Will attempt to use existing CSV files if available")
                if not os.path.exists(csv_path):
                    raise RuntimeError(
                        f"Could not export from MongoDB and no existing CSV file found at {csv_path}. "
                        "Please set DATABASE environment variable or ensure CSV files exist in the training directory."
                    )
        else:
            logger.warning(
                "DATABASE environment variable is not set. Skipping MongoDB export. "
                "Will use existing CSV files if available."
            )
            if not os.path.exists(csv_path):
                logger.warning(
                    f"No existing CSV file found at {csv_path}. "
                    "The app may fail if no training data is available. "
                    "Set DATABASE environment variable to export from MongoDB."
                )
        
        # Initialize daily preprocessor (will see all CSVs in the directory, including DAVOR_data.csv)
        csv_path = os.path.join(data_dir, 'DAVOR_data.csv')
        preprocessor = DailyDataPreprocessor(csv_path)
        
        # Initialize barangay predictor
        barangay_predictor = BarangayPredictor(csv_path)
        logger.info("Barangay predictor initialized")
        
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
            # Train with richer exogenous variables (weekends/holidays + schedule-based features)
            exog_cols = [
                'is_weekend_or_holiday',
                'day_of_week',
                'month',
                'is_scheduled_month',
                'is_scheduled_week',
            ]
            available_exog = [c for c in exog_cols if c in exogenous_vars.columns]

            aggregated_model.train(
                data=daily_data,
                exogenous=exogenous_vars[available_exog],
                force=False,
                processing_info=processing_info
            )
        
        # Initialize per-municipality models if enabled
        if ENABLE_PER_MUNICIPALITY:
            logger.info("Initializing per-municipality models...")
            municipality_models = {}
            
            for municipality in DAVAO_ORIENTAL_MUNICIPALITIES:
                try:
                    logger.info(f"Initializing model for {municipality}...")
                    mun_model = OptimizedSARIMAModel(
                        model_dir=model_dir,
                        municipality=municipality,
                        use_normalization=False,
                        scaler_type='minmax'
                    )
                    
                    if mun_model.model_exists():
                        logger.info(f"Loading existing model for {municipality}...")
                        mun_model.load_model()
                        municipality_models[municipality.upper()] = mun_model
                        logger.info(f"✓ Model loaded for {municipality}")
                    else:
                        # Try to train if data is available
                        try:
                            daily_data, exogenous_vars, processing_info = preprocessor.load_and_process_daily_data(
                                fill_missing_days=True,
                                fill_method='zero',
                                municipality=municipality
                            )
                            
                            # Check if we have enough data
                            if len(daily_data) >= MIN_WEEKS_FOR_MUNICIPALITY_MODEL * 7:  # Convert weeks to days
                                logger.info(f"Training new model for {municipality}...")
                                mun_model.train(
                                    data=daily_data,
                                    exogenous=exogenous_vars[['is_weekend_or_holiday']],
                                    force=False,
                                    processing_info=processing_info
                                )
                                municipality_models[municipality.upper()] = mun_model
                                logger.info(f"✓ Model trained for {municipality}")
                            else:
                                logger.warning(f"Insufficient data for {municipality} ({len(daily_data)} days, need {MIN_WEEKS_FOR_MUNICIPALITY_MODEL * 7}). Will use aggregated model.")
                        except Exception as e:
                            logger.warning(f"Could not train model for {municipality}: {str(e)}. Will use aggregated model.")
                except Exception as e:
                    logger.warning(f"Error initializing model for {municipality}: {str(e)}. Will use aggregated model.")
            
            logger.info(f"Initialized {len(municipality_models)} municipality-specific models")
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
    - municipality (str, optional): Specific municipality name (e.g., "CITY OF MATI", "LUPON")
      If provided and a municipality-specific model exists, uses that model. Otherwise uses aggregated model.
    
    Returns:
    - weekly_predictions: List of weekly predictions (aggregated from daily predictions)
    - monthly_aggregation: Aggregated monthly prediction
    - prediction_dates: List of dates for predictions
    - municipality: Municipality name if municipality-specific model was used
    - model_used: Name of the model used for predictions
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
        
        # Determine which model to use
        # Default: aggregated model (used for date logic and as fallback)
        model_to_use = aggregated_model
        model_used_name = 'optimized_aggregated'
        
        municipality_upper = municipality.upper().strip() if municipality else None
        
        # If a specific municipality is requested, try to use its dedicated model
        if municipality_upper:
            if municipality_upper in municipality_models:
                model_to_use = municipality_models[municipality_upper]
                model_used_name = f'optimized_municipality_{municipality_upper}'
                logger.info(f"Using municipality-specific model for {municipality_upper}")
            else:
                logger.warning(
                    f"Municipality-specific model not available for '{municipality_upper}'. "
                    f"Using aggregated model for this request."
                )
                logger.info(f"Available municipality models: {list(municipality_models.keys())}")
        
        # CRITICAL FIX: Force July 31, 2025 as the last training date
        # The test date range ends on July 31, 2025, so ALL predictions must start from August 1, 2025
        # This ensures consistency across all municipalities regardless of when their individual models were trained
        actual_last_date = pd.Timestamp(year=2025, month=7, day=31)
        logger.info(f"Using hardcoded actual_last_date: {actual_last_date} (test date range end: July 31, 2025)")
        logger.info(f"This ensures all predictions start from August 1, 2025 (next month after last training data)")
        
        # Calculate the first day of the next month (same logic as in OptimizedSARIMAModel.predict())
        if actual_last_date.month == 12:
            next_month_start = pd.Timestamp(year=actual_last_date.year + 1, month=1, day=1)
        else:
            next_month_start = pd.Timestamp(year=actual_last_date.year, month=actual_last_date.month + 1, day=1)
        
        logger.info(f"Actual last registration date: {actual_last_date}")
        logger.info(f"First day of next month: {next_month_start}")
        logger.info(f"Generating exogenous variables for dates starting from: {next_month_start}")
        
        # Create future dates for exogenous variables starting from first day of next month
        future_dates = pd.date_range(
            start=next_month_start,
            periods=days,
            freq='D'
        )
        
        # Create future exogenous variables
        future_exog = preprocessor._create_exogenous_variables(future_dates)
        future_exog = future_exog[['is_weekend_or_holiday']]  # Use only the combined indicator
        
        # CRITICAL: Ensure future_exog has a DatetimeIndex so the model can use these dates
        # This ensures all models (aggregated and municipality-specific) use the same prediction dates
        if not isinstance(future_exog.index, pd.DatetimeIndex):
            future_exog.index = future_dates
            logger.info(f"Set DatetimeIndex on future_exog: {future_exog.index[0]} to {future_exog.index[-1]}")
        
        # Decide how to generate predictions:
        # 1. If a municipality is specified, use its model (or aggregated fallback).
        # 2. If no municipality is specified AND per-municipality is enabled with available models,
        #    compute the regional total by summing all municipality-specific predictions.
        # 3. Otherwise, fall back to the aggregated model.
        
        use_municipality_aggregation = (
            municipality_upper is None and
            ENABLE_PER_MUNICIPALITY and
            municipality_models and
            len(municipality_models) > 0
        )
        
        if use_municipality_aggregation:
            # Aggregate predictions from all municipality-specific models
            logger.info(
                "No municipality specified and per-municipality mode is enabled. "
                "Computing regional predictions by summing all municipality models."
            )
            model_used_name = 'aggregated_from_municipalities'
            
            weekly_aggregated = {}
            prediction_start_date = None
            
            # Determine the global first week start date (Sunday on or after next_month_start)
            # to ensure we do NOT include any weeks from the training month (e.g., July).
            next_month_start_weekday = next_month_start.weekday()  # Monday=0, Sunday=6
            days_until_sunday = (6 - next_month_start_weekday) % 7
            if days_until_sunday == 0 and next_month_start_weekday != 6:
                days_until_sunday = 7
            global_first_week_start = next_month_start + timedelta(days=days_until_sunday)
            global_first_week_start_str = global_first_week_start.strftime('%Y-%m-%d')
            
            logger.info(
                f"Global first prediction week start (aggregated from municipalities): "
                f"{global_first_week_start_str}"
            )
            
            for mun_name, mun_model in municipality_models.items():
                try:
                    logger.info(f"Generating predictions for municipality: {mun_name}")
                    mun_predictions = mun_model.predict(days=days, exogenous=future_exog)
                except Exception as e:
                    logger.warning(
                        f"Failed to generate predictions for municipality '{mun_name}': {str(e)}"
                    )
                    continue
                
                # Track earliest prediction_start_date for informational purposes
                if not prediction_start_date:
                    prediction_start_date = mun_predictions.get('prediction_start_date')
                
                for week in mun_predictions.get('weekly_predictions', []):
                    # Use 'date' (week_start) as the key; fall back to 'week_start' if needed
                    date_key = week.get('date') or week.get('week_start')
                    if not date_key:
                        continue
                    
                    # Skip any weeks that start before the global first prediction week
                    if date_key < global_first_week_start_str:
                        continue
                    
                    if date_key not in weekly_aggregated:
                        weekly_aggregated[date_key] = {
                            'date': date_key,
                            'week_start': date_key,
                            'days': [],
                            'total_predicted': 0,
                            'predicted_count': 0,
                            'predicted': 0,
                            'lower_bound': 0,
                            'upper_bound': 0,
                        }
                    
                    entry = weekly_aggregated[date_key]
                    
                    value = (
                        week.get('total_predicted') or
                        week.get('predicted_count') or
                        week.get('predicted') or
                        0
                    )
                    
                    entry['total_predicted'] += value
                    entry['predicted_count'] += value
                    entry['predicted'] += value
                    entry['lower_bound'] += week.get('lower_bound', 0)
                    entry['upper_bound'] += week.get('upper_bound', 0)
            
            # Convert aggregated weekly dict to sorted list
            weekly_predictions = [
                weekly_aggregated[key]
                for key in sorted(weekly_aggregated.keys())
            ]
            
            # Compute overall monthly aggregation as the sum of weekly totals
            total_predicted = sum(w.get('total_predicted', 0) for w in weekly_predictions)
            lower_bound = sum(w.get('lower_bound', 0) for w in weekly_predictions)
            upper_bound = sum(w.get('upper_bound', 0) for w in weekly_predictions)
            
            predictions = {
                'weekly_predictions': weekly_predictions,
                'monthly_aggregation': {
                    'total_predicted': int(round(total_predicted)),
                    'lower_bound': int(round(lower_bound)),
                    'upper_bound': int(round(upper_bound)),
                },
                'prediction_dates': [w['date'] for w in weekly_predictions],
                'prediction_start_date': (
                    prediction_start_date
                    if prediction_start_date is not None and weekly_predictions
                    else (weekly_predictions[0]['date'] if weekly_predictions else next_month_start.strftime('%Y-%m-%d'))
                ),
            }
            
            # Debug: Log aggregated prediction summary
            if predictions.get('weekly_predictions'):
                weekly_totals = [w.get('total_predicted', 0) for w in predictions['weekly_predictions']]
                logger.info(f"DEBUG (aggregated from municipalities): Weekly prediction totals: {weekly_totals}")
                logger.info(
                    f"DEBUG (aggregated from municipalities): Total period prediction: "
                    f"{predictions.get('monthly_aggregation', {}).get('total_predicted', 0)}"
                )
        else:
            # Make predictions using the selected single model (aggregated or municipality-specific)
            logger.info(f"Making predictions for {days} days ({weeks} weeks) using {model_used_name}")
            logger.info(f"Actual last registration date: {actual_last_date}")
            logger.info(f"Future dates range: {future_dates[0]} to {future_dates[-1]}")
            logger.info(f"Exogenous variables shape: {future_exog.shape}")
            logger.info(
                f"Weekend/holiday days in future period: "
                f"{(future_exog['is_weekend_or_holiday'] == 1).sum()} out of {len(future_exog)}"
            )
            
            # CRITICAL FIX: Temporarily override the model's actual_last_date to ensure
            # all models (aggregated and municipality-specific) use the same date logic
            # This ensures predictions always start from the month after the last training data
            original_actual_last_date = None
            if hasattr(model_to_use, 'actual_last_date'):
                original_actual_last_date = model_to_use.actual_last_date
                model_to_use.actual_last_date = actual_last_date
                logger.info(f"Temporarily overriding model's actual_last_date to: {actual_last_date}")
            
            predictions = model_to_use.predict(days=days, exogenous=future_exog)
            
            # Restore original actual_last_date if it was overridden
            if original_actual_last_date is not None:
                model_to_use.actual_last_date = original_actual_last_date
            
            # Debug: Log prediction summary
            if predictions.get('weekly_predictions'):
                weekly_totals = [w.get('total_predicted', 0) for w in predictions['weekly_predictions']]
                logger.info(f"DEBUG: Weekly prediction totals: {weekly_totals}")
                logger.info(
                    f"DEBUG: Total monthly prediction: "
                    f"{predictions.get('monthly_aggregation', {}).get('total_predicted', 0)}"
                )
        
        # Format response to match expected API format (backward compatibility)
        # The optimized model already provides weekly_predictions and monthly_aggregation
        formatted_predictions = {
            'weekly_predictions': predictions.get('weekly_predictions', []),
            'monthly_aggregation': predictions.get('monthly_aggregation', {}),
            'prediction_dates': predictions.get('prediction_dates', []),
            'prediction_weeks': weeks,
            'last_training_date': str(actual_last_date),
            'last_data_date': str(actual_last_date),  # Actual last registration date
            'prediction_start_date': predictions.get('prediction_start_date', future_dates[0].strftime('%Y-%m-%d'))
        }
        
        # Add metadata about which model was used
        formatted_predictions['model_used'] = model_used_name
        formatted_predictions['per_municipality_enabled'] = ENABLE_PER_MUNICIPALITY
        formatted_predictions['model_type'] = 'optimized_sarima_daily'
        formatted_predictions['municipality'] = municipality.upper().strip() if municipality else None
        formatted_predictions['is_municipality_specific'] = model_used_name.startswith('optimized_municipality_')
        formatted_predictions['available_municipality_models'] = list(municipality_models.keys()) if municipality_models else []
        
        # Add barangay predictions if municipality is specified and barangay_predictor is available
        if municipality and barangay_predictor:
            try:
                # Prepare municipality predictions for barangay distribution
                mun_predictions = {}
                for week_pred in formatted_predictions['weekly_predictions']:
                    mun = municipality_upper
                    date = week_pred.get('date') or week_pred.get('week_start')
                    count = week_pred.get('predicted_count') or week_pred.get('total_predicted') or week_pred.get('predicted') or 0
                    
                    if mun not in mun_predictions:
                        mun_predictions[mun] = {}
                    mun_predictions[mun][date] = count
                
                # Distribute to barangays
                barangay_predictions = barangay_predictor.predict_barangay_registrations(
                    mun_predictions,
                    municipality=municipality_upper
                )
                
                if barangay_predictions:
                    # Group by barangay for summary
                    barangay_summary = {}
                    for pred in barangay_predictions:
                        brgy = pred['barangay']
                        if brgy not in barangay_summary:
                            barangay_summary[brgy] = {
                                'total_predicted': 0,
                                'weekly_predictions': []
                            }
                        barangay_summary[brgy]['total_predicted'] += pred['predicted_count']
                        barangay_summary[brgy]['weekly_predictions'].append({
                            'date': pred['date'],
                            'predicted_count': pred['predicted_count']
                        })
                    
                    formatted_predictions['barangay_predictions'] = barangay_predictions
                    formatted_predictions['barangay_summary'] = barangay_summary
                    logger.info(f"Added barangay predictions for {municipality_upper}: {len(barangay_predictions)} predictions across {len(barangay_summary)} barangays")
            except Exception as e:
                logger.warning(f"Could not generate barangay predictions: {str(e)}")
                # Don't fail the request if barangay predictions fail
        
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

@app.route('/api/predict/registrations/barangay', methods=['GET'])
def predict_barangay_registrations():
    """
    Get barangay-level vehicle registration predictions
    
    Query Parameters:
    - weeks (int, optional): Number of weeks to predict (default: 4, max: 52)
    - municipality (str, optional): Specific municipality name (e.g., "CITY OF MATI", "LUPON")
      If not provided, returns predictions for all municipalities
    
    Returns:
    - barangay_predictions: List of barangay-level predictions
    - municipality_summary: Summary per municipality
    - prediction_dates: List of dates for predictions
    """
    try:
        if aggregated_model is None or barangay_predictor is None:
            return jsonify({
                'success': False,
                'error': 'Model or barangay predictor not initialized'
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
        
        # Get municipality-level predictions first
        days = weeks * 7
        municipality_upper = municipality.upper().strip() if municipality else None
        
        # Determine which model to use
        model_to_use = aggregated_model
        if municipality_upper and municipality_upper in municipality_models:
            model_to_use = municipality_models[municipality_upper]
        
        # Generate municipality predictions
        result = model_to_use.predict(days=days)
        
        if not result or 'daily_predictions' not in result:
            return jsonify({
                'success': False,
                'error': 'Failed to generate municipality predictions'
            }), 500
        
        # Convert daily predictions to weekly for barangay distribution
        daily_preds = result['daily_predictions']
        
        # Group by week (Sunday to Saturday)
        weekly_predictions = {}
        for pred in daily_preds:
            date = pd.to_datetime(pred['date'])
            # Get the Sunday of that week (weekday: 0=Monday, 6=Sunday)
            # Calculate days to subtract to get to Sunday
            days_to_sunday = (date.weekday() + 1) % 7
            week_start = date - pd.Timedelta(days=days_to_sunday)
            week_key = week_start.strftime('%Y-%m-%d')
            
            if week_key not in weekly_predictions:
                weekly_predictions[week_key] = {
                    'municipality': municipality_upper or 'ALL',
                    'date': week_key,
                    'predicted_count': 0
                }
            
            weekly_predictions[week_key]['predicted_count'] += pred.get('predicted_count', 0)
        
        # Prepare municipality predictions for barangay distribution
        mun_predictions = {}
        for week_key, week_pred in weekly_predictions.items():
            mun = week_pred['municipality']
            if mun not in mun_predictions:
                mun_predictions[mun] = {}
            mun_predictions[mun][week_key] = week_pred['predicted_count']
        
        # If municipality specified, only predict for that municipality
        if municipality_upper:
            mun_predictions = {m: v for m, v in mun_predictions.items() if m == municipality_upper or m == 'ALL'}
        
        # Distribute to barangays
        barangay_predictions = barangay_predictor.predict_barangay_registrations(
            mun_predictions,
            municipality=municipality_upper
        )
        
        # Group by municipality and barangay for summary
        municipality_summary = {}
        for pred in barangay_predictions:
            mun = pred['municipality']
            brgy = pred['barangay']
            
            if mun not in municipality_summary:
                municipality_summary[mun] = {}
            if brgy not in municipality_summary[mun]:
                municipality_summary[mun][brgy] = {
                    'total_predicted': 0,
                    'weekly_predictions': []
                }
            
            municipality_summary[mun][brgy]['total_predicted'] += pred['predicted_count']
            municipality_summary[mun][brgy]['weekly_predictions'].append({
                'date': pred['date'],
                'predicted_count': pred['predicted_count']
            })
        
        return jsonify({
            'success': True,
            'data': {
                'barangay_predictions': barangay_predictions,
                'municipality_summary': municipality_summary,
                'prediction_dates': list(weekly_predictions.keys()),
                'weeks': weeks,
                'municipality': municipality_upper
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error predicting barangay registrations: {str(e)}")
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
        
        # Get municipality parameter
        municipality = request.args.get('municipality', default=None, type=str)
        
        # Determine which model to use
        model_to_use = aggregated_model
        model_used_name = 'optimized_aggregated'
        
        if municipality:
            municipality_upper = municipality.upper().strip()
            if municipality_upper in municipality_models:
                model_to_use = municipality_models[municipality_upper]
                model_used_name = f'optimized_municipality_{municipality_upper}'
                logger.info(f"Getting accuracy for municipality-specific model: {municipality_upper}")
            else:
                logger.warning(f"Municipality-specific model not available for '{municipality_upper}'. Using aggregated model.")
        
        # Build accuracy response with all optimized metrics
        accuracy_data = {
            'mae': model_to_use.accuracy_metrics.get('mae') if model_to_use.accuracy_metrics else None,
            'rmse': model_to_use.accuracy_metrics.get('rmse') if model_to_use.accuracy_metrics else None,
            'mape': model_to_use.accuracy_metrics.get('mape') if model_to_use.accuracy_metrics else None,
            'r2': model_to_use.accuracy_metrics.get('r2') if model_to_use.accuracy_metrics else None,
            'model_parameters': model_to_use.model_params,
            'in_sample': model_to_use.accuracy_metrics,
            'out_of_sample': model_to_use.test_accuracy_metrics,
            'cross_validation': model_to_use.cv_results,
            'diagnostics': model_to_use.diagnostics,
            'model_type': 'optimized_sarima_daily',
            'per_municipality_enabled': ENABLE_PER_MUNICIPALITY,
            'model_used': model_used_name,
            'municipality': municipality_upper if municipality else None
        }
        
        # Add test metrics for backward compatibility
        if model_to_use.test_accuracy_metrics:
            accuracy_data['test_accuracy_metrics'] = {
                'mae': model_to_use.test_accuracy_metrics.get('mae'),
                'rmse': model_to_use.test_accuracy_metrics.get('rmse'),
                'mape': model_to_use.test_accuracy_metrics.get('mape'),
                'r2': model_to_use.test_accuracy_metrics.get('r2')
            }
        
        if accuracy_data['mae'] is None:
            return jsonify({
                'success': False,
                'error': 'Model not trained yet. Please train the model first.'
            }), 404
        
        # Convert NumPy/pandas types to native Python types for JSON serialization
        accuracy_data_serializable = convert_to_native_types(accuracy_data)
        
        return jsonify({
            'success': True,
            'data': accuracy_data_serializable
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
        municipality = data.get('municipality', None)
        
        if municipality:
            # Retrain municipality-specific model
            municipality_upper = municipality.upper().strip()
            if municipality_upper not in DAVAO_ORIENTAL_MUNICIPALITIES:
                return jsonify({
                    'success': False,
                    'error': f"Invalid municipality '{municipality}'. Available municipalities: {', '.join(DAVAO_ORIENTAL_MUNICIPALITIES)}"
                }), 400
            
            logger.info(f"Retraining municipality-specific model for {municipality_upper}...")
            
            # Get or create municipality model
            if municipality_upper not in municipality_models:
                municipality_models[municipality_upper] = OptimizedSARIMAModel(
                    model_dir=os.path.join(os.path.dirname(os.path.abspath(__file__)), '../trained'),
                    municipality=municipality_upper,
                    use_normalization=False,
                    scaler_type='minmax'
                )
            
            mun_model = municipality_models[municipality_upper]
            
            # Check if model exists and force is required
            if mun_model.model_exists() and not force:
                return jsonify({
                    'success': False,
                    'error': f'Model for {municipality_upper} already exists. Use force=true to retrain.',
                    'message': 'Set "force": true in request body to retrain existing model'
                }), 400
            
            # Load and process municipality-specific data
            daily_data, exogenous_vars, processing_info = preprocessor.load_and_process_daily_data(
                fill_missing_days=True,
                fill_method='zero',
                municipality=municipality_upper
            )
            
            training_info = mun_model.train(
                data=daily_data,
                exogenous=exogenous_vars[['is_weekend_or_holiday']],
                force=force,
                processing_info=processing_info
            )
            
            # Add processing info to training results
            if training_info:
                training_info['processing_info'] = processing_info
                training_info['model_type'] = 'optimized_sarima_daily'
                training_info['municipality'] = municipality_upper
            
            # Convert NumPy/pandas types to native Python types for JSON serialization
            training_info_serializable = convert_to_native_types(training_info) if training_info else None
            
            return jsonify({
                'success': True,
                'message': f'Municipality-specific model for {municipality_upper} retrained successfully',
                'data': {
                    'municipality': municipality_upper,
                    'training_info': training_info_serializable
                }
            }), 200
        else:
            # Retrain aggregated optimized model
            # Check if model exists and force is required
            if aggregated_model.model_exists() and not force:
                return jsonify({
                    'success': False,
                    'error': 'Model already exists. Use force=true to retrain.',
                    'message': 'Set "force": true in request body to retrain existing model'
                }), 400
            
            logger.info("Retraining optimized aggregated model...")

            # Refresh CSV from MongoDB before each retrain to use latest data
            if os.getenv("DATABASE"):
                try:
                    export_mongo_to_csv(
                        os.path.join(os.path.dirname(os.path.abspath(__file__)), '../mv registration training'),
                        filename="DAVOR_data.csv",
                    )
                    logger.info("Refreshed DAVOR_data.csv from MongoDB for retraining")
                except Exception as e:
                    logger.warning(f"Failed to refresh data from MongoDB before retrain: {str(e)}")
                    logger.warning("Will use existing CSV files if available")
            else:
                logger.warning(
                    "DATABASE environment variable is not set. Skipping MongoDB export. "
                    "Will use existing CSV files for retraining."
                )

            daily_data, exogenous_vars, processing_info = preprocessor.load_and_process_daily_data(
                fill_missing_days=True,
                fill_method='zero'
            )

            exog_cols = [
                'is_weekend_or_holiday',
                'day_of_week',
                'month',
                'is_scheduled_month',
                'is_scheduled_week',
            ]
            available_exog = [c for c in exog_cols if c in exogenous_vars.columns]
            
            training_info = aggregated_model.train(
                data=daily_data,
                exogenous=exogenous_vars[available_exog],
                force=force,
                processing_info=processing_info
            )
            
            # Add processing info to training results
            if training_info:
                training_info['processing_info'] = processing_info
                training_info['model_type'] = 'optimized_sarima_daily'
            
            # Convert NumPy/pandas types to native Python types for JSON serialization
            training_info_serializable = convert_to_native_types(training_info) if training_info else None
            
            return jsonify({
                'success': True,
                'message': 'Optimized aggregated model retrained successfully',
                'data': {
                    'aggregated': training_info_serializable
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
        'per_municipality_enabled': ENABLE_PER_MUNICIPALITY,
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
        # Run on all interfaces, port 5002 
        # Frontend expects port 5002
        try:
            app.run(host='0.0.0.0', port=5002, debug=debug_mode)
        except OSError as e:
            if "Address already in use" in str(e):
                logger.error(f"\n⚠️  Port 5002 is in use. Error: {str(e)}")
                logger.error("To kill the process on port 5002, run: sudo lsof -i :5002 && kill -9 <PID>")
                sys.exit(1)
            else:
                raise
    else:
        logger.error("Failed to initialize optimized model. Please check the error messages above.")
        sys.exit(1)

