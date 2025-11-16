"""
Data Loader for Accident Prediction Model
Connects to MongoDB and aggregates monthly accident counts per barangay
"""

import os
import sys
from pymongo import MongoClient
import pandas as pd
import numpy as np
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AccidentDataLoader:
    """Load and prepare accident data from MongoDB for training"""
    
    def __init__(self, mongo_uri=None, db_name='lto_website', collection_name='accidents'):
        """
        Initialize data loader
        
        Args:
            mongo_uri: MongoDB connection string. If None, tries to get from environment or uses default
            db_name: Database name (default: 'lto_website')
            collection_name: Collection name (default: 'accidents')
        """
        self.db_name = db_name
        self.collection_name = collection_name
        
        # Get MongoDB URI from environment or use default
        if mongo_uri:
            self.mongo_uri = mongo_uri
        else:
            # Try to get from environment variable
            self.mongo_uri = os.getenv(
                'DATABASE',
                'mongodb://lto_user:jessa_allen_kent@72.60.198.244:27017/lto_website?authSource=lto_website'
            )
        
        # Convert MongoDB URI format if needed (handle Node.js format)
        if 'mongodb://' not in self.mongo_uri:
            self.mongo_uri = f"mongodb://{self.mongo_uri}"
        
        self.client = None
        self.db = None
        self.collection = None
    
    def connect(self):
        """Connect to MongoDB"""
        try:
            self.client = MongoClient(self.mongo_uri)
            self.db = self.client[self.db_name]
            self.collection = self.db[self.collection_name]
            
            # Test connection
            self.client.admin.command('ping')
            logger.info(f"Connected to MongoDB: {self.db_name}.{self.collection_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}")
            raise
    
    def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client is not None:
            self.client.close()
            logger.info("Disconnected from MongoDB")
    
    def load_raw_data(self, limit=None):
        """
        Load raw accident data from MongoDB
        
        Args:
            limit: Optional limit on number of records to load
            
        Returns:
            List of accident documents
        """
        if self.collection is None:
            self.connect()
        
        query = {}
        cursor = self.collection.find(query)
        
        if limit:
            cursor = cursor.limit(limit)
        
        accidents = list(cursor)
        logger.info(f"Loaded {len(accidents)} accident records from MongoDB")
        return accidents
    
    def aggregate_monthly_counts(self, accidents=None):
        """
        Aggregate monthly accident counts per barangay
        
        Args:
            accidents: List of accident documents. If None, loads from database
            
        Returns:
            DataFrame with columns: year, month, municipality, barangay, accident_count
        """
        if accidents is None:
            accidents = self.load_raw_data()
        
        logger.info("Aggregating monthly accident counts per barangay...")
        
        # Prepare data for aggregation
        aggregated_data = []
        
        for accident in accidents:
            try:
                # Extract dateCommited
                date_committed = accident.get('dateCommited')
                if not date_committed:
                    continue
                
                # Handle different date formats
                if isinstance(date_committed, str):
                    date_committed = datetime.fromisoformat(date_committed.replace('Z', '+00:00'))
                elif isinstance(date_committed, datetime):
                    pass
                else:
                    continue
                
                # Extract year and month
                year = date_committed.year
                month = date_committed.month
                
                # Extract location data
                municipality = accident.get('municipality', 'Unknown')
                barangay = accident.get('barangay', 'Unknown')
                
                # Skip if essential fields are missing
                if municipality == 'Unknown' or barangay == 'Unknown':
                    continue
                
                aggregated_data.append({
                    'year': year,
                    'month': month,
                    'municipality': municipality.strip(),
                    'barangay': barangay.strip(),
                    'accident_count': 1  # Will be summed later
                })
                
            except Exception as e:
                logger.warning(f"Error processing accident record: {str(e)}")
                continue
        
        if not aggregated_data:
            logger.warning("No valid accident records found for aggregation")
            return pd.DataFrame()
        
        # Convert to DataFrame
        df = pd.DataFrame(aggregated_data)
        
        # Group by year, month, municipality, barangay and sum accident_count
        df_aggregated = df.groupby(['year', 'month', 'municipality', 'barangay']).agg({
            'accident_count': 'sum'
        }).reset_index()
        
        logger.info(f"Aggregated data: {len(df_aggregated)} unique month-barangay combinations")
        logger.info(f"Date range: {df_aggregated['year'].min()}-{df_aggregated['year'].max()}")
        logger.info(f"Municipalities: {df_aggregated['municipality'].nunique()}")
        logger.info(f"Barangays: {df_aggregated['barangay'].nunique()}")
        
        return df_aggregated
    
    def prepare_training_data(self, df_aggregated=None):
        """
        Prepare training data with features for Random Forest
        
        Args:
            df_aggregated: DataFrame from aggregate_monthly_counts. If None, loads and aggregates
            
        Returns:
            DataFrame with features ready for training
        """
        if df_aggregated is None:
            accidents = self.load_raw_data()
            df_aggregated = self.aggregate_monthly_counts(accidents)
        
        if df_aggregated.empty:
            logger.error("No data available for training")
            return pd.DataFrame()
        
        df = df_aggregated.copy()
        
        # Create time-based features
        df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
        
        # Quarter features for seasonality
        df['quarter'] = ((df['month'] - 1) // 3) + 1
        df['quarter_sin'] = np.sin(2 * np.pi * df['quarter'] / 4)
        df['quarter_cos'] = np.cos(2 * np.pi * df['quarter'] / 4)
        
        # Create year feature (normalized or as-is)
        df['year_normalized'] = (df['year'] - df['year'].min()) / (df['year'].max() - df['year'].min() + 1)
        
        # Encode categorical features
        from sklearn.preprocessing import LabelEncoder
        
        municipality_encoder = LabelEncoder()
        barangay_encoder = LabelEncoder()
        
        df['municipality_encoded'] = municipality_encoder.fit_transform(df['municipality'])
        df['barangay_encoded'] = barangay_encoder.fit_transform(df['barangay'])
        
        # Store encoders for later use
        df.attrs['municipality_encoder'] = municipality_encoder
        df.attrs['barangay_encoder'] = barangay_encoder
        
        # Sort for rolling features
        df = df.sort_values(['barangay', 'year', 'month'])
        
        # Barangay-level lag/rolling features
        df['accident_count_lag1'] = df.groupby('barangay')['accident_count'].shift(1).fillna(0)
        df['accident_count_lag3'] = df.groupby('barangay')['accident_count'].shift(3).fillna(0)
        df['accident_count_lag6'] = df.groupby('barangay')['accident_count'].shift(6).fillna(0)
        df['accident_count_lag12'] = df.groupby('barangay')['accident_count'].shift(12).fillna(0)
        
        df['accident_count_rolling_mean_3'] = df.groupby('barangay')['accident_count'].transform(
            lambda x: x.rolling(window=3, min_periods=1).mean()
        )
        df['accident_count_rolling_std_3'] = df.groupby('barangay')['accident_count'].transform(
            lambda x: x.rolling(window=3, min_periods=1).std().fillna(0)
        )
        df['accident_count_rolling_mean_6'] = df.groupby('barangay')['accident_count'].transform(
            lambda x: x.rolling(window=6, min_periods=1).mean()
        )
        df['accident_count_rolling_std_6'] = df.groupby('barangay')['accident_count'].transform(
            lambda x: x.rolling(window=6, min_periods=1).std().fillna(0)
        )
        df['accident_count_rolling_mean_12'] = df.groupby('barangay')['accident_count'].transform(
            lambda x: x.rolling(window=12, min_periods=1).mean()
        )
        df['accident_count_rolling_std_12'] = df.groupby('barangay')['accident_count'].transform(
            lambda x: x.rolling(window=12, min_periods=1).std().fillna(0)
        )
        
        # Municipality-level aggregates to capture broader trends
        df = df.sort_values(['municipality', 'year', 'month'])
        df['muni_count_lag1'] = df.groupby('municipality')['accident_count'].shift(1).fillna(0)
        df['muni_count_rolling_mean_3'] = df.groupby('municipality')['accident_count'].transform(
            lambda x: x.rolling(window=3, min_periods=1).mean()
        )
        df['muni_count_rolling_std_3'] = df.groupby('municipality')['accident_count'].transform(
            lambda x: x.rolling(window=3, min_periods=1).std().fillna(0)
        )
        
        logger.info(f"Prepared training data: {len(df)} samples")
        logger.info(f"Features: {list(df.columns)}")
        
        return df
    
    def get_feature_columns(self):
        """Get list of feature columns for model training"""
        return [
            'year',
            'month',
            'month_sin',
            'month_cos',
            'quarter',
            'quarter_sin',
            'quarter_cos',
            'year_normalized',
            'municipality_encoded',
            'barangay_encoded',
            'accident_count_lag1',
            'accident_count_lag3',
            'accident_count_lag6',
            'accident_count_lag12',
            'accident_count_rolling_mean_3',
            'accident_count_rolling_std_3',
            'accident_count_rolling_mean_6',
            'accident_count_rolling_std_6',
            'accident_count_rolling_mean_12',
            'accident_count_rolling_std_12',
            'muni_count_lag1',
            'muni_count_rolling_mean_3',
            'muni_count_rolling_std_3',
        ]


if __name__ == '__main__':
    # Test the data loader
    loader = AccidentDataLoader()
    try:
        loader.connect()
        df = loader.aggregate_monthly_counts()
        print(f"\nSample aggregated data:")
        print(df.head(10))
        print(f"\nData shape: {df.shape}")
        print(f"\nSummary statistics:")
        print(df['accident_count'].describe())
        
        # Prepare training data
        df_training = loader.prepare_training_data(df)
        print(f"\nTraining data shape: {df_training.shape}")
        print(f"\nSample training data:")
        print(df_training.head(10))
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        loader.disconnect()

