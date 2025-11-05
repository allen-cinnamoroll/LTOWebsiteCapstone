"""
Data Preprocessor for Vehicle Registration Data
Processes CSV data and aggregates by week/month for time series analysis
"""

import pandas as pd
import numpy as np
from datetime import datetime
import os
from config import DAVAO_ORIENTAL_MUNICIPALITIES, MIN_WEEKS_FOR_MUNICIPALITY_MODEL, MIN_AVG_REGISTRATIONS_PER_WEEK

class DataPreprocessor:
    def __init__(self, csv_path):
        """
        Initialize the data preprocessor
        
        Args:
            csv_path: Path to the CSV file containing vehicle registration data
        """
        self.csv_path = csv_path
        self.davao_oriental_municipalities = DAVAO_ORIENTAL_MUNICIPALITIES
    
    def load_and_process_data(self):
        """
        Load CSV data and process it into time series format
        Automatically combines multiple CSV files if they exist in the directory
        
        Returns:
            tuple: (DataFrame with weekly aggregated registration counts, dict with processing info)
        """
        csv_dir = os.path.dirname(self.csv_path)
        csv_filename = os.path.basename(self.csv_path)
        
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
        # Using fileNo is more reliable since temporary plate numbers can be duplicates
        # This prevents duplicate registrations if same data appears in multiple files
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
        # Normalize municipality names (case-insensitive)
        df['municipality_upper'] = df['address_municipality'].str.upper().str.strip()
        
        # Filter for Davao Oriental
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
        
        # Extract week and year-week for grouping
        df_filtered['year'] = df_filtered['dateOfRenewal_parsed'].dt.year
        df_filtered['month'] = df_filtered['dateOfRenewal_parsed'].dt.month
        df_filtered['week'] = df_filtered['dateOfRenewal_parsed'].dt.isocalendar().week
        df_filtered['year_week'] = (
            df_filtered['year'].astype(str) + '-' + 
            df_filtered['week'].astype(str).str.zfill(2)
        )
        
        # Create date for week start (Monday of that week)
        df_filtered['week_start'] = df_filtered['dateOfRenewal_parsed'].dt.to_period('W-SUN').dt.start_time
        
        # Aggregate by week
        weekly_data = df_filtered.groupby(['week_start', 'year_week']).agg({
            'plateNo': 'count'
        }).rename(columns={'plateNo': 'count'}).reset_index()
        
        weekly_data = weekly_data.sort_values('week_start')
        
        print(f"Aggregated to {len(weekly_data)} weeks")
        print(f"Date range: {weekly_data['week_start'].min()} to {weekly_data['week_start'].max()}")
        
        # Set week_start as index for time series
        weekly_data = weekly_data.set_index('week_start')
        weekly_data.index = pd.to_datetime(weekly_data.index)
        
        # For sparse data, only keep weeks with actual registrations
        # Don't fill with zeros as it causes issues with SARIMA
        weekly_data = weekly_data[weekly_data['count'] > 0].copy()
        
        # Sort by date to ensure proper time series order
        weekly_data = weekly_data.sort_index()
        
        print(f"After filtering zero weeks: {len(weekly_data)} weeks with registrations")
        print(f"Weeks with data: {weekly_data['count'].sum()} total registrations")
        print(f"Mean per week: {weekly_data['count'].mean():.1f}")
        
        # Track actual min/max registration dates (not week_start dates)
        actual_min_date = df_filtered['dateOfRenewal_parsed'].min()
        actual_max_date = df_filtered['dateOfRenewal_parsed'].max()
        
        print(f"Actual registration date range: {actual_min_date} to {actual_max_date}")
        
        # Prepare processing info
        processing_info = {
            'total_csv_files': len(all_csv_files),
            'csv_files': all_csv_files,
            'total_rows_before_dedup': total_rows,
            'duplicates_removed': duplicates_removed,
            'total_rows_after_dedup': len(df),
            'filtered_rows': len(df_filtered),
            'weeks_with_data': len(weekly_data),
            'total_registrations': int(weekly_data['count'].sum()),
            'mean_per_week': float(weekly_data['count'].mean()),
            'actual_date_range': {
                'start': str(actual_min_date),
                'end': str(actual_max_date)
            }
        }
        
        return weekly_data[['count']], processing_info
    
    def get_data_info(self, processed_data):
        """
        Get information about the processed data
        
        Args:
            processed_data: Processed DataFrame
            
        Returns:
            Dictionary with data statistics
        """
        return {
            'total_weeks': len(processed_data),
            'date_range': {
                'start': str(processed_data.index.min()),
                'end': str(processed_data.index.max())
            },
            'total_registrations': int(processed_data['count'].sum()),
            'mean_weekly_registrations': float(processed_data['count'].mean()),
            'median_weekly_registrations': float(processed_data['count'].median()),
            'std_weekly_registrations': float(processed_data['count'].std()),
            'min_weekly_registrations': int(processed_data['count'].min()),
            'max_weekly_registrations': int(processed_data['count'].max())
        }
    
    def load_and_process_data_by_municipality(self, municipality=None):
        """
        Load CSV data and process it into time series format for a specific municipality
        or return data for all municipalities separately
        Automatically combines multiple CSV files if they exist
        
        Args:
            municipality: Specific municipality name (None for all municipalities)
            
        Returns:
            If municipality specified: DataFrame with weekly aggregated counts for that municipality
            If None: Dictionary {municipality_name: DataFrame} for all municipalities
        """
        csv_dir = os.path.dirname(self.csv_path)
        
        # Check if directory exists
        if not os.path.exists(csv_dir):
            raise FileNotFoundError(f"Directory not found: {csv_dir}")
        
        # Find all CSV files in the directory
        all_csv_files = [f for f in os.listdir(csv_dir) if f.endswith('.csv')]
        
        if not all_csv_files:
            raise FileNotFoundError(f"No CSV files found in: {csv_dir}")
        
        print(f"Loading data from {len(all_csv_files)} CSV file(s)...")
        
        # Load and combine all CSV files
        dfs = []
        for csv_file in all_csv_files:
            csv_path = os.path.join(csv_dir, csv_file)
            try:
                df_temp = pd.read_csv(csv_path)
                dfs.append(df_temp)
            except Exception as e:
                print(f"Warning: Could not load {csv_file}: {str(e)}")
                continue
        
        if not dfs:
            raise ValueError("No valid CSV files could be loaded")
        
        # Combine all dataframes
        df = pd.concat(dfs, ignore_index=True)
        
        # Remove duplicates using fileNo + dateOfRenewal
        # Using fileNo is more reliable since temporary plate numbers can be duplicates
        if 'fileNo' in df.columns and 'dateOfRenewal' in df.columns:
            df = df.drop_duplicates(subset=['fileNo', 'dateOfRenewal'], keep='first')
        
        print(f"Combined total: {len(df)} rows from {len(all_csv_files)} CSV file(s)")
        
        # Filter for Davao Oriental municipalities
        df['municipality_upper'] = df['address_municipality'].str.upper().str.strip()
        davao_mask = df['municipality_upper'].isin(self.davao_oriental_municipalities)
        df_filtered = df[davao_mask].copy()
        
        # Filter by specific municipality if provided
        if municipality:
            municipality_upper = municipality.upper().strip()
            if municipality_upper not in self.davao_oriental_municipalities:
                raise ValueError(f"Municipality '{municipality}' not found in Davao Oriental")
            df_filtered = df_filtered[df_filtered['municipality_upper'] == municipality_upper].copy()
        
        print(f"Filtered to {len(df_filtered)} rows from Davao Oriental municipalities")
        
        # Parse dates
        df_filtered['dateOfRenewal_parsed'] = pd.to_datetime(
            df_filtered['dateOfRenewal'],
            format='%m/%d/%Y',
            errors='coerce'
        )
        df_filtered = df_filtered.dropna(subset=['dateOfRenewal_parsed'])
        
        if municipality:
            # Return single time series for specific municipality
            return self._aggregate_by_week(df_filtered)
        else:
            # Return dictionary of time series for all municipalities
            municipalities_data = {}
            for mun in self.davao_oriental_municipalities:
                mun_data = df_filtered[df_filtered['municipality_upper'] == mun].copy()
                if len(mun_data) > 0:
                    weekly_data = self._aggregate_by_week(mun_data)
                    if len(weekly_data) > 0:
                        municipalities_data[mun] = weekly_data
            return municipalities_data
    
    def _aggregate_by_week(self, df_filtered):
        """Helper method to aggregate data by week"""
        df_filtered = df_filtered.sort_values('dateOfRenewal_parsed')
        
        # Extract week information
        df_filtered['year'] = df_filtered['dateOfRenewal_parsed'].dt.year
        df_filtered['week'] = df_filtered['dateOfRenewal_parsed'].dt.isocalendar().week
        df_filtered['year_week'] = (
            df_filtered['year'].astype(str) + '-' + 
            df_filtered['week'].astype(str).str.zfill(2)
        )
        df_filtered['week_start'] = df_filtered['dateOfRenewal_parsed'].dt.to_period('W-SUN').dt.start_time
        
        # Aggregate by week
        weekly_data = df_filtered.groupby(['week_start', 'year_week']).agg({
            'plateNo': 'count'
        }).rename(columns={'plateNo': 'count'}).reset_index()
        
        weekly_data = weekly_data.sort_values('week_start')
        
        # Set index
        weekly_data = weekly_data.set_index('week_start')
        weekly_data.index = pd.to_datetime(weekly_data.index)
        
        # Filter zero weeks
        weekly_data = weekly_data[weekly_data['count'] > 0].copy()
        weekly_data = weekly_data.sort_index()
        
        return weekly_data[['count']]
    
    def check_municipality_data_sufficiency(self, municipality_data):
        """
        Check if a municipality has sufficient data for training a model
        
        Args:
            municipality_data: DataFrame with weekly registration counts
            
        Returns:
            Dictionary with sufficiency check results
        """
        weeks_with_data = len(municipality_data)
        total_registrations = int(municipality_data['count'].sum())
        avg_per_week = float(municipality_data['count'].mean()) if weeks_with_data > 0 else 0
        
        is_sufficient = (
            weeks_with_data >= MIN_WEEKS_FOR_MUNICIPALITY_MODEL and
            avg_per_week >= MIN_AVG_REGISTRATIONS_PER_WEEK
        )
        
        return {
            'is_sufficient': is_sufficient,
            'weeks_with_data': weeks_with_data,
            'total_registrations': total_registrations,
            'avg_per_week': avg_per_week,
            'min_weeks_required': MIN_WEEKS_FOR_MUNICIPALITY_MODEL,
            'min_avg_required': MIN_AVG_REGISTRATIONS_PER_WEEK,
            'sufficient_reason': (
                'Sufficient data' if is_sufficient else
                f'Need {MIN_WEEKS_FOR_MUNICIPALITY_MODEL - weeks_with_data} more weeks' if weeks_with_data < MIN_WEEKS_FOR_MUNICIPALITY_MODEL else
                f'Need {MIN_AVG_REGISTRATIONS_PER_WEEK - avg_per_week:.1f} more avg registrations/week'
            )
        }

