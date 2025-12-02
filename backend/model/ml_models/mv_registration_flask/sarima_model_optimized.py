"""
Optimized SARIMA Model for Vehicle Registration Prediction
Enhanced version with daily data, auto_arima, exogenous variables, and cross-validation

Key Improvements:
- Daily data processing (s=7 for weekly seasonality)
- Auto parameter selection using pmdarima.auto_arima
- Exogenous variables (weekends/holidays)
- TimeSeriesSplit cross-validation
- Optional normalization
- Enhanced metrics (R²)
- Comprehensive logging
"""

import pandas as pd
import numpy as np
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.stats.diagnostic import acorr_ljungbox
from statsmodels.tsa.stattools import adfuller, acf, pacf
from sklearn.model_selection import TimeSeriesSplit
from sklearn.preprocessing import MinMaxScaler, StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import pmdarima as pm
import pickle
import os
import json
import logging
from datetime import datetime, timedelta
import holidays
import warnings
warnings.filterwarnings('ignore')

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('sarima_model.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class OptimizedSARIMAModel:
    """
    Optimized SARIMA model for daily vehicle registration forecasting.
    
    Features:
    - Daily data with s=7 (weekly seasonality)
    - Auto parameter selection (pmdarima)
    - Exogenous variables (weekends/holidays)
    - Cross-validation
    - Optional normalization
    - Enhanced metrics
    """
    
    def __init__(self, model_dir, municipality=None, use_normalization=False, scaler_type='minmax'):
        """
        Initialize optimized SARIMA model
        
        Args:
            model_dir: Directory to save/load model files
            municipality: Municipality name (None for aggregated model)
            use_normalization: Whether to apply normalization (default: False)
            scaler_type: 'minmax' or 'standard' (default: 'minmax')
        """
        self.model_dir = model_dir
        self.municipality = municipality
        self.use_normalization = use_normalization
        self.scaler_type = scaler_type
        self.scaler = None
        self.model = None
        self.fitted_model = None
        self.model_params = None
        self.training_data = None
        self.test_data = None
        self.all_data = None
        self.exog_train = None
        self.exog_test = None
        self.exog_all = None
        self.accuracy_metrics = None
        self.test_accuracy_metrics = None
        self.diagnostics = None
        self.cv_results = None
        self._metadata = None
        
        # Create model directory if it doesn't exist
        os.makedirs(model_dir, exist_ok=True)
        
        # Model file paths
        if municipality:
            safe_name = municipality.upper().replace(' ', '_').replace('/', '_')
            model_filename = f'optimized_sarima_model_{safe_name}.pkl'
            metadata_filename = f'optimized_sarima_metadata_{safe_name}.json'
        else:
            model_filename = 'optimized_sarima_model.pkl'
            metadata_filename = 'optimized_sarima_metadata.json'
        
        self.model_file = os.path.join(model_dir, model_filename)
        self.metadata_file = os.path.join(model_dir, metadata_filename)
    
    def model_exists(self):
        """Check if a trained model exists"""
        return os.path.exists(self.model_file) and os.path.exists(self.metadata_file)
    
    def check_stationarity(self, series, verbose=True):
        """
        Check stationarity using Augmented Dickey-Fuller test
        
        Args:
            series: Time series data
            verbose: Print results
            
        Returns:
            tuple: (is_stationary: bool, adf_result: dict)
        """
        try:
            adf_result = adfuller(series.dropna())
            p_value = adf_result[1]
            is_stationary = p_value < 0.05
            
            if verbose:
                logger.info(f"ADF Test Results:")
                logger.info(f"  ADF Statistic: {adf_result[0]:.4f}")
                logger.info(f"  p-value: {p_value:.4f}")
                logger.info(f"  Critical Values: {adf_result[4]}")
                logger.info(f"  Stationary: {is_stationary}")
            
            return is_stationary, {
                'adf_statistic': float(adf_result[0]),
                'p_value': float(p_value),
                'critical_values': {k: float(v) for k, v in adf_result[4].items()},
                'is_stationary': is_stationary
            }
        except Exception as e:
            logger.warning(f"ADF test failed: {str(e)}")
            return False, {'error': str(e)}
    
    def find_optimal_parameters_auto(self, data, exogenous=None, seasonal_period=7):
        """
        Find optimal SARIMA parameters using pmdarima.auto_arima
        
        Args:
            data: Time series data (pandas Series)
            exogenous: Exogenous variables (pandas DataFrame, optional)
            seasonal_period: Seasonal period s (default: 7 for daily data)
            
        Returns:
            tuple: (p, d, q, P, D, Q, s) parameters
        """
        logger.info("=" * 60)
        logger.info("AUTO_ARIMA PARAMETER OPTIMIZATION")
        logger.info("=" * 60)
        
        # Extract series if DataFrame
        if isinstance(data, pd.DataFrame):
            series = data.iloc[:, 0]
        else:
            series = data
        
        logger.info(f"Data shape: {len(series)} days")
        logger.info(f"Seasonal period: {seasonal_period} (weekly seasonality)")
        
        # Check stationarity
        is_stationary, adf_info = self.check_stationarity(series)
        
        # Auto ARIMA configuration
        # For daily data, we expect:
        # - Non-stationary (d=1 recommended)
        # - Weekly seasonality (s=7)
        # - Seasonal differencing likely needed (D=1)
        
        try:
            logger.info("Running auto_arima to find optimal parameters...")
            logger.info("This may take several minutes...")
            
            # Configure auto_arima
            auto_model = pm.auto_arima(
                series,
                exogenous=exogenous,
                start_p=0,          # Minimum AR order
                start_q=0,          # Minimum MA order
                max_p=3,            # Maximum AR order
                max_q=3,            # Maximum MA order
                d=None,             # Auto-detect differencing
                D=None,             # Auto-detect seasonal differencing
                start_P=0,          # Minimum seasonal AR order
                start_Q=0,          # Minimum seasonal MA order
                max_P=2,            # Maximum seasonal AR order
                max_Q=2,            # Maximum seasonal MA order
                seasonal=True,      # Enable seasonality
                m=seasonal_period,  # Seasonal period (7 for weekly)
                stepwise=True,      # Stepwise search (faster)
                suppress_warnings=True,
                error_action='ignore',
                trace=True,         # Print search progress
                n_jobs=-1,          # Use all CPU cores
                information_criterion='aic',  # Use AIC for model selection
                max_order=10,       # Maximum total order
                test='adf',         # Use ADF test for stationarity
                n_fits=50,          # Number of models to try
                with_intercept=True,
                verbose=True
            )
            
            # Extract parameters
            order = auto_model.order  # (p, d, q)
            seasonal_order = auto_model.seasonal_order  # (P, D, Q, s)
            
            p, d, q = order
            P, D, Q, s = seasonal_order
            
            logger.info("=" * 60)
            logger.info("OPTIMAL PARAMETERS FOUND")
            logger.info("=" * 60)
            logger.info(f"Order (p, d, q): {order}")
            logger.info(f"Seasonal Order (P, D, Q, s): {seasonal_order}")
            logger.info(f"Full Model: SARIMA{order} x SARIMA{seasonal_order}")
            logger.info(f"AIC: {auto_model.aic():.2f}")
            logger.info(f"BIC: {auto_model.bic():.2f}")
            logger.info("=" * 60)
            
            return (p, d, q, P, D, Q, s)
            
        except Exception as e:
            logger.error(f"Auto ARIMA failed: {str(e)}")
            logger.warning("Falling back to conservative default parameters")
            # Fallback to conservative parameters
            return (1, 1, 1, 1, 1, 1, seasonal_period)
    
    def apply_normalization(self, data, fit=True):
        """
        Apply normalization to data
        
        Args:
            data: Time series data
            fit: If True, fit scaler; if False, transform only
            
        Returns:
            Normalized data
        """
        if not self.use_normalization:
            return data
        
        if fit:
            if self.scaler_type == 'minmax':
                self.scaler = MinMaxScaler()
            elif self.scaler_type == 'standard':
                self.scaler = StandardScaler()
            else:
                raise ValueError(f"Unknown scaler_type: {self.scaler_type}")
            
            # Reshape for scaler (needs 2D array)
            data_reshaped = data.values.reshape(-1, 1)
            normalized = self.scaler.fit_transform(data_reshaped)
            return pd.Series(normalized.flatten(), index=data.index)
        else:
            if self.scaler is None:
                raise ValueError("Scaler not fitted. Call with fit=True first.")
            data_reshaped = data.values.reshape(-1, 1)
            normalized = self.scaler.transform(data_reshaped)
            return pd.Series(normalized.flatten(), index=data.index)
    
    def inverse_normalize(self, data):
        """
        Inverse transform normalized data
        
        Args:
            data: Normalized data (array-like)
            
        Returns:
            Inverse-transformed data
        """
        if not self.use_normalization or self.scaler is None:
            return data
        
        if isinstance(data, (pd.Series, pd.DataFrame)):
            data_reshaped = data.values.reshape(-1, 1)
        else:
            data_reshaped = np.array(data).reshape(-1, 1)
        
        inverse = self.scaler.inverse_transform(data_reshaped)
        
        if isinstance(data, pd.Series):
            return pd.Series(inverse.flatten(), index=data.index)
        elif isinstance(data, pd.DataFrame):
            return pd.DataFrame(inverse.flatten(), index=data.index)
        else:
            return inverse.flatten()
    
    def _generate_exogenous_for_future_dates(self, date_index):
        """
        Generate exogenous variables for future dates (weekends/holidays)
        
        Args:
            date_index: pandas DatetimeIndex for future dates
            
        Returns:
            DataFrame with exogenous variables matching the format used during training
        """
        exog_data = pd.DataFrame(index=date_index)
        
        # Normalize dates to midnight
        normalized_dates = date_index.normalize()
        
        # Weekend indicator (1 = Saturday or Sunday, 0 = weekday)
        exog_data['is_weekend'] = (normalized_dates.dayofweek >= 5).astype(int)
        
        # Holiday indicator from built-in Philippines holiday library
        ph_holidays = holidays.Philippines()
        exog_data['is_holiday_library'] = normalized_dates.map(
            lambda x: x in ph_holidays
        ).astype(int)
        
        # Try to load custom holiday dates if available
        custom_holiday_dates = set()
        try:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            holiday_csv_path = os.path.join(base_dir, "holiday_data.csv")
            if os.path.exists(holiday_csv_path):
                try:
                    df_holidays = pd.read_csv(holiday_csv_path)
                except UnicodeDecodeError:
                    df_holidays = pd.read_csv(holiday_csv_path, encoding="latin1")
                
                if "date" in df_holidays.columns:
                    df_holidays["date_parsed"] = pd.to_datetime(
                        df_holidays["date"],
                        dayfirst=True,
                        errors="coerce"
                    )
                    df_holidays = df_holidays.dropna(subset=["date_parsed"])
                    df_holidays["date_parsed"] = df_holidays["date_parsed"].dt.normalize()
                    custom_holiday_dates = set(df_holidays["date_parsed"].tolist())
        except Exception as e:
            logger.warning(f"Could not load custom holiday data: {str(e)}")
        
        # Holiday indicator from custom holiday_data.csv (if loaded)
        if custom_holiday_dates:
            exog_data['is_custom_holiday'] = normalized_dates.isin(
                custom_holiday_dates
            ).astype(int)
        else:
            exog_data['is_custom_holiday'] = 0
        
        # Unified holiday flag
        exog_data['is_holiday'] = (
            (exog_data['is_holiday_library'] == 1) |
            (exog_data['is_custom_holiday'] == 1)
        ).astype(int)
        
        # Combined weekend/holiday indicator (this is what we use during training)
        exog_data['is_weekend_or_holiday'] = (
            (exog_data['is_weekend'] == 1) |
            (exog_data['is_holiday'] == 1)
        ).astype(int)
        
        # Return only the column(s) that were used during training
        # Check what columns were used during training
        exog_columns = None
        
        # Method 1: Check if we have exog_all stored (from training)
        if self.exog_all is not None and len(self.exog_all.columns) > 0:
            exog_columns = self.exog_all.columns.tolist()
        # Method 2: Check the fitted model's exog_names (works for loaded models)
        elif (hasattr(self, 'fitted_model') and 
              self.fitted_model is not None and
              hasattr(self.fitted_model, 'model') and 
              hasattr(self.fitted_model.model, 'exog_names') and 
              self.fitted_model.model.exog_names is not None and
              len(self.fitted_model.model.exog_names) > 0):
            exog_columns = list(self.fitted_model.model.exog_names)
        
        if exog_columns:
            # Filter to only include columns that exist in exog_data
            available_columns = [col for col in exog_columns if col in exog_data.columns]
            if available_columns:
                return exog_data[available_columns]
            else:
                logger.warning(f"Requested exogenous columns {exog_columns} not found in generated data. Using default.")
                return exog_data[['is_weekend_or_holiday']]
        else:
            # Default: use is_weekend_or_holiday (most common case)
            return exog_data[['is_weekend_or_holiday']]
    
    def train(self, data, exogenous=None, force=False, processing_info=None):
        """
        Train the optimized SARIMA model
        
        Args:
            data: Daily time series data (DataFrame with 'count' column and DateTime index)
            exogenous: Exogenous variables (DataFrame with DateTime index, optional)
            force: Force retraining even if model exists
            processing_info: Optional dict with processing information
            
        Returns:
            Dictionary with training information
        """
        logger.info("=" * 60)
        logger.info("TRAINING OPTIMIZED SARIMA MODEL")
        logger.info("=" * 60)
        
        # Extract series
        if isinstance(data, pd.DataFrame):
            series = data['count']
        else:
            series = data
        
        logger.info(f"Training data: {len(series)} days")
        logger.info(f"Date range: {series.index.min()} to {series.index.max()}")
        logger.info(f"Normalization: {'Enabled' if self.use_normalization else 'Disabled'}")
        if self.use_normalization:
            logger.info(f"Scaler type: {self.scaler_type}")
        
        # Apply normalization if enabled
        if self.use_normalization:
            logger.info("Applying normalization...")
            series = self.apply_normalization(series, fit=True)
            logger.info("Normalization applied")
        
        # Split data: 80% training, 20% testing (chronological split)
        split_idx = int(len(series) * 0.8)
        train_series = series.iloc[:split_idx]
        test_series = series.iloc[split_idx:]
        
        # Split exogenous variables if provided
        if exogenous is not None:
            exog_train = exogenous.iloc[:split_idx]
            exog_test = exogenous.iloc[split_idx:]
        else:
            exog_train = None
            exog_test = None
        
        logger.info(f"Train-Test Split:")
        logger.info(f"  Training: {len(train_series)} days ({len(train_series)/len(series)*100:.1f}%)")
        logger.info(f"  Test: {len(test_series)} days ({len(test_series)/len(series)*100:.1f}%)")
        logger.info(f"  Training date range: {train_series.index.min()} to {train_series.index.max()}")
        logger.info(f"  Test date range: {test_series.index.min()} to {test_series.index.max()}")
        
        # Store data
        self.training_data = train_series.to_frame('count')
        self.test_data = test_series.to_frame('count')
        self.all_data = series.to_frame('count')
        self.exog_train = exog_train
        self.exog_test = exog_test
        self.exog_all = exogenous
        
        # Store actual last registration date from processing_info for correct prediction start
        if processing_info and 'actual_date_range' in processing_info:
            self.actual_last_date = pd.to_datetime(processing_info['actual_date_range']['end'])
            logger.info(f"Stored actual last registration date: {self.actual_last_date}")
        else:
            # Fallback to last date in daily data if actual_date_range not available
            self.actual_last_date = pd.to_datetime(series.index.max())
            logger.info(f"Using last date from daily data (fallback): {self.actual_last_date}")
        
        # Find optimal parameters using auto_arima
        logger.info("\nFinding optimal parameters using auto_arima...")
        p, d, q, P, D, Q, s = self.find_optimal_parameters_auto(
            train_series,
            exogenous=exog_train,
            seasonal_period=7  # Weekly seasonality for daily data
        )
        
        self.model_params = {
            'order': (p, d, q),
            'seasonal_order': (P, D, Q, s),
            'full_params': (p, d, q, P, D, Q, s),
            'seasonal_period': s
        }
        
        # Create and fit SARIMAX model
        logger.info(f"\nFitting SARIMAX model with parameters:")
        logger.info(f"  Order: {self.model_params['order']}")
        logger.info(f"  Seasonal Order: {self.model_params['seasonal_order']}")
        logger.info(f"  Exogenous variables: {'Yes' if exog_train is not None else 'No'}")
        
        self.model = SARIMAX(
            train_series,
            exog=exog_train,
            order=(p, d, q),
            seasonal_order=(P, D, Q, s),
            enforce_stationarity=False,
            enforce_invertibility=False
        )
        
        try:
            logger.info("Fitting model (this may take a few minutes)...")
            self.fitted_model = self.model.fit(disp=False, maxiter=200)
            logger.info("Model fitting completed!")
            logger.info(f"AIC: {self.fitted_model.aic:.2f}")
            logger.info(f"BIC: {self.fitted_model.bic:.2f}")
        except Exception as e:
            logger.error(f"Error fitting model: {str(e)}")
            raise
        
        # Calculate accuracy metrics on training data (in-sample)
        logger.info("\nCalculating in-sample (training) metrics...")
        self._calculate_accuracy_metrics(train_series, is_training=True, exogenous=exog_train)
        
        # Calculate accuracy metrics on test data (out-of-sample)
        if len(test_series) > 0:
            logger.info("\nCalculating out-of-sample (test) metrics...")
            self._calculate_test_accuracy(test_series, exogenous=exog_test)
        else:
            logger.warning("Test set is empty, skipping test metrics")
            self.test_accuracy_metrics = None
        
        # Analyze test period patterns
        if len(test_series) > 0:
            logger.info("\nAnalyzing test period patterns...")
            self._analyze_test_period_patterns(train_series, test_series, exog_train, exog_test)
        
        # Calculate diagnostic metrics
        logger.info("\nCalculating model diagnostics...")
        self._calculate_diagnostics(train_series)
        
        # Perform cross-validation
        logger.info("\nPerforming TimeSeriesSplit cross-validation...")
        self._perform_cross_validation(series, exogenous=exogenous)
        
        # Save model
        logger.info("\nSaving model...")
        self.save_model()
        
        # Prepare training info
        # Debug: Check what we're about to return
        if self.accuracy_metrics:
            logger.info(f"DEBUG: Before training_info - accuracy_metrics.r2 = {self.accuracy_metrics.get('r2')}")
        if self.test_accuracy_metrics:
            logger.info(f"DEBUG: Before training_info - test_accuracy_metrics.r2 = {self.test_accuracy_metrics.get('r2')}")
        
        # Calculate model accuracy percentages
        training_accuracy = None
        test_accuracy = None
        cv_accuracy = None
        if self.accuracy_metrics and self.accuracy_metrics.get('r2') is not None:
            training_accuracy = self.calculate_model_accuracy(self.accuracy_metrics['r2'])
        if self.test_accuracy_metrics and self.test_accuracy_metrics.get('r2') is not None:
            test_accuracy = self.calculate_model_accuracy(self.test_accuracy_metrics['r2'])
        if self.cv_results and self.cv_results.get('mean_accuracy') is not None:
            cv_accuracy = self.cv_results['mean_accuracy']
        
        # Compute active (non-zero) ranges for clearer reporting in UI
        train_nonzero = train_series[train_series > 0]
        test_nonzero = test_series[test_series > 0] if len(test_series) > 0 else test_series
        
        training_info = {
            'model_params': self.model_params,
            'training_days': len(train_series),
            'test_days': len(test_series),
            'total_days': len(series),
            'date_range': {
                'start': str(train_series.index.min()),
                'end': str(train_series.index.max())
            },
            'test_date_range': {
                'start': str(test_series.index.min()),
                'end': str(test_series.index.max())
            } if len(test_series) > 0 else None,
            # New: active (non-zero) date ranges for training and test sets.
            # These are used by the frontend to show when registrations actually occurred,
            # instead of only showing the raw calendar window (which may be mostly zeros).
            'active_date_ranges': {
                'training': {
                    'start': str(train_nonzero.index.min()) if len(train_nonzero) > 0 else None,
                    'end': str(train_nonzero.index.max()) if len(train_nonzero) > 0 else None,
                },
                'test': {
                    'start': str(test_nonzero.index.min()) if len(test_nonzero) > 0 else None,
                    'end': str(test_nonzero.index.max()) if len(test_nonzero) > 0 else None,
                } if len(test_series) > 0 else None,
            },
            'accuracy_metrics': self.accuracy_metrics,
            'test_accuracy_metrics': self.test_accuracy_metrics,
            'model_accuracy': {
                'cv_accuracy': float(cv_accuracy) if cv_accuracy is not None else None,  # Primary metric
                'training_accuracy': float(training_accuracy) if training_accuracy is not None else None,
                'test_accuracy': float(test_accuracy) if test_accuracy is not None else None
            },
            'diagnostics': self.diagnostics,
            'cv_results': self.cv_results,
            'aic': float(self.fitted_model.aic),
            'bic': float(self.fitted_model.bic),
            'normalization': {
                'enabled': self.use_normalization,
                'scaler_type': self.scaler_type if self.use_normalization else None
            },
            'exogenous_variables': {
                'used': exogenous is not None,
                'variables': list(exogenous.columns) if exogenous is not None else None
            }
        }
        
        # Debug: Verify what's in training_info
        if training_info.get('accuracy_metrics'):
            logger.info(f"DEBUG: training_info['accuracy_metrics']['r2'] = {training_info['accuracy_metrics'].get('r2')}")
        if training_info.get('test_accuracy_metrics'):
            logger.info(f"DEBUG: training_info['test_accuracy_metrics']['r2'] = {training_info['test_accuracy_metrics'].get('r2')}")
        
        logger.info("=" * 60)
        logger.info("TRAINING COMPLETED SUCCESSFULLY")
        logger.info("=" * 60)
        
        return training_info
    
    def _calculate_accuracy_metrics(self, actual_series, is_training=True, exogenous=None):
        """
        Calculate accuracy metrics using in-sample predictions
        
        Args:
            actual_series: Actual time series values
            is_training: Whether this is training data
            exogenous: Exogenous variables for predictions
        """
        try:
            # Get fitted values (in-sample predictions)
            fitted_values = self.fitted_model.fittedvalues
            
            # Align by index (more robust than position-based alignment)
            # Find common indices
            common_indices = actual_series.index.intersection(fitted_values.index)
            
            if len(common_indices) == 0:
                # Fallback: use position-based alignment if indices don't match
                logger.warning("Index mismatch between actual and fitted values, using position-based alignment")
                min_len = min(len(actual_series), len(fitted_values))
                actual_aligned = actual_series.iloc[:min_len].values
                fitted_aligned = fitted_values.iloc[:min_len].values
            else:
                actual_aligned = actual_series.loc[common_indices]
                fitted_aligned = fitted_values.loc[common_indices]
            
            # Convert to numpy arrays for calculations
            actual_aligned = np.array(actual_aligned, dtype=float)
            fitted_aligned = np.array(fitted_aligned, dtype=float)
            
            # Remove any NaN or Inf values before processing
            mask = np.isfinite(actual_aligned) & np.isfinite(fitted_aligned)
            if mask.sum() < 2:
                logger.error("Insufficient valid data points for metric calculation")
                # Set metrics to None but don't raise - let other metrics try to calculate
                if is_training:
                    self.accuracy_metrics = None
                else:
                    self.test_accuracy_metrics = None
                return
            actual_aligned = actual_aligned[mask]
            fitted_aligned = fitted_aligned[mask]
            
            # Inverse transform if normalization was used
            if self.use_normalization:
                # Convert back to Series for inverse transform, then back to array
                actual_aligned_series = pd.Series(actual_aligned, index=range(len(actual_aligned)))
                fitted_aligned_series = pd.Series(fitted_aligned, index=range(len(fitted_aligned)))
                actual_aligned_series = self.inverse_normalize(actual_aligned_series)
                fitted_aligned_series = self.inverse_normalize(fitted_aligned_series)
                actual_aligned = actual_aligned_series.values
                fitted_aligned = fitted_aligned_series.values
            
            # Calculate metrics
            mae = mean_absolute_error(actual_aligned, fitted_aligned)
            rmse = np.sqrt(mean_squared_error(actual_aligned, fitted_aligned))
            
            # MAPE (avoid division by zero)
            non_zero_mask = actual_aligned != 0
            if non_zero_mask.sum() > 0:
                mape = np.mean(np.abs((actual_aligned[non_zero_mask] - fitted_aligned[non_zero_mask]) 
                                      / actual_aligned[non_zero_mask])) * 100
            else:
                mape = np.nan
            
            # R² (Coefficient of Determination)
            try:
                # Check if we have enough valid data points
                if len(actual_aligned) < 2:
                    logger.warning("Not enough data points to calculate R²")
                    r2 = None
                else:
                    # Check if actual values have variance (required for R²)
                    actual_variance = np.var(actual_aligned)
                    if actual_variance == 0 or np.isnan(actual_variance) or np.isinf(actual_variance):
                        logger.warning(f"Cannot calculate R²: actual values have zero variance (all values are the same)")
                        r2 = None
                    else:
                        r2 = r2_score(actual_aligned, fitted_aligned)
                        # Handle NaN or inf values
                        if np.isnan(r2) or np.isinf(r2):
                            logger.warning(f"R² calculation resulted in NaN/Inf. Actual variance: {actual_variance:.4f}, len: {len(actual_aligned)}")
                            r2 = None
                        else:
                            r2 = float(r2)
                            logger.info(f"R² calculated successfully: {r2:.4f} (variance: {actual_variance:.4f})")
            except Exception as e:
                logger.error(f"Could not calculate R²: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
                r2 = None
            
            metrics = {
                'mae': float(mae),
                'rmse': float(rmse),
                'mape': float(mape) if not np.isnan(mape) else None,
                'r2': r2,
                'mean_actual': float(np.mean(actual_aligned)),
                'std_actual': float(np.std(actual_aligned))
            }
            
            # Ensure r2 is always in the metrics dict (even if None)
            if 'r2' not in metrics:
                metrics['r2'] = None
                logger.warning("R² was not included in metrics dictionary, setting to None")
            
            # Debug logging
            logger.info(f"DEBUG: Metrics calculated - R² value: {r2}, type: {type(r2)}")
            logger.info(f"DEBUG: Metrics dict keys: {list(metrics.keys())}, R² in dict: {'r2' in metrics}")
            
            if is_training:
                self.accuracy_metrics = metrics
                logger.info(f"In-Sample Performance:")
                logger.info(f"  MAE: {mae:.2f}")
                logger.info(f"  RMSE: {rmse:.2f}")
                logger.info(f"  MAPE: {mape:.2f}%")
                r2_str = f"{r2:.4f}" if r2 is not None else "N/A"
                logger.info(f"  R²: {r2_str}")
                # Debug: Verify R² was saved
                if self.accuracy_metrics:
                    logger.info(f"DEBUG: Saved accuracy_metrics.r2 = {self.accuracy_metrics.get('r2')}")
                else:
                    logger.warning("accuracy_metrics is None after calculation!")
            else:
                self.test_accuracy_metrics = metrics
                logger.info(f"Out-of-Sample Performance:")
                logger.info(f"  MAE: {mae:.2f}")
                logger.info(f"  RMSE: {rmse:.2f}")
                logger.info(f"  MAPE: {mape:.2f}%")
                r2_str = f"{r2:.4f}" if r2 is not None else "N/A"
                logger.info(f"  R²: {r2_str}")
            
        except Exception as e:
            logger.error(f"Error calculating accuracy metrics: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            logger.error(f"Actual series length: {len(actual_series) if 'actual_series' in locals() else 'N/A'}")
            logger.error(f"Fitted values length: {len(self.fitted_model.fittedvalues) if hasattr(self, 'fitted_model') and self.fitted_model else 'N/A'}")
            if is_training:
                self.accuracy_metrics = None
            else:
                self.test_accuracy_metrics = None
    
    def _calculate_test_accuracy(self, test_series, exogenous=None):
        """
        Calculate accuracy metrics on test data (out-of-sample predictions)
        
        Args:
            test_series: Test time series values
            exogenous: Exogenous variables for test period
        """
        try:
            # Generate forecasts for the test period
            forecast_steps = len(test_series)
            
            # Get forecast with confidence intervals
            forecast_result = self.fitted_model.get_forecast(
                steps=forecast_steps,
                exog=exogenous
            )
            
            forecast = forecast_result.predicted_mean
            forecast_ci = forecast_result.conf_int()
            
            # Align by index (more robust than position-based alignment)
            common_indices = test_series.index.intersection(forecast.index)
            
            if len(common_indices) == 0:
                # Fallback: use position-based alignment if indices don't match
                logger.warning("Index mismatch between test and forecast values, using position-based alignment")
                min_len = min(len(test_series), len(forecast))
                test_aligned = test_series.iloc[:min_len].values
                forecast_aligned = forecast.iloc[:min_len].values
            else:
                test_aligned = test_series.loc[common_indices]
                forecast_aligned = forecast.loc[common_indices]
            
            # Convert to numpy arrays for calculations
            test_aligned = np.array(test_aligned, dtype=float)
            forecast_aligned = np.array(forecast_aligned, dtype=float)
            
            # Remove any NaN or Inf values before processing
            mask = np.isfinite(test_aligned) & np.isfinite(forecast_aligned)
            if mask.sum() < 2:
                logger.error("Insufficient valid data points for test metric calculation")
                # Set metrics to None but don't raise
                self.test_accuracy_metrics = None
                return
            test_aligned = test_aligned[mask]
            forecast_aligned = forecast_aligned[mask]
            
            # Inverse transform if normalization was used
            if self.use_normalization:
                # Convert back to Series for inverse transform, then back to array
                test_aligned_series = pd.Series(test_aligned, index=range(len(test_aligned)))
                forecast_aligned_series = pd.Series(forecast_aligned, index=range(len(forecast_aligned)))
                test_aligned_series = self.inverse_normalize(test_aligned_series)
                forecast_aligned_series = self.inverse_normalize(forecast_aligned_series)
                test_aligned = test_aligned_series.values
                forecast_aligned = forecast_aligned_series.values
            
            # Calculate metrics
            mae = mean_absolute_error(test_aligned, forecast_aligned)
            rmse = np.sqrt(mean_squared_error(test_aligned, forecast_aligned))
            
            # MAPE
            non_zero_mask = test_aligned != 0
            if non_zero_mask.sum() > 0:
                test_non_zero = test_aligned[non_zero_mask]
                forecast_non_zero = forecast_aligned[non_zero_mask]
                mape = np.mean(np.abs((test_non_zero - forecast_non_zero) / test_non_zero)) * 100
            else:
                mape = np.nan
            
            # R²
            try:
                # Check if we have enough valid data points
                if len(test_aligned) < 2:
                    logger.warning("Not enough data points to calculate R² for test set")
                    r2 = None
                else:
                    # Check if actual values have variance (required for R²)
                    actual_variance = np.var(test_aligned)
                    if actual_variance == 0 or np.isnan(actual_variance) or np.isinf(actual_variance):
                        logger.warning(f"Cannot calculate R² for test set: actual values have zero variance (all values are the same)")
                        r2 = None
                    else:
                        r2 = r2_score(test_aligned, forecast_aligned)
                        # Handle NaN or inf values
                        if np.isnan(r2) or np.isinf(r2):
                            logger.warning(f"R² calculation for test set resulted in NaN/Inf. Actual variance: {actual_variance:.4f}, len: {len(test_aligned)}")
                            r2 = None
                        else:
                            r2 = float(r2)
                            logger.info(f"Test set R² calculated successfully: {r2:.4f} (variance: {actual_variance:.4f})")
            except Exception as e:
                logger.error(f"Could not calculate R² for test set: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
                r2 = None
            
            self.test_accuracy_metrics = {
                'mae': float(mae),
                'rmse': float(rmse),
                'mape': float(mape) if not np.isnan(mape) else None,
                'r2': r2,
                'mean_actual': float(np.mean(test_aligned)),
                'std_actual': float(np.std(test_aligned))
            }
            
            # Ensure r2 is always in the metrics dict (even if None)
            if 'r2' not in self.test_accuracy_metrics:
                self.test_accuracy_metrics['r2'] = None
                logger.warning("R² was not included in test metrics dictionary, setting to None")
            
            # Debug logging
            logger.info(f"DEBUG: Test metrics calculated - R² value: {r2}, type: {type(r2)}")
            logger.info(f"DEBUG: Test metrics dict keys: {list(self.test_accuracy_metrics.keys())}, R² in dict: {'r2' in self.test_accuracy_metrics}")
            
            logger.info(f"Test Set Performance (Out-of-Sample):")
            logger.info(f"  MAE: {mae:.2f}")
            logger.info(f"  RMSE: {rmse:.2f}")
            logger.info(f"  MAPE: {mape:.2f}%")
            r2_str = f"{r2:.4f}" if r2 is not None else "N/A"
            logger.info(f"  R²: {r2_str}")
            
        except Exception as e:
            logger.error(f"Error calculating test accuracy: {str(e)}")
            import traceback
            traceback.print_exc()
            self.test_accuracy_metrics = None
    
    def _analyze_test_period_patterns(self, train_series, test_series, exog_train=None, exog_test=None):
        """
        Analyze patterns in test period vs training period to detect differences
        
        Args:
            train_series: Training time series
            test_series: Test time series
            exog_train: Training exogenous variables
            exog_test: Test exogenous variables
        """
        try:
            logger.info("=" * 60)
            logger.info("TEST PERIOD PATTERN ANALYSIS")
            logger.info("=" * 60)
            
            # Basic statistics comparison
            train_mean = train_series.mean()
            test_mean = test_series.mean()
            train_std = train_series.std()
            test_std = test_series.std()
            train_median = train_series.median()
            test_median = test_series.median()
            
            # Calculate percentage differences
            mean_diff_pct = ((test_mean - train_mean) / train_mean * 100) if train_mean != 0 else 0
            std_diff_pct = ((test_std - train_std) / train_std * 100) if train_std != 0 else 0
            
            logger.info(f"\nStatistical Comparison:")
            logger.info(f"  Training - Mean: {train_mean:.2f}, Std: {train_std:.2f}, Median: {train_median:.2f}")
            logger.info(f"  Test      - Mean: {test_mean:.2f}, Std: {test_std:.2f}, Median: {test_median:.2f}")
            logger.info(f"  Difference - Mean: {mean_diff_pct:+.2f}%, Std: {std_diff_pct:+.2f}%")
            
            # Check for significant differences
            if abs(mean_diff_pct) > 20:
                logger.warning(f"  ⚠️  Significant mean difference ({mean_diff_pct:+.2f}%) - test period may have different patterns")
            if abs(std_diff_pct) > 30:
                logger.warning(f"  ⚠️  Significant variance difference ({std_diff_pct:+.2f}%) - test period may be more/less volatile")
            
            # Zero values analysis
            train_zeros = (train_series == 0).sum()
            test_zeros = (test_series == 0).sum()
            train_zero_pct = (train_zeros / len(train_series)) * 100
            test_zero_pct = (test_zeros / len(test_series)) * 100
            
            logger.info(f"\nZero Values:")
            logger.info(f"  Training: {train_zeros} days ({train_zero_pct:.2f}%)")
            logger.info(f"  Test: {test_zeros} days ({test_zero_pct:.2f}%)")
            
            if abs(test_zero_pct - train_zero_pct) > 10:
                logger.warning(f"  ⚠️  Different zero-value patterns - test period has {abs(test_zero_pct - train_zero_pct):.2f}% difference")
            
            # Weekend/holiday pattern comparison (if exogenous variables available)
            if exog_train is not None and exog_test is not None:
                if 'is_weekend_or_holiday' in exog_train.columns:
                    train_weekend_holiday = exog_train['is_weekend_or_holiday'].sum()
                    test_weekend_holiday = exog_test['is_weekend_or_holiday'].sum()
                    train_wh_pct = (train_weekend_holiday / len(exog_train)) * 100
                    test_wh_pct = (test_weekend_holiday / len(exog_test)) * 100
                    
                    logger.info(f"\nWeekend/Holiday Distribution:")
                    logger.info(f"  Training: {train_weekend_holiday} days ({train_wh_pct:.2f}%)")
                    logger.info(f"  Test: {test_weekend_holiday} days ({test_wh_pct:.2f}%)")
                    
                    if abs(test_wh_pct - train_wh_pct) > 10:
                        logger.warning(f"  ⚠️  Different weekend/holiday distribution - may affect predictions")
            
            # Trend analysis
            train_trend = np.polyfit(range(len(train_series)), train_series.values, 1)[0]
            test_trend = np.polyfit(range(len(test_series)), test_series.values, 1)[0]
            
            logger.info(f"\nTrend Analysis:")
            logger.info(f"  Training trend: {train_trend:.4f} (per day)")
            logger.info(f"  Test trend: {test_trend:.4f} (per day)")
            
            if (train_trend > 0 and test_trend < 0) or (train_trend < 0 and test_trend > 0):
                logger.warning(f"  ⚠️  Opposite trends detected - training and test periods show different directions")
            
            # Summary recommendations
            logger.info(f"\n" + "-" * 60)
            logger.info("Analysis Summary:")
            issues = []
            if abs(mean_diff_pct) > 20:
                issues.append("Significant mean difference")
            if abs(std_diff_pct) > 30:
                issues.append("Significant variance difference")
            if abs(test_zero_pct - train_zero_pct) > 10:
                issues.append("Different zero-value patterns")
            
            if issues:
                logger.warning(f"  ⚠️  Potential issues detected: {', '.join(issues)}")
                logger.info(f"  💡 Recommendation: Consider using cross-validation accuracy as primary metric")
                logger.info(f"  💡 Recommendation: Model may need retraining with more recent data")
            else:
                logger.info(f"  ✓ Test period patterns are similar to training period")
            
            logger.info("=" * 60)
            
        except Exception as e:
            logger.error(f"Error analyzing test period patterns: {str(e)}")
            import traceback
            traceback.print_exc()
    
    def _calculate_diagnostics(self, actual_series):
        """Calculate diagnostic metrics: residuals randomness, ACF/PACF"""
        try:
            residuals = self.fitted_model.resid
            residuals_clean = residuals.dropna()
            
            if len(residuals_clean) < 2:
                self.diagnostics = {'message': 'Insufficient data for diagnostics'}
                return
            
            # Ljung-Box test
            try:
                ljung_box = acorr_ljungbox(residuals_clean, lags=min(10, len(residuals_clean)//2), return_df=True)
                ljung_box_pvalue = float(ljung_box['lb_pvalue'].iloc[-1])
                ljung_box_statistic = float(ljung_box['lb_stat'].iloc[-1])
                residuals_random = ljung_box_pvalue > 0.05
            except Exception as e:
                logger.warning(f"Ljung-Box test failed: {str(e)}")
                ljung_box_pvalue = None
                ljung_box_statistic = None
                residuals_random = None
            
            # Residual statistics
            residuals_mean = float(residuals_clean.mean())
            residuals_std = float(residuals_clean.std())
            
            # ACF/PACF
            max_lags = min(10, len(residuals_clean) // 2)
            if max_lags > 0:
                try:
                    acf_values, acf_confint = acf(residuals_clean, nlags=max_lags, alpha=0.05, fft=True)
                    pacf_values, pacf_confint = pacf(residuals_clean, nlags=max_lags, alpha=0.05)
                    
                    acf_data = [
                        {
                            'lag': int(i),
                            'value': float(acf_values[i]),
                            'lower_ci': float(acf_confint[i][0]) if acf_confint is not None else None,
                            'upper_ci': float(acf_confint[i][1]) if acf_confint is not None else None
                        }
                        for i in range(1, len(acf_values))
                    ]
                    
                    pacf_data = [
                        {
                            'lag': int(i),
                            'value': float(pacf_values[i]),
                            'lower_ci': float(pacf_confint[i][0]) if pacf_confint is not None else None,
                            'upper_ci': float(pacf_confint[i][1]) if pacf_confint is not None else None
                        }
                        for i in range(1, len(pacf_values))
                    ]
                except Exception as e:
                    logger.warning(f"ACF/PACF calculation failed: {str(e)}")
                    acf_data = None
                    pacf_data = None
            else:
                acf_data = None
                pacf_data = None
            
            self.diagnostics = {
                'residuals_random': bool(residuals_random) if residuals_random is not None else None,
                'ljung_box_pvalue': ljung_box_pvalue,
                'ljung_box_statistic': ljung_box_statistic,
                'residuals_mean': residuals_mean,
                'residuals_std': residuals_std,
                'acf_values': acf_data,
                'pacf_values': pacf_data,
                'total_residuals': len(residuals_clean)
            }
            
            logger.info(f"Model Diagnostics:")
            logger.info(f"  Residuals Random: {residuals_random} (p-value: {ljung_box_pvalue:.4f})")
            logger.info(f"  Residuals Mean: {residuals_mean:.4f}, Std: {residuals_std:.4f}")
            
        except Exception as e:
            logger.error(f"Error calculating diagnostics: {str(e)}")
            self.diagnostics = None
    
    def _perform_cross_validation(self, series, exogenous=None, n_splits=3):
        """
        Perform TimeSeriesSplit cross-validation
        
        Args:
            series: Full time series data
            exogenous: Exogenous variables
            n_splits: Number of splits for cross-validation
        """
        try:
            logger.info(f"Performing {n_splits}-fold TimeSeriesSplit cross-validation...")
            
            # Ensure we have enough data for CV
            if len(series) < n_splits * 10:
                logger.warning(f"Insufficient data for {n_splits}-fold CV. Skipping.")
                self.cv_results = None
                return
            
            tscv = TimeSeriesSplit(n_splits=n_splits)
            cv_scores = []
            
            for fold, (train_idx, test_idx) in enumerate(tscv.split(series)):
                logger.info(f"\nFold {fold + 1}/{n_splits}:")
                logger.info(f"  Train: {len(train_idx)} days, Test: {len(test_idx)} days")
                
                train_data = series.iloc[train_idx]
                test_data = series.iloc[test_idx]
                
                exog_train_fold = exogenous.iloc[train_idx] if exogenous is not None else None
                exog_test_fold = exogenous.iloc[test_idx] if exogenous is not None else None
                
                # Find optimal parameters for this fold
                try:
                    p, d, q, P, D, Q, s = self.find_optimal_parameters_auto(
                        train_data,
                        exogenous=exog_train_fold,
                        seasonal_period=7
                    )
                    
                    # Fit model
                    temp_model = SARIMAX(
                        train_data,
                        exog=exog_train_fold,
                        order=(p, d, q),
                        seasonal_order=(P, D, Q, s),
                        enforce_stationarity=False,
                        enforce_invertibility=False
                    )
                    temp_fitted = temp_model.fit(disp=False, maxiter=100)
                    
                    # Forecast
                    forecast = temp_fitted.forecast(steps=len(test_data), exog=exog_test_fold)
                    
                    # Align forecast with test data
                    if len(forecast) != len(test_data):
                        min_len = min(len(forecast), len(test_data))
                        forecast = forecast.iloc[:min_len] if hasattr(forecast, 'iloc') else forecast[:min_len]
                        test_data = test_data.iloc[:min_len]
                    
                    # Convert to arrays for calculations
                    test_array = np.array(test_data, dtype=float)
                    forecast_array = np.array(forecast, dtype=float)
                    
                    # Remove NaN/Inf values
                    mask = np.isfinite(test_array) & np.isfinite(forecast_array)
                    if mask.sum() < 2:
                        logger.warning(f"  Fold {fold + 1}: Insufficient valid data points")
                        continue
                    
                    test_clean = test_array[mask]
                    forecast_clean = forecast_array[mask]
                    
                    # Calculate multiple metrics
                    mae = mean_absolute_error(test_clean, forecast_clean)
                    rmse = np.sqrt(mean_squared_error(test_clean, forecast_clean))
                    
                    # MAPE
                    non_zero_mask = test_clean != 0
                    if non_zero_mask.sum() > 0:
                        mape = np.mean(np.abs((test_clean[non_zero_mask] - forecast_clean[non_zero_mask]) 
                                              / test_clean[non_zero_mask])) * 100
                    else:
                        mape = np.nan
                    
                    # R²
                    r2 = None
                    if len(test_clean) >= 2:
                        test_variance = np.var(test_clean)
                        if test_variance > 0 and not np.isnan(test_variance) and not np.isinf(test_variance):
                            try:
                                r2 = r2_score(test_clean, forecast_clean)
                                if np.isnan(r2) or np.isinf(r2):
                                    r2 = None
                            except:
                                r2 = None
                    
                    # Calculate accuracy percentage
                    cv_accuracy = self.calculate_model_accuracy(r2) if r2 is not None else None
                    
                    cv_scores.append({
                        'fold': fold + 1,
                        'mae': float(mae),
                        'rmse': float(rmse),
                        'mape': float(mape) if not np.isnan(mape) else None,
                        'r2': float(r2) if r2 is not None else None,
                        'accuracy': float(cv_accuracy) if cv_accuracy is not None else None,
                        'parameters': (p, d, q, P, D, Q, s)
                    })
                    
                    logger.info(f"  Fold {fold + 1} - MAE: {mae:.2f}, RMSE: {rmse:.2f}, MAPE: {mape:.2f}%, R²: {r2:.4f if r2 is not None else 'N/A'}, Accuracy: {cv_accuracy:.2f}%")
                    
                except Exception as e:
                    logger.warning(f"  Fold {fold + 1} failed: {str(e)}")
                    continue
            
            if cv_scores:
                # Calculate mean and std for all metrics
                valid_mape = [s['mape'] for s in cv_scores if s['mape'] is not None]
                valid_r2 = [s['r2'] for s in cv_scores if s['r2'] is not None]
                valid_accuracy = [s['accuracy'] for s in cv_scores if s['accuracy'] is not None]
                valid_mae = [s['mae'] for s in cv_scores if s['mae'] is not None]
                valid_rmse = [s['rmse'] for s in cv_scores if s['rmse'] is not None]
                
                self.cv_results = {
                    'n_splits': n_splits,
                    'fold_scores': cv_scores,
                    'mean_mape': float(np.mean(valid_mape)) if valid_mape else None,
                    'std_mape': float(np.std(valid_mape)) if valid_mape else None,
                    'mean_r2': float(np.mean(valid_r2)) if valid_r2 else None,
                    'std_r2': float(np.std(valid_r2)) if valid_r2 else None,
                    'mean_accuracy': float(np.mean(valid_accuracy)) if valid_accuracy else None,
                    'std_accuracy': float(np.std(valid_accuracy)) if valid_accuracy else None,
                    'mean_mae': float(np.mean(valid_mae)) if valid_mae else None,
                    'mean_rmse': float(np.mean(valid_rmse)) if valid_rmse else None
                }
                
                logger.info(f"\nCross-Validation Results:")
                if valid_accuracy:
                    logger.info(f"  Mean Accuracy: {self.cv_results['mean_accuracy']:.2f}% ± {self.cv_results['std_accuracy']:.2f}%")
                if valid_r2:
                    logger.info(f"  Mean R²: {self.cv_results['mean_r2']:.4f} ± {self.cv_results['std_r2']:.4f}")
                if valid_mape:
                    logger.info(f"  Mean MAPE: {self.cv_results['mean_mape']:.2f}% ± {self.cv_results['std_mape']:.2f}%")
                if valid_mae:
                    logger.info(f"  Mean MAE: {self.cv_results['mean_mae']:.2f}")
                if valid_rmse:
                    logger.info(f"  Mean RMSE: {self.cv_results['mean_rmse']:.2f}")
            else:
                self.cv_results = None
                logger.warning("Cross-validation failed for all folds")
                
        except Exception as e:
            logger.error(f"Error in cross-validation: {str(e)}")
            self.cv_results = None
    
    def predict(self, days=30, exogenous=None):
        """
        Generate predictions for the specified number of days
        
        Args:
            days: Number of days to predict (default: 30)
            exogenous: Exogenous variables for future dates (DataFrame, optional)
            
        Returns:
            Dictionary with predictions and confidence intervals
        """
        if self.fitted_model is None:
            raise ValueError("Model not trained. Please train the model first.")
        
        logger.info(f"Generating predictions for {days} days...")
        
        # Determine actual last registration date
        # CRITICAL: Use the ACTUAL last registration date, not just the last date in daily data
        actual_last_date = None
        
        # Priority 1: Use actual_last_date if available (from freshly trained model)
        if hasattr(self, 'actual_last_date') and self.actual_last_date is not None:
            actual_last_date = pd.to_datetime(self.actual_last_date)
            logger.info(f"Using actual last registration date: {actual_last_date}")
        # Priority 2: Check if we have metadata with actual_last_date (from loaded model)
        elif hasattr(self, '_metadata') and self._metadata and 'actual_last_date' in self._metadata:
            actual_last_date_str = self._metadata['actual_last_date']
            if actual_last_date_str:
                actual_last_date = pd.to_datetime(actual_last_date_str)
                logger.info(f"Using actual last registration date from metadata: {actual_last_date}")
        # Priority 3: Fallback to last date from all_data
        elif self.all_data is not None and len(self.all_data) > 0:
            actual_last_date = pd.to_datetime(self.all_data.index.max())
            logger.info(f"Warning: Using last date from daily data (may be incorrect): {actual_last_date}")
        # Priority 4: Fallback to metadata's last_data_date
        elif hasattr(self, '_metadata') and self._metadata and 'last_data_date' in self._metadata:
            actual_last_date = pd.to_datetime(self._metadata['last_data_date'])
            logger.info(f"Warning: Using last_data_date from metadata (may be incorrect): {actual_last_date}")
        # Priority 5: Final fallback to training data
        else:
            actual_last_date = pd.to_datetime(self.training_data.index.max())
            logger.info(f"Warning: Using last date from training data (fallback): {actual_last_date}")
        
        if actual_last_date is None:
            raise ValueError("Cannot determine last data date for predictions")
        
        # Calculate the first day of the next month after the actual last registration date
        # User requirement: Start predictions from August 1, 2025 (first day of next month)
        actual_last_date_dt = pd.to_datetime(actual_last_date)
        
        # Get the first day of the next month
        if actual_last_date_dt.month == 12:
            # If December, next month is January of next year
            next_month_start = pd.Timestamp(year=actual_last_date_dt.year + 1, month=1, day=1)
        else:
            # Otherwise, next month, day 1
            next_month_start = pd.Timestamp(year=actual_last_date_dt.year, month=actual_last_date_dt.month + 1, day=1)
        
        logger.info(f"Actual last registration date: {actual_last_date}")
        logger.info(f"First day of next month: {next_month_start}")
        logger.info(f"Prediction start date: {next_month_start}")
        
        # CRITICAL FIX: If exogenous DataFrame is provided with a DatetimeIndex,
        # use those dates instead of recalculating. This ensures consistency when
        # app.py passes dates starting from next_month_start.
        if exogenous is not None and hasattr(exogenous, 'index') and isinstance(exogenous.index, pd.DatetimeIndex):
            # Use the dates from the exogenous DataFrame
            forecast_dates = exogenous.index[:days]  # Take only the requested number of days
            logger.info(f"Using dates from exogenous DataFrame: {forecast_dates[0]} to {forecast_dates[-1]}")
        else:
            # Generate forecast dates starting from the first day of next month
            forecast_dates = pd.date_range(
                start=next_month_start,
                periods=days,
                freq='D'
            )
            logger.info(f"Generated forecast dates: {forecast_dates[0]} to {forecast_dates[-1]}")
        
        # Auto-generate exogenous variables if they were used during training but not provided
        if exogenous is None:
            # Check if model was trained with exogenous variables
            needs_exog = False
            
            # Method 1: Check if we have exog_all stored (from training)
            if self.exog_all is not None and len(self.exog_all.columns) > 0:
                needs_exog = True
                logger.info("Model was trained with exogenous variables. Auto-generating them for forecast period...")
            # Method 2: Check the fitted model's exog_names (works for loaded models)
            elif (hasattr(self.fitted_model, 'model') and 
                  hasattr(self.fitted_model.model, 'exog_names') and 
                  self.fitted_model.model.exog_names is not None and
                  len(self.fitted_model.model.exog_names) > 0):
                needs_exog = True
                logger.info("Model was trained with exogenous variables (detected from model). Auto-generating them for forecast period...")
            # Method 3: Check if model has exog in its specification
            elif (hasattr(self.fitted_model, 'model') and 
                  hasattr(self.fitted_model.model, 'k_exog') and 
                  self.fitted_model.model.k_exog > 0):
                needs_exog = True
                logger.info("Model was trained with exogenous variables (detected from k_exog). Auto-generating them for forecast period...")
            
            if needs_exog:
                exogenous = self._generate_exogenous_for_future_dates(forecast_dates)
                logger.info(f"Generated exogenous variables with columns: {list(exogenous.columns)}")
        
        # Generate forecasts
        try:
            forecast_result = self.fitted_model.get_forecast(
                steps=days,
                exog=exogenous
            )
            
            forecast = forecast_result.predicted_mean
            forecast_ci = forecast_result.conf_int()
            
            # Inverse transform if normalization was used
            if self.use_normalization:
                forecast = self.inverse_normalize(forecast)
                forecast_ci_lower = self.inverse_normalize(forecast_ci.iloc[:, 0])
                forecast_ci_upper = self.inverse_normalize(forecast_ci.iloc[:, 1])
            else:
                forecast_ci_lower = forecast_ci.iloc[:, 0]
                forecast_ci_upper = forecast_ci.iloc[:, 1]
            
            # Debug: Log forecast statistics
            logger.info(f"DEBUG: Forecast statistics:")
            logger.info(f"  Min: {forecast.min():.2f}, Max: {forecast.max():.2f}, Mean: {forecast.mean():.2f}")
            logger.info(f"  Negative values: {(forecast < 0).sum()} out of {len(forecast)}")
            logger.info(f"  Values < 1: {(forecast < 1).sum()} out of {len(forecast)}")
            logger.info(f"  First 5 forecast values: {forecast.head().tolist()}")
            
            # Prepare daily predictions
            daily_predictions = []
            for i, date in enumerate(forecast_dates):
                daily_predictions.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'day': date.day,
                    'week': date.isocalendar()[1],
                    'predicted_count': int(round(max(0, forecast.iloc[i]))),
                    'lower_bound': int(round(max(0, forecast_ci_lower.iloc[i]))),
                    'upper_bound': int(round(max(0, forecast_ci_upper.iloc[i])))
                })
            
            # Aggregate to weekly totals
            # Calculate the Sunday on or after next_month_start for the first week
            next_month_start_weekday = next_month_start.weekday()
            days_until_sunday = (6 - next_month_start_weekday) % 7
            if days_until_sunday == 0 and next_month_start_weekday != 6:
                days_until_sunday = 7
            first_week_start = next_month_start + timedelta(days=days_until_sunday)
            
            weekly_predictions = []
            weekly_grouped = {}
            for pred in daily_predictions:
                date_obj = pd.to_datetime(pred['date'])
                # Calculate Sunday of the week (weekday: Monday=0, Sunday=6)
                # We want to find the previous Sunday (or current date if it's Sunday)
                # Formula: (weekday + 1) % 7 gives days since Sunday
                days_since_sunday = (date_obj.weekday() + 1) % 7
                week_start = date_obj - timedelta(days=days_since_sunday)
                
                # If week_start is before next_month_start, use first_week_start instead
                if week_start < next_month_start:
                    week_start = first_week_start
                
                week_key = week_start.strftime('%Y-%m-%d')
                
                if week_key not in weekly_grouped:
                    weekly_grouped[week_key] = {
                        'date': week_key,  # Use 'date' for compatibility
                        'week_start': week_key,
                        'days': [],
                        'total_predicted': 0,
                        'predicted_count': 0,  # Add for frontend compatibility
                        'predicted': 0,  # Add for frontend compatibility
                        'lower_bound': 0,
                        'upper_bound': 0
                    }
                
                weekly_grouped[week_key]['days'].append(pred)
                weekly_grouped[week_key]['total_predicted'] += pred['predicted_count']
                weekly_grouped[week_key]['predicted_count'] += pred['predicted_count']  # Same value
                weekly_grouped[week_key]['predicted'] += pred['predicted_count']  # Same value
                weekly_grouped[week_key]['lower_bound'] += pred['lower_bound']
                weekly_grouped[week_key]['upper_bound'] += pred['upper_bound']
            
            # Convert to list and ensure all fields are present
            weekly_predictions = []
            for week_data in weekly_grouped.values():
                weekly_predictions.append({
                    'date': week_data['date'],
                    'week_start': week_data['week_start'],
                    'predicted_count': int(week_data['predicted_count']),
                    'predicted': int(week_data['predicted']),  # Alias for compatibility
                    'total_predicted': int(week_data['total_predicted']),  # Keep for backward compatibility
                    'lower_bound': int(week_data['lower_bound']),
                    'upper_bound': int(week_data['upper_bound']),
                    'week': pd.to_datetime(week_data['date']).isocalendar()[1]  # Add week number
                })
            
            # Aggregate to monthly total
            monthly_total = int(round(max(0, forecast.sum())))
            monthly_lower = int(round(max(0, forecast_ci_lower.sum())))
            monthly_upper = int(round(max(0, forecast_ci_upper.sum())))
            
            result = {
                'daily_predictions': daily_predictions,
                'weekly_predictions': weekly_predictions,
                'monthly_aggregation': {
                    'total_predicted': monthly_total,
                    'lower_bound': monthly_lower,
                    'upper_bound': monthly_upper
                },
                'prediction_dates': [p['date'] for p in daily_predictions],
                'prediction_days': days,
                'last_data_date': str(actual_last_date),  # Actual last registration date
                'prediction_start_date': daily_predictions[0]['date'],
                'forecast': forecast.tolist() if hasattr(forecast, 'tolist') else list(forecast),
                'forecast_ci_lower': forecast_ci_lower.tolist() if hasattr(forecast_ci_lower, 'tolist') else list(forecast_ci_lower),
                'forecast_ci_upper': forecast_ci_upper.tolist() if hasattr(forecast_ci_upper, 'tolist') else list(forecast_ci_upper)
            }
            
            logger.info(f"Predictions generated successfully")
            logger.info(f"  Total predicted: {monthly_total} registrations")
            logger.info(f"  Confidence interval: [{monthly_lower}, {monthly_upper}]")
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating predictions: {str(e)}")
            raise
    
    def save_model(self):
        """Save the trained model to disk"""
        try:
            os.makedirs(self.model_dir, exist_ok=True)
            
            # Save fitted model
            with open(self.model_file, 'wb') as f:
                pickle.dump(self.fitted_model, f)
            
            # Save scaler if normalization was used
            scaler_file = None
            if self.use_normalization and self.scaler is not None:
                scaler_filename = self.model_file.replace('.pkl', '_scaler.pkl')
                with open(scaler_filename, 'wb') as f:
                    pickle.dump(self.scaler, f)
                scaler_file = scaler_filename
            
            # Save metadata
            # CRITICAL: Store ACTUAL last registration date, not just last date in daily data
            actual_last_date = None
            if hasattr(self, 'actual_last_date') and self.actual_last_date is not None:
                actual_last_date = str(self.actual_last_date)
            elif self.all_data is not None and len(self.all_data) > 0:
                # Fallback to last date in daily data if actual_last_date not available
                actual_last_date = str(self.all_data.index.max())
            elif self.test_data is not None and len(self.test_data) > 0:
                actual_last_date = str(max(
                    self.training_data.index.max() if self.training_data is not None else pd.Timestamp.min,
                    self.test_data.index.max()
                ))
            elif self.training_data is not None:
                actual_last_date = str(self.training_data.index.max())
            
            # Also store last_data_date for backward compatibility
            last_data_date = None
            if self.all_data is not None and len(self.all_data) > 0:
                last_data_date = str(self.all_data.index.max())
            
            # Calculate model accuracy percentages for metadata
            training_accuracy = None
            test_accuracy = None
            cv_accuracy = None
            if self.accuracy_metrics and self.accuracy_metrics.get('r2') is not None:
                training_accuracy = self.calculate_model_accuracy(self.accuracy_metrics['r2'])
            if self.test_accuracy_metrics and self.test_accuracy_metrics.get('r2') is not None:
                test_accuracy = self.calculate_model_accuracy(self.test_accuracy_metrics['r2'])
            if self.cv_results and self.cv_results.get('mean_accuracy') is not None:
                cv_accuracy = self.cv_results['mean_accuracy']
            
            metadata = {
                'model_params': self.model_params,
                'accuracy_metrics': self.accuracy_metrics,
                'test_accuracy_metrics': self.test_accuracy_metrics,
                'model_accuracy': {
                    'cv_accuracy': float(cv_accuracy) if cv_accuracy is not None else None,  # Primary metric
                    'training_accuracy': float(training_accuracy) if training_accuracy is not None else None,
                    'test_accuracy': float(test_accuracy) if test_accuracy is not None else None
                },
                'diagnostics': self.diagnostics,
                'cv_results': self.cv_results,
                'last_trained': datetime.now().isoformat(),
                'training_days': len(self.training_data) if self.training_data is not None else None,
                'date_range': {
                    'start': str(self.training_data.index.min()) if self.training_data is not None else None,
                    'end': str(self.training_data.index.max()) if self.training_data is not None else None
                },
                'actual_last_date': actual_last_date,  # ACTUAL last registration date (CRITICAL for correct predictions)
                'last_data_date': last_data_date,  # Last date from daily data (for backward compatibility)
                'normalization': {
                    'enabled': self.use_normalization,
                    'scaler_type': self.scaler_type if self.use_normalization else None,
                    'scaler_file': scaler_file
                }
            }
            
            with open(self.metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2, default=str)
            
            logger.info(f"Model saved to {self.model_file}")
            
        except Exception as e:
            logger.error(f"Error saving model: {str(e)}")
            raise
    
    def load_model(self):
        """Load a previously trained model from disk"""
        try:
            # Load fitted model
            with open(self.model_file, 'rb') as f:
                self.fitted_model = pickle.load(f)
            
            # Load metadata
            with open(self.metadata_file, 'r') as f:
                metadata = json.load(f)
            
            self.model_params = metadata['model_params']
            self.accuracy_metrics = metadata.get('accuracy_metrics')
            self.test_accuracy_metrics = metadata.get('test_accuracy_metrics')
            self.diagnostics = metadata.get('diagnostics')
            self.cv_results = metadata.get('cv_results')
            self._metadata = metadata
            
            # Restore actual_last_date if available
            if 'actual_last_date' in metadata and metadata['actual_last_date']:
                self.actual_last_date = pd.to_datetime(metadata['actual_last_date'])
            
            # Load scaler if normalization was used
            if metadata.get('normalization', {}).get('enabled'):
                scaler_file = metadata['normalization'].get('scaler_file')
                if scaler_file and os.path.exists(scaler_file):
                    with open(scaler_file, 'rb') as f:
                        self.scaler = pickle.load(f)
                    self.use_normalization = True
                    self.scaler_type = metadata['normalization'].get('scaler_type', 'minmax')
            
            logger.info(f"Model loaded from {self.model_file}")
            logger.info(f"Model parameters: {self.model_params}")
            if 'actual_last_date' in metadata:
                logger.info(f"Actual last registration date from metadata: {metadata['actual_last_date']}")
            elif 'last_data_date' in metadata:
                logger.info(f"Last data date from metadata (daily data): {metadata['last_data_date']}")
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise
    
    def calculate_model_accuracy(self, r2_value):
        """
        Calculate model accuracy as a percentage (0-100%)
        Based on R² (coefficient of determination)
        
        Args:
            r2_value: R² value (can be None, negative, or 0-1)
            
        Returns:
            float: Model accuracy as percentage (0-100)
        """
        if r2_value is None:
            return 0.0
        # R² ranges from -∞ to 1.0
        # Convert to 0-100% scale: max(0, R²) * 100
        return max(0.0, float(r2_value)) * 100.0
    
    def print_model_summary(self):
        """Print comprehensive model summary"""
        logger.info("=" * 60)
        logger.info("MODEL SUMMARY")
        logger.info("=" * 60)
        
        if self.model_params:
            logger.info(f"Parameters: SARIMA{self.model_params['order']} x SARIMA{self.model_params['seasonal_order']}")
        
        if self.fitted_model:
            logger.info(f"AIC: {self.fitted_model.aic:.2f}")
            logger.info(f"BIC: {self.fitted_model.bic:.2f}")
        
        # Calculate and display Model Accuracy (prioritize CV accuracy)
        logger.info(f"\nMODEL ACCURACY")
        logger.info(f"-" * 60)
        
        # Prioritize cross-validation accuracy (most reliable)
        cv_accuracy = None
        if self.cv_results and self.cv_results.get('mean_accuracy') is not None:
            cv_accuracy = self.cv_results['mean_accuracy']
            cv_std = self.cv_results.get('std_accuracy', 0)
            logger.info(f"  Cross-Validation Accuracy: {cv_accuracy:.2f}% ± {cv_std:.2f}% ⭐ (RECOMMENDED)")
        
        training_accuracy = None
        if self.accuracy_metrics and self.accuracy_metrics.get('r2') is not None:
            training_accuracy = self.calculate_model_accuracy(self.accuracy_metrics['r2'])
            logger.info(f"  Training Accuracy: {training_accuracy:.2f}%")
        
        test_accuracy = None
        if self.test_accuracy_metrics and self.test_accuracy_metrics.get('r2') is not None:
            test_accuracy = self.calculate_model_accuracy(self.test_accuracy_metrics['r2'])
            logger.info(f"  Test Accuracy: {test_accuracy:.2f}%")
        
        if cv_accuracy is None and training_accuracy is None and test_accuracy is None:
            logger.info(f"  Accuracy: Not available (R² not calculated)")
        
        # Display primary accuracy recommendation
        if cv_accuracy is not None:
            logger.info(f"\n  💡 Primary Metric: Cross-Validation Accuracy ({cv_accuracy:.2f}%)")
            logger.info(f"     This is the most reliable indicator of model performance.")
        
        if self.accuracy_metrics:
            logger.info(f"\nIn-Sample Performance:")
            logger.info(f"  MAE: {self.accuracy_metrics['mae']:.2f}")
            logger.info(f"  RMSE: {self.accuracy_metrics['rmse']:.2f}")
            logger.info(f"  MAPE: {self.accuracy_metrics['mape']:.2f}%")
            logger.info(f"  R²: {self.accuracy_metrics['r2']:.4f}")
        
        if self.test_accuracy_metrics:
            logger.info(f"\nOut-of-Sample Performance:")
            logger.info(f"  MAE: {self.test_accuracy_metrics['mae']:.2f}")
            logger.info(f"  RMSE: {self.test_accuracy_metrics['rmse']:.2f}")
            logger.info(f"  MAPE: {self.test_accuracy_metrics['mape']:.2f}%")
            logger.info(f"  R²: {self.test_accuracy_metrics['r2']:.4f}")
        
        if self.cv_results:
            logger.info(f"\nCross-Validation Details:")
            if self.cv_results.get('mean_accuracy') is not None:
                logger.info(f"  Mean Accuracy: {self.cv_results['mean_accuracy']:.2f}% ± {self.cv_results.get('std_accuracy', 0):.2f}%")
            if self.cv_results.get('mean_r2') is not None:
                logger.info(f"  Mean R²: {self.cv_results['mean_r2']:.4f} ± {self.cv_results.get('std_r2', 0):.4f}")
            if self.cv_results.get('mean_mape') is not None:
                logger.info(f"  Mean MAPE: {self.cv_results['mean_mape']:.2f}% ± {self.cv_results.get('std_mape', 0):.2f}%")
            if self.cv_results.get('mean_mae') is not None:
                logger.info(f"  Mean MAE: {self.cv_results['mean_mae']:.2f}")
            if self.cv_results.get('mean_rmse') is not None:
                logger.info(f"  Mean RMSE: {self.cv_results['mean_rmse']:.2f}")
        
        logger.info("=" * 60)

