"""
Train Random Forest Models for Accident Prediction
- Regressor: Predicts monthly accident counts per barangay
- Classifier: Predicts whether an area is high-risk
"""

import os
import sys
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.model_selection import (
    train_test_split, cross_val_score, RandomizedSearchCV,
    KFold, StratifiedKFold, TimeSeriesSplit
)
from sklearn.metrics import (
    mean_squared_error, mean_absolute_error, r2_score,
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, classification_report, confusion_matrix
)
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
    """Train Random Forest models (regressor + classifier) for accident prediction"""
    
    def __init__(self, model_dir=None, high_risk_threshold=None):
        """
        Initialize trainer
        
        Args:
            model_dir: Directory to save trained model. Default: '../trained'
            high_risk_threshold: Threshold for high-risk classification (percentile or absolute value).
                                 If None, uses 75th percentile of accident counts.
        """
        if model_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_dir = os.path.join(base_dir, 'trained')
        
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)
        
        self.regressor_model = None
        self.classifier_model = None
        self.feature_columns = None
        self.municipality_encoder = None
        self.barangay_encoder = None
        self.metadata = {}
        self.use_log_target = True
        self.high_risk_threshold = high_risk_threshold
    
    def _time_based_split(self, df, test_size=0.2):
        """
        Perform time-based train/test split for time-series data
        
        Args:
            df: DataFrame with 'year' and 'month' columns
            test_size: Proportion of data for testing
            
        Returns:
            train_indices, test_indices
        """
        # Create a datetime-like index for sorting
        df_sorted = df.sort_values(['year', 'month']).reset_index(drop=True)
        
        # Calculate split point
        split_idx = int(len(df_sorted) * (1 - test_size))
        
        train_indices = df_sorted.index[:split_idx].tolist()
        test_indices = df_sorted.index[split_idx:].tolist()
        
        logger.info(f"Time-based split: Train period {df_sorted.iloc[0]['year']}-{df_sorted.iloc[0]['month']} "
                   f"to {df_sorted.iloc[split_idx-1]['year']}-{df_sorted.iloc[split_idx-1]['month']}")
        logger.info(f"Test period: {df_sorted.iloc[split_idx]['year']}-{df_sorted.iloc[split_idx]['month']} "
                   f"to {df_sorted.iloc[-1]['year']}-{df_sorted.iloc[-1]['month']}")
        
        return train_indices, test_indices
    
    def train(self, mongo_uri=None, test_size=0.2, random_state=42, use_time_split=True):
        """
        Train both Random Forest Regressor and Classifier models
        
        Args:
            mongo_uri: MongoDB connection string
            test_size: Proportion of data for testing
            random_state: Random seed for reproducibility
            use_time_split: If True, use time-based split; otherwise use random split
            
        Returns:
            Dictionary with training metrics for both models
        """
        logger.info("=" * 60)
        logger.info("Starting Random Forest Model Training (Regressor + Classifier)")
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
            
            # Prepare features and targets
            X = df[self.feature_columns]
            y_raw = df['accident_count']
            y_transformed = np.log1p(y_raw) if self.use_log_target else y_raw
            
            # Determine high-risk threshold for classification
            if self.high_risk_threshold is None:
                # Use 75th percentile as default threshold
                threshold_value = np.percentile(y_raw, 75)
            elif isinstance(self.high_risk_threshold, float) and 0 < self.high_risk_threshold < 1:
                # Percentile
                threshold_value = np.percentile(y_raw, self.high_risk_threshold * 100)
            else:
                # Absolute value
                threshold_value = self.high_risk_threshold
            
            # Create binary classification target (1 = high risk, 0 = low risk)
            y_class = (y_raw >= threshold_value).astype(int)
            
            logger.info(f"Features: {list(X.columns)}")
            logger.info(f"Target (raw) range: {y_raw.min()} - {y_raw.max()} (mean {y_raw.mean():.2f})")
            logger.info(f"High-risk threshold: {threshold_value:.2f} accidents/month")
            logger.info(f"High-risk samples: {y_class.sum()} ({y_class.mean()*100:.1f}%)")
            
            # Split data
            logger.info("Step 4: Splitting data into train/test sets...")
            if use_time_split:
                train_indices, test_indices = self._time_based_split(df)
                X_train = X.iloc[train_indices]
                X_test = X.iloc[test_indices]
                y_train_t = y_transformed.iloc[train_indices]
                y_test_t = y_transformed.iloc[test_indices]
                y_train_raw = y_raw.iloc[train_indices]
                y_test_raw = y_raw.iloc[test_indices]
                y_train_class = y_class.iloc[train_indices]
                y_test_class = y_class.iloc[test_indices]
            else:
                X_train, X_test, y_train_t, y_test_t, y_train_raw, y_test_raw, y_train_class, y_test_class = train_test_split(
                    X, y_transformed, y_raw, y_class, test_size=test_size, random_state=random_state, 
                    shuffle=True, stratify=y_class
                )
            
            logger.info(f"Training samples: {len(X_train)} | Test samples: {len(X_test)}")
            logger.info(f"Train class distribution: Low-risk={sum(y_train_class==0)}, High-risk={sum(y_train_class==1)}")
            logger.info(f"Test class distribution: Low-risk={sum(y_test_class==0)}, High-risk={sum(y_test_class==1)}")
            
            # Train Regressor
            logger.info("Step 5: Training Random Forest Regressor...")
            regressor_metrics = self._train_regressor(
                X_train, y_train_t, y_train_raw, X_test, y_test_t, y_test_raw, random_state
            )
            
            # Train Classifier
            logger.info("Step 6: Training Random Forest Classifier...")
            classifier_metrics = self._train_classifier(
                X_train, y_train_class, X_test, y_test_class, random_state
            )
            
            # Save models
            logger.info("Step 7: Saving models and metadata...")
            self._save_models()
            
            # Store metadata
            self.metadata = {
                'model_types': ['RandomForestRegressor', 'RandomForestClassifier'],
                'training_date': datetime.now().isoformat(),
                'feature_count': len(self.feature_columns),
                'feature_columns': self.feature_columns,
                'training_samples': len(X_train),
                'test_samples': len(X_test),
                'regressor_metrics': regressor_metrics,
                'classifier_metrics': classifier_metrics,
                'year_range': [int(df['year'].min()), int(df['year'].max())],
                'use_log_target': self.use_log_target,
                'high_risk_threshold': float(threshold_value),
                'use_time_split': use_time_split
            }
            
            self._save_metadata()
            
            # Print summary
            logger.info("=" * 60)
            logger.info("Training Complete!")
            logger.info("=" * 60)
            logger.info(f"Models saved to: {self.model_dir}")
            logger.info("\n--- REGRESSOR METRICS ---")
            logger.info(f"Train R²: {regressor_metrics['train_r2']:.4f}")
            logger.info(f"Test R²: {regressor_metrics['test_r2']:.4f}")
            logger.info(f"Test RMSE: {regressor_metrics['test_rmse']:.4f}")
            logger.info(f"Test MAE: {regressor_metrics['test_mae']:.4f}")
            logger.info(f"CV R² (mean ± std): {regressor_metrics['cv_r2_mean']:.4f} ± {regressor_metrics['cv_r2_std']:.4f}")
            logger.info("\n--- CLASSIFIER METRICS ---")
            logger.info(f"Train Accuracy: {classifier_metrics['train_accuracy']:.4f}")
            logger.info(f"Test Accuracy: {classifier_metrics['test_accuracy']:.4f}")
            logger.info(f"Test Precision: {classifier_metrics['test_precision']:.4f}")
            logger.info(f"Test Recall: {classifier_metrics['test_recall']:.4f}")
            logger.info(f"Test F1: {classifier_metrics['test_f1']:.4f}")
            if classifier_metrics.get('test_roc_auc') is not None:
                logger.info(f"Test ROC AUC: {classifier_metrics['test_roc_auc']:.4f}")
            logger.info(f"CV Accuracy (mean ± std): {classifier_metrics['cv_accuracy_mean']:.4f} ± {classifier_metrics['cv_accuracy_std']:.4f}")
            logger.info("=" * 60)
            
            return {
                'regressor': regressor_metrics,
                'classifier': classifier_metrics
            }
            
        finally:
            loader.disconnect()
    
    def _train_regressor(self, X_train, y_train_t, y_train_raw, X_test, y_test_t, y_test_raw, random_state):
        """Train Random Forest Regressor with hyperparameter tuning"""
        # Hyperparameter tuning
        logger.info("  Performing hyperparameter tuning for regressor...")
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
            cv=KFold(n_splits=5, shuffle=True, random_state=random_state),
            scoring='neg_mean_absolute_error',
            random_state=random_state,
            n_jobs=-1,
            verbose=1
        )
        search.fit(X_train, y_train_t)
        self.regressor_model = search.best_estimator_
        logger.info(f"  Best regressor params: {search.best_params_}")
        
        # Evaluate regressor
        metrics = self._evaluate_regressor(X_train, y_train_raw, X_test, y_test_raw, random_state)
        metrics['best_params'] = search.best_params_
        return metrics
    
    def _train_classifier(self, X_train, y_train_class, X_test, y_test_class, random_state):
        """Train Random Forest Classifier with hyperparameter tuning"""
        # Hyperparameter tuning
        logger.info("  Performing hyperparameter tuning for classifier...")
        base_model = RandomForestClassifier(random_state=random_state, n_jobs=-1, class_weight='balanced')
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
            cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=random_state),
            scoring='f1',
            random_state=random_state,
            n_jobs=-1,
            verbose=1
        )
        search.fit(X_train, y_train_class)
        self.classifier_model = search.best_estimator_
        logger.info(f"  Best classifier params: {search.best_params_}")
        
        # Evaluate classifier
        metrics = self._evaluate_classifier(X_train, y_train_class, X_test, y_test_class, random_state)
        metrics['best_params'] = search.best_params_
        return metrics
    
    def _evaluate_regressor(self, X_train, y_train_raw, X_test, y_test_raw, random_state):
        """Evaluate regressor performance on raw scale"""
        # Training predictions
        y_train_pred_t = self.regressor_model.predict(X_train)
        y_test_pred_t = self.regressor_model.predict(X_test)
        
        # Inverse transform if trained on log scale
        if self.use_log_target:
            y_train_pred = np.expm1(y_train_pred_t)
            y_test_pred = np.expm1(y_test_pred_t)
        else:
            y_train_pred = y_train_pred_t
            y_test_pred = y_test_pred_t
        
        # Ensure non-negative predictions
        y_train_pred = np.maximum(y_train_pred, 0)
        y_test_pred = np.maximum(y_test_pred, 0)
        
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
        
        # Cross-validation with KFold
        logger.info("  Performing cross-validation for regressor...")
        y_train_transformed = np.log1p(y_train_raw) if self.use_log_target else y_train_raw
        cv_scores = cross_val_score(
            self.regressor_model, X_train, y_train_transformed,
            cv=KFold(n_splits=5, shuffle=True, random_state=random_state),
            scoring='r2', n_jobs=-1
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
        return metrics
    
    def _evaluate_classifier(self, X_train, y_train_class, X_test, y_test_class, random_state):
        """Evaluate classifier performance"""
        # Training predictions
        y_train_pred = self.classifier_model.predict(X_train)
        y_test_pred = self.classifier_model.predict(X_test)
        
        # Training probabilities (for ROC AUC)
        y_train_proba = self.classifier_model.predict_proba(X_train)[:, 1]
        y_test_proba = self.classifier_model.predict_proba(X_test)[:, 1]
        
        # Calculate metrics
        train_accuracy = accuracy_score(y_train_class, y_train_pred)
        test_accuracy = accuracy_score(y_test_class, y_test_pred)
        
        train_precision = precision_score(y_train_class, y_train_pred, zero_division=0)
        test_precision = precision_score(y_test_class, y_test_pred, zero_division=0)
        
        train_recall = recall_score(y_train_class, y_train_pred, zero_division=0)
        test_recall = recall_score(y_test_class, y_test_pred, zero_division=0)
        
        train_f1 = f1_score(y_train_class, y_train_pred, zero_division=0)
        test_f1 = f1_score(y_test_class, y_test_pred, zero_division=0)
        
        # ROC AUC (only if both classes present)
        train_roc_auc = None
        test_roc_auc = None
        if len(np.unique(y_train_class)) == 2:
            try:
                train_roc_auc = roc_auc_score(y_train_class, y_train_proba)
            except:
                pass
        if len(np.unique(y_test_class)) == 2:
            try:
                test_roc_auc = roc_auc_score(y_test_class, y_test_proba)
            except:
                pass
        
        # Cross-validation with StratifiedKFold
        logger.info("  Performing cross-validation for classifier...")
        cv_scores = cross_val_score(
            self.classifier_model, X_train, y_train_class,
            cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=random_state),
            scoring='accuracy', n_jobs=-1
        )
        cv_mean = cv_scores.mean()
        cv_std = cv_scores.std()
        
        # Confusion matrix
        cm = confusion_matrix(y_test_class, y_test_pred)
        
        metrics = {
            'train_accuracy': float(train_accuracy),
            'train_precision': float(train_precision),
            'train_recall': float(train_recall),
            'train_f1': float(train_f1),
            'test_accuracy': float(test_accuracy),
            'test_precision': float(test_precision),
            'test_recall': float(test_recall),
            'test_f1': float(test_f1),
            'test_roc_auc': float(test_roc_auc) if test_roc_auc is not None else None,
            'cv_accuracy_mean': float(cv_mean),
            'cv_accuracy_std': float(cv_std),
            'confusion_matrix': cm.tolist()
        }
        return metrics
    
    def _save_models(self):
        """Save trained models and encoders"""
        # Save regressor
        if self.regressor_model:
            regressor_path = os.path.join(self.model_dir, 'accident_rf_regression_model.pkl')
            joblib.dump(self.regressor_model, regressor_path)
            logger.info(f"Regressor model saved: {regressor_path}")
        
        # Save classifier
        if self.classifier_model:
            classifier_path = os.path.join(self.model_dir, 'accident_rf_classification_model.pkl')
            joblib.dump(self.classifier_model, classifier_path)
            logger.info(f"Classifier model saved: {classifier_path}")
        
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
            if isinstance(obj, np.ndarray):
                return obj.tolist()
            return obj

        safe_metadata = to_serializable(self.metadata)
        with open(metadata_path, 'w') as f:
            json.dump(safe_metadata, f, indent=2)
        logger.info(f"Metadata saved: {metadata_path}")


if __name__ == '__main__':
    # Train the models
    trainer = AccidentRFTrainer()
    
    try:
        results = trainer.train(use_time_split=True)
        
        print("\n" + "=" * 60)
        print("Training Summary")
        print("=" * 60)
        
        print("\n--- REGRESSOR METRICS ---")
        reg_metrics = results['regressor']
        print(f"Train R²: {reg_metrics['train_r2']:.4f}")
        print(f"Test R²: {reg_metrics['test_r2']:.4f}")
        print(f"Test RMSE: {reg_metrics['test_rmse']:.4f}")
        print(f"Test MAE: {reg_metrics['test_mae']:.4f}")
        if reg_metrics.get('test_accuracy_pct') is not None:
            print(f"Test Accuracy (100 - MAPE): {reg_metrics['test_accuracy_pct']:.2f}%")
        print(f"Test Accuracy (within 20%): {reg_metrics['test_accuracy_20pct']:.2f}%")
        print(f"Test Accuracy (within 30%): {reg_metrics['test_accuracy_30pct']:.2f}%")
        print(f"Cross-Validation R²: {reg_metrics['cv_r2_mean']:.4f} ± {reg_metrics['cv_r2_std']:.4f}")
        
        print("\n--- CLASSIFIER METRICS ---")
        clf_metrics = results['classifier']
        print(f"Train Accuracy: {clf_metrics['train_accuracy']:.4f}")
        print(f"Test Accuracy: {clf_metrics['test_accuracy']:.4f}")
        print(f"Test Precision: {clf_metrics['test_precision']:.4f}")
        print(f"Test Recall: {clf_metrics['test_recall']:.4f}")
        print(f"Test F1: {clf_metrics['test_f1']:.4f}")
        if clf_metrics.get('test_roc_auc') is not None:
            print(f"Test ROC AUC: {clf_metrics['test_roc_auc']:.4f}")
        print(f"Cross-Validation Accuracy: {clf_metrics['cv_accuracy_mean']:.4f} ± {clf_metrics['cv_accuracy_std']:.4f}")
        
        print("=" * 60)
        
    except Exception as e:
        logger.error(f"Training failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

