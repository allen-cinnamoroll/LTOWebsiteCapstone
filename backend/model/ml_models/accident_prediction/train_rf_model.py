"""
Train Random Forest Regression Model for Accident Prediction
Predicts monthly accident counts per barangay
"""

import os
import sys
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib
import json
from datetime import datetime
import logging

# Add parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

from data_loader import AccidentDataLoader

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AccidentRFTrainer:
    """Train Random Forest regression model for accident prediction"""
    
    def __init__(self, model_dir=None):
        """
        Initialize trainer
        
        Args:
            model_dir: Directory to save trained model. Default: '../trained'
        """
        if model_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_dir = os.path.join(base_dir, 'trained')
        
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)
        
        self.model = None
        self.feature_columns = None
        self.municipality_encoder = None
        self.barangay_encoder = None
        self.metadata = {}
    
    def train(self, mongo_uri=None, test_size=0.2, random_state=42):
        """
        Train the Random Forest model
        
        Args:
            mongo_uri: MongoDB connection string
            test_size: Proportion of data for testing
            random_state: Random seed for reproducibility
            
        Returns:
            Dictionary with training metrics
        """
        logger.info("=" * 60)
        logger.info("Starting Random Forest Model Training")
        logger.info("=" * 60)
        
        # Load and prepare data
        logger.info("Step 1: Loading data from MongoDB...")
        loader = AccidentDataLoader(mongo_uri=mongo_uri)
        
        try:
            loader.connect()
            accidents = loader.load_raw_data()
            
            if not accidents:
                raise ValueError("No accident data found in database")
            
            logger.info(f"Loaded {len(accidents)} accident records")
            
            # Aggregate monthly counts
            logger.info("Step 2: Aggregating monthly counts per barangay...")
            df_aggregated = loader.aggregate_monthly_counts(accidents)
            
            if df_aggregated.empty:
                raise ValueError("No valid aggregated data found")
            
            # Prepare training data
            logger.info("Step 3: Preparing training features...")
            df = loader.prepare_training_data(df_aggregated)
            
            # Store encoders
            self.municipality_encoder = df.attrs.get('municipality_encoder')
            self.barangay_encoder = df.attrs.get('barangay_encoder')
            
            # Get feature columns
            self.feature_columns = loader.get_feature_columns()
            
            # Remove rows with NaN values (from lag features)
            df = df.dropna()
            
            if df.empty:
                raise ValueError("No valid training data after preprocessing")
            
            logger.info(f"Training data shape: {df.shape}")
            
            # Prepare features and target
            X = df[self.feature_columns]
            y = df['accident_count']
            
            logger.info(f"Features: {list(X.columns)}")
            logger.info(f"Target range: {y.min()} - {y.max()}")
            logger.info(f"Target mean: {y.mean():.2f}")
            
            # Split data
            logger.info("Step 4: Splitting data into train/test sets...")
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=random_state, shuffle=True
            )
            
            logger.info(f"Training samples: {len(X_train)}")
            logger.info(f"Test samples: {len(X_test)}")
            
            # Train model
            logger.info("Step 5: Training Random Forest Regressor...")
            self.model = RandomForestRegressor(
                n_estimators=100,
                max_depth=20,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=random_state,
                n_jobs=-1,
                verbose=1
            )
            
            self.model.fit(X_train, y_train)
            logger.info("Model training completed!")
            
            # Evaluate model
            logger.info("Step 6: Evaluating model...")
            metrics = self._evaluate_model(X_train, y_train, X_test, y_test)
            
            # Save model
            logger.info("Step 7: Saving model and metadata...")
            self._save_model()
            
            # Store metadata
            self.metadata = {
                'model_type': 'RandomForestRegressor',
                'training_date': datetime.now().isoformat(),
                'feature_count': len(self.feature_columns),
                'feature_columns': self.feature_columns,
                'training_samples': len(X_train),
                'test_samples': len(X_test),
                'metrics': metrics,
                'year_range': [int(df['year'].min()), int(df['year'].max())],
                'model_params': {
                    'n_estimators': 100,
                    'max_depth': 20,
                    'min_samples_split': 5,
                    'min_samples_leaf': 2,
                    'random_state': random_state
                }
            }
            
            self._save_metadata()
            
            logger.info("=" * 60)
            logger.info("Training Complete!")
            logger.info("=" * 60)
            logger.info(f"Model saved to: {self.model_dir}")
            logger.info(f"Test R² Score: {metrics['test_r2']:.4f}")
            logger.info(f"Test RMSE: {metrics['test_rmse']:.4f}")
            logger.info(f"Test MAE: {metrics['test_mae']:.4f}")
            if metrics.get('test_accuracy_pct') is not None:
                logger.info(f"Test Accuracy (100 - MAPE): {metrics['test_accuracy_pct']:.2f}%")
            logger.info(f"Test Accuracy (within 20%): {metrics['test_accuracy_20pct']:.2f}%")
            logger.info(f"Test Accuracy (within 30%): {metrics['test_accuracy_30pct']:.2f}%")
            
            return metrics
            
        finally:
            loader.disconnect()
    
    def _evaluate_model(self, X_train, y_train, X_test, y_test):
        """Evaluate model performance"""
        # Training predictions
        y_train_pred = self.model.predict(X_train)
        train_rmse = np.sqrt(mean_squared_error(y_train, y_train_pred))
        train_mae = mean_absolute_error(y_train, y_train_pred)
        train_r2 = r2_score(y_train, y_train_pred)
        
        # Test predictions
        y_test_pred = self.model.predict(X_test)
        test_rmse = np.sqrt(mean_squared_error(y_test, y_test_pred))
        test_mae = mean_absolute_error(y_test, y_test_pred)
        test_r2 = r2_score(y_test, y_test_pred)
        
        # Calculate MAPE (Mean Absolute Percentage Error)
        def calculate_mape(y_true, y_pred):
            """Calculate MAPE, handling zero values"""
            mask = y_true != 0
            if mask.sum() == 0:
                return np.nan
            return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100
        
        train_mape = calculate_mape(y_train, y_train_pred)
        test_mape = calculate_mape(y_test, y_test_pred)
        
        # Calculate accuracy metrics (predictions within threshold)
        def calculate_accuracy(y_true, y_pred, threshold=0.2):
            """Calculate accuracy as percentage of predictions within threshold% of actual"""
            if len(y_true) == 0:
                return 0.0
            # For zero values, check if prediction is also close to zero
            mask_nonzero = y_true != 0
            mask_zero = y_true == 0
            
            correct = 0
            # For non-zero values: check if within threshold%
            if mask_nonzero.sum() > 0:
                relative_error = np.abs((y_true[mask_nonzero] - y_pred[mask_nonzero]) / y_true[mask_nonzero])
                correct += (relative_error <= threshold).sum()
            
            # For zero values: check if prediction is close to zero (within 0.5)
            if mask_zero.sum() > 0:
                correct += (np.abs(y_pred[mask_zero]) <= 0.5).sum()
            
            return (correct / len(y_true)) * 100
        
        train_accuracy_20 = calculate_accuracy(y_train, y_train_pred, threshold=0.2)
        test_accuracy_20 = calculate_accuracy(y_test, y_test_pred, threshold=0.2)
        train_accuracy_30 = calculate_accuracy(y_train, y_train_pred, threshold=0.3)
        test_accuracy_30 = calculate_accuracy(y_test, y_test_pred, threshold=0.3)
        
        # Calculate Mean Absolute Percentage Accuracy (100 - MAPE)
        train_accuracy_pct = 100 - train_mape if not np.isnan(train_mape) else np.nan
        test_accuracy_pct = 100 - test_mape if not np.isnan(test_mape) else np.nan
        
        # Cross-validation
        logger.info("Performing cross-validation...")
        cv_scores = cross_val_score(
            self.model, X_train, y_train,
            cv=5, scoring='r2', n_jobs=-1
        )
        cv_mean = cv_scores.mean()
        cv_std = cv_scores.std()
        
        metrics = {
            'train_rmse': float(train_rmse),
            'train_mae': float(train_mae),
            'train_r2': float(train_r2),
            'train_mape': float(train_mape) if not np.isnan(train_mape) else None,
            'train_accuracy_pct': float(train_accuracy_pct) if not np.isnan(train_accuracy_pct) else None,
            'train_accuracy_20pct': float(train_accuracy_20),
            'train_accuracy_30pct': float(train_accuracy_30),
            'test_rmse': float(test_rmse),
            'test_mae': float(test_mae),
            'test_r2': float(test_r2),
            'test_mape': float(test_mape) if not np.isnan(test_mape) else None,
            'test_accuracy_pct': float(test_accuracy_pct) if not np.isnan(test_accuracy_pct) else None,
            'test_accuracy_20pct': float(test_accuracy_20),
            'test_accuracy_30pct': float(test_accuracy_30),
            'cv_r2_mean': float(cv_mean),
            'cv_r2_std': float(cv_std)
        }
        
        logger.info(f"Training Metrics:")
        logger.info(f"  R² Score: {train_r2:.4f}")
        logger.info(f"  RMSE: {train_rmse:.4f}")
        logger.info(f"  MAE: {train_mae:.4f}")
        if not np.isnan(train_mape):
            logger.info(f"  MAPE: {train_mape:.2f}%")
            logger.info(f"  Accuracy (100 - MAPE): {train_accuracy_pct:.2f}%")
        logger.info(f"  Accuracy (within 20%): {train_accuracy_20:.2f}%")
        logger.info(f"  Accuracy (within 30%): {train_accuracy_30:.2f}%")
        
        logger.info(f"Test Metrics:")
        logger.info(f"  R² Score: {test_r2:.4f}")
        logger.info(f"  RMSE: {test_rmse:.4f}")
        logger.info(f"  MAE: {test_mae:.4f}")
        if not np.isnan(test_mape):
            logger.info(f"  MAPE: {test_mape:.2f}%")
            logger.info(f"  Accuracy (100 - MAPE): {test_accuracy_pct:.2f}%")
        logger.info(f"  Accuracy (within 20%): {test_accuracy_20:.2f}%")
        logger.info(f"  Accuracy (within 30%): {test_accuracy_30:.2f}%")
        
        logger.info(f"Cross-Validation R²: {cv_mean:.4f} (+/- {cv_std * 2:.4f})")
        
        return metrics
    
    def _save_model(self):
        """Save trained model and encoders"""
        model_path = os.path.join(self.model_dir, 'accident_rf_regression_model.pkl')
        joblib.dump(self.model, model_path)
        logger.info(f"Model saved: {model_path}")
        
        # Save encoders
        if self.municipality_encoder:
            encoder_path = os.path.join(self.model_dir, 'municipality_encoder.pkl')
            joblib.dump(self.municipality_encoder, encoder_path)
            logger.info(f"Municipality encoder saved: {encoder_path}")
        
        if self.barangay_encoder:
            encoder_path = os.path.join(self.model_dir, 'barangay_encoder.pkl')
            joblib.dump(self.barangay_encoder, encoder_path)
            logger.info(f"Barangay encoder saved: {encoder_path}")
        
        # Save feature columns
        if self.feature_columns:
            feature_path = os.path.join(self.model_dir, 'accident_rf_feature_columns.pkl')
            joblib.dump(self.feature_columns, feature_path)
            logger.info(f"Feature columns saved: {feature_path}")
    
    def _save_metadata(self):
        """Save model metadata"""
        metadata_path = os.path.join(self.model_dir, 'accident_rf_regression_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(self.metadata, f, indent=2)
        logger.info(f"Metadata saved: {metadata_path}")


if __name__ == '__main__':
    # Train the model
    trainer = AccidentRFTrainer()
    
    try:
        metrics = trainer.train()
        print("\n" + "=" * 60)
        print("Training Summary:")
        print("=" * 60)
        print(f"Test R² Score: {metrics['test_r2']:.4f}")
        print(f"Test RMSE: {metrics['test_rmse']:.4f}")
        print(f"Test MAE: {metrics['test_mae']:.4f}")
        if metrics.get('test_accuracy_pct') is not None:
            print(f"Test Accuracy (100 - MAPE): {metrics['test_accuracy_pct']:.2f}%")
        print(f"Test Accuracy (within 20%): {metrics['test_accuracy_20pct']:.2f}%")
        print(f"Test Accuracy (within 30%): {metrics['test_accuracy_30pct']:.2f}%")
        print(f"Cross-Validation R²: {metrics['cv_r2_mean']:.4f} (+/- {metrics['cv_r2_std'] * 2:.4f})")
        print("=" * 60)
        
    except Exception as e:
        logger.error(f"Training failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

