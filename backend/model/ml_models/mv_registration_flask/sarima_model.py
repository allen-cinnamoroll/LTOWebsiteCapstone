"""
SARIMA Model for Vehicle Registration Prediction
Implements Seasonal ARIMA model for time series forecasting
"""

import pandas as pd
import numpy as np
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.stats.diagnostic import acorr_ljungbox
from statsmodels.tsa.stattools import adfuller, acf, pacf
from scipy import stats
import pickle
import os
from datetime import datetime, timedelta
import json

class SARIMAModel:
    def __init__(self, model_dir, municipality=None):
        """
        Initialize SARIMA model
        
        Args:
            model_dir: Directory to save/load model files
            municipality: Municipality name (None for aggregated model)
        """
        self.model_dir = model_dir
        self.municipality = municipality
        self.model = None
        self.fitted_model = None
        self.model_params = None
        self.training_data = None
        self.test_data = None
        self.all_data = None  # Store entire dataset (training + test) for prediction start date
        self._metadata = None  # Store metadata when loading model
        self.accuracy_metrics = None
        self.test_accuracy_metrics = None
        self.diagnostics = None
        
        # Model file paths (include municipality in filename if specified)
        if municipality:
            safe_name = municipality.upper().replace(' ', '_').replace('/', '_')
            model_filename = f'sarima_model_{safe_name}.pkl'
            metadata_filename = f'sarima_metadata_{safe_name}.json'
        else:
            model_filename = 'sarima_model.pkl'
            metadata_filename = 'sarima_metadata.json'
        
        self.model_file = os.path.join(model_dir, model_filename)
        self.metadata_file = os.path.join(model_dir, metadata_filename)
    
    def model_exists(self):
        """Check if a trained model exists"""
        return os.path.exists(self.model_file) and os.path.exists(self.metadata_file)
    
    def find_optimal_parameters(self, data):
        """
        Find optimal SARIMA parameters using grid search
        
        Args:
            data: Time series data (pandas Series or DataFrame)
            
        Returns:
            Tuple of (p, d, q, P, D, Q, s) parameters
        """
        print("Finding optimal SARIMA parameters...")
        
        # Extract series if DataFrame
        if isinstance(data, pd.DataFrame):
            series = data.iloc[:, 0]
        else:
            series = data
        
        # For small datasets (3 months = ~12 weeks), use simpler parameters
        # This is a conservative approach suitable for limited data
        n_weeks = len(series)
        
        # Check if series is constant (all same values or all zeros)
        series_clean = series.dropna()
        if len(series_clean) == 0 or series_clean.nunique() <= 1:
            print(f"Warning: Series is constant or empty. Using default parameters.")
            return (1, 1, 1, 1, 1, 1, 4)
        
        if n_weeks < 20:
            print(f"Small dataset detected ({n_weeks} weeks). Using conservative parameters.")
            # Conservative parameters for small datasets
            p, d, q = 1, 1, 1  # ARIMA(1,1,1)
            P, D, Q, s = 1, 1, 1, 4  # Seasonal: 4-week cycle
            return (p, d, q, P, D, Q, s)
        
        # Check stationarity - only if we have enough non-zero values
        try:
            non_zero_series = series_clean[series_clean != 0]
            if len(non_zero_series) > 10:  # Need at least 10 non-zero values
                adf_result = adfuller(non_zero_series)
                is_stationary = adf_result[1] < 0.05
            else:
                # Too many zeros, assume non-stationary
                is_stationary = False
        except (ValueError, Exception) as e:
            # If ADF test fails (e.g., constant data), assume non-stationary
            print(f"ADF test failed: {str(e)}. Assuming non-stationary.")
            is_stationary = False
        
        # Determine differencing order
        if is_stationary:
            d = 0
        else:
            d = 1
        
        # Determine seasonal period (weekly data, 4 weeks per month)
        s = 4
        
        # For limited data, use simpler model
        # Try a few parameter combinations
        best_aic = np.inf
        best_params = None
        
        # Limited grid search for small datasets
        param_grid = [
            (1, d, 1, 1, 1, 1, s),  # SARIMA(1,d,1)(1,1,1)4
            (1, d, 0, 1, 1, 1, s),  # SARIMA(1,d,0)(1,1,1)4
            (0, d, 1, 1, 1, 1, s),  # SARIMA(0,d,1)(1,1,1)4
            (1, d, 1, 0, 1, 1, s),  # SARIMA(1,d,1)(0,1,1)4
            (1, d, 1, 1, 0, 1, s),  # SARIMA(1,d,1)(1,0,1)4
        ]
        
        for params in param_grid:
            try:
                p, d, q, P, D, Q, s = params
                temp_model = SARIMAX(
                    series,
                    order=(p, d, q),
                    seasonal_order=(P, D, Q, s),
                    enforce_stationarity=False,
                    enforce_invertibility=False
                )
                temp_fitted = temp_model.fit(disp=False, maxiter=50)
                
                if temp_fitted.aic < best_aic:
                    best_aic = temp_fitted.aic
                    best_params = params
                    
            except Exception as e:
                print(f"Error with parameters {params}: {str(e)}")
                continue
        
        if best_params is None:
            # Fallback to default
            print("Using fallback parameters")
            best_params = (1, 1, 1, 1, 1, 1, 4)
        
        print(f"Optimal parameters: SARIMA{best_params[:3]} x SARIMA{best_params[3:]}")
        return best_params
    
    def train(self, data, force=False, processing_info=None):
        """
        Train the SARIMA model
        
        Args:
            data: Processed time series data (DataFrame with 'count' column)
            force: Force retraining even if model exists
            processing_info: Optional dict with processing information including actual_date_range
            
        Returns:
            Dictionary with training information
        """
        if self.model_exists() and not force:
            print("Model already exists. Use force=True to retrain.")
            return None
        
        print("Training SARIMA model...")
        
        # Extract series
        series = data['count']
        
        # Split data: 80% training, 20% testing (chronological split for time series)
        split_idx = int(len(series) * 0.8)
        train_series = series.iloc[:split_idx]
        test_series = series.iloc[split_idx:]
        
        print(f"Total data: {len(series)} weeks")
        print(f"Training set: {len(train_series)} weeks ({len(train_series)/len(series)*100:.1f}%)")
        print(f"Test set: {len(test_series)} weeks ({len(test_series)/len(series)*100:.1f}%)")
        print(f"Training date range: {train_series.index.min()} to {train_series.index.max()}")
        print(f"Test date range: {test_series.index.min()} to {test_series.index.max()}")
        
        # Store training and test data
        self.training_data = train_series.to_frame('count')
        self.test_data = test_series.to_frame('count')
        # Store entire dataset to determine correct prediction start date
        self.all_data = series.to_frame('count')
        
        # Store actual last registration date from processing_info for correct prediction start
        if processing_info and 'actual_date_range' in processing_info:
            self.actual_last_date = pd.to_datetime(processing_info['actual_date_range']['end'])
        else:
            # Fallback to week_start date if actual_date_range not available
            self.actual_last_date = pd.to_datetime(series.index.max())
        
        # Find optimal parameters using training data only
        p, d, q, P, D, Q, s = self.find_optimal_parameters(train_series)
        self.model_params = {
            'order': (p, d, q),
            'seasonal_order': (P, D, Q, s),
            'full_params': (p, d, q, P, D, Q, s)
        }
        
        # Create and fit model on training data only
        print(f"Fitting SARIMA model with parameters: order={self.model_params['order']}, seasonal={self.model_params['seasonal_order']}")
        
        self.model = SARIMAX(
            train_series,
            order=(p, d, q),
            seasonal_order=(P, D, Q, s),
            enforce_stationarity=False,
            enforce_invertibility=False
        )
        
        try:
            self.fitted_model = self.model.fit(disp=False, maxiter=100)
            print("Model fitting completed!")
        except Exception as e:
            print(f"Error fitting model: {str(e)}")
            raise
        
        # Calculate accuracy metrics on training data (in-sample)
        self._calculate_accuracy_metrics(train_series, is_training=True)
        
        # Calculate accuracy metrics on test data (out-of-sample)
        if len(test_series) > 0:
            self._calculate_test_accuracy(test_series)
        else:
            print("Warning: Test set is empty, skipping test metrics")
            self.test_accuracy_metrics = None
        
        # Calculate diagnostic metrics on training residuals
        self._calculate_diagnostics(train_series)
        
        # Save model
        self.save_model()
        
        # Use actual registration dates if available, otherwise fall back to week_start dates
        # The key fix: use actual min registration date instead of week_start Monday
        if processing_info and 'actual_date_range' in processing_info:
            actual_date_range = processing_info['actual_date_range']
            # Use actual earliest registration date for training start (fixes the Dec 30 issue)
            training_start = actual_date_range['start']
            # For end dates, use week_start dates as they're reasonable approximations
            # since we're splitting by weeks anyway
            training_end = str(train_series.index.max())
            
            if len(test_series) > 0:
                test_start = str(test_series.index.min())
                test_end = str(test_series.index.max())
            else:
                test_start = None
                test_end = None
        else:
            # Fall back to week_start dates
            training_start = str(train_series.index.min())
            training_end = str(train_series.index.max())
            test_start = str(test_series.index.min()) if len(test_series) > 0 else None
            test_end = str(test_series.index.max()) if len(test_series) > 0 else None
        
        training_info = {
            'model_params': self.model_params,
            'training_weeks': len(train_series),
            'test_weeks': len(test_series),
            'total_weeks': len(series),
            'date_range': {
                'start': training_start,
                'end': training_end
            },
            'test_date_range': {
                'start': test_start,
                'end': test_end
            } if test_start else None,
            'accuracy_metrics': self.accuracy_metrics,  # Training (in-sample) metrics
            'test_accuracy_metrics': self.test_accuracy_metrics,  # Test (out-of-sample) metrics
            'diagnostics': self.diagnostics,
            'aic': float(self.fitted_model.aic),
            'bic': float(self.fitted_model.bic)
        }
        
        return training_info
    
    def _calculate_accuracy_metrics(self, actual_series, is_training=True):
        """Calculate accuracy metrics using in-sample predictions (training data)"""
        try:
            # Get fitted values (in-sample predictions)
            fitted_values = self.fitted_model.fittedvalues
            
            # Calculate metrics
            mae = np.mean(np.abs(actual_series - fitted_values))
            mse = np.mean((actual_series - fitted_values) ** 2)
            rmse = np.sqrt(mse)
            
            # MAPE (avoid division by zero)
            non_zero_mask = actual_series != 0
            if non_zero_mask.sum() > 0:
                mape = np.mean(np.abs((actual_series[non_zero_mask] - fitted_values[non_zero_mask]) / actual_series[non_zero_mask])) * 100
            else:
                mape = np.nan
            
            metrics = {
                'mae': float(mae),
                'rmse': float(rmse),
                'mape': float(mape) if not np.isnan(mape) else None,
                'mean_actual': float(actual_series.mean()),
                'std_actual': float(actual_series.std())
            }
            
            if is_training:
                self.accuracy_metrics = metrics
                print(f"Training Accuracy (In-Sample) - MAE: {mae:.2f}, RMSE: {rmse:.2f}, MAPE: {mape:.2f}%")
            else:
                self.test_accuracy_metrics = metrics
                print(f"Test Accuracy (Out-of-Sample) - MAE: {mae:.2f}, RMSE: {rmse:.2f}, MAPE: {mape:.2f}%")
            
        except Exception as e:
            print(f"Error calculating accuracy metrics: {str(e)}")
            if is_training:
                self.accuracy_metrics = None
            else:
                self.test_accuracy_metrics = None
    
    def _calculate_test_accuracy(self, test_series):
        """Calculate accuracy metrics on test data (out-of-sample predictions)"""
        try:
            # Generate forecasts for the test period
            # Use the last training date as the forecast start point
            forecast_steps = len(test_series)
            forecast = self.fitted_model.forecast(steps=forecast_steps)
            
            # Convert forecast to numpy array if it's not already
            if hasattr(forecast, 'values'):
                forecast = forecast.values
            forecast = np.array(forecast).flatten()
            
            # Ensure forecast and test_series have same length
            if len(forecast) != len(test_series):
                min_len = min(len(forecast), len(test_series))
                forecast = forecast[:min_len]
                test_series = test_series.iloc[:min_len]
            
            # Calculate metrics
            test_values = test_series.values.flatten()
            mae = np.mean(np.abs(test_values - forecast))
            mse = np.mean((test_values - forecast) ** 2)
            rmse = np.sqrt(mse)
            
            # MAPE (avoid division by zero)
            non_zero_mask = test_values != 0
            if non_zero_mask.sum() > 0:
                test_non_zero = test_values[non_zero_mask]
                forecast_non_zero = forecast[non_zero_mask]
                mape = np.mean(np.abs((test_non_zero - forecast_non_zero) / test_non_zero)) * 100
            else:
                mape = np.nan
            
            self.test_accuracy_metrics = {
                'mae': float(mae),
                'rmse': float(rmse),
                'mape': float(mape) if not np.isnan(mape) else None,
                'mean_actual': float(test_series.mean()),
                'std_actual': float(test_series.std())
            }
            
            print(f"\n=== Test Set Performance (Out-of-Sample) ===")
            print(f"MAE: {mae:.2f}, RMSE: {rmse:.2f}, MAPE: {mape:.2f}%")
            print("=============================================\n")
            
        except Exception as e:
            print(f"Error calculating test accuracy: {str(e)}")
            import traceback
            traceback.print_exc()
            self.test_accuracy_metrics = None
    
    def _calculate_diagnostics(self, actual_series):
        """Calculate diagnostic metrics: residuals randomness, ACF/PACF"""
        try:
            # Get residuals
            residuals = self.fitted_model.resid
            
            # Remove NaN values
            residuals_clean = residuals.dropna()
            
            if len(residuals_clean) < 2:
                self.diagnostics = {
                    'residuals_random': None,
                    'ljung_box_pvalue': None,
                    'ljung_box_statistic': None,
                    'residuals_mean': None,
                    'residuals_std': None,
                    'acf_values': None,
                    'pacf_values': None,
                    'message': 'Insufficient data for diagnostics'
                }
                return
            
            # 1. Ljung-Box test for residual randomness
            # Test if residuals are random (white noise)
            # Null hypothesis: residuals are random (no autocorrelation)
            # p-value > 0.05 means residuals are random (good!)
            try:
                ljung_box = acorr_ljungbox(residuals_clean, lags=min(10, len(residuals_clean)//2), return_df=True)
                # Use the p-value from the last lag
                ljung_box_pvalue = float(ljung_box['lb_pvalue'].iloc[-1])
                ljung_box_statistic = float(ljung_box['lb_stat'].iloc[-1])
                residuals_random = ljung_box_pvalue > 0.05
            except Exception as e:
                print(f"Error in Ljung-Box test: {str(e)}")
                ljung_box_pvalue = None
                ljung_box_statistic = None
                residuals_random = None
            
            # 2. Residual statistics
            residuals_mean = float(residuals_clean.mean())
            residuals_std = float(residuals_clean.std())
            
            # 3. ACF and PACF values for residuals
            # Calculate up to 10 lags or half the data length, whichever is smaller
            max_lags = min(10, len(residuals_clean) // 2)
            if max_lags > 0:
                try:
                    acf_values, acf_confint = acf(residuals_clean, nlags=max_lags, alpha=0.05, fft=True)
                    pacf_values, pacf_confint = pacf(residuals_clean, nlags=max_lags, alpha=0.05)
                    
                    # Convert to lists (excluding lag 0 which is always 1.0)
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
                    print(f"Error calculating ACF/PACF: {str(e)}")
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
            
            # Print diagnostic results
            print(f"\n=== Model Diagnostics ===")
            print(f"Residuals Random: {residuals_random} (p-value: {ljung_box_pvalue:.4f})")
            print(f"Residuals Mean: {residuals_mean:.4f}, Std: {residuals_std:.4f}")
            if residuals_random:
                print("✓ Residuals appear random - model fits well!")
            else:
                print("⚠ Residuals show patterns - model may need improvement")
            print("=======================\n")
            
        except Exception as e:
            print(f"Error calculating diagnostics: {str(e)}")
            import traceback
            traceback.print_exc()
            self.diagnostics = None
    
    def predict(self, weeks=4, municipality=None):
        """
        Generate predictions for the specified number of weeks
        
        Args:
            weeks: Number of weeks to predict (default: 4)
            municipality: Specific municipality (for per-municipality mode, should match model's municipality)
            
        Returns:
            Dictionary with predictions
        """
        if self.fitted_model is None:
            raise ValueError("Model not trained. Please train the model first.")
        
        print(f"Generating predictions for {weeks} weeks...")
        
        # Generate forecasts
        forecast = self.fitted_model.forecast(steps=weeks)
        forecast_ci = self.fitted_model.get_forecast(steps=weeks).conf_int()
        
        # Generate dates for predictions
        # CRITICAL: Use the ACTUAL last registration date, not the week_start date
        # This ensures predictions start from the correct future period
        actual_last_date = None
        
        # Priority 1: Use actual_last_date if available (from freshly trained model)
        if hasattr(self, 'actual_last_date') and self.actual_last_date is not None:
            actual_last_date = pd.to_datetime(self.actual_last_date)
            print(f"Using actual last registration date: {actual_last_date}")
        # Priority 2: Check if we have metadata with actual_last_date (from loaded model)
        elif hasattr(self, '_metadata') and self._metadata and 'actual_last_date' in self._metadata:
            actual_last_date_str = self._metadata['actual_last_date']
            if actual_last_date_str:
                actual_last_date = pd.to_datetime(actual_last_date_str)
                print(f"Using actual last registration date from metadata: {actual_last_date}")
        # Priority 3: Fallback to week_start date from all_data (backward compatibility)
        elif self.all_data is not None and len(self.all_data) > 0:
            actual_last_date = pd.to_datetime(self.all_data.index.max())
            print(f"Warning: Using week_start date as fallback (may be incorrect): {actual_last_date}")
        # Priority 4: Try to reconstruct from test_data if available
        elif self.test_data is not None and len(self.test_data) > 0 and self.training_data is not None:
            actual_last_date = pd.to_datetime(max(
                self.training_data.index.max(),
                self.test_data.index.max()
            ))
            print(f"Warning: Using week_start date as fallback (may be incorrect): {actual_last_date}")
        # Priority 5: Try training_data only if available
        elif self.training_data is not None and len(self.training_data) > 0:
            actual_last_date = pd.to_datetime(self.training_data.index.max())
            print(f"Warning: Using week_start date as fallback (may be incorrect): {actual_last_date}")
        # Priority 6: Try test_data only if available
        elif self.test_data is not None and len(self.test_data) > 0:
            actual_last_date = pd.to_datetime(self.test_data.index.max())
            print(f"Warning: Using week_start date as fallback (may be incorrect): {actual_last_date}")
        # Priority 7: Last resort - try to get from metadata's last_data_date (week_start)
        elif hasattr(self, '_metadata') and self._metadata and 'last_data_date' in self._metadata:
            actual_last_date = pd.to_datetime(self._metadata['last_data_date'])
            print(f"Warning: Using week_start date from metadata as last resort (may be incorrect): {actual_last_date}")
        
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
        
        # Find the Sunday that is on or after the first day of next month
        # This ensures predictions start from the week containing or after August 1
        next_month_start_weekday = next_month_start.weekday()  # Monday=0, Sunday=6
        
        if next_month_start_weekday == 6:
            # If August 1 is already a Sunday, use it
            prediction_week_start = next_month_start
        else:
            # Find the next Sunday after August 1
            # Days until next Sunday = (6 - weekday) % 7, but if 0, add 7
            days_until_next_sunday = (6 - next_month_start_weekday) % 7
            if days_until_next_sunday == 0:
                days_until_next_sunday = 7  # If already Sunday, go to next week
            prediction_week_start = next_month_start + timedelta(days=days_until_next_sunday)
        
        # Ensure prediction week start is after the last registration date
        if prediction_week_start <= actual_last_date:
            # If somehow the calculated Sunday is before/on last date, use next Sunday
            prediction_week_start = actual_last_date + timedelta(weeks=1)
            # Find the Sunday of that week
            days_to_sunday = (6 - prediction_week_start.weekday()) % 7
            if days_to_sunday == 0:
                prediction_week_start = prediction_week_start + timedelta(weeks=1)
            else:
                prediction_week_start = prediction_week_start + timedelta(days=days_to_sunday)
        
        print(f"Actual last registration date: {actual_last_date}")
        print(f"First day of next month: {next_month_start}")
        print(f"Prediction week start (Sunday on/after {next_month_start}): {prediction_week_start}")
        
        # Generate forecast dates starting from the calculated week_start
        forecast_dates = pd.date_range(
            start=prediction_week_start,
            periods=weeks,
            freq='W-SUN'
        )
        
        # Prepare weekly predictions
        weekly_predictions = []
        for i, date in enumerate(forecast_dates):
            weekly_predictions.append({
                'date': date.strftime('%Y-%m-%d'),
                'week': date.isocalendar()[1],
                'predicted_count': int(round(max(0, forecast.iloc[i]))),  # Ensure non-negative
                'lower_bound': int(round(max(0, forecast_ci.iloc[i, 0]))),
                'upper_bound': int(round(max(0, forecast_ci.iloc[i, 1])))
            })
        
        # Aggregate to monthly total
        monthly_total = int(round(max(0, forecast.sum())))
        monthly_lower = int(round(max(0, forecast_ci.iloc[:, 0].sum())))
        monthly_upper = int(round(max(0, forecast_ci.iloc[:, 1].sum())))
        
        result = {
            'weekly_predictions': weekly_predictions,
            'monthly_aggregation': {
                'total_predicted': monthly_total,
                'lower_bound': monthly_lower,
                'upper_bound': monthly_upper
            },
            'prediction_dates': [p['date'] for p in weekly_predictions],
            'prediction_weeks': weeks,
            'last_training_date': str(self.training_data.index.max()) if self.training_data is not None else None,
            'last_data_date': str(actual_last_date),  # Actual last registration date
            'prediction_start_date': weekly_predictions[0]['date']
        }
        
        return result
    
    def get_accuracy_metrics(self):
        """Get model accuracy metrics"""
        if self.accuracy_metrics is None:
            return None
        
        result = {
            **self.accuracy_metrics,
            'model_parameters': self.model_params,
            'last_trained': str(self.training_data.index.max()) if self.training_data is not None else None
        }
        
        # Add date range information if training data is available
        if self.training_data is not None and len(self.training_data) > 0:
            result['date_range'] = {
                'start': str(self.training_data.index.min()),
                'end': str(self.training_data.index.max())
            }
            result['training_weeks'] = len(self.training_data)
        
        # Add test metrics if available
        if self.test_accuracy_metrics is not None:
            result['test_accuracy_metrics'] = self.test_accuracy_metrics
            if self.test_data is not None and len(self.test_data) > 0:
                result['test_date_range'] = {
                    'start': str(self.test_data.index.min()),
                    'end': str(self.test_data.index.max())
                }
                result['test_weeks'] = len(self.test_data)
        
        return result
    
    def save_model(self):
        """Save the trained model to disk"""
        try:
            os.makedirs(self.model_dir, exist_ok=True)
            
            # Save fitted model
            with open(self.model_file, 'wb') as f:
                pickle.dump(self.fitted_model, f)
            
            # Save metadata
            # CRITICAL: Store ACTUAL last registration date, not week_start date
            # This ensures predictions start from the correct future period
            actual_last_date = None
            if hasattr(self, 'actual_last_date') and self.actual_last_date is not None:
                actual_last_date = str(self.actual_last_date)
            elif self.all_data is not None and len(self.all_data) > 0:
                # Fallback to week_start date if actual_last_date not available (backward compatibility)
                actual_last_date = str(self.all_data.index.max())
            elif self.test_data is not None and len(self.test_data) > 0:
                # If all_data not set but test_data exists, use max of training + test
                actual_last_date = str(max(
                    self.training_data.index.max() if self.training_data is not None else pd.Timestamp.min,
                    self.test_data.index.max()
                ))
            elif self.training_data is not None:
                actual_last_date = str(self.training_data.index.max())
            
            # Also store week_start date for backward compatibility
            week_start_last_date = None
            if self.all_data is not None and len(self.all_data) > 0:
                week_start_last_date = str(self.all_data.index.max())
            
            metadata = {
                'model_params': self.model_params,
                'accuracy_metrics': self.accuracy_metrics,
                'last_trained': datetime.now().isoformat(),
                'training_weeks': len(self.training_data) if self.training_data is not None else None,
                'date_range': {
                    'start': str(self.training_data.index.min()) if self.training_data is not None else None,
                    'end': str(self.training_data.index.max()) if self.training_data is not None else None
                },
                'actual_last_date': actual_last_date,  # ACTUAL last registration date (CRITICAL for correct predictions)
                'last_data_date': week_start_last_date  # Week_start date (for backward compatibility)
            }
            
            with open(self.metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            print(f"Model saved to {self.model_file}")
            
        except Exception as e:
            print(f"Error saving model: {str(e)}")
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
            # Store metadata for access in predict() method
            self._metadata = metadata
            
            # Restore actual_last_date if available
            if 'actual_last_date' in metadata and metadata['actual_last_date']:
                self.actual_last_date = pd.to_datetime(metadata['actual_last_date'])
            
            print(f"Model loaded from {self.model_file}")
            print(f"Model parameters: {self.model_params}")
            if 'actual_last_date' in metadata:
                print(f"Actual last registration date from metadata: {metadata['actual_last_date']}")
            elif 'last_data_date' in metadata:
                print(f"Last data date from metadata (week_start): {metadata['last_data_date']}")
            
            # Reconstruct training data info (we don't have the full data, just metadata)
            if metadata.get('date_range'):
                date_range = metadata['date_range']
                # Create a dummy series for prediction purposes
                # In a real scenario, you'd want to reload the actual data
                print("Note: Training data not fully reloaded. Retraining may be needed for optimal predictions.")
            
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            raise

