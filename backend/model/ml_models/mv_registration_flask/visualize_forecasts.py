"""
Visualization utility for SARIMA forecasts
Creates line charts with confidence intervals
"""

import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import datetime
import os

def plot_forecast_with_ci(historical_data, predictions, save_path=None):
    """
    Plot historical data and forecast with confidence intervals
    
    Args:
        historical_data: DataFrame with historical counts (index: dates, column: 'count')
        predictions: Dictionary from model.predict() with daily_predictions and forecast_ci
        save_path: Path to save the plot (optional)
    """
    fig, ax = plt.subplots(figsize=(14, 7))
    
    # Plot historical data
    if historical_data is not None:
        ax.plot(historical_data.index, historical_data['count'], 
                label='Historical Data', color='blue', linewidth=2, alpha=0.7)
    
    # Extract prediction data
    pred_dates = [pd.to_datetime(p['date']) for p in predictions['daily_predictions']]
    pred_values = [p['predicted_count'] for p in predictions['daily_predictions']]
    lower_bounds = [p['lower_bound'] for p in predictions['daily_predictions']]
    upper_bounds = [p['upper_bound'] for p in predictions['daily_predictions']]
    
    # Plot forecast
    ax.plot(pred_dates, pred_values, 
            label='Forecast', color='red', linewidth=2, linestyle='--')
    
    # Plot confidence intervals
    ax.fill_between(pred_dates, lower_bounds, upper_bounds, 
                    alpha=0.3, color='red', label='95% Confidence Interval')
    
    # Formatting
    ax.set_xlabel('Date', fontsize=12, fontweight='bold')
    ax.set_ylabel('Number of Vehicle Registrations', fontsize=12, fontweight='bold')
    ax.set_title('Vehicle Registration Forecast with 95% Confidence Intervals', 
                 fontsize=14, fontweight='bold')
    ax.legend(loc='best', fontsize=10)
    ax.grid(True, alpha=0.3)
    
    # Format x-axis dates
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
    ax.xaxis.set_major_locator(mdates.WeekdayLocator(interval=1))
    plt.xticks(rotation=45, ha='right')
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"Plot saved to: {save_path}")
    else:
        plt.show()
    
    plt.close()

def plot_training_history(historical_data, train_data, test_data, save_path=None):
    """
    Plot training history showing train/test split
    
    Args:
        historical_data: Full historical data
        train_data: Training set
        test_data: Test set
        save_path: Path to save the plot (optional)
    """
    fig, ax = plt.subplots(figsize=(14, 7))
    
    # Plot full historical data
    if historical_data is not None:
        ax.plot(historical_data.index, historical_data['count'], 
                label='All Data', color='gray', linewidth=1, alpha=0.5)
    
    # Plot training data
    if train_data is not None:
        ax.plot(train_data.index, train_data['count'], 
                label='Training Set', color='blue', linewidth=2)
    
    # Plot test data
    if test_data is not None:
        ax.plot(test_data.index, test_data['count'], 
                label='Test Set', color='green', linewidth=2)
    
    # Add vertical line to show split
    if train_data is not None and test_data is not None:
        split_date = train_data.index.max()
        ax.axvline(x=split_date, color='red', linestyle='--', linewidth=2, 
                   label='Train/Test Split')
    
    ax.set_xlabel('Date', fontsize=12, fontweight='bold')
    ax.set_ylabel('Number of Vehicle Registrations', fontsize=12, fontweight='bold')
    ax.set_title('Train-Test Split Visualization', fontsize=14, fontweight='bold')
    ax.legend(loc='best', fontsize=10)
    ax.grid(True, alpha=0.3)
    
    # Format x-axis dates
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
    ax.xaxis.set_major_locator(mdates.WeekdayLocator(interval=1))
    plt.xticks(rotation=45, ha='right')
    
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"Plot saved to: {save_path}")
    else:
        plt.show()
    
    plt.close()

