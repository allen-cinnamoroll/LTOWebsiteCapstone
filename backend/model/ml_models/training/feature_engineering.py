"""
Feature Engineering Module for LTO Accident Prediction System
Handles data preprocessing, feature extraction, and encoding
"""

import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import os
import yaml

class FeatureEngineer:
    def __init__(self, config_path="model_config.yaml"):
        """Initialize Feature Engineer with configuration"""
        with open(config_path, 'r') as file:
            self.config = yaml.safe_load(file)
        
        self.label_encoders = {}
        self.scaler = StandardScaler()
        self.feature_columns = []
        
    def load_data(self, data_path):
        """Load and perform initial data cleaning"""
        print(f"Loading data from {data_path}")
        df = pd.read_csv(data_path)
        
        # Convert date column to datetime
        df[self.config['features']['date_feature']] = pd.to_datetime(df[self.config['features']['date_feature']])
        
        # Remove rows with missing critical data
        df = df.dropna(subset=[self.config['features']['target_feature']])
        
        print(f"Loaded {len(df)} records")
        return df
    
    def extract_temporal_features(self, df):
        """Extract temporal features from dateCommited"""
        date_col = self.config['features']['date_feature']
        df['year'] = df[date_col].dt.year
        df['month'] = df[date_col].dt.month
        df['day'] = df[date_col].dt.day
        df['day_of_week'] = df[date_col].dt.dayofweek
        
        # Extract hour if time data is available, otherwise default to 0
        if df[date_col].dt.hour.notna().any():
            df['hour'] = df[date_col].dt.hour
        else:
            df['hour'] = 0  # Default hour if not available
            
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        df['is_rush_hour'] = df['hour'].isin([7, 8, 17, 18]).astype(int)
        
        return df
    
    def extract_location_features(self, df):
        """Extract location-based features"""
        # Extract road type from street names
        df['road_type'] = df['street'].apply(self._extract_road_type)
        
        return df
    
    
    def _extract_road_type(self, street_name):
        """Extract road type from street name"""
        if pd.isna(street_name):
            return 'unknown'
        
        street_lower = street_name.lower()
        if any(keyword in street_lower for keyword in ['highway', 'hwy']):
            return 'highway'
        elif any(keyword in street_lower for keyword in ['ave', 'avenue']):
            return 'avenue'
        elif any(keyword in street_lower for keyword in ['st', 'street']):
            return 'street'
        elif any(keyword in street_lower for keyword in ['road', 'rd']):
            return 'road'
        elif any(keyword in street_lower for keyword in ['purok']):
            return 'purok'
        else:
            return 'other'
    
    def encode_categorical_features(self, df, fit_encoders=True):
        """Encode categorical features"""
        categorical_features = self.config['features']['categorical_features'] + ['road_type']
        
        for feature in categorical_features:
            if feature in df.columns:
                if fit_encoders:
                    self.label_encoders[feature] = LabelEncoder()
                    df[feature + '_encoded'] = self.label_encoders[feature].fit_transform(df[feature].astype(str))
                else:
                    if feature in self.label_encoders:
                        # Handle unseen categories
                        df[feature + '_encoded'] = df[feature].astype(str)
                        df[feature + '_encoded'] = df[feature + '_encoded'].apply(
                            lambda x: x if x in self.label_encoders[feature].classes_ else 'unknown'
                        )
                        df[feature + '_encoded'] = self.label_encoders[feature].transform(df[feature + '_encoded'])
                    else:
                        df[feature + '_encoded'] = 0
        
        return df
    
    def scale_numerical_features(self, df, fit_scaler=True):
        """Scale numerical features"""
        numerical_features = self.config['features']['numerical_features'] + ['year', 'month', 'day', 'day_of_week', 'hour']
        
        # Add encoded categorical features to numerical features for scaling
        encoded_features = [col for col in df.columns if col.endswith('_encoded')]
        numerical_features.extend(encoded_features)
        
        # Filter features that exist in the dataframe
        existing_features = [f for f in numerical_features if f in df.columns]
        
        if fit_scaler:
            df[existing_features] = self.scaler.fit_transform(df[existing_features])
        else:
            df[existing_features] = self.scaler.transform(df[existing_features])
        
        self.feature_columns = existing_features
        return df
    
    def prepare_features(self, df, fit_encoders=True):
        """Complete feature preparation pipeline"""
        print("Extracting temporal features...")
        df = self.extract_temporal_features(df)
        
        print("Extracting location features...")
        df = self.extract_location_features(df)
        
        print("Encoding categorical features...")
        df = self.encode_categorical_features(df, fit_encoders)
        
        print("Scaling numerical features...")
        df = self.scale_numerical_features(df, fit_encoders)
        
        return df
    
    def prepare_target(self, df):
        """Prepare target variable"""
        target_feature = self.config['features']['target_feature']
        
        # Map target to numerical values
        target_mapping = self.config['rule_system']['case_status_mapping']
        df['target_encoded'] = df[target_feature].map(target_mapping)
        
        # Remove rows with unmapped target values
        df = df.dropna(subset=['target_encoded'])
        
        print(f"Target distribution:\n{df['target_encoded'].value_counts()}")
        
        return df
    
    def split_data(self, df):
        """Split data into train and test sets"""
        target = df['target_encoded']
        features = df[self.feature_columns]
        
        X_train, X_test, y_train, y_test = train_test_split(
            features, target,
            test_size=1 - self.config['data']['train_test_split'],
            random_state=self.config['data']['random_state'],
            stratify=target
        )
        
        print(f"Training set: {len(X_train)} samples")
        print(f"Test set: {len(X_test)} samples")
        print(f"Training target distribution:\n{pd.Series(y_train).value_counts()}")
        print(f"Test target distribution:\n{pd.Series(y_test).value_counts()}")
        
        return X_train, X_test, y_train, y_test
    
    def save_preprocessors(self, save_path):
        """Save encoders and scaler for inference"""
        os.makedirs(save_path, exist_ok=True)
        
        # Save label encoders
        joblib.dump(self.label_encoders, os.path.join(save_path, 'feature_encoders.pkl'))
        
        # Save scaler
        joblib.dump(self.scaler, os.path.join(save_path, 'scaler.pkl'))
        
        # Save feature columns
        joblib.dump(self.feature_columns, os.path.join(save_path, 'feature_columns.pkl'))
        
        print(f"Preprocessors saved to {save_path}")
    
    def load_preprocessors(self, load_path):
        """Load encoders and scaler for inference"""
        self.label_encoders = joblib.load(os.path.join(load_path, 'feature_encoders.pkl'))
        self.scaler = joblib.load(os.path.join(load_path, 'scaler.pkl'))
        self.feature_columns = joblib.load(os.path.join(load_path, 'feature_columns.pkl'))
        
        print(f"Preprocessors loaded from {load_path}")

if __name__ == "__main__":
    # Test the feature engineering pipeline
    fe = FeatureEngineer()
    
    # Load and process data
    df = fe.load_data(fe.config['data']['raw_data_path'])
    df = fe.prepare_features(df)
    df = fe.prepare_target(df)
    
    # Split data
    X_train, X_test, y_train, y_test = fe.split_data(df)
    
    print("Feature engineering completed successfully!")
    print(f"Feature columns: {fe.feature_columns}")
    print(f"Target distribution in training set: {y_train.value_counts().to_dict()}")
