"""
SARIMA Model for Vehicle Registration Prediction
Implements Seasonal ARIMA model for time series forecasting
"""

import pandas as pd
import numpy as np
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.stats.diagnostic import acorr_ljungbox
from statsmodels.tsa.stattools import adfuller
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
        self.accuracy_metrics = None
        
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
    
    def train(self, data, force=False):
        """
        Train the SARIMA model
        
        Args:
            data: Processed time series data (DataFrame with 'count' column)
            force: Force retraining even if model exists
            
        Returns:
            Dictionary with training information
        """
        if self.model_exists() and not force:
            print("Model already exists. Use force=True to retrain.")
            return None
        
        print("Training SARIMA model...")
        
        # Store training data
        self.training_data = data.copy()
        
        # Extract series
        series = data['count']
        
        print(f"Training on {len(series)} weeks of data")
        print(f"Date range: {series.index.min()} to {series.index.max()}")
        
        # Find optimal parameters
        p, d, q, P, D, Q, s = self.find_optimal_parameters(series)
        self.model_params = {
            'order': (p, d, q),
            'seasonal_order': (P, D, Q, s),
            'full_params': (p, d, q, P, D, Q, s)
        }
        
        # Create and fit model
        print(f"Fitting SARIMA model with parameters: order={self.model_params['order']}, seasonal={self.model_params['seasonal_order']}")
        
        self.model = SARIMAX(
            series,
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
        
        # Calculate accuracy metrics on training data
        self._calculate_accuracy_metrics(series)
        
        # Save model
        self.save_model()
        
        training_info = {
            'model_params': self.model_params,
            'training_weeks': len(series),
            'date_range': {
                'start': str(series.index.min()),
                'end': str(series.index.max())
            },
            'accuracy_metrics': self.accuracy_metrics,
            'aic': float(self.fitted_model.aic),
            'bic': float(self.fitted_model.bic)
        }
        
        return training_info
    
    def _calculate_accuracy_metrics(self, actual_series):
        """Calculate accuracy metrics using in-sample predictions"""
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
            
            self.accuracy_metrics = {
                'mae': float(mae),
                'rmse': float(rmse),
                'mape': float(mape) if not np.isnan(mape) else None,
                'mean_actual': float(actual_series.mean()),
                'std_actual': float(actual_series.std())
            }
            
            print(f"Model Accuracy - MAE: {mae:.2f}, RMSE: {rmse:.2f}, MAPE: {mape:.2f}%")
            
        except Exception as e:
            print(f"Error calculating accuracy metrics: {str(e)}")
            self.accuracy_metrics = None
    
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
        last_date = self.training_data.index.max()
        forecast_dates = pd.date_range(
            start=last_date + timedelta(weeks=1),
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
            'last_training_date': str(last_date),
            'prediction_start_date': weekly_predictions[0]['date']
        }
        
        return result
    
    def get_accuracy_metrics(self):
        """Get model accuracy metrics"""
        if self.accuracy_metrics is None:
            return None
        
        return {
            **self.accuracy_metrics,
            'model_parameters': self.model_params,
            'last_trained': str(self.training_data.index.max()) if self.training_data is not None else None
        }
    
    def save_model(self):
        """Save the trained model to disk"""
        try:
            os.makedirs(self.model_dir, exist_ok=True)
            
            # Save fitted model
            with open(self.model_file, 'wb') as f:
                pickle.dump(self.fitted_model, f)
            
            # Save metadata
            metadata = {
                'model_params': self.model_params,
                'accuracy_metrics': self.accuracy_metrics,
                'last_trained': datetime.now().isoformat(),
                'training_weeks': len(self.training_data) if self.training_data is not None else None,
                'date_range': {
                    'start': str(self.training_data.index.min()) if self.training_data is not None else None,
                    'end': str(self.training_data.index.max()) if self.training_data is not None else None
                }
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
            
            print(f"Model loaded from {self.model_file}")
            print(f"Model parameters: {self.model_params}")
            
            # Reconstruct training data info (we don't have the full data, just metadata)
            if metadata.get('date_range'):
                date_range = metadata['date_range']
                # Create a dummy series for prediction purposes
                # In a real scenario, you'd want to reload the actual data
                print("Note: Training data not fully reloaded. Retraining may be needed for optimal predictions.")
            
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            raise

