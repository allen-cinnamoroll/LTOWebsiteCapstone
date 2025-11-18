#!/usr/bin/env python3
"""
Scheduled retraining script for Accident Prediction Model
Runs automatically at the end of each month via systemd timer
"""

import os
import sys
import subprocess
import logging
from datetime import datetime, timedelta
from pathlib import Path

# Get script directory
script_dir = Path(__file__).parent.absolute()
project_root = script_dir.parent.parent.parent.parent

# Create logs directory if it doesn't exist (Windows-compatible)
logs_dir = script_dir / 'logs'
logs_dir.mkdir(exist_ok=True)
log_file = logs_dir / 'accident-prediction-retrain.log'

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(str(log_file)),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def is_last_day_of_month():
    """Check if today is the last day of the current month"""
    today = datetime.now()
    # Get tomorrow
    tomorrow = today + timedelta(days=1)
    # If tomorrow is the 1st, then today is the last day
    return tomorrow.day == 1


def main():
    """Main retraining function"""
    logger.info("=" * 80)
    logger.info("STARTING AUTOMATED MODEL RETRAINING")
    logger.info("=" * 80)
    logger.info(f"Timestamp: {datetime.now().isoformat()}")
    logger.info(f"Script directory: {script_dir}")
    
    # Check if this is the last day of the month or the 1st day
    today = datetime.now()
    if is_last_day_of_month():
        logger.info("Last day of month detected - proceeding with retraining")
    elif today.day == 1:
        logger.info("First day of month detected - retraining with previous month's complete data")
    else:
        logger.warning(f"Not the last day or 1st day of month (today is {today.day}). Exiting.")
        logger.info("Retraining will run automatically on the last day of the month or 1st day of next month")
        sys.exit(0)
    
    try:
        # Activate virtual environment and run training
        # Windows uses 'Scripts', Linux/Mac uses 'bin'
        import platform
        if platform.system() == 'Windows':
            venv_python = script_dir / 'venv' / 'Scripts' / 'python.exe'
        else:
            venv_python = script_dir / 'venv' / 'bin' / 'python'
        
        if not venv_python.exists():
            logger.error(f"Virtual environment not found at: {venv_python}")
            logger.error("Please create the virtual environment first:")
            logger.error("  cd backend/model/ml_models/accident_prediction")
            if platform.system() == 'Windows':
                logger.error("  python -m venv venv")
                logger.error("  venv\\Scripts\\activate")
            else:
                logger.error("  python3 -m venv venv")
                logger.error("  source venv/bin/activate")
            logger.error("  pip install -r requirements.txt")
            sys.exit(1)
        
        # Change to script directory
        os.chdir(script_dir)
        
        # Run training script
        logger.info("Step 1: Running training script...")
        train_script = script_dir / 'train_rf_model.py'
        
        if not train_script.exists():
            logger.error(f"Training script not found: {train_script}")
            sys.exit(1)
        
        result = subprocess.run(
            [str(venv_python), str(train_script)],
            cwd=str(script_dir),
            capture_output=True,
            text=True,
            timeout=3600  # 1 hour timeout
        )
        
        if result.returncode != 0:
            logger.error("Training failed!")
            logger.error(f"STDOUT:\n{result.stdout}")
            logger.error(f"STDERR:\n{result.stderr}")
            sys.exit(1)
        
        logger.info("Training completed successfully!")
        logger.info(f"STDOUT:\n{result.stdout}")
        
        # Step 2: Try to reload model via API endpoint first (if available)
        logger.info("Step 2: Attempting to reload model via API endpoint...")
        try:
            try:
                import requests
            except ImportError:
                logger.warning("requests library not available, skipping API reload")
                raise ImportError("requests not available")
            
            reload_url = 'http://localhost:5004/api/accidents/reload-model'
            reload_response = requests.post(reload_url, timeout=30)
            
            if reload_response.status_code == 200:
                logger.info("Model reloaded successfully via API endpoint")
            else:
                logger.warning(f"API reload failed (status {reload_response.status_code}), trying service restart...")
                raise Exception("API reload failed")
        
        except (ImportError, Exception) as api_error:
            logger.info(f"API reload not available or failed: {api_error}")
            logger.info("Falling back to service restart...")
            
            # Step 3: Restart Flask API service to load new model
            try:
                restart_result = subprocess.run(
                    ['sudo', 'systemctl', 'restart', 'accident-prediction-api'],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if restart_result.returncode == 0:
                    logger.info("Service restarted successfully")
                else:
                    logger.warning("Failed to restart service automatically")
                    logger.warning("Please restart manually: sudo systemctl restart accident-prediction-api")
                    logger.warning(f"STDERR: {restart_result.stderr}")
            
            except subprocess.TimeoutExpired:
                logger.warning("Service restart timed out")
            except FileNotFoundError:
                logger.warning("systemctl not found - cannot restart service automatically")
                logger.warning("Please restart manually: sudo systemctl restart accident-prediction-api")
            except Exception as e:
                logger.warning(f"Error restarting service: {e}")
                logger.warning("Please restart manually: sudo systemctl restart accident-prediction-api")
        
        logger.info("=" * 80)
        logger.info("RETRAINING COMPLETE!")
        logger.info("=" * 80)
        logger.info(f"Completion time: {datetime.now().isoformat()}")
        
        return 0
        
    except subprocess.TimeoutExpired:
        logger.error("Training process timed out after 1 hour")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error during retraining: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        sys.exit(1)


if __name__ == '__main__':
    sys.exit(main())

