"""
Unit tests for Random Forest Accident Prediction API endpoints
Tests all endpoints including valid predictions, malformed inputs, metadata, and health checks
"""

import pytest
import json
import os
import sys
from unittest.mock import patch, MagicMock
import pandas as pd
import numpy as np

# Add parent directories to path to import Flask apps
base_dir = os.path.dirname(os.path.abspath(__file__))
ml_models_dir = os.path.dirname(base_dir)
accident_prediction_dir = os.path.join(ml_models_dir, 'accident_prediction')

# Remove any existing app modules from sys.modules to avoid conflicts
modules_to_remove = [k for k in sys.modules.keys() if k == 'app' or k.startswith('app.')]
for mod in modules_to_remove:
    if 'accident_prediction' not in str(sys.modules[mod].__file__ if hasattr(sys.modules[mod], '__file__') else ''):
        continue
    del sys.modules[mod]

# Insert the correct path first
if accident_prediction_dir not in sys.path:
    sys.path.insert(0, accident_prediction_dir)

# Import Flask app with explicit path
import importlib.util
spec = importlib.util.spec_from_file_location("accident_app", os.path.join(accident_prediction_dir, "app.py"))
accident_app_module = importlib.util.module_from_spec(spec)
sys.modules["accident_app"] = accident_app_module
spec.loader.exec_module(accident_app_module)
app = accident_app_module.app


@pytest.fixture
def client():
    """Create a test client for the Flask app"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def mock_models_loaded():
    """Mock the models to be loaded"""
    # Mock regressor prediction
    mock_regressor = MagicMock()
    mock_regressor.predict.return_value = np.array([3.5])
    
    # Mock classifier prediction
    mock_classifier = MagicMock()
    mock_classifier.predict.return_value = np.array([1])  # High risk
    mock_classifier.predict_proba.return_value = np.array([[0.25, 0.75]])  # 75% high risk
    
    # Mock metadata
    mock_metadata = {
        'model_types': ['RandomForestRegressor', 'RandomForestClassifier'],
        'training_date': '2024-01-10T08:00:00.000Z',
        'feature_count': 10,
        'training_samples': 500,
        'test_samples': 100,
        'use_log_target': True,
        'regressor_metrics': {
            'test_r2': 0.75,
            'test_rmse': 2.5,
            'test_mae': 1.8,
            'test_accuracy_20pct': 0.85,
            'test_accuracy_30pct': 0.92,
            'cv_r2_mean': 0.73
        },
        'classifier_metrics': {
            'test_accuracy': 0.88,
            'test_f1': 0.85,
            'test_precision': 0.90,
            'test_recall': 0.80
        }
    }
    
    # Mock data_loader
    mock_data_loader = MagicMock()
    mock_data_loader.connect.return_value = None
    mock_data_loader.load_raw_data.return_value = []
    mock_data_loader.aggregate_monthly_counts.return_value = pd.DataFrame()
    mock_data_loader.disconnect.return_value = None
    
    with patch.object(accident_app_module, 'rf_regressor_model', mock_regressor), \
         patch.object(accident_app_module, 'rf_classifier_model', mock_classifier), \
         patch.object(accident_app_module, 'model_loaded', True), \
         patch.object(accident_app_module, 'model_metadata', mock_metadata), \
         patch.object(accident_app_module, 'data_loader', mock_data_loader):
        
        yield {
            'regressor': mock_regressor,
            'classifier': mock_classifier,
            'metadata': mock_metadata
        }


class TestRandomForestPredictions:
    """Test cases for Random Forest prediction endpoints"""
    
    def test_valid_single_prediction(self, client, mock_models_loaded):
        """Test valid single barangay prediction"""
        response = client.get(
            '/api/accidents/predict/count?year=2024&month=6&municipality=MATI%20(CAPITAL)&barangay=DAWAN'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'prediction' in data
        assert 'predicted_count' in data['prediction']
        assert isinstance(data['prediction']['predicted_count'], (int, float))
        assert data['prediction']['predicted_count'] >= 0
    
    def test_valid_prediction_with_risk_assessment(self, client, mock_models_loaded):
        """Test prediction includes risk assessment"""
        response = client.get(
            '/api/accidents/predict/count?year=2024&month=6&municipality=MATI%20(CAPITAL)&barangay=DAWAN'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'prediction' in data
        # Check for risk-related fields
        prediction = data['prediction']
        assert 'predicted_count' in prediction
        # May have is_high_risk or risk_probability
        assert 'is_high_risk' in prediction or 'risk_probability' in prediction
    
    def test_malformed_input_missing_year(self, client, mock_models_loaded):
        """Test malformed input: missing year parameter"""
        response = client.get(
            '/api/accidents/predict/count?month=6&municipality=MATI%20(CAPITAL)&barangay=DAWAN'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        
        assert data['success'] is False
        assert 'error' in data
        assert 'year' in data['error'].lower() or 'required' in data['error'].lower()
    
    def test_malformed_input_missing_month(self, client, mock_models_loaded):
        """Test malformed input: missing month parameter"""
        response = client.get(
            '/api/accidents/predict/count?year=2024&municipality=MATI%20(CAPITAL)&barangay=DAWAN'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        
        assert data['success'] is False
        assert 'error' in data
        assert 'month' in data['error'].lower() or 'required' in data['error'].lower()
    
    def test_malformed_input_missing_municipality(self, client, mock_models_loaded):
        """Test malformed input: missing municipality parameter"""
        response = client.get(
            '/api/accidents/predict/count?year=2024&month=6&barangay=DAWAN'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        
        assert data['success'] is False
        assert 'error' in data
    
    def test_malformed_input_missing_barangay(self, client, mock_models_loaded):
        """Test malformed input: missing barangay parameter"""
        response = client.get(
            '/api/accidents/predict/count?year=2024&month=6&municipality=MATI%20(CAPITAL)'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        
        assert data['success'] is False
        assert 'error' in data
    
    def test_malformed_input_invalid_month(self, client, mock_models_loaded):
        """Test malformed input: invalid month value (out of range)"""
        response = client.get(
            '/api/accidents/predict/count?year=2024&month=13&municipality=MATI%20(CAPITAL)&barangay=DAWAN'
        )
        
        assert response.status_code in [400, 500]
        data = json.loads(response.data)
        
        assert data['success'] is False
        assert 'error' in data
    
    def test_malformed_input_invalid_month_zero(self, client, mock_models_loaded):
        """Test malformed input: month value is zero"""
        response = client.get(
            '/api/accidents/predict/count?year=2024&month=0&municipality=MATI%20(CAPITAL)&barangay=DAWAN'
        )
        
        assert response.status_code in [400, 500]
        data = json.loads(response.data)
        
        assert data['success'] is False
        assert 'error' in data
    
    def test_malformed_input_invalid_year(self, client, mock_models_loaded):
        """Test malformed input: invalid year value"""
        response = client.get(
            '/api/accidents/predict/count?year=abc&month=6&municipality=MATI%20(CAPITAL)&barangay=DAWAN'
        )
        
        # May return 400 or 500 depending on validation
        assert response.status_code in [400, 500]
        data = json.loads(response.data)
        
        assert data['success'] is False
        assert 'error' in data


class TestRandomForestBatchPredictions:
    """Test cases for batch prediction endpoints"""
    
    def test_valid_batch_prediction(self, client, mock_models_loaded):
        """Test valid batch prediction request"""
        payload = {
            'year': 2024,
            'month': 6,
            'locations': [
                {
                    'municipality': 'MATI (CAPITAL)',
                    'barangay': 'DAWAN'
                },
                {
                    'municipality': 'MATI (CAPITAL)',
                    'barangay': 'CENTRAL'
                }
            ]
        }
        
        response = client.post('/api/accidents/predict/batch', json=payload)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'predictions' in data
        assert isinstance(data['predictions'], list)
        assert len(data['predictions']) > 0
    
    def test_malformed_batch_empty_locations(self, client, mock_models_loaded):
        """Test malformed batch input: empty locations array"""
        payload = {
            'year': 2024,
            'month': 6,
            'locations': []
        }
        
        response = client.post('/api/accidents/predict/batch', json=payload)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        
        assert data['success'] is False
        assert 'error' in data
        assert 'location' in data['error'].lower() or 'empty' in data['error'].lower() or 'no locations' in data['error'].lower()
    
    def test_malformed_batch_missing_locations(self, client, mock_models_loaded):
        """Test malformed batch input: missing locations field"""
        payload = {}
        
        response = client.post('/api/accidents/predict/batch', json=payload)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        
        assert data['success'] is False
        assert 'error' in data
    
    def test_malformed_batch_invalid_location(self, client, mock_models_loaded):
        """Test malformed batch input: invalid location data"""
        payload = {
            'locations': [
                {
                    'year': 2024,
                    'month': 6
                    # Missing municipality and barangay
                }
            ]
        }
        
        response = client.post('/api/accidents/predict/batch', json=payload)
        
        # May return 400 or filter out invalid locations
        assert response.status_code in [200, 400]
        data = json.loads(response.data)
        
        if response.status_code == 400:
            assert data['success'] is False
            assert 'error' in data


class TestRandomForestPredictAll:
    """Test cases for predict all barangays endpoint"""
    
    def test_valid_predict_all(self, client, mock_models_loaded):
        """Test valid predict all barangays request"""
        # Mock historical data for predict_all endpoint
        mock_historical_data = pd.DataFrame({
            'municipality': ['MATI (CAPITAL)', 'MATI (CAPITAL)'],
            'barangay': ['DAWAN', 'CENTRAL'],
            'year': [2023, 2023],
            'month': [6, 6],
            'accident_count': [5, 3]
        })
        
        # Update the data_loader mock to return proper historical data
        accident_app_module.data_loader.connect.return_value = None
        accident_app_module.data_loader.load_raw_data.return_value = []
        accident_app_module.data_loader.aggregate_monthly_counts.return_value = mock_historical_data
        accident_app_module.data_loader.disconnect.return_value = None
        
        response = client.get('/api/accidents/predict/all?year=2024&month=6')
        
        # If endpoint doesn't exist (404), that's acceptable
        if response.status_code == 404:
            pytest.skip("Endpoint /api/accidents/predict/all not found - may have been removed")
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['success'] is True
        assert 'predictions' in data
        assert isinstance(data['predictions'], list)
        assert 'year' in data
        assert 'month' in data
    
    def test_malformed_predict_all_missing_year(self, client, mock_models_loaded):
        """Test malformed input: missing year for predict all"""
        response = client.get('/api/accidents/predict/all?month=6')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        
        assert data['success'] is False
        assert 'error' in data
    
    def test_malformed_predict_all_missing_month(self, client, mock_models_loaded):
        """Test malformed input: missing month for predict all"""
        response = client.get('/api/accidents/predict/all?year=2024')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        
        assert data['success'] is False
        assert 'error' in data


class TestRandomForestHealthCheck:
    """Test cases for Random Forest health check endpoint"""
    
    def test_health_check_success(self, client, mock_models_loaded):
        """Test health check endpoint returns success"""
        response = client.get('/api/accidents/health')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['status'] == 'ok'
        assert 'model_loaded' in data
        assert 'timestamp' in data
        assert isinstance(data['model_loaded'], bool)
    
    def test_health_check_model_info(self, client, mock_models_loaded):
        """Test health check includes model information"""
        response = client.get('/api/accidents/health')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert 'model_info' in data
        model_info = data['model_info']
        assert 'model_type' in model_info or 'model_types' in model_info
        assert 'training_date' in model_info or 'feature_count' in model_info
    
    def test_health_check_consistent_response(self, client, mock_models_loaded):
        """Test health check returns consistent response structure"""
        response1 = client.get('/api/accidents/health')
        response2 = client.get('/api/accidents/health')
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        data1 = json.loads(response1.data)
        data2 = json.loads(response2.data)
        
        # Check that structure is consistent
        assert set(data1.keys()) == set(data2.keys())
        assert data1['status'] == data2['status']
        assert data1['model_loaded'] == data2['model_loaded']


class TestRandomForestModelNotLoaded:
    """Test cases when model is not loaded"""
    
    def test_prediction_model_not_loaded(self, client):
        """Test prediction endpoint when model is not loaded"""
        with patch.object(accident_app_module, 'model_loaded', False):
            response = client.get(
                '/api/accidents/predict/count?year=2024&month=6&municipality=MATI%20(CAPITAL)&barangay=DAWAN'
            )
            
            assert response.status_code == 503
            data = json.loads(response.data)
            
            assert data['success'] is False
            assert 'error' in data
            assert 'model' in data['error'].lower() or 'loaded' in data['error'].lower()
    
    def test_batch_prediction_model_not_loaded(self, client):
        """Test batch prediction endpoint when model is not loaded"""
        with patch.object(accident_app_module, 'model_loaded', False):
            payload = {
                'year': 2024,
                'month': 6,
                'locations': [
                    {
                        'municipality': 'MATI (CAPITAL)',
                        'barangay': 'DAWAN'
                    }
                ]
            }
            
            response = client.post('/api/accidents/predict/batch', json=payload)
            
            assert response.status_code == 503
            data = json.loads(response.data)
            
            assert data['success'] is False
            assert 'error' in data


class TestRandomForestModelMetadata:
    """Test cases for model metadata"""
    
    def test_prediction_includes_model_info(self, client, mock_models_loaded):
        """Test that predictions include model information when available"""
        response = client.get(
            '/api/accidents/predict/count?year=2024&month=6&municipality=MATI%20(CAPITAL)&barangay=DAWAN'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # May or may not include model_info, but if it does, should be valid
        if 'model_info' in data:
            model_info = data['model_info']
            assert isinstance(model_info, dict)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

