#!/bin/bash

# Quick start script for Vehicle Registration Prediction API
# Usage: ./start_api.sh

echo "=========================================="
echo "Vehicle Registration Prediction API"
echo "=========================================="

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "Current directory: $(pwd)"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install/upgrade dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create trained models directory if it doesn't exist
mkdir -p ../trained

# Check if CSV file exists
CSV_PATH="../../mv registration training/DAVOR_data.csv"
if [ ! -f "$CSV_PATH" ]; then
    echo "Warning: CSV file not found at $CSV_PATH"
    echo "Please ensure the data file exists before running predictions."
fi

echo ""
echo "Starting Flask API..."
echo "API will be available at: http://localhost:5000"
echo "Press Ctrl+C to stop the server"
echo ""

# Run the Flask application
python3 app.py

