"""
Flask API for Vehicle Registration Prediction using SARIMA
This standalone Flask application provides endpoints for:
- GET /api/predict/registrations - Get prediction results
- GET /api/model/accuracy - Get model accuracy metrics
- POST /api/model/retrain - Retrain the model
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import sys
from datetime import datetime
import traceback

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sarima_model import SARIMAModel
from data_preprocessor import DataPreprocessor

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize model and preprocessor
model = None
preprocessor = None

def initialize_model():
    """Initialize the SARIMA model and preprocessor"""
    global model, preprocessor
    try:
        # Get the directory paths
        base_dir = os.path.dirname(os.path.abspath(__file__))
        # Handle directory name with spaces - try both possible paths
        data_dir = os.path.join(base_dir, '../../mv registration training')
        if not os.path.exists(data_dir):
            # Try alternative path without spaces (if renamed)
            data_dir_alt = os.path.join(base_dir, '../../mv_registration_training')
            if os.path.exists(data_dir_alt):
                data_dir = data_dir_alt
        
        model_dir = os.path.join(base_dir, '../trained')
        
        # Create directories if they don't exist
        os.makedirs(model_dir, exist_ok=True)
        
        # Initialize preprocessor
        csv_path = os.path.join(data_dir, 'DAVOR_data.csv')
        preprocessor = DataPreprocessor(csv_path)
        
        # Initialize model
        model = SARIMAModel(model_dir)
        
        # Load existing model or train new one
        if model.model_exists():
            print("Loading existing model...")
            model.load_model()
        else:
            print("No existing model found. Training new model...")
            data = preprocessor.load_and_process_data()
            model.train(data)
        
        return True
    except Exception as e:
        print(f"Error initializing model: {str(e)}")
        traceback.print_exc()
        return False

@app.route('/api/predict/registrations', methods=['GET'])
def predict_registrations():
    """
    Get vehicle registration predictions for Davao Oriental
    
    Query Parameters:
    - weeks (int, optional): Number of weeks to predict (default: 4)
    - municipality (str, optional): Specific municipality (default: all Davao Oriental)
    
    Returns:
    - weekly_predictions: List of weekly predictions
    - monthly_total: Aggregated monthly prediction
    - prediction_dates: List of dates for predictions
    """
    try:
        if model is None:
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
        
        # Make predictions
        predictions = model.predict(weeks=weeks, municipality=municipality)
        
        return jsonify({
            'success': True,
            'data': predictions
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/model/accuracy', methods=['GET'])
def get_model_accuracy():
    """
    Get model accuracy metrics
    
    Returns:
    - mae: Mean Absolute Error
    - mape: Mean Absolute Percentage Error
    - rmse: Root Mean Squared Error
    - model_params: SARIMA model parameters (p, d, q, P, D, Q, s)
    - data_info: Information about training data
    """
    try:
        if model is None:
            return jsonify({
                'success': False,
                'error': 'Model not initialized'
            }), 500
        
        # Get accuracy metrics
        accuracy = model.get_accuracy_metrics()
        
        if accuracy is None:
            return jsonify({
                'success': False,
                'error': 'Model not trained yet. Please train the model first.'
            }), 404
        
        return jsonify({
            'success': True,
            'data': accuracy
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/model/retrain', methods=['POST'])
def retrain_model():
    """
    Retrain the SARIMA model with updated data
    
    Optional JSON Body:
    - force (bool): Force retrain even if model exists (default: false)
    - use_existing_data (bool): Use existing CSV data (default: true)
    
    Returns:
    - success: Boolean indicating success
    - message: Status message
    - training_info: Information about the training process
    """
    try:
        if model is None or preprocessor is None:
            return jsonify({
                'success': False,
                'error': 'Model or preprocessor not initialized'
            }), 500
        
        # Get request body
        data = request.get_json() or {}
        force = data.get('force', False)
        
        # Load and process data
        print("Loading and processing data...")
        processed_data = preprocessor.load_and_process_data()
        
        # Check if model exists and should be retrained
        if model.model_exists() and not force:
            return jsonify({
                'success': False,
                'error': 'Model already exists. Use force=true to retrain.',
                'message': 'Set "force": true in request body to retrain existing model'
            }), 400
        
        # Train the model
        print("Training model...")
        training_info = model.train(processed_data, force=force)
        
        return jsonify({
            'success': True,
            'message': 'Model retrained successfully',
            'data': training_info
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'status': 'healthy',
        'model_initialized': model is not None,
        'model_trained': model.model_exists() if model else False,
        'timestamp': datetime.now().isoformat()
    }), 200

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
            'health': '/api/health'
        },
        'description': 'SARIMA-based prediction API for vehicle registration volumes in Davao Oriental'
    }), 200

if __name__ == '__main__':
    print("Initializing Vehicle Registration Prediction API...")
    if initialize_model():
        print("Model initialized successfully!")
        print("Starting Flask server...")
        # Run on all interfaces, port 5000
        app.run(host='0.0.0.0', port=5000, debug=False)
    else:
        print("Failed to initialize model. Please check the error messages above.")
        sys.exit(1)

