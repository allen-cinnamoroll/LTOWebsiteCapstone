"""
Daily Data Preprocessor for Vehicle Registration Data
Optimized version for daily SARIMA forecasting with exogenous variables
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import holidays
from config import DAVAO_ORIENTAL_MUNICIPALITIES

class DailyDataPreprocessor:
    """
    Preprocesses daily vehicle registration data for optimized SARIMA modeling.
    Handles missing days, creates exogenous variables, and prepares data for daily forecasting.
    """
    
    def __init__(self, csv_path):
        """
        Initialize the daily data preprocessor
        
        Args:
            csv_path: Path to the CSV file containing vehicle registration data
        """
        self.csv_path = csv_path
        self.davao_oriental_municipalities = DAVAO_ORIENTAL_MUNICIPALITIES
        # Philippine holidays for exogenous variable creation
        self.ph_holidays = holidays.Philippines()
    
    def load_and_process_daily_data(self, fill_missing_days=True, fill_method='forward'):
        """
        Load CSV data and process it into daily time series format
        
        Args:
            fill_missing_days: If True, fill missing days with 0 or forward-fill
            fill_method: 'zero' to fill with 0, 'forward' to forward-fill last value
        
        Returns:
            tuple: (daily_data DataFrame with DateTime index, exogenous_vars DataFrame, processing_info dict)
        """
        csv_dir = os.path.dirname(self.csv_path)
        
        # Check if directory exists
        if not os.path.exists(csv_dir):
            raise FileNotFoundError(f"Directory not found: {csv_dir}")
        
        # Find all CSV files in the directory
        all_csv_files = [f for f in os.listdir(csv_dir) if f.endswith('.csv')]
        
        if not all_csv_files:
            raise FileNotFoundError(f"No CSV files found in: {csv_dir}")
        
        print(f"Found {len(all_csv_files)} CSV file(s) in directory: {csv_dir}")
        print(f"Files: {', '.join(all_csv_files)}")
        
        # Load and combine all CSV files
        dfs = []
        total_rows = 0
        
        for csv_file in all_csv_files:
            csv_path = os.path.join(csv_dir, csv_file)
            try:
                df_temp = pd.read_csv(csv_path)
                dfs.append(df_temp)
                total_rows += len(df_temp)
                print(f"  - Loaded {csv_file}: {len(df_temp)} rows")
            except Exception as e:
                print(f"  - Warning: Could not load {csv_file}: {str(e)}")
                continue
        
        if not dfs:
            raise ValueError("No valid CSV files could be loaded")
        
        # Combine all dataframes
        df = pd.concat(dfs, ignore_index=True)
        
        # Validate required columns
        required_columns = ['fileNo', 'dateOfRenewal', 'address_municipality']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise ValueError(
                f"CSV file is missing required columns: {', '.join(missing_columns)}. "
                f"Required columns are: {', '.join(required_columns)}. "
                f"Found columns: {', '.join(df.columns.tolist())}"
            )
        
        # Remove duplicates based on fileNo + dateOfRenewal
        duplicates_removed = 0
        if 'fileNo' in df.columns and 'dateOfRenewal' in df.columns:
            before_dedup = len(df)
            df = df.drop_duplicates(subset=['fileNo', 'dateOfRenewal'], keep='first')
            after_dedup = len(df)
            duplicates_removed = before_dedup - after_dedup
            if duplicates_removed > 0:
                print(f"  - Removed {duplicates_removed} duplicate rows using fileNo + dateOfRenewal")
        
        print(f"Combined total: {len(df)} rows from {len(all_csv_files)} CSV file(s)")
        
        # Filter for Davao Oriental municipalities
        df['municipality_upper'] = df['address_municipality'].str.upper().str.strip()
        davao_mask = df['municipality_upper'].isin(self.davao_oriental_municipalities)
        df_filtered = df[davao_mask].copy()
        
        print(f"Filtered to {len(df_filtered)} rows from Davao Oriental municipalities")
        
        if len(df_filtered) == 0:
            raise ValueError("No data found for Davao Oriental municipalities")
        
        # Parse dateOfRenewal
        df_filtered['dateOfRenewal_parsed'] = pd.to_datetime(
            df_filtered['dateOfRenewal'],
            format='%m/%d/%Y',
            errors='coerce'
        )
        
        # Drop rows with invalid dates
        df_filtered = df_filtered.dropna(subset=['dateOfRenewal_parsed'])
        print(f"After date parsing: {len(df_filtered)} rows")
        
        # Sort by date
        df_filtered = df_filtered.sort_values('dateOfRenewal_parsed')
        
        # Aggregate by day (count registrations per day)
        daily_data = df_filtered.groupby('dateOfRenewal_parsed').agg({
            'plateNo': 'count'
        }).rename(columns={'plateNo': 'count'}).reset_index()
        
        daily_data = daily_data.sort_values('dateOfRenewal_parsed')
        
        print(f"Aggregated to {len(daily_data)} days with registrations")
        print(f"Date range: {daily_data['dateOfRenewal_parsed'].min()} to {daily_data['dateOfRenewal_parsed'].max()}")
        
        # Create complete date range from min to max date
        min_date = daily_data['dateOfRenewal_parsed'].min()
        max_date = daily_data['dateOfRenewal_parsed'].max()
        complete_date_range = pd.date_range(start=min_date, end=max_date, freq='D')
        
        # Set date as index
        daily_data = daily_data.set_index('dateOfRenewal_parsed')
        daily_data.index.name = 'date'
        
        # Reindex to include all days in the range
        daily_data = daily_data.reindex(complete_date_range)
        
        # Fill missing days
        if fill_missing_days:
            if fill_method == 'zero':
                daily_data['count'] = daily_data['count'].fillna(0)
                print(f"Filled {daily_data['count'].isna().sum()} missing days with 0")
            elif fill_method == 'forward':
                daily_data['count'] = daily_data['count'].ffill().fillna(0)
                print(f"Forward-filled missing days, then filled remaining with 0")
            else:
                raise ValueError(f"Unknown fill_method: {fill_method}. Use 'zero' or 'forward'")
        else:
            # Keep NaN for missing days (not recommended for SARIMA)
            print("Warning: Missing days not filled. SARIMA may have issues with NaN values.")
        
        # Ensure count is integer
        daily_data['count'] = daily_data['count'].astype(int)
        
        # Sort by date to ensure proper time series order
        daily_data = daily_data.sort_index()
        
        print(f"Final daily data: {len(daily_data)} days")
        print(f"Total registrations: {daily_data['count'].sum()}")
        print(f"Mean per day: {daily_data['count'].mean():.2f}")
        print(f"Days with zero registrations: {(daily_data['count'] == 0).sum()}")
        
        # Create exogenous variables
        exogenous_vars = self._create_exogenous_variables(daily_data.index)
        
        # Prepare processing info
        processing_info = {
            'total_csv_files': len(all_csv_files),
            'csv_files': all_csv_files,
            'total_rows_before_dedup': total_rows,
            'duplicates_removed': duplicates_removed,
            'total_rows_after_dedup': len(df),
            'filtered_rows': len(df_filtered),
            'total_days': len(daily_data),
            'days_with_registrations': (daily_data['count'] > 0).sum(),
            'days_with_zero': (daily_data['count'] == 0).sum(),
            'total_registrations': int(daily_data['count'].sum()),
            'mean_per_day': float(daily_data['count'].mean()),
            'date_range': {
                'start': str(min_date),
                'end': str(max_date)
            },
            'fill_method': fill_method if fill_missing_days else None
        }
        
        return daily_data[['count']], exogenous_vars, processing_info
    
    def _create_exogenous_variables(self, date_index):
        """
        Create exogenous variables for weekends and holidays
        
        Args:
            date_index: pandas DatetimeIndex
            
        Returns:
            DataFrame with exogenous variables
        """
        exog_data = pd.DataFrame(index=date_index)
        
        # Weekend indicator (1 = Saturday or Sunday, 0 = weekday)
        exog_data['is_weekend'] = (date_index.dayofweek >= 5).astype(int)
        
        # Holiday indicator (1 = holiday, 0 = not holiday)
        exog_data['is_holiday'] = date_index.map(lambda x: x in self.ph_holidays).astype(int)
        
        # Combined weekend/holiday indicator (1 = weekend or holiday, 0 = otherwise)
        exog_data['is_weekend_or_holiday'] = ((exog_data['is_weekend'] == 1) | (exog_data['is_holiday'] == 1)).astype(int)
        
        # Day of week (0=Monday, 6=Sunday) - can be useful for more granular patterns
        exog_data['day_of_week'] = date_index.dayofweek
        
        # Month (1-12) - for seasonal patterns
        exog_data['month'] = date_index.month
        
        print(f"Created exogenous variables:")
        print(f"  - Weekends: {exog_data['is_weekend'].sum()} days")
        print(f"  - Holidays: {exog_data['is_holiday'].sum()} days")
        print(f"  - Weekend/Holiday: {exog_data['is_weekend_or_holiday'].sum()} days")
        
        return exog_data
    
    def get_data_info(self, processed_data):
        """
        Get information about the processed daily data
        
        Args:
            processed_data: Processed DataFrame with daily counts
            
        Returns:
            Dictionary with data statistics
        """
        return {
            'total_days': len(processed_data),
            'date_range': {
                'start': str(processed_data.index.min()),
                'end': str(processed_data.index.max())
            },
            'total_registrations': int(processed_data['count'].sum()),
            'mean_daily_registrations': float(processed_data['count'].mean()),
            'median_daily_registrations': float(processed_data['count'].median()),
            'std_daily_registrations': float(processed_data['count'].std()),
            'min_daily_registrations': int(processed_data['count'].min()),
            'max_daily_registrations': int(processed_data['count'].max()),
            'days_with_zero': int((processed_data['count'] == 0).sum()),
            'days_with_registrations': int((processed_data['count'] > 0).sum())
        }

