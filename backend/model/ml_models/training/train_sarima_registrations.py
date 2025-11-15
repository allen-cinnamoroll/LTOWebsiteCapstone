"""
SARIMA Training Script for Vehicle Registration Forecasting

This script trains a Seasonal ARIMA (SARIMA) model on historical vehicle
registration data and saves the best-performing model for later use by
Flask-based prediction services.
"""

import itertools
import json
import os
import warnings
from dataclasses import dataclass, asdict
from typing import Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error
from statsmodels.tsa.statespace.sarimax import SARIMAX

warnings.filterwarnings("ignore")

# Minimum data points thresholds
MIN_POINTS_PRIMARY = 20      # for weekly series
MIN_POINTS_FALLBACK = 5      # for monthly series  
MIN_POINTS_SARIMA = 8        # below this, use baseline model

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "../mv registration training/DAVOR_data.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "sarima_registrations.pkl")
METADATA_PATH = os.path.join(MODEL_DIR, "sarima_registrations_metadata.json")


@dataclass
class ModelMetadata:
    model_type: str
    frequency: str
    seasonal_period: int
    order: tuple
    seasonal_order: tuple
    training_samples: int
    test_samples: int
    best_aic: float
    mae: float
    rmse: float
    mape: float
    train_start: str
    train_end: str
    test_start: str
    test_end: str


class NaiveMeanForecast:
    """
    Simple baseline forecasting model that predicts the mean of historical values.
    Used when there's insufficient data for SARIMA training.
    """
    def __init__(self, mean_value: float, freq: str, historical_values: pd.Series = None):
        self.mean_value = float(mean_value)
        self.freq = freq
        self.historical_values = historical_values
        self.model_type = "NaiveMeanForecast"
    
    def forecast(self, steps: int):
        """Return an array of forecasted values (all equal to mean)."""
        return np.full(shape=steps, fill_value=self.mean_value)
    
    def get_forecast(self, steps: int):
        """Mimic SARIMAX interface for compatibility."""
        class ForecastResult:
            def __init__(self, predicted_mean):
                self.predicted_mean = predicted_mean
        
        predictions = pd.Series(
            self.forecast(steps),
            index=pd.date_range(
                start=self.historical_values.index[-1] + pd.DateOffset(1),
                periods=steps,
                freq=self.freq
            ) if self.historical_values is not None else range(steps)
        )
        return ForecastResult(predictions)


def _aggregate_registrations(df: pd.DataFrame, freq: str) -> pd.Series:
    """Aggregate registrations by frequency."""
    ts = df.set_index("date").resample(freq).sum()["count"]
    ts = ts.asfreq(freq).fillna(0)
    ts.name = "registration_count"
    return ts


def load_registration_timeseries(
    primary_freq: str = "W-MON",
    fallback_freq: str = "M",
    min_points_primary: int = None,
) -> Tuple[pd.Series, str]:
    """
    Load registration data from CSV and aggregate to a time series.
    Falls back to a coarser frequency if too few observations are found.
    """
    if min_points_primary is None:
        min_points_primary = MIN_POINTS_PRIMARY
    
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(
            f"Registration dataset not found. Expected at: {DATA_PATH}"
        )

    df = pd.read_csv(DATA_PATH, usecols=["dateOfRenewal"])
    df = df.rename(columns={"dateOfRenewal": "date"})
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"])
    df = df.sort_values("date")
    df["count"] = 1

    ts = _aggregate_registrations(df, primary_freq)

    if len(ts) < min_points_primary and fallback_freq:
        print(
            f"Found only {len(ts)} {primary_freq} points. "
            f"Falling back to {fallback_freq} aggregation..."
        )
        ts = _aggregate_registrations(df, fallback_freq)
        freq_used = fallback_freq
    else:
        freq_used = primary_freq

    # Warn if data is limited, but don't raise exception
    if len(ts) < MIN_POINTS_SARIMA:
        print(
            f"[WARN] Very few data points after aggregation ({len(ts)}). "
            "SARIMA may not be reliable; will consider baseline fallback."
        )
    
    if len(ts) < 1:
        raise ValueError("No data points found after aggregation.")

    return ts, freq_used


def train_test_split(ts: pd.Series, test_ratio: float = 0.2):
    train_size = int(len(ts) * (1 - test_ratio))
    train = ts.iloc[:train_size]
    test = ts.iloc[train_size:]
    return train, test


def sarima_grid_search(
    train_series: pd.Series,
    seasonal_period: int,
    pdq_range=(0, 1, 2),
    seasonal_range=(0, 1),
):
    """
    Perform a simple grid search over SARIMA hyperparameters using AIC.
    """
    best_aic = float("inf")
    best_order = None
    best_seasonal_order = None
    best_model = None

    p = d = q = pdq_range
    P = D = Q = seasonal_range

    for order in itertools.product(p, d, q):
        for seasonal in itertools.product(P, D, Q):
            seasonal_order = (*seasonal, seasonal_period)
            try:
                model = SARIMAX(
                    train_series,
                    order=order,
                    seasonal_order=seasonal_order,
                    enforce_stationarity=False,
                    enforce_invertibility=False,
                )
                result = model.fit(disp=False)

                if result.aic < best_aic:
                    best_aic = result.aic
                    best_order = order
                    best_seasonal_order = seasonal_order
                    best_model = result
                    print(
                        f"New best model found: order={order}, "
                        f"seasonal_order={seasonal_order}, AIC={result.aic:.2f}"
                    )
            except Exception as exc:
                print(
                    f"Failed to fit SARIMA{order}x{seasonal_order}: {exc}"
                )
                continue

    if best_model is None:
        raise RuntimeError("SARIMA grid search failed to produce a valid model.")

    return {
        "model": best_model,
        "order": best_order,
        "seasonal_order": best_seasonal_order,
        "aic": best_aic,
    }


def evaluate_model(model_result, test_series: pd.Series):
    """
    Evaluate the SARIMA model on the test set.
    """
    if len(test_series) == 0:
        return {"mae": 0.0, "rmse": 0.0, "mape": 0.0}

    forecast = model_result.get_forecast(steps=len(test_series))
    predictions = forecast.predicted_mean
    predictions.index = test_series.index

    mae = mean_absolute_error(test_series, predictions)
    # Calculate RMSE manually for compatibility with all scikit-learn versions
    mse = mean_squared_error(test_series, predictions)
    rmse = np.sqrt(mse)
    with np.errstate(divide="ignore", invalid="ignore"):
        mape = np.mean(
            np.abs((test_series - predictions) / np.maximum(test_series, 1))
        ) * 100

    print(
        f"Evaluation Metrics -> MAE: {mae:.2f}, RMSE: {rmse:.2f}, "
        f"MAPE: {mape:.2f}%"
    )

    return {"mae": mae, "rmse": rmse, "mape": mape}


def refit_full_model(ts: pd.Series, order, seasonal_order):
    """
    Refit SARIMA on the complete dataset using the best parameters.
    """
    model = SARIMAX(
        ts,
        order=order,
        seasonal_order=seasonal_order,
        enforce_stationarity=False,
        enforce_invertibility=False,
    )
    return model.fit(disp=False)


def save_model(model_result, metadata):
    """Save model and metadata. Accepts either ModelMetadata dataclass or dict."""
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model_result, MODEL_PATH)
    
    # Convert metadata to dict if it's a dataclass
    if isinstance(metadata, ModelMetadata):
        metadata_dict = asdict(metadata)
    else:
        metadata_dict = metadata
    
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata_dict, f, indent=2, default=str)
    print(
        f"Model saved to {MODEL_PATH}\nMetadata saved to {METADATA_PATH}"
    )


def train_baseline_model(ts: pd.Series, freq: str):
    """
    Train a simple baseline model when insufficient data for SARIMA.
    """
    mean_value = ts.mean()
    print(f"Training NaiveMeanForecast baseline model (mean={mean_value:.2f})...")
    model = NaiveMeanForecast(mean_value=mean_value, freq=freq, historical_values=ts)
    
    # Create metadata dict for baseline model
    metadata = {
        "model_type": "NaiveMeanForecast",
        "frequency": ts.index.freqstr or freq,
        "seasonal_period": 0,
        "order": (0, 0, 0),
        "seasonal_order": (0, 0, 0, 0),
        "training_samples": len(ts),
        "test_samples": 0,
        "best_aic": 0.0,
        "mae": 0.0,
        "rmse": 0.0,
        "mape": 0.0,
        "mean_value": float(mean_value),
        "train_start": str(ts.index[0]),
        "train_end": str(ts.index[-1]),
        "test_start": "N/A",
        "test_end": "N/A",
        "note": "Baseline model used due to insufficient data for SARIMA"
    }
    
    return model, metadata


def main():
    print("Loading registration time series data...")
    ts, freq_used = load_registration_timeseries(
        primary_freq="W-MON",
        fallback_freq="M",
        min_points_primary=MIN_POINTS_PRIMARY,
    )
    
    # Check if we have enough data for SARIMA
    if len(ts) < MIN_POINTS_SARIMA:
        print(
            f"[WARN] Only {len(ts)} points available. "
            "Skipping SARIMA training and using a naive baseline model instead."
        )
        model, metadata = train_baseline_model(ts, freq_used)
        save_model(model, metadata)
        
        # Print summary for baseline model
        print("\n" + "=" * 60)
        print("Training completed successfully!")
        print(f"Model type: NaiveMeanForecast (baseline)")
        print(f"Mean value: {metadata['mean_value']:.2f}")
        print(f"Training samples: {metadata['training_samples']}")
        print("=" * 60)
        return
    
    train, test = train_test_split(ts, test_ratio=0.2)
    if freq_used.startswith("W"):
        base_period = 52
    elif freq_used.startswith("M"):
        base_period = 12
    elif freq_used.startswith("D"):
        base_period = 7
    else:
        base_period = max(2, len(ts) // 4 or 2)

    seasonal_period = max(2, min(base_period, max(2, len(train) // 2)))
    seasonal_candidates = (0,) if seasonal_period <= 2 else (0, 1)

    print(
        f"Training samples: {len(train)}, Test samples: {len(test)}, "
        f"Frequency: {ts.index.freqstr} (requested {freq_used}), "
        f"seasonal_period={seasonal_period}"
    )

    print("Starting SARIMA grid search...")
    search_results = sarima_grid_search(
        train_series=train,
        seasonal_period=seasonal_period,
        pdq_range=(0, 1, 2),
        seasonal_range=seasonal_candidates,
    )

    evaluation = evaluate_model(search_results["model"], test)

    print("Refitting best model on the full dataset...")
    final_model = refit_full_model(
        ts, search_results["order"], search_results["seasonal_order"]
    )

    metadata = ModelMetadata(
        model_type="SARIMAX",
        frequency=ts.index.freqstr,
        seasonal_period=seasonal_period,
        order=search_results["order"],
        seasonal_order=search_results["seasonal_order"],
        training_samples=len(train),
        test_samples=len(test),
        best_aic=search_results["aic"],
        mae=float(evaluation["mae"]),
        rmse=float(evaluation["rmse"]),
        mape=float(evaluation["mape"]),
        train_start=str(train.index[0]),
        train_end=str(train.index[-1]),
        test_start=str(test.index[0]) if len(test) > 0 else "N/A",
        test_end=str(test.index[-1]) if len(test) > 0 else "N/A",
    )

    save_model(final_model, metadata)
    
    # Print final summary
    print("\n" + "=" * 60)
    print("Training completed successfully!")
    print(f"Model accuracy (1 - MAPE): {(1 - evaluation['mape']/100):.4f}")
    print(f"Model MAE: {evaluation['mae']:.4f}")
    print(f"Model RMSE: {evaluation['rmse']:.4f}")
    print(f"Model MAPE: {evaluation['mape']:.2f}%")
    print("=" * 60)


if __name__ == "__main__":
    main()

