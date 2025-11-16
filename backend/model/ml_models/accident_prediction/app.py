"""
Flask API for Accident Count Prediction
Predicts monthly accident counts per barangay using Random Forest regression

Endpoints:
- GET /api/accidents/predict/count - Predict accident count for a specific month and barangay
- POST /api/accidents/predict/batch - Predict accident counts for multiple barangays
- GET /api/accidents/predict/all - Predict for all barangays for a given month
- GET /api/accidents/health - Health check
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import sys
from datetime import datetime
import traceback
import pandas as pd
import numpy as np
import joblib
import json
import logging

# Add parent directories to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from data_loader import AccidentDataLoader

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max upload size

# Enable CORS
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

# Global variables
rf_model = None
municipality_encoder = None
barangay_encoder = None
feature_columns = None
model_metadata = None
model_loaded = False
data_loader = None


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


def initialize_model():
    """Initialize the accident prediction model"""
    global rf_model, municipality_encoder, barangay_encoder, feature_columns, model_metadata, model_loaded, data_loader
    
    try:
        # Get paths
        base_dir = os.path.dirname(os.path.abspath(__file__))
        model_dir = os.path.join(base_dir, '../trained')
        
        # Check if model directory exists
        if not os.path.exists(model_dir):
            logger.error(f"Model directory not found: {model_dir}")
            return False
        
        # Load Random Forest model
        model_path = os.path.join(model_dir, 'accident_rf_regression_model.pkl')
        if not os.path.exists(model_path):
            logger.error(f"Model not found: {model_path}")
            logger.error("Please train the model first using train_rf_model.py")
            return False
        
        rf_model = joblib.load(model_path)
        logger.info(f"Loaded Random Forest model from: {model_path}")
        
        # Load encoders
        municipality_encoder_path = os.path.join(model_dir, 'municipality_encoder.pkl')
        if os.path.exists(municipality_encoder_path):
            municipality_encoder = joblib.load(municipality_encoder_path)
            logger.info("Loaded municipality encoder")
        else:
            municipality_encoder = None
            logger.warning("Municipality encoder not found")
        
        barangay_encoder_path = os.path.join(model_dir, 'barangay_encoder.pkl')
        if os.path.exists(barangay_encoder_path):
            barangay_encoder = joblib.load(barangay_encoder_path)
            logger.info("Loaded barangay encoder")
        else:
            barangay_encoder = None
            logger.warning("Barangay encoder not found")
        
        # Load feature columns
        feature_path = os.path.join(model_dir, 'accident_rf_feature_columns.pkl')
        if os.path.exists(feature_path):
            feature_columns = joblib.load(feature_path)
            logger.info(f"Loaded feature columns: {feature_columns}")
        else:
            logger.error("Feature columns not found")
            return False
        
        # Load metadata
        metadata_path = os.path.join(model_dir, 'accident_rf_regression_metadata.json')
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r') as f:
                model_metadata = json.load(f)
            logger.info("Loaded model metadata")
        else:
            model_metadata = {}
        
        # Initialize data loader
        data_loader = AccidentDataLoader()
        
        model_loaded = True
        logger.info("Model initialization complete!")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize model: {str(e)}")
        traceback.print_exc()
        return False


def prepare_features(year, month, municipality, barangay, historical_data=None):
    """
    Prepare features for prediction
    
    Args:
        year: Year for prediction
        month: Month for prediction (1-12)
        municipality: Municipality name
        barangay: Barangay name
        historical_data: Optional DataFrame with historical data for lag features
        
    Returns:
        DataFrame with features ready for prediction
    """
    # Create base features
    features = {
        'year': [year],
        'month': [month],
        'month_sin': [np.sin(2 * np.pi * month / 12)],
        'month_cos': [np.cos(2 * np.pi * month / 12)],
    }
    
    # Normalize year (need to know min/max from training)
    if model_metadata and 'year_range' in model_metadata:
        year_min, year_max = model_metadata['year_range']
        features['year_normalized'] = [(year - year_min) / (year_max - year_min + 1)]
    else:
        # Fallback: use current year range
        current_year = datetime.now().year
        features['year_normalized'] = [(year - 2020) / (current_year - 2020 + 1)]
    
    # Encode municipality and barangay
    if municipality_encoder:
        try:
            municipality_encoded = municipality_encoder.transform([municipality])[0]
        except (ValueError, KeyError):
            # If municipality not in training data, use 0 or most common
            municipality_encoded = 0
        features['municipality_encoded'] = [municipality_encoded]
    else:
        features['municipality_encoded'] = [0]
    
    if barangay_encoder:
        try:
            barangay_encoded = barangay_encoder.transform([barangay])[0]
        except (ValueError, KeyError):
            # If barangay not in training data, use 0
            barangay_encoded = 0
        features['barangay_encoded'] = [barangay_encoded]
    else:
        features['barangay_encoded'] = [0]
    
    # Add lag features if historical data available
    if historical_data is not None and not historical_data.empty:
        # Get previous month's count
        prev_month = month - 1
        prev_year = year
        if prev_month == 0:
            prev_month = 12
            prev_year = year - 1
        
        prev_data = historical_data[
            (historical_data['year'] == prev_year) &
            (historical_data['month'] == prev_month) &
            (historical_data['barangay'] == barangay)
        ]
        
        if not prev_data.empty:
            features['accident_count_lag1'] = [prev_data['accident_count'].iloc[0]]
            # Calculate rolling statistics
            recent_data = historical_data[
                (historical_data['barangay'] == barangay) &
                ((historical_data['year'] < year) | ((historical_data['year'] == year) & (historical_data['month'] < month)))
            ].tail(3)
            
            if not recent_data.empty:
                features['accident_count_rolling_mean_3'] = [recent_data['accident_count'].mean()]
                features['accident_count_rolling_std_3'] = [recent_data['accident_count'].std() if len(recent_data) > 1 else 0]
            else:
                features['accident_count_rolling_mean_3'] = [0]
                features['accident_count_rolling_std_3'] = [0]
        else:
            features['accident_count_lag1'] = [0]
            features['accident_count_rolling_mean_3'] = [0]
            features['accident_count_rolling_std_3'] = [0]
    else:
        # No historical data, use defaults
        features['accident_count_lag1'] = [0]
        features['accident_count_rolling_mean_3'] = [0]
        features['accident_count_rolling_std_3'] = [0]
    
    # Create DataFrame
    df = pd.DataFrame(features)
    
    # Ensure all feature columns are present
    for col in feature_columns:
        if col not in df.columns:
            df[col] = 0
    
    # Reorder columns to match training
    df = df[feature_columns]
    
    return df


@app.route('/api/accidents/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        model_info = {}
        if model_metadata:
            model_info = {
                'model_type': model_metadata.get('model_type', 'Unknown'),
                'training_date': model_metadata.get('training_date', 'Unknown'),
                'feature_count': model_metadata.get('feature_count', 0),
                'training_samples': model_metadata.get('training_samples', 0),
                'test_samples': model_metadata.get('test_samples', 0)
            }
            
            # Add accuracy metrics if available
            metrics = model_metadata.get('metrics', {})
            if metrics:
                accuracy_info = {}
                if metrics.get('test_accuracy_pct') is not None:
                    accuracy_info['accuracy_percentage'] = round(metrics['test_accuracy_pct'], 2)
                if metrics.get('test_accuracy_20pct') is not None:
                    accuracy_info['accuracy_within_20pct'] = round(metrics['test_accuracy_20pct'], 2)
                if metrics.get('test_accuracy_30pct') is not None:
                    accuracy_info['accuracy_within_30pct'] = round(metrics['test_accuracy_30pct'], 2)
                if metrics.get('test_r2') is not None:
                    accuracy_info['r2_score'] = round(metrics['test_r2'], 4)
                if metrics.get('test_mape') is not None:
                    accuracy_info['mape'] = round(metrics['test_mape'], 2)
                
                if accuracy_info:
                    model_info['accuracy_metrics'] = accuracy_info
        
        return jsonify({
            'status': 'ok' if model_loaded else 'error',
            'model_loaded': model_loaded,
            'timestamp': datetime.now().isoformat(),
            'model_info': model_info
        }), 200 if model_loaded else 503
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@app.route('/api/accidents/predict/count', methods=['GET'])
def predict_accident_count():
    """
    Predict accident count for a specific month and barangay
    
    Query Parameters:
    - year: Year (required)
    - month: Month (1-12, required)
    - municipality: Municipality name (required)
    - barangay: Barangay name (required)
    """
    try:
        if not model_loaded:
            return jsonify({
                'success': False,
                'error': 'Model not loaded. Please check server logs.',
                'timestamp': datetime.now().isoformat()
            }), 503
        
        # Get parameters
        year = request.args.get('year', type=int)
        month = request.args.get('month', type=int)
        municipality = request.args.get('municipality', type=str)
        barangay = request.args.get('barangay', type=str)
        
        # Validate parameters
        if not all([year, month, municipality, barangay]):
            return jsonify({
                'success': False,
                'error': 'Missing required parameters: year, month, municipality, barangay',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        if month < 1 or month > 12:
            return jsonify({
                'success': False,
                'error': 'Month must be between 1 and 12',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Load historical data for lag features (optional)
        historical_data = None
        try:
            if data_loader:
                data_loader.connect()
                accidents = data_loader.load_raw_data()
                historical_data = data_loader.aggregate_monthly_counts(accidents)
                data_loader.disconnect()
        except Exception as e:
            logger.warning(f"Could not load historical data: {str(e)}")
        
        # Prepare features
        features_df = prepare_features(year, month, municipality, barangay, historical_data)
        
        # Make prediction
        prediction = rf_model.predict(features_df)[0]
        prediction = max(0, float(prediction))  # Ensure non-negative
        
        return jsonify({
            'success': True,
            'prediction': convert_to_native_types(prediction),
            'year': year,
            'month': month,
            'municipality': municipality,
            'barangay': barangay,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@app.route('/api/accidents/predict/all', methods=['GET'])
def predict_all_barangays():
    """
    Predict accident counts for all barangays for a given month
    
    Query Parameters:
    - year: Year (required)
    - month: Month (1-12, required)
    """
    def prescribe_actions(predicted_count):
        """
        Rule-based prescriptive recommendations grounded on PNP SOP for major traffic accidents
        (Education, Enforcement, Engineering, Response/Coordination).
        Returns dict with level and actions (short actionable items).
        """
        level = 'LOW'
        actions = []
        if predicted_count <= 0:
            return {'level': 'NONE', 'actions': ['Maintain monitoring; no special deployment required.']}
        if 1 <= predicted_count <= 30:
            level = 'LOW'
            actions = [
                'Enforcement: Weekend DUI checkpoint (1 point) at high-risk window.',
                'Education: Barangay road safety briefings; helmet/seatbelt reminders.',
                'Engineering: Verify signage/markings; clear roadside obstructions.',
                'Response: Coordinate with municipal traffic unit for rapid response.'
            ]
        elif 31 <= predicted_count <= 60:
            level = 'MEDIUM'
            actions = [
                'Enforcement: 2 patrol units during high-risk hours; random speed checks.',
                'Enforcement: DUI checkpoint Fri–Sun at identified hotspot.',
                'Engineering: Temporary warning devices/reflective cones at blind curves.',
                'Education: School/transport operators awareness drives.',
                'Response: Pre-alert HPG/local first responders; ensure TARAS reporting readiness.'
            ]
        elif 61 <= predicted_count <= 100:
            level = 'HIGH'
            actions = [
                'Enforcement: 3 patrol units; continuous speed/DUI enforcement.',
                'Engineering: Request DPWH/LGU for lighting repair & rumble strips.',
                'Education: Intensified barangay campaigns; visible advisories on highways.',
                'Response: Staging of ambulance and tow readiness during high-risk windows.',
                'Coordination: HPG lead coordination with LGU per SOP.'
            ]
        else:
            level = 'CRITICAL'
            actions = [
                'Enforcement: Joint ops (HPG+LGU) with multi-point checkpoints.',
                'Engineering: Immediate hazard mitigation (barriers, signage, lighting).',
                'Education: Continuous broadcasting; public advisories via radio/social media.',
                'Response: Pre-position medical and rescue teams; define detours & traffic control.',
                'Coordination: Daily SITREP and escalation to provincial task force.'
            ]
        return {'level': level, 'actions': actions}
    def extract_hour(rec):
        """Extract hour (0-23) from record using timeCommited if available, else from dateCommited"""
        try:
            t = rec.get('timeCommited')
            if isinstance(t, str) and len(t) >= 2 and t[0:2].isdigit():
                h = int(t[0:2])
                if 0 <= h <= 23:
                    return h
        except Exception:
            pass
        try:
            dc = rec.get('dateCommited')
            if isinstance(dc, str):
                # ISO string
                dt = datetime.fromisoformat(dc.replace('Z', '+00:00'))
                return dt.hour
            elif isinstance(dc, datetime):
                return dc.hour
        except Exception:
            return None
        return None

    def compute_high_risk_hours(accidents_raw, municipality, barangay):
        """
        Compute high-risk hours for a barangay based on historical hourly distribution.
        Returns a dict with: hours (list[int]), ranges (str), threshold (float).
        """
        try:
            # Filter accidents for this barangay (case sensitive match as stored)
            relevant = [a for a in accidents_raw
                        if a.get('municipality') == municipality and a.get('barangay') == barangay]
            # Build 24-bucket histogram
            counts = [0] * 24
            total = 0
            for rec in relevant:
                h = extract_hour(rec)
                if h is None or h < 0 or h > 23:
                    continue
                counts[h] += 1
                total += 1
            if total == 0:
                return {'hours': [], 'ranges': '', 'threshold': 0.0}
            # Compute statistics
            avg = sum(counts) / 24.0
            var = sum((c - avg) ** 2 for c in counts) / 24.0
            std = var ** 0.5
            threshold = avg + std
            high_hours = [i for i, c in enumerate(counts) if c >= threshold and c > 0]

            def format_hour(h):
                if h == 0:
                    return '12 AM'
                if h < 12:
                    return f'{h} AM'
                if h == 12:
                    return '12 PM'
                return f'{h - 12} PM'

            def format_ranges(hours):
                if not hours:
                    return ''
                hours = sorted(hours)
                # Group consecutive hours
                ranges = []
                start = hours[0]
                end = hours[0]
                for h in hours[1:]:
                    if h == end + 1:
                        end = h
                    else:
                        if start == end:
                            ranges.append(format_hour(start))
                        else:
                            ranges.append(f'{format_hour(start)} – {format_hour(end)}')
                        start = end = h
                # last
                if start == end:
                    ranges.append(format_hour(start))
                else:
                    ranges.append(f'{format_hour(start)} – {format_hour(end)}')
                return ', '.join(ranges)

            return {
                'hours': high_hours,
                'ranges': format_ranges(high_hours),
                'threshold': float(threshold)
            }
        except Exception as e:
            logger.warning(f'compute_high_risk_hours error for {municipality}/{barangay}: {e}')
            return {'hours': [], 'ranges': '', 'threshold': 0.0}

    def compute_baseline_count(historical_df, year, month, municipality, barangay):
        """
        Compute a simple baseline: average of last up to 3 months for this barangay.
        """
        try:
            # Build previous months list (year, month)
            prev = []
            py, pm = year, month
            for _ in range(3):
                pm -= 1
                if pm == 0:
                    pm = 12
                    py -= 1
                prev.append((py, pm))
            # Filter historical df for these months
            subset = historical_df[
                (historical_df['municipality'] == municipality) &
                (historical_df['barangay'] == barangay) &
                (
                    (historical_df['year'] == prev[0][0]) & (historical_df['month'] == prev[0][1]) |
                    (historical_df['year'] == prev[1][0]) & (historical_df['month'] == prev[1][1]) |
                    (historical_df['year'] == prev[2][0]) & (historical_df['month'] == prev[2][1])
                )
            ]
            if subset.empty:
                return 0.0
            return float(subset['accident_count'].mean())
        except Exception:
            return 0.0

    try:
        if not model_loaded:
            return jsonify({
                'success': False,
                'error': 'Model not loaded. Please check server logs.',
                'timestamp': datetime.now().isoformat()
            }), 503
        
        # Get parameters
        year = request.args.get('year', type=int)
        month = request.args.get('month', type=int)
        
        if not year or not month:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters: year, month',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        if month < 1 or month > 12:
            return jsonify({
                'success': False,
                'error': 'Month must be between 1 and 12',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Load historical data to get all barangays
        if not data_loader:
            return jsonify({
                'success': False,
                'error': 'Data loader not initialized',
                'timestamp': datetime.now().isoformat()
            }), 500
        
        data_loader.connect()
        accidents = data_loader.load_raw_data()
        historical_data = data_loader.aggregate_monthly_counts(accidents)
        data_loader.disconnect()
        
        if historical_data.empty:
            return jsonify({
                'success': False,
                'error': 'No historical data available',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        # Get unique barangays
        unique_locations = historical_data[['municipality', 'barangay']].drop_duplicates()
        
        predictions = []
        for _, row in unique_locations.iterrows():
            municipality = row['municipality']
            barangay = row['barangay']
            
            # Prepare features
            features_df = prepare_features(year, month, municipality, barangay, historical_data)
            
            # Make prediction
            prediction = rf_model.predict(features_df)[0]
            prediction = max(0, float(prediction))
            
            # Compute historical baseline and blend to add locality differentiation
            baseline = compute_baseline_count(historical_data, year, month, municipality, barangay)
            # Blend: 60% baseline, 40% model prediction
            blended_prediction = 0.6 * baseline + 0.4 * prediction
            # Ensure non-negative and reasonable precision
            blended_prediction = max(0.0, float(blended_prediction))
            # Rounded count for reporting and rule thresholds
            rounded_prediction = int(round(blended_prediction))
            
            # Compute predicted high-risk hours based on historical hourly distribution
            high_risk = compute_high_risk_hours(accidents, municipality, barangay)

            # Build prescriptions based on predicted count
            prescription = prescribe_actions(rounded_prediction)

            predictions.append({
                'municipality': municipality,
                'barangay': barangay,
                'predicted_count': convert_to_native_types(rounded_prediction),
                'predicted_count_raw': convert_to_native_types(round(blended_prediction, 2)),
                'predicted_high_risk_hours': high_risk.get('hours', []),
                'predicted_high_risk_ranges': high_risk.get('ranges', ''),
                'prescription': prescription
            })
        
        # Sort by predicted count (descending)
        predictions.sort(key=lambda x: x['predicted_count'], reverse=True)
        
        return jsonify({
            'success': True,
            'year': year,
            'month': month,
            'predictions': convert_to_native_types(predictions),
            'total_barangays': len(predictions),
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


@app.route('/api/accidents/predict/batch', methods=['POST'])
def predict_batch():
    """
    Predict accident counts for multiple barangays
    
    Request Body:
    {
        "year": 2024,
        "month": 6,
        "locations": [
            {"municipality": "MATI (CAPITAL)", "barangay": "DAWAN"},
            {"municipality": "MATI (CAPITAL)", "barangay": "CENTRAL"}
        ]
    }
    """
    try:
        if not model_loaded:
            return jsonify({
                'success': False,
                'error': 'Model not loaded. Please check server logs.',
                'timestamp': datetime.now().isoformat()
            }), 503
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        year = data.get('year')
        month = data.get('month')
        locations = data.get('locations', [])
        
        if not year or not month:
            return jsonify({
                'success': False,
                'error': 'Missing required fields: year, month',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        if not locations:
            return jsonify({
                'success': False,
                'error': 'No locations provided',
                'timestamp': datetime.now().isoformat()
            }), 400
        
        # Load historical data
        historical_data = None
        try:
            if data_loader:
                data_loader.connect()
                accidents = data_loader.load_raw_data()
                historical_data = data_loader.aggregate_monthly_counts(accidents)
                data_loader.disconnect()
        except Exception as e:
            logger.warning(f"Could not load historical data: {str(e)}")
        
        predictions = []
        for location in locations:
            municipality = location.get('municipality')
            barangay = location.get('barangay')
            
            if not municipality or not barangay:
                continue
            
            # Prepare features
            features_df = prepare_features(year, month, municipality, barangay, historical_data)
            
            # Make prediction
            prediction = rf_model.predict(features_df)[0]
            prediction = max(0, float(prediction))
            
            predictions.append({
                'municipality': municipality,
                'barangay': barangay,
                'predicted_count': convert_to_native_types(prediction)
            })
        
        return jsonify({
            'success': True,
            'year': year,
            'month': month,
            'predictions': convert_to_native_types(predictions),
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500


# Initialize model on startup
if __name__ == '__main__':
    logger.info("Initializing accident prediction API...")
    if initialize_model():
        logger.info("Starting Flask server...")
        port = int(os.getenv('PORT', 5004))
        app.run(host='0.0.0.0', port=port, debug=False)
    else:
        logger.error("Failed to initialize model. Exiting.")
        sys.exit(1)
else:
    # If running via gunicorn or similar
    initialize_model()

