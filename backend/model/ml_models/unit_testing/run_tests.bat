@echo off
REM Test runner script for Prediction Controller unit tests (Windows)
REM Run this script from the unit_testing directory

REM Change to the directory where this script is located
cd /d "%~dp0"

echo ==========================================
echo Prediction Controller Unit Tests
echo ==========================================
echo.

REM Check if pytest is installed
python -m pytest --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] pytest not found. Installing test dependencies...
    pip install -r test_requirements.txt
)

REM Run tests
echo Running SARIMA endpoint tests...
echo ----------------------------------------
python -m pytest test_sarima_endpoints.py -v

echo.
echo Running Random Forest endpoint tests...
echo ----------------------------------------
python -m pytest test_random_forest_endpoints.py -v

echo.
echo ==========================================
echo All tests completed!
echo ==========================================
pause

