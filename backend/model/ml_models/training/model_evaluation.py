"""
Model Evaluation Module for LTO Accident Prediction System
Provides comprehensive evaluation metrics and visualization
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    classification_report, confusion_matrix, roc_curve, auc,
    precision_recall_curve, average_precision_score
)
from sklearn.model_selection import learning_curve, validation_curve
import joblib
import yaml
import os
from datetime import datetime
from feature_engineering import FeatureEngineer

class ModelEvaluator:
    def __init__(self, config_path="model_config.yaml"):
        """Initialize evaluator with configuration"""
        with open(config_path, 'r') as file:
            self.config = yaml.safe_load(file)
        
        self.results = {}
        
    def load_model_and_data(self, model_path, data_path):
        """Load trained model and test data"""
        # Load model
        self.model = joblib.load(model_path)
        
        # Load preprocessors
        preprocessor_path = os.path.dirname(model_path)
        # Get the config path relative to the training directory
        training_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(training_dir, "model_config.yaml")
        self.feature_engineer = FeatureEngineer(config_path)
        self.feature_engineer.load_preprocessors(preprocessor_path)
        
        # Load and prepare test data
        df = self.feature_engineer.load_data(data_path)
        df = self.feature_engineer.prepare_features(df, fit_encoders=False)
        df = self.feature_engineer.prepare_target(df)
        
        # Split data (using same random state for consistency)
        X_train, X_test, y_train, y_test = self.feature_engineer.split_data(df)
        
        return X_test, y_test
    
    def calculate_basic_metrics(self, y_true, y_pred):
        """Calculate basic classification metrics"""
        metrics = {
            'accuracy': accuracy_score(y_true, y_pred),
            'precision': precision_score(y_true, y_pred, average='weighted'),
            'recall': recall_score(y_true, y_pred, average='weighted'),
            'f1_score': f1_score(y_true, y_pred, average='weighted')
        }
        
        # Per-class metrics
        precision_per_class = precision_score(y_true, y_pred, average=None)
        recall_per_class = recall_score(y_true, y_pred, average=None)
        f1_per_class = f1_score(y_true, y_pred, average=None)
        
        metrics['precision_per_class'] = precision_per_class.tolist()
        metrics['recall_per_class'] = recall_per_class.tolist()
        metrics['f1_per_class'] = f1_per_class.tolist()
        
        return metrics
    
    def plot_confusion_matrix(self, y_true, y_pred, save_path=None):
        """Plot confusion matrix"""
        cm = confusion_matrix(y_true, y_pred)
        
        plt.figure(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                   xticklabels=['Minor', 'Moderate', 'Severe'],
                   yticklabels=['Minor', 'Moderate', 'Severe'])
        plt.title('Confusion Matrix')
        plt.xlabel('Predicted')
        plt.ylabel('Actual')
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.show()
        
        return cm
    
    def plot_feature_importance(self, feature_names, importances, top_n=15, save_path=None):
        """Plot feature importance"""
        # Create DataFrame
        feature_df = pd.DataFrame({
            'feature': feature_names,
            'importance': importances
        }).sort_values('importance', ascending=True).tail(top_n)
        
        plt.figure(figsize=(10, 8))
        plt.barh(range(len(feature_df)), feature_df['importance'])
        plt.yticks(range(len(feature_df)), feature_df['feature'])
        plt.xlabel('Feature Importance')
        plt.title(f'Top {top_n} Most Important Features')
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.show()
        
        return feature_df
    
    def plot_learning_curve(self, X, y, save_path=None):
        """Plot learning curve"""
        train_sizes, train_scores, val_scores = learning_curve(
            self.model, X, y, cv=5, n_jobs=-1,
            train_sizes=np.linspace(0.1, 1.0, 10)
        )
        
        train_mean = np.mean(train_scores, axis=1)
        train_std = np.std(train_scores, axis=1)
        val_mean = np.mean(val_scores, axis=1)
        val_std = np.std(val_scores, axis=1)
        
        plt.figure(figsize=(10, 6))
        plt.plot(train_sizes, train_mean, 'o-', label='Training Score')
        plt.fill_between(train_sizes, train_mean - train_std, train_mean + train_std, alpha=0.1)
        plt.plot(train_sizes, val_mean, 'o-', label='Validation Score')
        plt.fill_between(train_sizes, val_mean - val_std, val_mean + val_std, alpha=0.1)
        plt.xlabel('Training Set Size')
        plt.ylabel('Accuracy Score')
        plt.title('Learning Curve')
        plt.legend()
        plt.grid(True)
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
        plt.show()
    
    def evaluate_rule_system(self, X_test, y_test, rule_system_path):
        """Evaluate rule-based system performance"""
        # Load rule system
        rule_system = joblib.load(rule_system_path)
        
        # Get predictions and probabilities
        y_pred = self.model.predict(X_test)
        y_pred_proba = self.model.predict_proba(X_test)
        max_proba = np.max(y_pred_proba, axis=1)
        
        # Assign risk levels using thresholds
        risk_thresholds = rule_system['risk_thresholds']
        risk_levels = []
        for conf in max_proba:
            if conf >= risk_thresholds['high_risk']:
                risk_levels.append('high_risk')
            elif conf >= risk_thresholds['medium_risk']:
                risk_levels.append('medium_risk')
            else:
                risk_levels.append('low_risk')
        
        # Analyze risk distribution
        risk_distribution = pd.Series(risk_levels).value_counts()
        
        # Create evaluation report
        rule_evaluation = {
            'risk_distribution': risk_distribution.to_dict(),
            'average_confidence': np.mean(max_proba),
            'high_risk_percentage': (np.array(risk_levels) == 'high_risk').mean() * 100,
            'medium_risk_percentage': (np.array(risk_levels) == 'medium_risk').mean() * 100,
            'low_risk_percentage': (np.array(risk_levels) == 'low_risk').mean() * 100
        }
        
        return rule_evaluation
    
    def generate_evaluation_report(self, X_test, y_test, model_path, rule_system_path, save_path=None):
        """Generate comprehensive evaluation report"""
        print("Generating comprehensive evaluation report...")
        
        # Make predictions
        y_pred = self.model.predict(X_test)
        y_pred_proba = self.model.predict_proba(X_test)
        
        # Calculate metrics
        basic_metrics = self.calculate_basic_metrics(y_test, y_pred)
        
        # Classification report
        class_report = classification_report(y_test, y_pred, output_dict=True)
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': self.feature_engineer.feature_columns,
            'importance': self.model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        # Rule system evaluation
        rule_evaluation = self.evaluate_rule_system(X_test, y_test, rule_system_path)
        
        # Compile results
        evaluation_results = {
            'timestamp': datetime.now().isoformat(),
            'basic_metrics': basic_metrics,
            'classification_report': class_report,
            'feature_importance': feature_importance.to_dict('records'),
            'rule_system_evaluation': rule_evaluation,
            'model_info': {
                'model_type': type(self.model).__name__,
                'n_features': len(self.feature_engineer.feature_columns),
                'n_classes': len(np.unique(y_test))
            }
        }
        
        # Save results
        if save_path:
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            with open(save_path, 'w') as f:
                import json
                json.dump(evaluation_results, f, indent=2)
        
        # Print summary
        print("\n" + "="*50)
        print("EVALUATION SUMMARY")
        print("="*50)
        print(f"Accuracy: {basic_metrics['accuracy']:.4f}")
        print(f"Precision: {basic_metrics['precision']:.4f}")
        print(f"Recall: {basic_metrics['recall']:.4f}")
        print(f"F1-Score: {basic_metrics['f1_score']:.4f}")
        print(f"\nRisk Distribution:")
        for risk, percentage in rule_evaluation['risk_distribution'].items():
            print(f"  {risk}: {percentage} samples")
        
        return evaluation_results

def main():
    """Main function for model evaluation"""
    evaluator = ModelEvaluator()
    
    # Paths (adjust as needed)
    model_path = "../trained/accident_rf_model.pkl"
    rule_system_path = "../trained/accident_rule_system.pkl"
    data_path = "../../../data/raw/accidents_data.csv"
    
    try:
        # Load model and data
        X_test, y_test = evaluator.load_model_and_data(model_path, data_path)
        
        # Generate evaluation report
        results = evaluator.generate_evaluation_report(
            X_test, y_test, model_path, rule_system_path,
            save_path="../trained/evaluation_report.json"
        )
        
        # Create visualizations
        y_pred = evaluator.model.predict(X_test)
        
        # Plot confusion matrix
        evaluator.plot_confusion_matrix(y_test, y_pred, "../trained/confusion_matrix.png")
        
        # Plot feature importance
        evaluator.plot_feature_importance(
            evaluator.feature_engineer.feature_columns,
            evaluator.model.feature_importances_,
            save_path="../trained/feature_importance.png"
        )
        
        print("Evaluation completed successfully!")
        
    except Exception as e:
        print(f"Evaluation failed: {str(e)}")

if __name__ == "__main__":
    main()
