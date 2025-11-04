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
from werkzeug.utils import secure_filename

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sarima_model import SARIMAModel
from data_preprocessor import DataPreprocessor
from config import ENABLE_PER_MUNICIPALITY, DAVAO_ORIENTAL_MUNICIPALITIES

app = Flask(__name__)
# Enable CORS for all routes with more permissive settings
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Initialize models
aggregated_model = None  # Main aggregated model (always used)
municipality_models = {}  # Dictionary of per-municipality models (when enabled)
preprocessor = None

def initialize_model():
    """Initialize the SARIMA model(s) and preprocessor"""
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
        
        # Initialize preprocessor
        csv_path = os.path.join(data_dir, 'DAVOR_data.csv')
        preprocessor = DataPreprocessor(csv_path)
        
        # Initialize aggregated model (always needed)
        print("Initializing aggregated model...")
        aggregated_model = SARIMAModel(model_dir, municipality=None)
        
        if aggregated_model.model_exists():
            print("Loading existing aggregated model...")
            aggregated_model.load_model()
        else:
            print("Training aggregated model...")
            data = preprocessor.load_and_process_data()
            aggregated_model.train(data)
        
        # Initialize per-municipality models if enabled
        if ENABLE_PER_MUNICIPALITY:
            print("\nPer-municipality mode enabled. Initializing municipality models...")
            municipalities_data = preprocessor.load_and_process_data_by_municipality()
            
            for municipality, data in municipalities_data.items():
                # Check if municipality has sufficient data
                sufficiency = preprocessor.check_municipality_data_sufficiency(data)
                
                if sufficiency['is_sufficient']:
                    print(f"\nTraining model for {municipality}...")
                    print(f"  - Weeks: {sufficiency['weeks_with_data']}")
                    print(f"  - Avg/week: {sufficiency['avg_per_week']:.1f}")
                    
                    mun_model = SARIMAModel(model_dir, municipality=municipality)
                    
                    if mun_model.model_exists():
                        print(f"  Loading existing model for {municipality}...")
                        mun_model.load_model()
                    else:
                        print(f"  Training new model for {municipality}...")
                        mun_model.train(data)
                    
                    municipality_models[municipality] = mun_model
                else:
                    print(f"\nSkipping {municipality} - {sufficiency['sufficient_reason']}")
                    print(f"  - Weeks: {sufficiency['weeks_with_data']}/{sufficiency['min_weeks_required']}")
                    print(f"  - Avg/week: {sufficiency['avg_per_week']:.1f}/{sufficiency['min_avg_required']}")
        else:
            print("Per-municipality mode disabled. Using aggregated model only.")
            print("To enable, set ENABLE_PER_MUNICIPALITY = True in config.py when you have 6+ months of data.")
        
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
        
        # Determine which model to use
        use_municipality_model = False
        selected_model = aggregated_model
        
        if municipality and ENABLE_PER_MUNICIPALITY:
            municipality_upper = municipality.upper().strip()
            if municipality_upper in municipality_models:
                use_municipality_model = True
                selected_model = municipality_models[municipality_upper]
                print(f"Using municipality-specific model for {municipality_upper}")
            else:
                print(f"Municipality model not available for {municipality_upper}, using aggregated model")
                print(f"Per-municipality models available for: {list(municipality_models.keys())}")
        elif municipality and not ENABLE_PER_MUNICIPALITY:
            print(f"Per-municipality mode disabled. Using aggregated model for all predictions.")
        
        # Make predictions
        predictions = selected_model.predict(weeks=weeks, municipality=municipality)
        
        # Add metadata about which model was used
        predictions['model_used'] = (
            f"{municipality}" if use_municipality_model else "aggregated"
        )
        predictions['per_municipality_enabled'] = ENABLE_PER_MUNICIPALITY
        
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
        if aggregated_model is None:
            return jsonify({
                'success': False,
                'error': 'Model not initialized'
            }), 500
        
        # Get municipality parameter
        municipality = request.args.get('municipality', default=None, type=str)
        
        # Get accuracy metrics from appropriate model
        if municipality and ENABLE_PER_MUNICIPALITY:
            municipality_upper = municipality.upper().strip()
            if municipality_upper in municipality_models:
                accuracy = municipality_models[municipality_upper].get_accuracy_metrics()
                model_type = f"municipality ({municipality_upper})"
            else:
                accuracy = aggregated_model.get_accuracy_metrics()
                model_type = "aggregated (municipality model not available)"
        else:
            accuracy = aggregated_model.get_accuracy_metrics()
            model_type = "aggregated"
        
        if accuracy is None:
            return jsonify({
                'success': False,
                'error': 'Model not trained yet. Please train the model first.'
            }), 404
        
        # Add model type info
        accuracy['model_type'] = model_type
        accuracy['per_municipality_enabled'] = ENABLE_PER_MUNICIPALITY
        
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
        if aggregated_model is None or preprocessor is None:
            return jsonify({
                'success': False,
                'error': 'Model or preprocessor not initialized'
            }), 500
        
        # Get request body
        data = request.get_json() or {}
        force = data.get('force', False)
        municipality = data.get('municipality', None)  # Optional: retrain specific municipality
        
        training_results = {}
        
        # Retrain aggregated model
        print("Retraining aggregated model...")
        processed_data = preprocessor.load_and_process_data()
        
        if aggregated_model.model_exists() and not force:
            return jsonify({
                'success': False,
                'error': 'Model already exists. Use force=true to retrain.',
                'message': 'Set "force": true in request body to retrain existing model'
            }), 400
        
        training_info = aggregated_model.train(processed_data, force=force)
        training_results['aggregated'] = training_info
        
        # Retrain per-municipality models if enabled
        if ENABLE_PER_MUNICIPALITY:
            print("\nRetraining per-municipality models...")
            municipalities_data = preprocessor.load_and_process_data_by_municipality()
            
            for mun_name, mun_data in municipalities_data.items():
                # Skip if specific municipality requested and this isn't it
                if municipality and mun_name.upper() != municipality.upper():
                    continue
                
                sufficiency = preprocessor.check_municipality_data_sufficiency(mun_data)
                
                if sufficiency['is_sufficient']:
                    print(f"\nRetraining model for {mun_name}...")
                    if mun_name not in municipality_models:
                        municipality_models[mun_name] = SARIMAModel(
                            aggregated_model.model_dir, 
                            municipality=mun_name
                        )
                    
                    mun_model = municipality_models[mun_name]
                    if not mun_model.model_exists() or force:
                        mun_training_info = mun_model.train(mun_data, force=force)
                        training_results[mun_name] = mun_training_info
                    else:
                        training_results[mun_name] = "Model exists (use force=true to retrain)"
                else:
                    print(f"Skipping {mun_name} - {sufficiency['sufficient_reason']}")
                    training_results[mun_name] = f"Insufficient data: {sufficiency['sufficient_reason']}"
        
        training_info = training_results
        
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
    municipality_models_count = len(municipality_models) if municipality_models else 0
    
    return jsonify({
        'success': True,
        'status': 'healthy',
        'aggregated_model_initialized': aggregated_model is not None,
        'aggregated_model_trained': aggregated_model.model_exists() if aggregated_model else False,
        'per_municipality_enabled': ENABLE_PER_MUNICIPALITY,
        'municipality_models_count': municipality_models_count,
        'available_municipality_models': list(municipality_models.keys()) if municipality_models else [],
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
        # Note: If port 5000 is in use, change to port 5001 or kill the process using port 5000
        try:
            app.run(host='0.0.0.0', port=5000, debug=False)
        except OSError as e:
            if "Address already in use" in str(e):
                print("\n⚠️  Port 5000 is in use. Trying port 5001...")
                print("To kill the process on port 5000, run: lsof -i :5000 && kill -9 <PID>")
                app.run(host='0.0.0.0', port=5001, debug=False)
            else:
                raise
    else:
        print("Failed to initialize model. Please check the error messages above.")
        sys.exit(1)

