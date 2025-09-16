"""
Data Preprocessor for Inference
Handles real-time data preprocessing for model predictions
"""

import pandas as pd
import numpy as np
from datetime import datetime
import joblib
import os
import yaml

class InferencePreprocessor:
    def __init__(self, model_path):
        """Initialize preprocessor with trained model artifacts"""
        self.model_path = model_path
        self.label_encoders = None
        self.scaler = None
        self.feature_columns = None
        self.config = None
        
        self.load_preprocessors()
        self.load_config()
    
    def load_preprocessors(self):
        """Load trained preprocessors"""
        try:
            self.label_encoders = joblib.load(os.path.join(self.model_path, 'feature_encoders.pkl'))
            self.scaler = joblib.load(os.path.join(self.model_path, 'scaler.pkl'))
            self.feature_columns = joblib.load(os.path.join(self.model_path, 'feature_columns.pkl'))
            print("Preprocessors loaded successfully")
        except Exception as e:
            print(f"Error loading preprocessors: {str(e)}")
            raise
    
    def load_config(self):
        """Load model configuration"""
        try:
            with open(os.path.join(self.model_path, 'model_metadata.json'), 'r') as f:
                import json
                metadata = json.load(f)
                self.config = metadata.get('config', {})
        except Exception as e:
            print(f"Warning: Could not load config: {str(e)}")
            self.config = {}
    
    def preprocess_single_record(self, record):
        """Preprocess a single accident record for prediction"""
        try:
            # Convert to DataFrame
            df = pd.DataFrame([record])
            
            # Convert date if present
            if 'accident_date' in df.columns:
                df['accident_date'] = pd.to_datetime(df['accident_date'])
            
            # Extract temporal features
            df = self._extract_temporal_features(df)
            
            # Extract location features
            df = self._extract_location_features(df)
            
            # Encode categorical features
            df = self._encode_categorical_features(df)
            
            # Scale numerical features
            df = self._scale_numerical_features(df)
            
            # Ensure all required features are present
            df = self._ensure_feature_columns(df)
            
            return df[self.feature_columns]
            
        except Exception as e:
            print(f"Error preprocessing record: {str(e)}")
            raise
    
    def _extract_temporal_features(self, df):
        """Extract temporal features from accident_date"""
        if 'accident_date' in df.columns:
            df['year'] = df['accident_date'].dt.year
            df['month'] = df['accident_date'].dt.month
            df['day'] = df['accident_date'].dt.day
            df['day_of_week'] = df['accident_date'].dt.dayofweek
            df['hour'] = df['accident_date'].dt.hour
            df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
            df['is_rush_hour'] = df['hour'].isin([7, 8, 17, 18]).astype(int)
        return df
    
    def _extract_location_features(self, df):
        """Extract location-based features"""
        # Create location clusters (simplified for inference)
        if 'latitude' in df.columns and 'longitude' in df.columns:
            # Simple binning approach for inference
            df['location_cluster'] = self._simple_location_cluster(
                df['latitude'].iloc[0], df['longitude'].iloc[0]
            )
        
        # Extract road type from street names
        if 'street' in df.columns:
            df['road_type'] = df['street'].apply(self._extract_road_type)
        
        return df
    
    def _simple_location_cluster(self, lat, lon):
        """Simple location clustering for inference"""
        # This is a simplified version - in production, you'd use the same clustering
        # method used during training
        if pd.isna(lat) or pd.isna(lon):
            return 0
        
        # Simple grid-based clustering
        lat_bin = int((lat - 6.8) * 10) % 10
        lon_bin = int((lon - 125.9) * 10) % 10
        return lat_bin * 10 + lon_bin
    
    def _extract_road_type(self, street_name):
        """Extract road type from street name"""
        if pd.isna(street_name):
            return 'unknown'
        
        street_lower = str(street_name).lower()
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
    
    def _encode_categorical_features(self, df):
        """Encode categorical features using trained encoders"""
        categorical_features = ['vehicle_type', 'municipality', 'barangay', 'street', 'road_type', 'location_cluster']
        
        for feature in categorical_features:
            if feature in df.columns:
                if feature in self.label_encoders:
                    # Handle unseen categories
                    df[feature + '_encoded'] = df[feature].astype(str)
                    # Replace unseen categories with the most common category
                    most_common = self.label_encoders[feature].classes_[0]
                    df[feature + '_encoded'] = df[feature + '_encoded'].apply(
                        lambda x: x if x in self.label_encoders[feature].classes_ else most_common
                    )
                    df[feature + '_encoded'] = self.label_encoders[feature].transform(df[feature + '_encoded'])
                else:
                    df[feature + '_encoded'] = 0
        
        return df
    
    def _scale_numerical_features(self, df):
        """Scale numerical features using trained scaler"""
        numerical_features = ['latitude', 'longitude', 'year', 'month', 'day', 'day_of_week', 'hour']
        
        # Add encoded categorical features
        encoded_features = [col for col in df.columns if col.endswith('_encoded')]
        numerical_features.extend(encoded_features)
        
        # Filter features that exist in the dataframe
        existing_features = [f for f in numerical_features if f in df.columns]
        
        if existing_features:
            df[existing_features] = self.scaler.transform(df[existing_features])
        
        return df
    
    def _ensure_feature_columns(self, df):
        """Ensure all required feature columns are present"""
        for feature in self.feature_columns:
            if feature not in df.columns:
                df[feature] = 0  # Fill missing features with 0
        
        return df
    
    def preprocess_batch(self, records):
        """Preprocess multiple records for batch prediction"""
        try:
            processed_records = []
            for record in records:
                processed = self.preprocess_single_record(record)
                processed_records.append(processed.iloc[0])
            
            return pd.DataFrame(processed_records)
            
        except Exception as e:
            print(f"Error preprocessing batch: {str(e)}")
            raise

if __name__ == "__main__":
    # Test the preprocessor
    preprocessor = InferencePreprocessor("../trained/")
    
    # Test record
    test_record = {
        'accident_id': 'TEST-001',
        'plateNo': 'ABC-1234',
        'accident_date': '2024-01-15T10:30:00.000Z',
        'street': 'Rizal Street',
        'barangay': 'Poblacion',
        'municipality': 'Mati',
        'vehicle_type': 'car',
        'latitude': 6.95,
        'longitude': 126.20
    }
    
    try:
        processed = preprocessor.preprocess_single_record(test_record)
        print("Preprocessing successful!")
        print(f"Processed features shape: {processed.shape}")
        print(f"Feature columns: {list(processed.columns)}")
    except Exception as e:
        print(f"Preprocessing failed: {str(e)}")
