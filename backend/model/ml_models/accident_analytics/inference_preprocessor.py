"""
Inference Preprocessor for Accident Analytics
Handles real-time data preprocessing using the same feature engineering as training
"""

import pandas as pd
import numpy as np
from datetime import datetime
import joblib
import os
import json

class AccidentInferencePreprocessor:
    """Preprocessor that matches the training feature engineering logic"""
    
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
        """Load trained preprocessors (encoders, scaler, feature columns)"""
        try:
            encoders_path = os.path.join(self.model_path, 'feature_encoders.pkl')
            scaler_path = os.path.join(self.model_path, 'scaler.pkl')
            columns_path = os.path.join(self.model_path, 'feature_columns.pkl')
            
            if os.path.exists(encoders_path):
                self.label_encoders = joblib.load(encoders_path)
            else:
                raise FileNotFoundError(f"Feature encoders not found at {encoders_path}")
            
            if os.path.exists(scaler_path):
                self.scaler = joblib.load(scaler_path)
            else:
                raise FileNotFoundError(f"Scaler not found at {scaler_path}")
            
            if os.path.exists(columns_path):
                self.feature_columns = joblib.load(columns_path)
            else:
                raise FileNotFoundError(f"Feature columns not found at {columns_path}")
            
            print(f"Preprocessors loaded successfully from {self.model_path}")
            print(f"Number of feature columns: {len(self.feature_columns)}")
            
        except Exception as e:
            print(f"Error loading preprocessors: {str(e)}")
            raise
    
    def load_config(self):
        """Load model configuration from metadata"""
        try:
            metadata_path = os.path.join(self.model_path, 'model_metadata.json')
            if os.path.exists(metadata_path):
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                    self.config = metadata.get('config', {})
                    print("Model configuration loaded successfully")
            else:
                print(f"Warning: Metadata not found at {metadata_path}")
                self.config = {}
        except Exception as e:
            print(f"Warning: Could not load config: {str(e)}")
            self.config = {}
    
    def preprocess_single_record(self, record):
        """
        Preprocess a single accident record for prediction
        Matches the feature engineering pipeline from training
        """
        try:
            # Convert to DataFrame
            df = pd.DataFrame([record])
            
            # Map dateCommited if accident_date is provided (for backward compatibility)
            if 'accident_date' in df.columns and 'dateCommited' not in df.columns:
                df['dateCommited'] = df['accident_date']
            elif 'dateCommited' not in df.columns:
                # Default to current date if not provided
                df['dateCommited'] = pd.Timestamp.now()
            
            # Convert date to datetime
            df['dateCommited'] = pd.to_datetime(df['dateCommited'])
            
            # Extract temporal features (matches training code)
            df = self._extract_temporal_features(df)
            
            # Extract location features
            df = self._extract_location_features(df)
            
            # Encode categorical features
            df = self._encode_categorical_features(df)
            
            # Scale numerical features
            df = self._scale_numerical_features(df)
            
            # Ensure all required feature columns are present
            df = self._ensure_feature_columns(df)
            
            # Return only the feature columns in the correct order
            return df[self.feature_columns]
            
        except Exception as e:
            print(f"Error preprocessing record: {str(e)}")
            raise
    
    def _extract_temporal_features(self, df):
        """Extract temporal features from dateCommited (matches training code)"""
        if 'dateCommited' in df.columns:
            df['year'] = df['dateCommited'].dt.year
            df['month'] = df['dateCommited'].dt.month
            df['day'] = df['dateCommited'].dt.day
            df['day_of_week'] = df['dateCommited'].dt.dayofweek
            
            # Extract hour if time data is available, otherwise default to 0
            if df['dateCommited'].dt.hour.notna().any():
                df['hour'] = df['dateCommited'].dt.hour
            else:
                df['hour'] = 0  # Default hour if not available
            
            df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
            df['is_rush_hour'] = df['hour'].isin([7, 8, 17, 18]).astype(int)
        else:
            # Default values if date not provided
            now = pd.Timestamp.now()
            df['year'] = now.year
            df['month'] = now.month
            df['day'] = now.day
            df['day_of_week'] = now.dayofweek
            df['hour'] = now.hour
            df['is_weekend'] = 1 if now.dayofweek in [5, 6] else 0
            df['is_rush_hour'] = 1 if now.hour in [7, 8, 17, 18] else 0
        
        return df
    
    def _extract_location_features(self, df):
        """Extract location-based features (matches training code)"""
        # Extract road type from street names
        if 'street' in df.columns:
            df['road_type'] = df['street'].apply(self._extract_road_type)
        else:
            df['road_type'] = 'unknown'
        
        return df
    
    def _extract_road_type(self, street_name):
        """Extract road type from street name (matches training code)"""
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
        # Get categorical features from config or use defaults
        if self.config and 'features' in self.config:
            categorical_features = self.config['features'].get('categorical_features', [])
        else:
            # Default categorical features from training
            categorical_features = ['incidentType', 'municipality', 'barangay', 'street', 
                                  'stageOfFelony', 'province', 'region']
        
        # Add road_type which is derived
        categorical_features = list(categorical_features) + ['road_type']
        
        for feature in categorical_features:
            if feature in df.columns:
                feature_key = feature
                if feature_key in self.label_encoders:
                    # Handle unseen categories by mapping to 'unknown' or most common class
                    df[feature + '_encoded'] = df[feature].astype(str).fillna('unknown')
                    
                    # Replace unseen categories with first class (most common during training)
                    if len(self.label_encoders[feature_key].classes_) > 0:
                        default_class = self.label_encoders[feature_key].classes_[0]
                    else:
                        default_class = 'unknown'
                    
                    # Check if values are in encoder classes
                    unseen_mask = ~df[feature + '_encoded'].isin(self.label_encoders[feature_key].classes_)
                    df.loc[unseen_mask, feature + '_encoded'] = default_class
                    
                    # Transform using encoder
                    df[feature + '_encoded'] = self.label_encoders[feature_key].transform(
                        df[feature + '_encoded']
                    )
                else:
                    # Encoder not found, set to 0
                    df[feature + '_encoded'] = 0
            else:
                # Feature not in input, create encoded column with 0
                df[feature + '_encoded'] = 0
        
        return df
    
    def _scale_numerical_features(self, df):
        """Scale numerical features using trained scaler"""
        # Get numerical features from config or use defaults
        if self.config and 'features' in self.config:
            numerical_features = self.config['features'].get('numerical_features', [])
        else:
            # Default numerical features
            numerical_features = ['lat', 'lng']
        
        # Add temporal features
        numerical_features = list(numerical_features) + ['year', 'month', 'day', 'day_of_week', 'hour']
        
        # Add encoded categorical features (they are treated as numerical after encoding)
        encoded_features = [col for col in df.columns if col.endswith('_encoded')]
        numerical_features.extend(encoded_features)
        
        # Ensure all numerical features exist with default values if missing
        for feature in numerical_features:
            if feature not in df.columns:
                # Feature is completely missing, add with default value
                if feature == 'lat':
                    df[feature] = 6.90543  # Approximate center of Davao Oriental
                elif feature == 'lng':
                    df[feature] = 125.971907  # Approximate center of Davao Oriental
                else:
                    df[feature] = 0
            else:
                # Feature exists but may have NaN values, fill with defaults
                if feature == 'lat':
                    df[feature] = df[feature].fillna(6.90543)
                elif feature == 'lng':
                    df[feature] = df[feature].fillna(125.971907)
                else:
                    df[feature] = df[feature].fillna(0)
        
        # Filter features that exist (should be all after above)
        existing_features = [f for f in numerical_features if f in df.columns]
        
        if existing_features and self.scaler:
            # Ensure all values are numeric
            for feature in existing_features:
                df[feature] = pd.to_numeric(df[feature], errors='coerce').fillna(0)
            
            try:
                df[existing_features] = self.scaler.transform(df[existing_features])
            except Exception as e:
                print(f"Warning: Scaling failed: {str(e)}. Using unscaled features.")
        
        return df
    
    def _ensure_feature_columns(self, df):
        """Ensure all required feature columns are present and in correct order"""
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
    import sys
    
    model_path = "../trained/"
    if len(sys.argv) > 1:
        model_path = sys.argv[1]
    
    try:
        preprocessor = AccidentInferencePreprocessor(model_path)
        
        # Test record
        test_record = {
            'incidentType': 'Traffic Accident',
            'municipality': 'Mati',
            'barangay': 'Poblacion',
            'street': 'Rizal Street',
            'stageOfFelony': 'Unknown',
            'province': 'Davao Oriental',
            'region': 'Region XI',
            'lat': 6.95,
            'lng': 126.20,
            'dateCommited': '2024-01-15T10:30:00.000Z'
        }
        
        processed = preprocessor.preprocess_single_record(test_record)
        print("Preprocessing successful!")
        print(f"Processed features shape: {processed.shape}")
        print(f"Feature columns: {list(processed.columns)}")
        print(f"Sample values:\n{processed.iloc[0]}")
        
    except Exception as e:
        print(f"Preprocessing failed: {str(e)}")
        import traceback
        traceback.print_exc()

