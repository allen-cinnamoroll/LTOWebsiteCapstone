"""
Prediction Module for LTO Accident Prediction System
Handles real-time predictions using trained models
"""

import pandas as pd
import numpy as np
import joblib
import os
from datetime import datetime
import logging

from data_preprocessor import InferencePreprocessor

class AccidentPredictor:
    def __init__(self, model_path):
        """Initialize predictor with trained models"""
        self.model_path = model_path
        self.rf_model = None
        self.rule_system = None
        self.preprocessor = None
        self.metadata = None
        
        self.setup_logging()
        self.load_models()
    
    def setup_logging(self):
        """Setup logging for predictions"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
    
    def load_models(self):
        """Load trained models and preprocessors"""
        try:
            # Load Random Forest model
            rf_path = os.path.join(self.model_path, 'accident_rf_model.pkl')
            self.rf_model = joblib.load(rf_path)
            
            # Load rule-based system
            rule_path = os.path.join(self.model_path, 'accident_rule_system.pkl')
            self.rule_system = joblib.load(rule_path)
            
            # Load preprocessor
            self.preprocessor = InferencePreprocessor(self.model_path)
            
            # Load metadata
            metadata_path = os.path.join(self.model_path, 'model_metadata.json')
            with open(metadata_path, 'r') as f:
                import json
                self.metadata = json.load(f)
            
            self.logger.info("Models loaded successfully")
            
        except Exception as e:
            self.logger.error(f"Error loading models: {str(e)}")
            raise
    
    def predict_severity(self, accident_data):
        """Predict accident severity for a single record"""
        try:
            # Preprocess the data
            processed_data = self.preprocessor.preprocess_single_record(accident_data)
            
            # Make prediction
            severity_pred = self.rf_model.predict(processed_data)[0]
            severity_proba = self.rf_model.predict_proba(processed_data)[0]
            
            # Get confidence score
            confidence = np.max(severity_proba)
            
            # Map severity back to string
            severity_mapping = {v: k for k, v in self.rule_system['severity_mapping'].items()}
            severity_label = severity_mapping.get(severity_pred, 'unknown')
            
            return {
                'predicted_severity': severity_label,
                'severity_code': int(severity_pred),
                'confidence': float(confidence),
                'probabilities': {
                    'minor': float(severity_proba[0]),
                    'moderate': float(severity_proba[1]),
                    'severe': float(severity_proba[2])
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error predicting severity: {str(e)}")
            raise
    
    def get_risk_assessment(self, accident_data):
        """Get risk assessment and prescriptive recommendations"""
        try:
            # Get severity prediction
            prediction = self.predict_severity(accident_data)
            confidence = prediction['confidence']
            
            # Determine risk level using thresholds
            risk_thresholds = self.rule_system['risk_thresholds']
            if confidence >= risk_thresholds['high_risk']:
                risk_level = 'high_risk'
            elif confidence >= risk_thresholds['medium_risk']:
                risk_level = 'medium_risk'
            else:
                risk_level = 'low_risk'
            
            # Get prescriptive actions
            prescriptive_actions = self.rule_system['prescriptive_actions'][risk_level]
            
            return {
                'risk_level': risk_level,
                'confidence': confidence,
                'prescriptive_actions': prescriptive_actions,
                'severity_prediction': prediction
            }
            
        except Exception as e:
            self.logger.error(f"Error getting risk assessment: {str(e)}")
            raise
    
    def predict_batch(self, accident_records):
        """Predict severity for multiple records"""
        try:
            results = []
            
            for record in accident_records:
                prediction = self.predict_severity(record)
                risk_assessment = self.get_risk_assessment(record)
                
                results.append({
                    'accident_id': record.get('accident_id', 'unknown'),
                    'prediction': prediction,
                    'risk_assessment': risk_assessment,
                    'timestamp': datetime.now().isoformat()
                })
            
            return results
            
        except Exception as e:
            self.logger.error(f"Error in batch prediction: {str(e)}")
            raise
    
    def get_model_info(self):
        """Get information about the loaded models"""
        return {
            'model_type': self.metadata.get('model_type', 'Unknown'),
            'rule_system_type': self.metadata.get('rule_system_type', 'Unknown'),
            'training_date': self.metadata.get('training_date', 'Unknown'),
            'feature_count': len(self.preprocessor.feature_columns),
            'model_path': self.model_path
        }
    
    def validate_input(self, accident_data):
        """Validate input data for prediction"""
        required_fields = ['accident_date', 'vehicle_type', 'municipality', 'latitude', 'longitude']
        missing_fields = [field for field in required_fields if field not in accident_data]
        
        if missing_fields:
            return False, f"Missing required fields: {missing_fields}"
        
        # Validate data types
        try:
            pd.to_datetime(accident_data['accident_date'])
            float(accident_data['latitude'])
            float(accident_data['longitude'])
        except (ValueError, TypeError) as e:
            return False, f"Invalid data types: {str(e)}"
        
        return True, "Valid input"

class PredictionService:
    """Service class for handling prediction requests"""
    
    def __init__(self, model_path):
        self.predictor = AccidentPredictor(model_path)
    
    def predict_single(self, accident_data):
        """Predict for a single accident record"""
        # Validate input
        is_valid, message = self.predictor.validate_input(accident_data)
        if not is_valid:
            return {
                'success': False,
                'error': message,
                'timestamp': datetime.now().isoformat()
            }
        
        try:
            # Get prediction and risk assessment
            prediction = self.predictor.predict_severity(accident_data)
            risk_assessment = self.predictor.get_risk_assessment(accident_data)
            
            return {
                'success': True,
                'prediction': prediction,
                'risk_assessment': risk_assessment,
                'model_info': self.predictor.get_model_info(),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def predict_multiple(self, accident_records):
        """Predict for multiple accident records"""
        results = []
        
        for record in accident_records:
            result = self.predict_single(record)
            results.append(result)
        
        return {
            'success': True,
            'results': results,
            'total_records': len(accident_records),
            'timestamp': datetime.now().isoformat()
        }

if __name__ == "__main__":
    import sys
    import json
    import argparse
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='LTO Accident Prediction System')
    parser.add_argument('--input', type=str, help='Input data as JSON string')
    parser.add_argument('--batch', type=str, help='Batch input data as JSON string')
    parser.add_argument('--model_path', type=str, default='../trained/', help='Path to trained models')
    parser.add_argument('--validate', type=str, help='Validate input data')
    
    args = parser.parse_args()
    
    try:
        if args.validate:
            # Validation mode
            from validator import ValidationService
            validator = ValidationService()
            record = json.loads(args.validate)
            result = validator.validate_for_prediction(record)
            print(json.dumps(result))
            
        elif args.input:
            # Single prediction mode
            predictor = AccidentPredictor(args.model_path)
            input_data = json.loads(args.input)
            
            prediction = predictor.predict_severity(input_data)
            risk_assessment = predictor.get_risk_assessment(input_data)
            
            result = {
                'success': True,
                'prediction': prediction,
                'risk_assessment': risk_assessment,
                'model_info': predictor.get_model_info()
            }
            print(json.dumps(result))
            
        elif args.batch:
            # Batch prediction mode
            predictor = AccidentPredictor(args.model_path)
            input_data = json.loads(args.batch)
            
            results = predictor.predict_batch(input_data)
            print(json.dumps(results))
            
        else:
            # Test mode
            predictor = AccidentPredictor(args.model_path)
            
            # Test record
            test_record = {
                'accident_id': 'TEST-001',
                'plateNo': 'ABC-1234',
                'accident_date': '2024-01-15T10:30:00.000Z',
                'street': 'Rizal Street',
                'barangay': 'Poblacion',
                'municipality': 'Mati',
                'vehicle_type': 'car',
                'latitude': 6.95,
                'longitude': 126.20
            }
            
            # Test prediction
            prediction = predictor.predict_severity(test_record)
            risk_assessment = predictor.get_risk_assessment(test_record)
            
            print("Prediction successful!")
            print(f"Predicted severity: {prediction['predicted_severity']}")
            print(f"Confidence: {prediction['confidence']:.4f}")
            print(f"Risk level: {risk_assessment['risk_level']}")
            print(f"Prescriptive actions: {risk_assessment['prescriptive_actions']}")
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)
