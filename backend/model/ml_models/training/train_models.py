"""
Model Training Script for LTO Incident Prediction System
Implements Random Forest Classifier and Rule-Based System for Case Status Prediction
Updated to work with new incident data structure (blotterNo, dateCommited, caseStatus, incidentType, etc.)
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report, confusion_matrix
from sklearn.model_selection import cross_val_score
import joblib
import yaml
import os
import json
from datetime import datetime
import logging

from feature_engineering import FeatureEngineer

class IncidentPredictionTrainer:
    def __init__(self, config_path="model_config.yaml"):
        """Initialize trainer with configuration for incident case status prediction"""
        with open(config_path, 'r') as file:
            self.config = yaml.safe_load(file)
        
        self.feature_engineer = FeatureEngineer(config_path)
        self.rf_model = None
        self.rule_system = None
        
        # Setup logging
        self.setup_logging()
    
    def setup_logging(self):
        """Setup logging for training process"""
        log_path = self.config['output']['logs_path']
        os.makedirs(log_path, exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(os.path.join(log_path, 'model_training.log')),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def load_and_prepare_data(self):
        """Load and prepare data for training"""
        self.logger.info("Loading and preparing data...")
        
        # Load data
        df = self.feature_engineer.load_data(self.config['data']['raw_data_path'])
        
        # Prepare features
        df = self.feature_engineer.prepare_features(df, fit_encoders=True)
        df = self.feature_engineer.prepare_target(df)
        
        # Split data
        X_train, X_test, y_train, y_test = self.feature_engineer.split_data(df)
        
        self.logger.info(f"Data prepared: {len(X_train)} training samples, {len(X_test)} test samples")
        
        return X_train, X_test, y_train, y_test
    
    def train_random_forest(self, X_train, y_train):
        """Train Random Forest Classifier"""
        self.logger.info("Training Random Forest Classifier...")
        
        rf_config = self.config['random_forest']
        self.rf_model = RandomForestClassifier(
            n_estimators=rf_config['n_estimators'],
            max_depth=rf_config['max_depth'],
            min_samples_split=rf_config['min_samples_split'],
            min_samples_leaf=rf_config['min_samples_leaf'],
            random_state=rf_config['random_state'],
            n_jobs=rf_config['n_jobs']
        )
        
        # Train the model
        self.rf_model.fit(X_train, y_train)
        
        # Cross-validation
        cv_scores = cross_val_score(
            self.rf_model, X_train, y_train,
            cv=self.config['evaluation']['cross_validation_folds'],
            scoring='accuracy'
        )
        
        self.logger.info(f"Random Forest CV Accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
        
        return self.rf_model
    
    def evaluate_model(self, X_test, y_test):
        """Evaluate the trained model"""
        self.logger.info("Evaluating model...")
        
        # Make predictions
        y_pred = self.rf_model.predict(X_test)
        
        # Calculate metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, average='weighted')
        recall = recall_score(y_test, y_pred, average='weighted')
        f1 = f1_score(y_test, y_pred, average='weighted')
        
        # Log metrics
        self.logger.info(f"Test Accuracy: {accuracy:.4f}")
        self.logger.info(f"Test Precision: {precision:.4f}")
        self.logger.info(f"Test Recall: {recall:.4f}")
        self.logger.info(f"Test F1-Score: {f1:.4f}")
        
        # Classification report
        self.logger.info("Classification Report:")
        self.logger.info(f"\n{classification_report(y_test, y_pred)}")
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        self.logger.info(f"Confusion Matrix:\n{cm}")
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': self.feature_engineer.feature_columns,
            'importance': self.rf_model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        self.logger.info("Top 10 Most Important Features:")
        self.logger.info(feature_importance.head(10).to_string())
        
        return {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1_score': f1,
            'confusion_matrix': cm.tolist(),
            'feature_importance': feature_importance.to_dict('records')
        }
    
    def create_rule_based_system(self, X_train, y_train):
        """Create rule-based system for prescriptive analytics"""
        self.logger.info("Creating rule-based system...")
        
        # Get predictions from Random Forest
        y_pred_proba = self.rf_model.predict_proba(X_train)
        max_proba = np.max(y_pred_proba, axis=1)
        
        # Create risk levels based on prediction confidence
        risk_thresholds = self.config['rule_system']['risk_thresholds']
        
        # Create rule-based system (without lambda function for pickle compatibility)
        self.rule_system = {
            'risk_thresholds': risk_thresholds,
            'prescriptive_actions': self.config['rule_system']['prescriptive_actions'],
            'case_status_mapping': self.config['rule_system']['case_status_mapping']
        }
        
        self.logger.info("Rule-based system created successfully")
        return self.rule_system
    
    def save_models(self):
        """Save trained models and metadata"""
        self.logger.info("Saving models...")
        
        save_path = self.config['output']['model_save_path']
        os.makedirs(save_path, exist_ok=True)
        
        # Save Random Forest model
        rf_path = os.path.join(save_path, f"{self.config['output']['model_name']}.pkl")
        joblib.dump(self.rf_model, rf_path)
        
        # Save rule-based system
        rule_path = os.path.join(save_path, f"{self.config['output']['rule_system_name']}.pkl")
        joblib.dump(self.rule_system, rule_path)
        
        # Save feature preprocessors
        self.feature_engineer.save_preprocessors(save_path)
        
        # Save model metadata
        metadata = {
            'model_name': self.config['output']['model_name'],
            'rule_system_name': self.config['output']['rule_system_name'],
            'training_date': datetime.now().isoformat(),
            'config': self.config,
            'feature_columns': self.feature_engineer.feature_columns,
            'model_type': 'RandomForestClassifier',
            'rule_system_type': 'PrescriptiveRuleBased'
        }
        
        metadata_path = os.path.join(save_path, 'model_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        self.logger.info(f"Models saved to {save_path}")
    
    def train_complete_pipeline(self):
        """Run the complete training pipeline"""
        try:
            self.logger.info("Starting complete training pipeline...")
            
            # Load and prepare data
            X_train, X_test, y_train, y_test = self.load_and_prepare_data()
            
            # Train Random Forest
            self.train_random_forest(X_train, y_train)
            
            # Evaluate model
            evaluation_results = self.evaluate_model(X_test, y_test)
            
            # Create rule-based system
            self.create_rule_based_system(X_train, y_train)
            
            # Save models
            self.save_models()
            
            self.logger.info("Training pipeline completed successfully!")
            
            return {
                'status': 'success',
                'evaluation_results': evaluation_results,
                'model_saved': True
            }
            
        except Exception as e:
            self.logger.error(f"Training pipeline failed: {str(e)}")
            return {
                'status': 'error',
                'error': str(e),
                'model_saved': False
            }

def main():
    """Main function to run training"""
    print("=" * 60)
    print("LTO Incident Case Status Prediction Model Training")
    print("Updated for new incident data structure")
    print("=" * 60)
    
    trainer = IncidentPredictionTrainer()
    results = trainer.train_complete_pipeline()
    
    if results['status'] == 'success':
        print("\n" + "=" * 60)
        print("✅ Training completed successfully!")
        print(f"Model accuracy: {results['evaluation_results']['accuracy']:.4f}")
        print(f"Model precision: {results['evaluation_results']['precision']:.4f}")
        print(f"Model recall: {results['evaluation_results']['recall']:.4f}")
        print(f"Model F1-score: {results['evaluation_results']['f1_score']:.4f}")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print(f"❌ Training failed: {results['error']}")
        print("=" * 60)

if __name__ == "__main__":
    main()
