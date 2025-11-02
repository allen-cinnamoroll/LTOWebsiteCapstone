"""
Data Preprocessor for Vehicle Registration Data
Processes CSV data and aggregates by week/month for time series analysis
"""

import pandas as pd
import numpy as np
from datetime import datetime
import os

class DataPreprocessor:
    def __init__(self, csv_path):
        """
        Initialize the data preprocessor
        
        Args:
            csv_path: Path to the CSV file containing vehicle registration data
        """
        self.csv_path = csv_path
        self.davao_oriental_municipalities = [
            'BAGANGA', 'BANAYBANAY', 'BOSTON', 'CARAGA', 'CATEEL',
            'GOVERNOR GENEROSO', 'LUPON', 'MANAY', 'SAN ISIDRO',
            'TARRAGONA', 'CITY OF MATI'
        ]
    
    def load_and_process_data(self):
        """
        Load CSV data and process it into time series format
        
        Returns:
            DataFrame with weekly aggregated registration counts
        """
        if not os.path.exists(self.csv_path):
            raise FileNotFoundError(f"CSV file not found: {self.csv_path}")
        
        print(f"Loading data from: {self.csv_path}")
        
        # Read CSV file
        df = pd.read_csv(self.csv_path)
        
        print(f"Loaded {len(df)} rows")
        
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
        
        # Resample to ensure weekly frequency (fill missing weeks with 0)
        date_range = pd.date_range(
            start=weekly_data.index.min(),
            end=weekly_data.index.max(),
            freq='W-SUN'
        )
        
        weekly_data = weekly_data.reindex(date_range, fill_value=0)
        weekly_data['count'] = weekly_data['count'].fillna(0).astype(int)
        
        print(f"After resampling: {len(weekly_data)} weeks")
        
        return weekly_data[['count']]
    
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

