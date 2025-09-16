"""
Model Loader for LTO Accident Prediction System
Handles model loading and initialization for the API
"""

import os
import joblib
import json
from datetime import datetime
import logging

class ModelLoader:
    def __init__(self, model_path):
        """Initialize model loader"""
        self.model_path = model_path
        self.models_loaded = False
        self.model_info = {}
        
        self.setup_logging()
        self.load_models()
    
    def setup_logging(self):
        """Setup logging"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
    
    def load_models(self):
        """Load all required models and artifacts"""
        try:
            # Check if model path exists
            if not os.path.exists(self.model_path):
                raise FileNotFoundError(f"Model path not found: {self.model_path}")
            
            # Load metadata
            metadata_path = os.path.join(self.model_path, 'model_metadata.json')
            if os.path.exists(metadata_path):
                with open(metadata_path, 'r') as f:
                    self.model_info = json.load(f)
            else:
                self.logger.warning("Model metadata not found")
            
            # Check for required model files
            required_files = [
                'accident_rf_model.pkl',
                'accident_rule_system.pkl',
                'feature_encoders.pkl',
                'scaler.pkl',
                'feature_columns.pkl'
            ]
            
            missing_files = []
            for file in required_files:
                file_path = os.path.join(self.model_path, file)
                if not os.path.exists(file_path):
                    missing_files.append(file)
            
            if missing_files:
                raise FileNotFoundError(f"Missing model files: {missing_files}")
            
            self.models_loaded = True
            self.logger.info("All models loaded successfully")
            
        except Exception as e:
            self.logger.error(f"Error loading models: {str(e)}")
            self.models_loaded = False
            raise
    
    def get_model_info(self):
        """Get information about loaded models"""
        return {
            'models_loaded': self.models_loaded,
            'model_path': self.model_path,
            'model_info': self.model_info,
            'load_timestamp': datetime.now().isoformat()
        }
    
    def is_ready(self):
        """Check if models are ready for inference"""
        return self.models_loaded
    
    def reload_models(self):
        """Reload models (useful for model updates)"""
        self.logger.info("Reloading models...")
        self.models_loaded = False
        self.load_models()
        return self.is_ready()

class ModelManager:
    """Singleton model manager for the application"""
    
    _instance = None
    _predictor = None
    
    def __new__(cls, model_path=None):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
            if model_path:
                cls._instance.initialize(model_path)
        return cls._instance
    
    def initialize(self, model_path):
        """Initialize the model manager"""
        if not self._predictor:
            from predictor import AccidentPredictor
            self._predictor = AccidentPredictor(model_path)
            self.model_loader = ModelLoader(model_path)
    
    def get_predictor(self):
        """Get the predictor instance"""
        if not self._predictor:
            raise RuntimeError("Model manager not initialized. Call initialize() first.")
        return self._predictor
    
    def get_model_info(self):
        """Get model information"""
        if not self.model_loader:
            raise RuntimeError("Model manager not initialized. Call initialize() first.")
        return self.model_loader.get_model_info()
    
    def is_ready(self):
        """Check if models are ready"""
        if not self.model_loader:
            return False
        return self.model_loader.is_ready()
    
    def reload_models(self):
        """Reload models"""
        if not self.model_loader:
            raise RuntimeError("Model manager not initialized. Call initialize() first.")
        return self.model_loader.reload_models()

if __name__ == "__main__":
    # Test the model loader
    try:
        model_path = "../trained/"
        loader = ModelLoader(model_path)
        
        if loader.is_ready():
            print("Models loaded successfully!")
            info = loader.get_model_info()
            print(f"Model info: {json.dumps(info, indent=2)}")
        else:
            print("Models failed to load")
            
    except Exception as e:
        print(f"Model loading failed: {str(e)}")
