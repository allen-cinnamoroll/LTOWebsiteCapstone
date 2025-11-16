"""
Flask API for Accident Analytics and Risk Prediction
This standalone Flask application provides endpoints for:
- GET /api/accidents/health - Health check endpoint
- POST /api/accidents/predict - Predict accident severity/risk
- GET /api/accidents/forecast - Forecast accident counts (optional)
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import sys
from datetime import datetime, timedelta
import traceback
import pandas as pd
import numpy as np
import joblib
import json
import logging

# Add parent directories to path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
training_dir = os.path.join(current_dir, '../training')
sys.path.append(training_dir)

from inference_preprocessor import AccidentInferencePreprocessor

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max upload size

# Enable CORS for all routes
CORS(app, 
     resources={
         r"/api/*": {
             "origins": "*",
             "methods": ["GET", "POST", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"],
             "supports_credentials": False
         }
     },
     supports_credentials=False)

# Global variables for models
rf_model = None
rule_system = None
preprocessor = None
model_metadata = None
model_loaded = False

def convert_to_native_types(obj):
    """Recursively convert NumPy/pandas types to native Python types for JSON serialization"""
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

def initialize_models():
    """Initialize the accident prediction models"""
    global rf_model, rule_system, preprocessor, model_metadata, model_loaded
    
    try:
        # Get paths
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_dir = os.path.join(base_dir, '../trained')
        
        # Check if model directory exists
        if not os.path.exists(model_dir):
            logger.error(f"Model directory not found: {model_dir}")
            return False
        
        # Load Random Forest model
        rf_model_path = os.path.join(model_dir, 'accident_rf_model.pkl')
        if not os.path.exists(rf_model_path):
            logger.error(f"Random Forest model not found: {rf_model_path}")
            return False
        
        rf_model = joblib.load(rf_model_path)
        logger.info(f"Random Forest model loaded from {rf_model_path}")
        
        # Load rule-based system
        rule_system_path = os.path.join(model_dir, 'accident_rule_system.pkl')
        if not os.path.exists(rule_system_path):
            logger.error(f"Rule-based system not found: {rule_system_path}")
            return False
        
        rule_system = joblib.load(rule_system_path)
        logger.info(f"Rule-based system loaded from {rule_system_path}")
        
        # Initialize preprocessor
        preprocessor = AccidentInferencePreprocessor(model_dir)
        logger.info("Preprocessor initialized")
        
        # Load metadata
        metadata_path = os.path.join(model_dir, 'model_metadata.json')
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r') as f:
                model_metadata = json.load(f)
            logger.info("Model metadata loaded")
        else:
            logger.warning(f"Model metadata not found: {metadata_path}")
            model_metadata = {}
        
        model_loaded = True
        logger.info("All models initialized successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Error initializing models: {str(e)}")
        logger.error(traceback.format_exc())
        model_loaded = False
        return False

def get_risk_level(confidence, predicted_class=None):
    """Determine risk level based on confidence score and prediction"""
    if not rule_system:
        return "Unknown"
    
    risk_thresholds = rule_system.get('risk_thresholds', {
        'high_risk': 0.7,
        'medium_risk': 0.4,
        'low_risk': 0.0
    })
    
    if confidence >= risk_thresholds.get('high_risk', 0.7):
        return "High"
    elif confidence >= risk_thresholds.get('medium_risk', 0.4):
        return "Medium"
    else:
        return "Low"

def get_prescriptive_actions(risk_level, predicted_class=None):
    """Get prescriptive actions based on risk level"""
    if not rule_system:
        return []
    
    prescriptive_actions = rule_system.get('prescriptive_actions', {})
    
    # Map risk level to action keys
    if risk_level == "High":
        # Check if prediction is for "Crimes Against Persons" (class 1)
        if predicted_class == 1:
            actions = prescriptive_actions.get('high_risk_persons', {})
        else:
            actions = prescriptive_actions.get('high_risk', {})
    elif risk_level == "Medium":
        actions = prescriptive_actions.get('medium_risk', {})
    else:
        actions = prescriptive_actions.get('low_risk_property', {})
    
    # Flatten actions if it's a dict
    if isinstance(actions, dict):
        all_actions = []
        for category, action_list in actions.items():
            if isinstance(action_list, list):
                all_actions.extend(action_list)
            else:
                all_actions.append(action_list)
        return all_actions
    elif isinstance(actions, list):
        return actions
    else:
        return []

def map_offense_type(class_code):
    """Map numerical class code to offense type string"""
    if not model_metadata or 'config' not in model_metadata:
        return f"Class_{class_code}"
    
    case_status_mapping = model_metadata.get('config', {}).get('rule_system', {}).get('case_status_mapping', {})
    # Reverse the mapping: {string: code} -> {code: string}
    reverse_mapping = {v: k for k, v in case_status_mapping.items()}
    return reverse_mapping.get(class_code, f"Class_{class_code}")

@app.route('/api/accidents/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        response = {
            'status': 'ok',
            'model_loaded': model_loaded,
            'timestamp': datetime.now().isoformat()
        }
        
        if model_loaded and model_metadata:
            response['model_info'] = {
                'model_type': model_metadata.get('model_type', 'Unknown'),
                'training_date': model_metadata.get('training_date', 'Unknown'),
                'feature_count': len(preprocessor.feature_columns) if preprocessor else 0
            }
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e),
            'model_loaded': model_loaded
        }), 500

@app.route('/api/accidents/predict', methods=['POST'])
def predict_accident():
    """Predict accident severity/risk for a single record"""
    try:
        if not model_loaded:
            return jsonify({
                'success': False,
                'error': 'Models not loaded. Please check server logs.',
                'timestamp': datetime.now().isoformat()
            }), 503
        
        # Get JSON data from request
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Preprocess the input data
        processed_data = preprocessor.preprocess_single_record(data)
        
        # Make prediction
        prediction_proba = rf_model.predict_proba(processed_data)[0]
        prediction_class = rf_model.predict(processed_data)[0]
        
        # Get confidence (max probability)
        confidence = float(np.max(prediction_proba))
        
        # Get predicted offense type
        predicted_offense_type = map_offense_type(int(prediction_class))
        
        # Determine risk level
        risk_level = get_risk_level(confidence, int(prediction_class))
        
        # Calculate severity index (normalized confidence, can be adjusted)
        severity_index = float(confidence)
        
        # Get prescriptive actions
        prescriptive_actions = get_prescriptive_actions(risk_level, int(prediction_class))
        
        # Prepare probabilities dictionary
        probabilities = {}
        case_status_mapping = model_metadata.get('config', {}).get('rule_system', {}).get('case_status_mapping', {})
        for offense_type, class_code in case_status_mapping.items():
            if class_code - 1 < len(prediction_proba):  # Adjust for 0-based index
                probabilities[offense_type] = float(prediction_proba[class_code - 1])
        
        response = {
            'success': True,
            'prediction': {
                'severity_index': severity_index,
                'risk_level': risk_level,
                'predicted_offense_type': predicted_offense_type,
                'predicted_class': int(prediction_class),
                'confidence': confidence,
                'probabilities': probabilities
            },
            'prescriptive_actions': prescriptive_actions,
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify(convert_to_native_types(response)), 200
        
    except KeyError as e:
        logger.error(f"Missing required field: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Missing required field: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 400
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/accidents/forecast', methods=['GET'])
def forecast_accidents():
    """
    Forecast accident counts for next N periods
    This is a placeholder implementation - actual forecasting would require time-series models
    """
    try:
        if not model_loaded:
            return jsonify({
                'success': False,
                'error': 'Models not loaded. Please check server logs.',
                'timestamp': datetime.now().isoformat()
            }), 503
        
        # Get query parameters
        months = request.args.get('months', default=6, type=int)
        municipality = request.args.get('municipality', default=None, type=str)
        
        # Validate parameters
        if months < 1 or months > 24:
            return jsonify({
                'success': False,
                'error': 'Months parameter must be between 1 and 24',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # This is a placeholder - actual forecasting would require:
        # 1. Historical accident data aggregated by time period
        # 2. Time-series forecasting model (ARIMA, SARIMA, Prophet, etc.)
        # 3. Municipality-specific models if municipality is provided
        
        # For now, return a simple response indicating this feature needs implementation
        forecast = []
        current_date = datetime.now()
        
        for i in range(1, months + 1):
            forecast_period = current_date + timedelta(days=30 * i)
            forecast.append({
                'period': forecast_period.strftime('%Y-%m'),
                'predicted_accidents': None,  # Placeholder
                'note': 'Forecasting requires time-series model implementation'
            })
        
        response = {
            'success': True,
            'forecast': forecast,
            'municipality': municipality,
            'note': 'This is a placeholder endpoint. Implement time-series forecasting model for actual predictions.',
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify(convert_to_native_types(response)), 200
        
    except Exception as e:
        logger.error(f"Forecast error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'success': False,
        'error': 'Endpoint not found',
        'available_endpoints': [
            'GET /api/accidents/health',
            'POST /api/accidents/predict',
            'GET /api/accidents/forecast'
        ],
        'timestamp': datetime.now().isoformat()
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'timestamp': datetime.now().isoformat()
    }), 500

# Initialize models on startup
if __name__ == "__main__":
    logger.info("Initializing Accident Analytics Flask API...")
    
    if initialize_models():
        logger.info("Starting Flask server...")
        app.run(host="0.0.0.0", port=5003, debug=True)
    else:
        logger.error("Failed to initialize models. Exiting...")
        sys.exit(1)
else:
    # When running via gunicorn or other WSGI server
    initialize_models()

