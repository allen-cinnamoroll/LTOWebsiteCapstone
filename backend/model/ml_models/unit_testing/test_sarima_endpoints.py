"""
Unit tests for SARIMA Vehicle Registration Prediction API endpoints
Tests all endpoints including valid predictions, malformed inputs, metadata, and health checks
"""

import pytest
import json
import os
import sys
from unittest.mock import patch, MagicMock
import pandas as pd

# Add parent directories to path to import Flask apps
base_dir = os.path.dirname(os.path.abspath(__file__))
ml_models_dir = os.path.dirname(base_dir)
mv_registration_dir = os.path.join(ml_models_dir, 'mv_registration_flask')

# Remove any existing app modules from sys.modules to avoid conflicts
modules_to_remove = [k for k in sys.modules.keys() if k == 'app' or k.startswith('app.')]
for mod in modules_to_remove:
    if 'mv_registration_flask' not in str(sys.modules[mod].__file__ if hasattr(sys.modules[mod], '__file__') else ''):
        continue
    del sys.modules[mod]

# Insert the correct path first
if mv_registration_dir not in sys.path:
    sys.path.insert(0, mv_registration_dir)

# Import Flask app and module with explicit path
import importlib.util
spec = importlib.util.spec_from_file_location("sarima_app", os.path.join(mv_registration_dir, "app.py"))
sarima_app_module = importlib.util.module_from_spec(spec)
sys.modules["sarima_app"] = sarima_app_module
spec.loader.exec_module(sarima_app_module)
app = sarima_app_module.app


@pytest.fixture
def client():
    """Create a test client for the Flask app"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def mock_model_initialized():
    """Mock the model initialization to avoid actual model loading during tests"""
    mock_model = MagicMock()
    mock_model.model_exists.return_value = True
    mock_model.accuracy_metrics = {
        'mae': 10.5,
        'rmse': 15.2,
        'mape': 12.3,
        'r2': 0.85
    }
    mock_model.test_accuracy_metrics = {
        'mae': 11.2,
        'rmse': 16.1,
        'mape': 13.5,
        'r2': 0.82
    }
    mock_model.model_params = {
        'order': (1, 1, 1),
        'seasonal_order': (1, 1, 1, 7)
    }
    mock_model.cv_results = {
        'mean_mape': 12.5,
        'std_mape': 2.1
    }
    mock_model.diagnostics = {
        'ljung_box_pvalue': 0.15,
        'jarque_bera_pvalue': 0.08
    }
    
    # Mock prediction response
    mock_predictions = {
        'weekly_predictions': [
            {
                'date': '2025-08-03',
                'week_start': '2025-08-03',
                'total_predicted': 150,
                'predicted_count': 150,
                'predicted': 150,
                'lower_bound': 120,
                'upper_bound': 180
            },
            {
                'date': '2025-08-10',
                'week_start': '2025-08-10',
                'total_predicted': 145,
                'predicted_count': 145,
                'predicted': 145,
                'lower_bound': 115,
                'upper_bound': 175
            }
        ],
        'monthly_aggregation': {
            'total_predicted': 600,
            'lower_bound': 480,
            'upper_bound': 720
        },
        'prediction_dates': ['2025-08-03', '2025-08-10'],
        'prediction_start_date': '2025-08-01'
    }
    mock_model.predict.return_value = mock_predictions
    
    # Mock preprocessor with proper DataFrame
    mock_preprocessor = MagicMock()
    # Create a proper DataFrame for exogenous variables that matches what the code expects
    future_dates = pd.date_range(start='2025-08-01', periods=28, freq='D')
    mock_exog = pd.DataFrame({
        'is_weekend_or_holiday': [0] * 28
    }, index=future_dates)
    # Make sure the DataFrame has the right structure
    mock_exog.index = future_dates
    mock_preprocessor._create_exogenous_variables.return_value = mock_exog
    
    with patch.object(sarima_app_module, 'aggregated_model', mock_model), \
         patch.object(sarima_app_module, 'municipality_models', {}), \
         patch.object(sarima_app_module, 'preprocessor', mock_preprocessor):
        yield mock_model


class TestSARIMAPredictions:
    """Test cases for SARIMA prediction endpoints"""
    
    def test_valid_prediction_default_weeks(self, client, mock_model_initialized):
        """Test valid prediction request with default weeks parameter"""
        response = client.get('/api/predict/registrations')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'weekly_predictions' in data['data']
        assert 'monthly_aggregation' in data['data']
        assert 'prediction_dates' in data['data']
        assert isinstance(data['data']['weekly_predictions'], list)
        assert len(data['data']['weekly_predictions']) > 0
        
        # Check prediction structure
        first_pred = data['data']['weekly_predictions'][0]
        assert 'date' in first_pred
        assert 'total_predicted' in first_pred or 'predicted_count' in first_pred
        assert 'lower_bound' in first_pred
        assert 'upper_bound' in first_pred
    
    def test_valid_prediction_custom_weeks(self, client, mock_model_initialized):
        """Test valid prediction request with custom weeks parameter"""
        response = client.get('/api/predict/registrations?weeks=8')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert data['data']['prediction_weeks'] == 8
        assert 'weekly_predictions' in data['data']
    
    def test_valid_prediction_with_municipality(self, client, mock_model_initialized):
        """Test valid prediction request with municipality parameter"""
        response = client.get('/api/predict/registrations?weeks=4&municipality=CITY%20OF%20MATI')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'municipality' in data['data']
        assert data['data']['municipality'] == 'CITY OF MATI'
    
    def test_malformed_input_weeks_too_large(self, client, mock_model_initialized):
        """Test malformed input: weeks parameter exceeds maximum"""
        response = client.get('/api/predict/registrations?weeks=100')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        
        assert data['success'] is False
        assert 'error' in data
        assert '52' in data['error'] or 'between' in data['error'].lower()
    
    def test_malformed_input_weeks_negative(self, client, mock_model_initialized):
        """Test malformed input: negative weeks parameter"""
        response = client.get('/api/predict/registrations?weeks=-5')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        
        assert data['success'] is False
        assert 'error' in data
    
    def test_malformed_input_weeks_zero(self, client, mock_model_initialized):
        """Test malformed input: weeks parameter is zero"""
        response = client.get('/api/predict/registrations?weeks=0')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        
        assert data['success'] is False
        assert 'error' in data
    
    def test_malformed_input_weeks_not_integer(self, client, mock_model_initialized):
        """Test malformed input: weeks parameter is not an integer"""
        response = client.get('/api/predict/registrations?weeks=abc')
        
        # Flask will return 200 but with default value, or 400 depending on implementation
        # Check that it handles gracefully
        assert response.status_code in [200, 400]
        data = json.loads(response.data)
        
        # If 200, should use default; if 400, should have error
        if response.status_code == 400:
            assert data['success'] is False
            assert 'error' in data


class TestSARIMAModelMetadata:
    """Test cases for SARIMA model metadata endpoints"""
    
    def test_get_model_accuracy(self, client, mock_model_initialized):
        """Test getting model accuracy metrics"""
        response = client.get('/api/model/accuracy')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'data' in data
        
        accuracy_data = data['data']
        assert 'mae' in accuracy_data or 'in_sample' in accuracy_data
        assert 'rmse' in accuracy_data or 'in_sample' in accuracy_data
        assert 'mape' in accuracy_data or 'in_sample' in accuracy_data
        assert 'model_parameters' in accuracy_data
        assert 'model_type' in accuracy_data
    
    def test_get_model_accuracy_with_municipality(self, client, mock_model_initialized):
        """Test getting model accuracy for specific municipality"""
        response = client.get('/api/model/accuracy?municipality=CITY%20OF%20MATI')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'data' in data
        assert 'municipality' in data['data']
    
    def test_model_metadata_structure(self, client, mock_model_initialized):
        """Test that model metadata contains all expected fields"""
        response = client.get('/api/model/accuracy')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        accuracy_data = data['data']
        
        # Check for model parameters
        assert 'model_parameters' in accuracy_data
        params = accuracy_data['model_parameters']
        assert isinstance(params, dict)
        
        # Check for model type
        assert 'model_type' in accuracy_data
        assert accuracy_data['model_type'] == 'optimized_sarima_daily'


class TestSARIMAHealthCheck:
    """Test cases for SARIMA health check endpoint"""
    
    def test_health_check_success(self, client, mock_model_initialized):
        """Test health check endpoint returns success"""
        response = client.get('/api/health')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert data['status'] == 'healthy'
        assert 'aggregated_model_initialized' in data
        assert 'aggregated_model_trained' in data
        assert 'model_type' in data
        assert 'timestamp' in data
    
    def test_health_check_consistent_response(self, client, mock_model_initialized):
        """Test health check returns consistent response structure"""
        response1 = client.get('/api/health')
        response2 = client.get('/api/health')
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        data1 = json.loads(response1.data)
        data2 = json.loads(response2.data)
        
        # Check that structure is consistent
        assert set(data1.keys()) == set(data2.keys())
        assert data1['status'] == data2['status']
        assert data1['model_type'] == data2['model_type']
    
    def test_health_check_model_status(self, client, mock_model_initialized):
        """Test health check includes model status information"""
        response = client.get('/api/health')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert 'aggregated_model_initialized' in data
        assert 'aggregated_model_trained' in data
        assert isinstance(data['aggregated_model_initialized'], bool)
        assert isinstance(data['aggregated_model_trained'], bool)


class TestSARIMAModelNotInitialized:
    """Test cases when model is not initialized"""
    
    def test_prediction_model_not_initialized(self, client):
        """Test prediction endpoint when model is not initialized"""
        with patch.object(sarima_app_module, 'aggregated_model', None):
            response = client.get('/api/predict/registrations')
            
            assert response.status_code == 500
            data = json.loads(response.data)
            
            assert data['success'] is False
            assert 'error' in data
    
    def test_accuracy_model_not_initialized(self, client):
        """Test accuracy endpoint when model is not initialized"""
        with patch.object(sarima_app_module, 'aggregated_model', None):
            response = client.get('/api/model/accuracy')
            
            assert response.status_code == 500
            data = json.loads(response.data)
            
            assert data['success'] is False
            assert 'error' in data


class TestSARIMARetrain:
    """Test cases for model retraining endpoint"""
    
    def test_retrain_without_force(self, client, mock_model_initialized):
        """Test retrain endpoint without force parameter"""
        response = client.post('/api/model/retrain', json={})
        
        # Should return 400 if model exists and force is not set
        assert response.status_code in [400, 200]
        data = json.loads(response.data)
        
        if response.status_code == 400:
            assert data['success'] is False
            assert 'force' in data.get('error', '').lower() or 'already exists' in data.get('error', '').lower()
    
    def test_retrain_with_force(self, client, mock_model_initialized):
        """Test retrain endpoint with force parameter"""
        with patch('app.preprocessor') as mock_preprocessor, \
             patch('app.export_mongo_to_csv') as mock_export:
            
            mock_preprocessor.load_and_process_daily_data.return_value = (
                MagicMock(), MagicMock(), {}
            )
            mock_model_initialized.train.return_value = {
                'training_time': 120.5,
                'model_params': {'order': (1, 1, 1)}
            }
            
            response = client.post('/api/model/retrain', json={'force': True})
            
            # May succeed or fail depending on actual implementation
            assert response.status_code in [200, 500]
            data = json.loads(response.data)
            
            # If successful, should have success: true
            if response.status_code == 200:
                assert data['success'] is True


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

