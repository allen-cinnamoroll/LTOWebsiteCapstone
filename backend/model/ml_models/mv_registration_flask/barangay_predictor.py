"""
Barangay-Level Prediction Module
Uses hierarchical approach: Municipality predictions distributed to barangays based on historical proportions
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class BarangayPredictor:
    """
    Predicts vehicle registrations at barangay level using hierarchical approach:
    1. Get municipality-level predictions (from SARIMA)
    2. Calculate historical barangay proportions within each municipality
    3. Distribute municipality predictions to barangays proportionally
    """
    
    def __init__(self, csv_path):
        """
        Initialize barangay predictor
        
        Args:
            csv_path: Path to CSV file with vehicle registration data
        """
        self.csv_path = csv_path
        self.barangay_proportions = {}  # Cache for barangay proportions
        
    def load_barangay_data(self):
        """
        Load and process barangay-level data from CSV
        
        Returns:
            DataFrame with barangay, municipality, date, and count columns
        """
        try:
            import os
            csv_dir = os.path.dirname(self.csv_path)
            all_csv_files = [f for f in os.listdir(csv_dir) if f.endswith('.csv')]
            
            dfs = []
            for csv_file in all_csv_files:
                csv_path = os.path.join(csv_dir, csv_file)
                try:
                    df_temp = pd.read_csv(csv_path)
                    dfs.append(df_temp)
                except Exception as e:
                    logger.warning(f"Could not load {csv_file}: {str(e)}")
                    continue
            
            if not dfs:
                raise ValueError("No valid CSV files could be loaded")
            
            df = pd.concat(dfs, ignore_index=True)
            
            # Validate required columns
            required_columns = ['dateOfRenewal', 'address_municipality', 'address_barangay']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                raise ValueError(f"CSV missing required columns: {', '.join(missing_columns)}")
            
            # Parse dates
            df['dateOfRenewal_parsed'] = pd.to_datetime(
                df['dateOfRenewal'],
                format='%m/%d/%Y',
                errors='coerce'
            )
            
            # Drop rows with invalid dates or missing barangay
            df = df.dropna(subset=['dateOfRenewal_parsed', 'address_barangay'])
            
            # Normalize municipality and barangay names
            df['municipality'] = df['address_municipality'].str.upper().str.strip()
            df['barangay'] = df['address_barangay'].str.upper().str.strip()
            
            return df[['municipality', 'barangay', 'dateOfRenewal_parsed']].copy()
            
        except Exception as e:
            logger.error(f"Error loading barangay data: {str(e)}")
            raise
    
    def calculate_barangay_proportions(self, municipality=None, lookback_days=90):
        """
        Calculate historical proportions of registrations per barangay within each municipality
        
        Args:
            municipality: Specific municipality (None for all)
            lookback_days: Number of days to look back for calculating proportions (default: 90 days)
        
        Returns:
            dict: {municipality: {barangay: proportion, ...}, ...}
        """
        try:
            df = self.load_barangay_data()
            
            # Filter by municipality if specified
            if municipality:
                municipality_upper = municipality.upper().strip()
                df = df[df['municipality'] == municipality_upper].copy()
            
            # Filter to recent data (last N days)
            if len(df) > 0:
                max_date = df['dateOfRenewal_parsed'].max()
                min_date = max_date - timedelta(days=lookback_days)
                df = df[df['dateOfRenewal_parsed'] >= min_date].copy()
            
            if len(df) == 0:
                logger.warning(f"No data found for calculating barangay proportions")
                return {}
            
            # Calculate proportions per municipality
            proportions = {}
            
            for mun in df['municipality'].unique():
                mun_data = df[df['municipality'] == mun].copy()
                
                # Count registrations per barangay
                barangay_counts = mun_data.groupby('barangay').size()
                total = barangay_counts.sum()
                
                if total > 0:
                    # Calculate proportions
                    mun_proportions = (barangay_counts / total).to_dict()
                    proportions[mun] = mun_proportions
                    
                    logger.info(f"Calculated proportions for {mun}: {len(mun_proportions)} barangays")
            
            return proportions
            
        except Exception as e:
            logger.error(f"Error calculating barangay proportions: {str(e)}")
            return {}
    
    def predict_barangay_registrations(self, municipality_predictions, municipality=None):
        """
        Distribute municipality-level predictions to barangays based on historical proportions
        
        Args:
            municipality_predictions: dict or list of predictions
                Format 1: {municipality: {date: count, ...}, ...}
                Format 2: [{municipality: str, date: str, predicted: int}, ...]
            municipality: Specific municipality to predict (None for all)
        
        Returns:
            list: [{municipality, barangay, date, predicted_count, ...}, ...]
        """
        try:
            # Calculate proportions
            proportions = self.calculate_barangay_proportions(municipality)
            
            if not proportions:
                logger.warning("No barangay proportions available. Cannot distribute predictions.")
                return []
            
            # Convert municipality_predictions to standard format
            if isinstance(municipality_predictions, list):
                # Format 2: List of dicts
                predictions_dict = {}
                for pred in municipality_predictions:
                    mun = pred.get('municipality', '').upper().strip()
                    date = pred.get('date') or pred.get('week_start')
                    count = pred.get('predicted') or pred.get('predicted_count') or pred.get('total_predicted') or 0
                    
                    if mun not in predictions_dict:
                        predictions_dict[mun] = {}
                    predictions_dict[mun][date] = count
            else:
                # Format 1: Dict of dicts
                predictions_dict = municipality_predictions
            
            # Distribute predictions
            barangay_predictions = []
            
            for mun, date_predictions in predictions_dict.items():
                if municipality and mun.upper().strip() != municipality.upper().strip():
                    continue
                
                mun_proportions = proportions.get(mun.upper().strip(), {})
                
                if not mun_proportions:
                    logger.warning(f"No proportions found for municipality: {mun}")
                    continue
                
                # Distribute each date's prediction
                for date, total_count in date_predictions.items():
                    for barangay, proportion in mun_proportions.items():
                        barangay_count = int(round(total_count * proportion))
                        
                        barangay_predictions.append({
                            'municipality': mun,
                            'barangay': barangay,
                            'date': date,
                            'predicted_count': barangay_count,
                            'proportion': proportion,
                            'municipality_total': total_count
                        })
            
            logger.info(f"Generated {len(barangay_predictions)} barangay predictions")
            return barangay_predictions
            
        except Exception as e:
            logger.error(f"Error predicting barangay registrations: {str(e)}")
            return []
    
    def get_barangay_summary(self, municipality=None):
        """
        Get summary statistics for barangays
        
        Args:
            municipality: Specific municipality (None for all)
        
        Returns:
            dict: Summary statistics per municipality and barangay
        """
        try:
            df = self.load_barangay_data()
            
            if municipality:
                municipality_upper = municipality.upper().strip()
                df = df[df['municipality'] == municipality_upper].copy()
            
            if len(df) == 0:
                return {}
            
            # Group by municipality and barangay
            summary = df.groupby(['municipality', 'barangay']).agg({
                'dateOfRenewal_parsed': ['count', 'min', 'max']
            }).reset_index()
            
            summary.columns = ['municipality', 'barangay', 'total_registrations', 'first_date', 'last_date']
            
            # Convert to dict format
            result = {}
            for _, row in summary.iterrows():
                mun = row['municipality']
                if mun not in result:
                    result[mun] = {}
                
                result[mun][row['barangay']] = {
                    'total_registrations': int(row['total_registrations']),
                    'first_date': str(row['first_date']),
                    'last_date': str(row['last_date']),
                    'days_with_data': (row['last_date'] - row['first_date']).days + 1
                }
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting barangay summary: {str(e)}")
            return {}

