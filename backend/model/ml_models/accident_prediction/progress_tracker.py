"""
Progress tracking utility for model training
Stores progress in a JSON file for frontend polling
"""

import json
import os
from datetime import datetime
from pathlib import Path


class ProgressTracker:
    """Track and store training progress"""
    
    def __init__(self, progress_file=None):
        """
        Initialize progress tracker
        
        Args:
            progress_file: Path to JSON file for storing progress. 
                          Default: progress.json in current directory
        """
        if progress_file is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            progress_file = os.path.join(current_dir, 'training_progress.json')
        
        self.progress_file = progress_file
        self.progress_dir = os.path.dirname(progress_file)
        os.makedirs(self.progress_dir, exist_ok=True)
    
    def update(self, step, step_name, progress_percent, message="", details=None):
        """
        Update training progress
        
        Args:
            step: Current step number (0-7)
            step_name: Name of the current step
            progress_percent: Progress percentage (0-100)
            message: Status message
            details: Additional details dict
        """
        progress_data = {
            'is_training': True,
            'step': step,
            'step_name': step_name,
            'progress': progress_percent,
            'message': message,
            'details': details or {},
            'timestamp': datetime.now().isoformat(),
            'start_time': self._get_start_time()
        }
        
        self._write_progress(progress_data)
    
    def cancel(self):
        """Mark training as cancelled"""
        progress_data = {
            'is_training': False,
            'completed': False,
            'cancelled': True,
            'progress': 0,
            'message': 'Training cancelled by user',
            'timestamp': datetime.now().isoformat(),
            'start_time': self._get_start_time(),
            'end_time': datetime.now().isoformat()
        }
        self._write_progress(progress_data)
    
    def complete(self, success=True, message="", details=None):
        """
        Mark training as complete
        
        Args:
            success: Whether training was successful
            message: Completion message
            details: Additional details dict
        """
        progress_data = {
            'is_training': False,
            'completed': True,
            'success': success,
            'progress': 100 if success else 0,
            'message': message,
            'details': details or {},
            'timestamp': datetime.now().isoformat(),
            'start_time': self._get_start_time(),
            'end_time': datetime.now().isoformat()
        }
        
        self._write_progress(progress_data)
    
    def is_cancelled(self):
        """Check if training was cancelled"""
        progress = self.get()
        return progress and progress.get('cancelled', False)
    
    def reset(self):
        """Reset progress tracking"""
        if os.path.exists(self.progress_file):
            os.remove(self.progress_file)
    
    def get(self):
        """
        Get current progress
        
        Returns:
            dict with progress data or None if no progress file exists
        """
        if not os.path.exists(self.progress_file):
            return None
        
        try:
            with open(self.progress_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return None
    
    def _write_progress(self, data):
        """Write progress to file"""
        try:
            # Write atomically by writing to temp file first, then renaming
            temp_file = self.progress_file + '.tmp'
            with open(temp_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            # Atomic rename
            if os.path.exists(self.progress_file):
                os.remove(self.progress_file)
            os.rename(temp_file, self.progress_file)
        except IOError as e:
            print(f"Error writing progress file: {e}")
    
    def _get_start_time(self):
        """Get start time from existing progress file"""
        progress = self.get()
        if progress and 'start_time' in progress:
            return progress['start_time']
        return datetime.now().isoformat()

