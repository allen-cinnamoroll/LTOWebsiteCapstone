#!/bin/bash
# Test runner script for Prediction Controller unit tests
# Run this script from the unit_testing directory

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "Prediction Controller Unit Tests"
echo "=========================================="
echo ""

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo "⚠️  pytest not found. Installing test dependencies..."
    pip install -r test_requirements.txt
fi

# Run tests
echo "Running SARIMA endpoint tests..."
echo "----------------------------------------"
pytest test_sarima_endpoints.py -v

echo ""
echo "Running Random Forest endpoint tests..."
echo "----------------------------------------"
pytest test_random_forest_endpoints.py -v

echo ""
echo "=========================================="
echo "All tests completed!"
echo "=========================================="

