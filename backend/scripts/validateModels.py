"""
Model Validation Script for LTO Accident Prediction System
Validates trained models and provides performance metrics
"""

import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime

# Add the training directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'model', 'ml_models', 'training'))

from model_evaluation import ModelEvaluator

def validate_models():
    """Validate trained models"""
    print("Starting model validation...")
    
    # Paths
    model_path = os.path.join(os.path.dirname(__file__), '..', 'model', 'ml_models', 'trained')
    data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw', 'cleaned_accidents_data.csv')
    config_path = os.path.join(os.path.dirname(__file__), '..', 'model', 'ml_models', 'training', 'model_config.yaml')
    
    # Check if model files exist
    required_files = [
        'accident_rf_model.pkl',
        'accident_rule_system.pkl',
        'feature_encoders.pkl',
        'scaler.pkl',
        'feature_columns.pkl',
        'model_metadata.json'
    ]
    
    missing_files = []
    for file in required_files:
        if not os.path.exists(os.path.join(model_path, file)):
            missing_files.append(file)
    
    if missing_files:
        print(f"ERROR: Missing model files: {missing_files}")
        print("Please run training first using trainModels.sh")
        return False
    
    try:
        # Initialize evaluator
        evaluator = ModelEvaluator(config_path)
        
        # Load model and data
        model_file = os.path.join(model_path, 'accident_rf_model.pkl')
        rule_system_file = os.path.join(model_path, 'accident_rule_system.pkl')
        
        X_test, y_test = evaluator.load_model_and_data(model_file, data_path)
        
        # Generate evaluation report
        results = evaluator.generate_evaluation_report(
            X_test, y_test, model_file, rule_system_file,
            save_path=os.path.join(model_path, 'validation_report.json')
        )
        
        # Print validation summary
        print("\n" + "="*60)
        print("MODEL VALIDATION SUMMARY")
        print("="*60)
        print(f"Model Type: {results['model_info']['model_type']}")
        print(f"Number of Features: {results['model_info']['n_features']}")
        print(f"Number of Classes: {results['model_info']['n_classes']}")
        print(f"Test Accuracy: {results['basic_metrics']['accuracy']:.4f}")
        print(f"Test Precision: {results['basic_metrics']['precision']:.4f}")
        print(f"Test Recall: {results['basic_metrics']['recall']:.4f}")
        print(f"Test F1-Score: {results['basic_metrics']['f1_score']:.4f}")
        
        print(f"\nRisk Distribution:")
        for risk, count in results['rule_system_evaluation']['risk_distribution'].items():
            print(f"  {risk}: {count} samples")
        
        # Check if model meets minimum performance criteria (production thresholds)
        min_accuracy = 0.70  # 70% minimum accuracy for production model
        min_f1 = 0.65  # 65% minimum F1 score for production model
        
        if results['basic_metrics']['accuracy'] >= min_accuracy:
            print(f"\n✅ Model accuracy ({results['basic_metrics']['accuracy']:.4f}) meets minimum requirement ({min_accuracy})")
        else:
            print(f"\n❌ Model accuracy ({results['basic_metrics']['accuracy']:.4f}) below minimum requirement ({min_accuracy})")
        
        if results['basic_metrics']['f1_score'] >= min_f1:
            print(f"✅ Model F1-score ({results['basic_metrics']['f1_score']:.4f}) meets minimum requirement ({min_f1})")
        else:
            print(f"❌ Model F1-score ({results['basic_metrics']['f1_score']:.4f}) below minimum requirement ({min_f1})")
        
        # Save validation status
        validation_status = {
            'validation_date': datetime.now().isoformat(),
            'status': 'PASSED' if (results['basic_metrics']['accuracy'] >= min_accuracy and 
                                  results['basic_metrics']['f1_score'] >= min_f1) else 'FAILED',
            'metrics': results['basic_metrics'],
            'requirements': {
                'min_accuracy': min_accuracy,
                'min_f1_score': min_f1
            }
        }
        
        with open(os.path.join(model_path, 'validation_status.json'), 'w') as f:
            json.dump(validation_status, f, indent=2)
        
        print(f"\nValidation report saved to: {os.path.join(model_path, 'validation_report.json')}")
        print(f"Validation status saved to: {os.path.join(model_path, 'validation_status.json')}")
        
        return validation_status['status'] == 'PASSED'
        
    except Exception as e:
        print(f"ERROR during validation: {str(e)}")
        return False

def test_inference():
    """Test model inference"""
    print("\nTesting model inference...")
    
    try:
        # Add inference directory to path
        sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'model', 'ml_models', 'inference'))
        
        from predictor import AccidentPredictor
        
        model_path = os.path.join(os.path.dirname(__file__), '..', 'model', 'ml_models', 'trained')
        predictor = AccidentPredictor(model_path)
        
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
        
        print("✅ Inference test successful!")
        print(f"Predicted severity: {prediction['predicted_severity']}")
        print(f"Confidence: {prediction['confidence']:.4f}")
        print(f"Risk level: {risk_assessment['risk_level']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Inference test failed: {str(e)}")
        return False

def main():
    """Main validation function"""
    print("LTO Accident Prediction Model Validation")
    print("="*50)
    
    # Validate models
    model_validation_passed = validate_models()
    
    # Test inference
    inference_test_passed = test_inference()
    
    # Final result
    print("\n" + "="*60)
    print("FINAL VALIDATION RESULT")
    print("="*60)
    
    if model_validation_passed and inference_test_passed:
        print("✅ ALL VALIDATIONS PASSED - Models are ready for deployment!")
        return 0
    else:
        print("❌ VALIDATION FAILED - Please check the issues above")
        return 1

if __name__ == "__main__":
    exit(main())
