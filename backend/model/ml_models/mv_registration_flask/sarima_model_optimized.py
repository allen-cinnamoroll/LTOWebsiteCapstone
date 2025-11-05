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
            'accuracy_metrics': self.accuracy_metrics,
            'test_accuracy_metrics': self.test_accuracy_metrics,
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
            
            # Ensure same length
            min_len = min(len(actual_series), len(fitted_values))
            actual_aligned = actual_series.iloc[:min_len]
            fitted_aligned = fitted_values.iloc[:min_len]
            
            # Inverse transform if normalization was used
            if self.use_normalization:
                actual_aligned = self.inverse_normalize(actual_aligned)
                fitted_aligned = self.inverse_normalize(fitted_aligned)
            
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
            r2 = r2_score(actual_aligned, fitted_aligned)
            
            metrics = {
                'mae': float(mae),
                'rmse': float(rmse),
                'mape': float(mape) if not np.isnan(mape) else None,
                'r2': float(r2),
                'mean_actual': float(actual_aligned.mean()),
                'std_actual': float(actual_aligned.std())
            }
            
            if is_training:
                self.accuracy_metrics = metrics
                logger.info(f"In-Sample Performance:")
                logger.info(f"  MAE: {mae:.2f}")
                logger.info(f"  RMSE: {rmse:.2f}")
                logger.info(f"  MAPE: {mape:.2f}%")
                logger.info(f"  R²: {r2:.4f}")
            else:
                self.test_accuracy_metrics = metrics
                logger.info(f"Out-of-Sample Performance:")
                logger.info(f"  MAE: {mae:.2f}")
                logger.info(f"  RMSE: {rmse:.2f}")
                logger.info(f"  MAPE: {mape:.2f}%")
                logger.info(f"  R²: {r2:.4f}")
            
        except Exception as e:
            logger.error(f"Error calculating accuracy metrics: {str(e)}")
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
            
            # Ensure same length
            min_len = min(len(test_series), len(forecast))
            test_aligned = test_series.iloc[:min_len]
            forecast_aligned = forecast.iloc[:min_len]
            
            # Inverse transform if normalization was used
            if self.use_normalization:
                test_aligned = self.inverse_normalize(test_aligned)
                forecast_aligned = self.inverse_normalize(forecast_aligned)
            
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
            r2 = r2_score(test_aligned, forecast_aligned)
            
            self.test_accuracy_metrics = {
                'mae': float(mae),
                'rmse': float(rmse),
                'mape': float(mape) if not np.isnan(mape) else None,
                'r2': float(r2),
                'mean_actual': float(test_aligned.mean()),
                'std_actual': float(test_aligned.std())
            }
            
            logger.info(f"Test Set Performance (Out-of-Sample):")
            logger.info(f"  MAE: {mae:.2f}")
            logger.info(f"  RMSE: {rmse:.2f}")
            logger.info(f"  MAPE: {mape:.2f}%")
            logger.info(f"  R²: {r2:.4f}")
            
        except Exception as e:
            logger.error(f"Error calculating test accuracy: {str(e)}")
            import traceback
            traceback.print_exc()
            self.test_accuracy_metrics = None
    
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
                    
                    # Calculate MAPE
                    non_zero_mask = test_data != 0
                    if non_zero_mask.sum() > 0:
                        mape = np.mean(np.abs((test_data[non_zero_mask] - forecast[non_zero_mask]) 
                                              / test_data[non_zero_mask])) * 100
                    else:
                        mape = np.nan
                    
                    cv_scores.append({
                        'fold': fold + 1,
                        'mape': float(mape) if not np.isnan(mape) else None,
                        'parameters': (p, d, q, P, D, Q, s)
                    })
                    
                    logger.info(f"  Fold {fold + 1} MAPE: {mape:.2f}%")
                    
                except Exception as e:
                    logger.warning(f"  Fold {fold + 1} failed: {str(e)}")
                    continue
            
            if cv_scores:
                avg_mape = np.mean([s['mape'] for s in cv_scores if s['mape'] is not None])
                self.cv_results = {
                    'n_splits': n_splits,
                    'fold_scores': cv_scores,
                    'mean_mape': float(avg_mape),
                    'std_mape': float(np.std([s['mape'] for s in cv_scores if s['mape'] is not None]))
                }
                logger.info(f"\nCross-Validation Results:")
                logger.info(f"  Mean MAPE: {avg_mape:.2f}%")
                logger.info(f"  Std MAPE: {self.cv_results['std_mape']:.2f}%")
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
        
        # Determine last date
        if self.all_data is not None and len(self.all_data) > 0:
            last_date = pd.to_datetime(self.all_data.index.max())
        elif hasattr(self, '_metadata') and self._metadata and 'last_data_date' in self._metadata:
            last_date = pd.to_datetime(self._metadata['last_data_date'])
        else:
            last_date = pd.to_datetime(self.training_data.index.max())
        
        logger.info(f"Last data date: {last_date}")
        logger.info(f"Prediction start date: {last_date + timedelta(days=1)}")
        
        # Generate forecast dates
        forecast_dates = pd.date_range(
            start=last_date + timedelta(days=1),
            periods=days,
            freq='D'
        )
        
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
            weekly_predictions = []
            weekly_grouped = {}
            for pred in daily_predictions:
                date_obj = pd.to_datetime(pred['date'])
                week_start = date_obj - timedelta(days=date_obj.weekday())
                week_key = week_start.strftime('%Y-%m-%d')
                
                if week_key not in weekly_grouped:
                    weekly_grouped[week_key] = {
                        'week_start': week_key,
                        'days': [],
                        'total_predicted': 0,
                        'lower_bound': 0,
                        'upper_bound': 0
                    }
                
                weekly_grouped[week_key]['days'].append(pred)
                weekly_grouped[week_key]['total_predicted'] += pred['predicted_count']
                weekly_grouped[week_key]['lower_bound'] += pred['lower_bound']
                weekly_grouped[week_key]['upper_bound'] += pred['upper_bound']
            
            weekly_predictions = list(weekly_grouped.values())
            
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
                'last_data_date': str(last_date),
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
            last_data_date = None
            if self.all_data is not None and len(self.all_data) > 0:
                last_data_date = str(self.all_data.index.max())
            elif self.test_data is not None and len(self.test_data) > 0:
                last_data_date = str(max(
                    self.training_data.index.max() if self.training_data is not None else pd.Timestamp.min,
                    self.test_data.index.max()
                ))
            elif self.training_data is not None:
                last_data_date = str(self.training_data.index.max())
            
            metadata = {
                'model_params': self.model_params,
                'accuracy_metrics': self.accuracy_metrics,
                'test_accuracy_metrics': self.test_accuracy_metrics,
                'diagnostics': self.diagnostics,
                'cv_results': self.cv_results,
                'last_trained': datetime.now().isoformat(),
                'training_days': len(self.training_data) if self.training_data is not None else None,
                'date_range': {
                    'start': str(self.training_data.index.min()) if self.training_data is not None else None,
                    'end': str(self.training_data.index.max()) if self.training_data is not None else None
                },
                'last_data_date': last_data_date,
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
            if 'last_data_date' in metadata:
                logger.info(f"Last data date: {metadata['last_data_date']}")
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise
    
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
            logger.info(f"\nCross-Validation:")
            logger.info(f"  Mean MAPE: {self.cv_results['mean_mape']:.2f}%")
            logger.info(f"  Std MAPE: {self.cv_results['std_mape']:.2f}%")
        
        logger.info("=" * 60)

