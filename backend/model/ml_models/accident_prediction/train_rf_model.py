"""
Train Random Forest Regression Model for Accident Prediction
Predicts monthly accident counts per barangay
"""

import os
import sys
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split, cross_val_score, RandomizedSearchCV
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
        self.use_log_target = True
    
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
            
            # Prepare features and targets (raw + transformed)
            X = df[self.feature_columns]
            y_raw = df['accident_count']
            y_transformed = np.log1p(y_raw) if self.use_log_target else y_raw
            
            logger.info(f"Features: {list(X.columns)}")
            logger.info(f"Target (raw) range: {y_raw.min()} - {y_raw.max()} (mean {y_raw.mean():.2f})")
            
            # Split data
            logger.info("Step 4: Splitting data into train/test sets...")
            X_train, X_test, y_train_t, y_test_t, y_train_raw, y_test_raw = train_test_split(
                X, y_transformed, y_raw, test_size=test_size, random_state=random_state, shuffle=True
            )
            
            logger.info(f"Training samples: {len(X_train)} | Test samples: {len(X_test)}")
            
            # Hyperparameter tuning (random search)
            logger.info("Step 5: Hyperparameter tuning with RandomizedSearchCV...")
            base_model = RandomForestRegressor(random_state=random_state, n_jobs=-1)
            param_dist = {
                'n_estimators': np.arange(200, 801, 50),
                'max_depth': [10, 15, 20, 25, 30, None],
                'min_samples_split': [2, 5, 10],
                'min_samples_leaf': [1, 2, 4],
                'max_features': ['sqrt', 'log2', None],
                'bootstrap': [True, False]
            }
            search = RandomizedSearchCV(
                estimator=base_model,
                param_distributions=param_dist,
                n_iter=40,
                cv=3,
                scoring='neg_mean_absolute_error',
                random_state=random_state,
                n_jobs=-1,
                verbose=1
            )
            search.fit(X_train, y_train_t)
            self.model = search.best_estimator_
            logger.info(f"Best params: {search.best_params_}")
            
            # Evaluate model on raw scale
            logger.info("Step 6: Evaluating model...")
            metrics = self._evaluate_model(X_train, y_train_raw, X_test, y_test_raw)
            
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
                'use_log_target': self.use_log_target,
                'best_params': search.best_params_
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
    
    def _evaluate_model(self, X_train, y_train_raw, X_test, y_test_raw):
        """Evaluate model performance on raw scale (inverse-transform predictions if needed)"""
        # Training predictions
        y_train_pred_t = self.model.predict(X_train)
        y_test_pred_t = self.model.predict(X_test)
        
        # Inverse transform if trained on log scale
        if self.use_log_target:
            y_train_pred = np.expm1(y_train_pred_t)
            y_test_pred = np.expm1(y_test_pred_t)
        else:
            y_train_pred = y_train_pred_t
            y_test_pred = y_test_pred_t
        
        train_rmse = np.sqrt(mean_squared_error(y_train_raw, y_train_pred))
        train_mae = mean_absolute_error(y_train_raw, y_train_pred)
        train_r2 = r2_score(y_train_raw, y_train_pred)
        
        test_rmse = np.sqrt(mean_squared_error(y_test_raw, y_test_pred))
        test_mae = mean_absolute_error(y_test_raw, y_test_pred)
        test_r2 = r2_score(y_test_raw, y_test_pred)
        
        def calculate_mape(y_true, y_pred):
            mask = y_true != 0
            if mask.sum() == 0:
                return np.nan
            return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100
        
        train_mape = calculate_mape(y_train_raw.values if hasattr(y_train_raw, 'values') else y_train_raw, y_train_pred)
        test_mape = calculate_mape(y_test_raw.values if hasattr(y_test_raw, 'values') else y_test_raw, y_test_pred)
        
        def calculate_accuracy(y_true, y_pred, threshold=0.2):
            if len(y_true) == 0:
                return 0.0
            mask_nonzero = y_true != 0
            mask_zero = y_true == 0
            correct = 0
            if mask_nonzero.sum() > 0:
                relative_error = np.abs((y_true[mask_nonzero] - y_pred[mask_nonzero]) / y_true[mask_nonzero])
                correct += (relative_error <= threshold).sum()
            if mask_zero.sum() > 0:
                correct += (np.abs(y_pred[mask_zero]) <= 0.5).sum()
            return (correct / len(y_true)) * 100
        
        train_accuracy_20 = calculate_accuracy(np.array(y_train_raw), y_train_pred, threshold=0.2)
        test_accuracy_20 = calculate_accuracy(np.array(y_test_raw), y_test_pred, threshold=0.2)
        train_accuracy_30 = calculate_accuracy(np.array(y_train_raw), y_train_pred, threshold=0.3)
        test_accuracy_30 = calculate_accuracy(np.array(y_test_raw), y_test_pred, threshold=0.3)
        
        train_accuracy_pct = 100 - train_mape if not np.isnan(train_mape) else np.nan
        test_accuracy_pct = 100 - test_mape if not np.isnan(test_mape) else np.nan
        
        # Cross-validation on transformed target (kept same as training)
        logger.info("Performing cross-validation...")
        cv_scores = cross_val_score(self.model, X_train, np.log1p(y_train_raw) if self.use_log_target else y_train_raw, cv=5, scoring='r2', n_jobs=-1)
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

        # Convert numpy types to native Python types for JSON serialization
        def to_serializable(obj):
            try:
                import numpy as _np
            except Exception:
                _np = None
            if _np is not None and isinstance(obj, _np.generic):
                return obj.item()
            if isinstance(obj, (list, tuple)):
                return [to_serializable(v) for v in obj]
            if isinstance(obj, dict):
                return {str(k): to_serializable(v) for k, v in obj.items()}
            return obj

        safe_metadata = to_serializable(self.metadata)
        with open(metadata_path, 'w') as f:
            json.dump(safe_metadata, f, indent=2)
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

