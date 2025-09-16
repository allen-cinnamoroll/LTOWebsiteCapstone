#!/bin/bash

# Training Script for LTO Accident Prediction Models
# This script trains Random Forest Classifier and Rule-Based System

echo "Starting LTO Accident Prediction Model Training..."

# Navigate to the training directory
cd backend/model/ml_models/training

# Check if Python virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/Scripts/activate  # For Windows
# source venv/bin/activate  # For Linux/Mac

# Install requirements
echo "Installing requirements..."
pip install -r requirements.txt

# Create necessary directories
echo "Creating directories..."
mkdir -p ../trained
mkdir -p ../../data/processed
mkdir -p ../../logs

# Run training
echo "Starting model training..."
python train_models.py

# Check if training was successful
if [ $? -eq 0 ]; then
    echo "Training completed successfully!"
    
    # Run evaluation
    echo "Running model evaluation..."
    python model_evaluation.py
    
    echo "Model training and evaluation completed!"
else
    echo "Training failed!"
    exit 1
fi

# Deactivate virtual environment
deactivate

echo "Training script completed!"
