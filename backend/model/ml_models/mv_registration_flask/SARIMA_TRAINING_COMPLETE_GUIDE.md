# Complete SARIMA Training Guide - From Start to Finish

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Training Process](#step-by-step-training-process)
4. [Detailed Code Walkthrough](#detailed-code-walkthrough)
5. [Training Output and Results](#training-output-and-results)
6. [Troubleshooting](#troubleshooting)

---

## Overview

This document provides a **complete, step-by-step guide** on how the SARIMA (Seasonal AutoRegressive Integrated Moving Average) algorithm is trained from raw CSV data to a fully trained predictive model. Every step is documented with code locations, explanations, and expected outputs.

### What is SARIMA?

SARIMA is a time series forecasting model that:
- **AR (AutoRegressive)**: Uses past values to predict future values
- **I (Integrated)**: Uses differencing to make data stationary
- **MA (Moving Average)**: Uses past forecast errors
- **S (Seasonal)**: Captures repeating patterns (e.g., weekly, monthly cycles)

**Notation**: `SARIMA(p,d,q)(P,D,Q,s)`
- `(p,d,q)`: Non-seasonal parameters
- `(P,D,Q,s)`: Seasonal parameters
- `s`: Seasonal period (4 weeks for monthly patterns)

---

## Prerequisites

### Required Files

1. **Raw Data**: CSV files in `backend/model/ml_models/mv registration training/`
   - Required columns: `fileNo`, `dateOfRenewal`, `address_municipality`, `plateNo`
   - Date format: `MM/DD/YYYY` (e.g., "01/15/2025")

2. **Python Files**:
   - `data_preprocessor.py`: Data loading and preprocessing
   - `sarima_model.py`: SARIMA model implementation
   - `config.py`: Configuration settings

3. **Dependencies**:
   ```python
   pandas
   numpy
   statsmodels
   scipy
   ```

### Directory Structure

```
backend/model/ml_models/mv_registration_flask/
├── data_preprocessor.py          # Step 1: Data preprocessing
├── sarima_model.py              # Step 2-5: Model training
├── config.py                    # Configuration
├── mv registration training/     # Raw CSV data directory
│   └── DAVOR_data.csv
└── trained/                      # Output directory
    ├── sarima_model.pkl         # Trained model (after training)
    └── sarima_metadata.json     # Model metadata (after training)
```

---

## Step-by-Step Training Process

### **STEP 1: Initialize the Model**

**Location**: `sarima_model.py`, lines 18-50

**What Happens**:
1. Create a `SARIMAModel` instance
2. Set up file paths for saving/loading models
3. Initialize empty model variables

**Code**:
```python
from sarima_model import SARIMAModel

# Initialize model
model_dir = "backend/model/ml_models/mv_registration_flask/trained"
model = SARIMAModel(model_dir=model_dir, municipality=None)
```

**What Gets Initialized**:
- `self.model_dir`: Directory to save trained models
- `self.model_file`: Path to `.pkl` file (trained model)
- `self.metadata_file`: Path to `.json` file (model metadata)
- `self.model = None`: Will hold SARIMAX model object
- `self.fitted_model = None`: Will hold fitted model results
- `self.model_params = None`: Will hold optimal parameters

**Output**: Model object ready for training

---

### **STEP 2: Load and Preprocess Raw Data**

**Location**: `data_preprocessor.py`, `load_and_process_data()` method (lines 23-180)

#### **2.1: Load CSV Files**

**Code Location**: `data_preprocessor.py`, lines 38-66

**Process**:
1. Scan directory for all `.csv` files
2. Load each CSV file using `pd.read_csv()`
3. Combine all DataFrames into one
4. Track total rows loaded

**Code**:
```python
from data_preprocessor import DataPreprocessor

csv_path = "backend/model/ml_models/mv registration training/DAVOR_data.csv"
preprocessor = DataPreprocessor(csv_path)

# Load and process data
weekly_data, processing_info = preprocessor.load_and_process_data()
```

**Example Console Output**:
```
Found 3 CSV file(s) in directory: /path/to/data
Files: DAVOR_data.csv, DAVOR_data_june.csv, DAVOR_data_july.csv
  - Loaded DAVOR_data.csv: 4000 rows
  - Loaded DAVOR_data_june.csv: 1500 rows
  - Loaded DAVOR_data_july.csv: 500 rows
Combined total: 6000 rows from 3 CSV file(s)
```

**What Happens**:
- All CSV files in the directory are automatically detected
- Each file is loaded and concatenated
- Errors are logged but don't stop the process

---

#### **2.2: Remove Duplicates**

**Code Location**: `data_preprocessor.py`, lines 78-88

**Process**:
1. Identify duplicates using `fileNo + dateOfRenewal` as composite key
2. Keep first occurrence, remove rest
3. Count duplicates removed

**Code**:
```python
df = df.drop_duplicates(subset=['fileNo', 'dateOfRenewal'], keep='first')
```

**Why `fileNo` instead of `plateNo`?**
- Temporary plate numbers can be duplicates
- `fileNo` is unique per registration
- More reliable for duplicate detection

**Example Output**:
```
  - Removed 45 duplicate rows using fileNo + dateOfRenewal
```

---

#### **2.3: Filter by Municipality**

**Code Location**: `data_preprocessor.py`, lines 92-100

**Process**:
1. Normalize municipality names (uppercase, strip whitespace)
2. Filter for Davao Oriental municipalities only
3. Municipality list from `config.py`:
   - BAGANGA, BANAYBANAY, BOSTON, CARAGA, CATEEL
   - GOVERNOR GENEROSO, LUPON, MANAY, SAN ISIDRO
   - TARRAGONA, CITY OF MATI

**Code**:
```python
df['municipality_upper'] = df['address_municipality'].str.upper().str.strip()
davao_mask = df['municipality_upper'].isin(self.davao_oriental_municipalities)
df_filtered = df[davao_mask].copy()
```

**Example Output**:
```
Filtered to 5800 rows from Davao Oriental municipalities
```

---

#### **2.4: Parse Dates**

**Code Location**: `data_preprocessor.py`, lines 105-113

**Process**:
1. Parse `dateOfRenewal` column using format `MM/DD/YYYY`
2. Convert invalid dates to `NaT` (Not a Time)
3. Drop rows with invalid dates

**Code**:
```python
df_filtered['dateOfRenewal_parsed'] = pd.to_datetime(
    df_filtered['dateOfRenewal'],
    format='%m/%d/%Y',
    errors='coerce'
)
df_filtered = df_filtered.dropna(subset=['dateOfRenewal_parsed'])
```

**Example Output**:
```
After date parsing: 5750 rows
```

**Why `errors='coerce'`?**
- Prevents crashes on invalid dates
- Invalid dates become `NaT` and are dropped
- Process continues with valid data

---

#### **2.5: Aggregate to Weekly Totals**

**Code Location**: `data_preprocessor.py`, lines 120-148

**Process**:
1. Extract temporal features: year, month, week (ISO calendar)
2. Create `year_week` identifier (e.g., "2025-10")
3. Calculate `week_start` (Sunday of that week)
4. Group by week and count registrations
5. Set `week_start` as time series index

**Code**:
```python
# Extract week information
df_filtered['year'] = df_filtered['dateOfRenewal_parsed'].dt.year
df_filtered['week'] = df_filtered['dateOfRenewal_parsed'].dt.isocalendar().week
df_filtered['year_week'] = (
    df_filtered['year'].astype(str) + '-' + 
    df_filtered['week'].astype(str).str.zfill(2)
)
df_filtered['week_start'] = df_filtered['dateOfRenewal_parsed'].dt.to_period('W-SUN').dt.start_time

# Aggregate by week
weekly_data = df_filtered.groupby(['week_start', 'year_week']).agg({
    'plateNo': 'count'
}).rename(columns={'plateNo': 'count'}).reset_index()

# Set index
weekly_data = weekly_data.set_index('week_start')
weekly_data.index = pd.to_datetime(weekly_data.index)
```

**Example Output**:
```
Aggregated to 27 weeks
Date range: 2025-01-05 to 2025-07-06
```

---

#### **2.6: Filter Zero Weeks**

**Code Location**: `data_preprocessor.py`, lines 146-148

**Process**:
1. Remove weeks with zero registrations
2. Keep only weeks with actual data

**Code**:
```python
weekly_data = weekly_data[weekly_data['count'] > 0].copy()
```

**Why Filter Zero Weeks?**
- SARIMA works better with sparse data (only active weeks)
- Filling zeros creates artificial patterns
- Model learns from actual registration patterns

**Example Output**:
```
After filtering zero weeks: 21 weeks with registrations
Weeks with data: 8500 total registrations
Mean per week: 404.8
Actual registration date range: 2025-01-02 to 2025-07-28
```

**Final Output Structure**:
```python
weekly_data = DataFrame with:
  - Index: week_start dates (DatetimeIndex)
  - Column: 'count' (weekly registration totals)
  - Only weeks with registrations > 0
```

---

### **STEP 3: Split Data into Training and Test Sets**

**Location**: `sarima_model.py`, `train()` method, lines 177-192

**Process**:
1. Extract time series from DataFrame
2. Split chronologically: 80% training, 20% testing
3. Store all three datasets: training, test, and all data

**Code**:
```python
# Extract series
series = data['count']  # pandas Series with week_start as index

# Split data: 80% training, 20% testing (chronological split)
split_idx = int(len(series) * 0.8)
train_series = series.iloc[:split_idx]  # First 80%
test_series = series.iloc[split_idx:]   # Last 20%

# Store data
self.training_data = train_series.to_frame('count')
self.test_data = test_series.to_frame('count')
self.all_data = series.to_frame('count')  # Entire dataset
```

**Why Chronological Split?**
- Time series must maintain temporal order
- Random split would leak future information
- Test set represents true "future" predictions

**Example Output**:
```
Total data: 21 weeks
Training set: 16 weeks (76.2%)
Test set: 5 weeks (23.8%)
Training date range: 2025-01-05 to 2025-05-04
Test date range: 2025-05-11 to 2025-07-06
```

**Important**: 
- Training data is used for parameter selection and model fitting
- Test data is used ONLY for evaluation (not for training)
- `all_data` is stored to determine correct prediction start date

---

### **STEP 4: Find Optimal SARIMA Parameters**

**Location**: `sarima_model.py`, `find_optimal_parameters()` method (lines 56-154)

#### **4.1: Check Dataset Size**

**Code Location**: `sarima_model.py`, lines 74-89

**Process**:
1. Count number of weeks in dataset
2. If < 20 weeks: Use conservative fixed parameters
3. If ≥ 20 weeks: Proceed with grid search

**Code**:
```python
n_weeks = len(series)

if n_weeks < 20:
    print(f"Small dataset detected ({n_weeks} weeks). Using conservative parameters.")
    p, d, q = 1, 1, 1  # ARIMA(1,1,1)
    P, D, Q, s = 1, 1, 1, 4  # Seasonal: 4-week cycle
    return (p, d, q, P, D, Q, s)
```

**Why Conservative Parameters for Small Datasets?**
- Prevents overfitting
- Simple models generalize better with limited data
- Complex models risk learning noise instead of patterns

**Example Output** (if < 20 weeks):
```
Small dataset detected (18 weeks). Using conservative parameters.
Optimal parameters: SARIMA(1, 1, 1) x SARIMA(1, 1, 1, 4)
```

---

#### **4.2: Test for Stationarity (if ≥ 20 weeks)**

**Code Location**: `sarima_model.py`, lines 91-109

**Process**:
1. Filter out zero values (only test non-zero registrations)
2. Run Augmented Dickey-Fuller (ADF) test
3. Determine differencing order `d`:
   - p-value < 0.05 → Stationary → `d = 0`
   - p-value ≥ 0.05 → Non-stationary → `d = 1`

**Code**:
```python
# Check stationarity
non_zero_series = series_clean[series_clean != 0]
if len(non_zero_series) > 10:
    adf_result = adfuller(non_zero_series)
    is_stationary = adf_result[1] < 0.05
else:
    is_stationary = False  # Assume non-stationary if too few values

# Determine differencing order
d = 0 if is_stationary else 1
```

**What is Stationarity?**
- Stationary: Mean and variance constant over time
- Non-stationary: Has trend (needs differencing)
- Differencing removes trend: `y_t - y_{t-1}`

**Example Output**:
```
ADF test p-value: 0.12 (non-stationary)
Using d = 1 (first-order differencing)
```

---

#### **4.3: Set Seasonal Period**

**Code Location**: `sarima_model.py`, line 112

**Process**:
1. Set seasonal period `s = 4` (4 weeks = 1 month)
2. Captures monthly seasonality in weekly data

**Code**:
```python
s = 4  # 4 weeks per month
```

**Why s = 4?**
- Weekly data aggregated into monthly patterns
- 4 weeks ≈ 1 month
- Captures monthly registration cycles

---

#### **4.4: Grid Search for Optimal Parameters (if ≥ 20 weeks)**

**Code Location**: `sarima_model.py`, lines 116-154

**Process**:
1. Define parameter grid (5 combinations)
2. For each combination:
   - Create temporary SARIMAX model
   - Fit model with `maxiter=50`
   - Calculate AIC (Akaike Information Criterion)
3. Select parameters with lowest AIC

**Parameter Grid**:
```python
param_grid = [
    (1, d, 1, 1, 1, 1, s),  # SARIMA(1,d,1)(1,1,1)4
    (1, d, 0, 1, 1, 1, s),  # SARIMA(1,d,0)(1,1,1)4
    (0, d, 1, 1, 1, 1, s),  # SARIMA(0,d,1)(1,1,1)4
    (1, d, 1, 0, 1, 1, s),  # SARIMA(1,d,1)(0,1,1)4
    (1, d, 1, 1, 0, 1, s),  # SARIMA(1,d,1)(1,0,1)4
]
```

**Code**:
```python
best_aic = np.inf
best_params = None

for params in param_grid:
    try:
        p, d, q, P, D, Q, s = params
        temp_model = SARIMAX(
            series,
            order=(p, d, q),
            seasonal_order=(P, D, Q, s),
            enforce_stationarity=False,
            enforce_invertibility=False
        )
        temp_fitted = temp_model.fit(disp=False, maxiter=50)
        
        if temp_fitted.aic < best_aic:
            best_aic = temp_fitted.aic
            best_params = params
    except Exception as e:
        print(f"Error with parameters {params}: {str(e)}")
        continue
```

**What is AIC?**
- **Akaike Information Criterion**: Balances model fit and complexity
- Lower AIC = Better model (better fit with penalty for complexity)
- Prevents overfitting

**Example Output**:
```
Testing SARIMA(1,1,1)(1,1,1)4... AIC: 245.32
Testing SARIMA(1,1,0)(1,1,1)4... AIC: 248.15
Testing SARIMA(0,1,1)(1,1,1)4... AIC: 251.42
Testing SARIMA(1,1,1)(0,1,1)4... AIC: 247.89
Testing SARIMA(1,1,1)(1,0,1)4... AIC: 246.11
Optimal parameters: SARIMA(1, 1, 1) x SARIMA(1, 1, 1, 4)
```

**Final Parameters** (typical):
- **Order (p, d, q)**: `(1, 1, 1)`
  - `p = 1`: Autoregressive order 1 (uses 1 previous value)
  - `d = 1`: First-order differencing (removes trend)
  - `q = 1`: Moving average order 1 (uses 1 previous error)
- **Seasonal Order (P, D, Q, s)**: `(1, 1, 1, 4)`
  - `P = 1`: Seasonal autoregressive order 1
  - `D = 1`: Seasonal differencing order 1
  - `Q = 1`: Seasonal moving average order 1
  - `s = 4`: Seasonal period (4 weeks = monthly pattern)

---

### **STEP 5: Create and Fit the SARIMA Model**

**Location**: `sarima_model.py`, `train()` method, lines 202-218

#### **5.1: Create SARIMAX Model**

**Code**:
```python
self.model = SARIMAX(
    train_series,  # Training data only
    order=(p, d, q),  # Non-seasonal parameters
    seasonal_order=(P, D, Q, s),  # Seasonal parameters
    enforce_stationarity=False,  # Relaxed constraints
    enforce_invertibility=False  # More flexible estimation
)
```

**Parameters Explained**:
- `enforce_stationarity=False`: Allows non-stationary data (needed for small datasets)
- `enforce_invertibility=False`: More flexible parameter estimation

**Why Relaxed Constraints?**
- Small datasets may not meet strict requirements
- Allows model to fit better with limited data
- Trade-off: Slightly less stable forecasts (acceptable for small datasets)

---

#### **5.2: Fit the Model**

**Code**:
```python
self.fitted_model = self.model.fit(disp=False, maxiter=100)
```

**What Happens During Fitting**:
1. Model estimates parameters using Maximum Likelihood Estimation (MLE)
2. Iteratively optimizes parameters to minimize prediction error
3. Maximum 100 iterations (usually converges in 20-50 iterations)
4. `disp=False` suppresses verbose output

**Example Output**:
```
Fitting SARIMA model with parameters: order=(1, 1, 1), seasonal=(1, 1, 1, 4)
Model fitting completed!
```

**What Gets Stored**:
- `self.fitted_model`: Fitted SARIMAXResults object
  - Contains all estimated parameters
  - Can generate predictions
  - Contains residuals for diagnostics

---

### **STEP 6: Calculate Accuracy Metrics**

**Location**: `sarima_model.py`, methods:
- `_calculate_accuracy_metrics()` (lines 281-319): Training set metrics
- `_calculate_test_accuracy()` (lines 321-371): Test set metrics

#### **6.1: Training Set Metrics (In-Sample)**

**Code Location**: `sarima_model.py`, lines 281-319

**Process**:
1. Get fitted values (model's predictions on training data)
2. Compare actual vs. fitted values
3. Calculate MAE, RMSE, MAPE

**Code**:
```python
# Get fitted values (in-sample predictions)
fitted_values = self.fitted_model.fittedvalues

# Calculate metrics
mae = np.mean(np.abs(actual_series - fitted_values))
mse = np.mean((actual_series - fitted_values) ** 2)
rmse = np.sqrt(mse)

# MAPE (avoid division by zero)
non_zero_mask = actual_series != 0
mape = np.mean(np.abs((actual_series[non_zero_mask] - fitted_values[non_zero_mask]) 
                      / actual_series[non_zero_mask])) * 100
```

**Metrics Explained**:
- **MAE (Mean Absolute Error)**: Average prediction error in registration units
  - Formula: `mean(|actual - predicted|)`
  - Example: MAE = 86.31 means average error is 86 registrations
- **RMSE (Root Mean Square Error)**: Penalizes large errors more
  - Formula: `sqrt(mean((actual - predicted)²))`
  - Example: RMSE = 113.98 means typical error is ~114 registrations
- **MAPE (Mean Absolute Percentage Error)**: Percentage error
  - Formula: `mean(|(actual - predicted) / actual|) × 100%`
  - Example: MAPE = 29.07% means 71% accuracy (100% - 29.07%)

**Example Output**:
```
Training Accuracy (In-Sample) - MAE: 86.31, RMSE: 113.98, MAPE: 29.07%
```

---

#### **6.2: Test Set Metrics (Out-of-Sample)**

**Code Location**: `sarima_model.py`, lines 321-371

**Process**:
1. Generate forecasts for test period (future predictions)
2. Compare actual test values vs. forecasted values
3. Calculate MAE, RMSE, MAPE

**Code**:
```python
# Generate forecasts for test period
forecast_steps = len(test_series)
forecast = self.fitted_model.forecast(steps=forecast_steps)

# Calculate metrics
test_values = test_series.values.flatten()
mae = np.mean(np.abs(test_values - forecast))
mse = np.mean((test_values - forecast) ** 2)
rmse = np.sqrt(mse)

# MAPE
non_zero_mask = test_values != 0
mape = np.mean(np.abs((test_non_zero - forecast_non_zero) / test_non_zero)) * 100
```

**Why Test Metrics Matter**:
- **In-sample metrics** (training): How well model fits historical data
- **Out-of-sample metrics** (test): How well model predicts unseen data
- Test metrics are more reliable for real-world performance

**Example Output**:
```
=== Test Set Performance (Out-of-Sample) ===
MAE: 93.69, RMSE: 117.43, MAPE: 28.30%
=============================================
```

**Performance Interpretation**:
- ✅ Test MAPE similar to training MAPE → No overfitting
- ✅ MAPE < 30% → Acceptable for 5 months of data
- ⚠️ Target: <10% MAPE for 90%+ accuracy (requires 1.5-2 years of data)

---

### **STEP 7: Calculate Diagnostic Metrics**

**Location**: `sarima_model.py`, `_calculate_diagnostics()` method (lines 373-476)

#### **7.1: Ljung-Box Test (Residual Randomness)**

**Code Location**: `sarima_model.py`, lines 395-409

**Process**:
1. Get model residuals (actual - predicted)
2. Run Ljung-Box test to check if residuals are random
3. Null hypothesis: Residuals are random (white noise)
4. p-value > 0.05 → Residuals are random (good!)

**Code**:
```python
# Get residuals
residuals = self.fitted_model.resid
residuals_clean = residuals.dropna()

# Ljung-Box test
ljung_box = acorr_ljungbox(residuals_clean, lags=min(10, len(residuals_clean)//2), return_df=True)
ljung_box_pvalue = float(ljung_box['lb_pvalue'].iloc[-1])
residuals_random = ljung_box_pvalue > 0.05
```

**What Are Residuals?**
- Residuals = Actual values - Predicted values
- Random residuals = Model captured all patterns
- Non-random residuals = Model missing patterns

**Example Output**:
```
Residuals Random: True (p-value: 0.0823)
✓ Residuals appear random - model fits well!
```

---

#### **7.2: Residual Statistics**

**Code Location**: `sarima_model.py`, lines 411-413

**Process**:
1. Calculate mean and standard deviation of residuals
2. Mean should be close to 0 (no systematic bias)
3. Standard deviation measures prediction variability

**Code**:
```python
residuals_mean = float(residuals_clean.mean())
residuals_std = float(residuals_clean.std())
```

**Example Output**:
```
Residuals Mean: 0.0234, Std: 98.45
```

---

#### **7.3: ACF/PACF Analysis**

**Code Location**: `sarima_model.py`, lines 415-449

**Process**:
1. Calculate ACF (Autocorrelation Function) and PACF (Partial Autocorrelation Function)
2. Check for leftover autocorrelation in residuals
3. Values should be within ±0.2 for good model

**Code**:
```python
acf_values, acf_confint = acf(residuals_clean, nlags=max_lags, alpha=0.05, fft=True)
pacf_values, pacf_confint = pacf(residuals_clean, nlags=max_lags, alpha=0.05)
```

**What is ACF/PACF?**
- **ACF**: Correlation between residuals at different lags
- **PACF**: Partial correlation (removes indirect effects)
- Random residuals → ACF/PACF values near 0

**Example Output**:
```
=== Model Diagnostics ===
Residuals Random: True (p-value: 0.0823)
Residuals Mean: 0.0234, Std: 98.45
✓ Residuals appear random - model fits well!
=======================
```

---

### **STEP 8: Save the Trained Model**

**Location**: `sarima_model.py`, `save_model()` method (lines 597-639)

**Process**:
1. Create model directory if it doesn't exist
2. Save fitted model to `.pkl` file (pickle format)
3. Save metadata to `.json` file

**Code**:
```python
# Save fitted model
with open(self.model_file, 'wb') as f:
    pickle.dump(self.fitted_model, f)

# Save metadata
metadata = {
    'model_params': self.model_params,
    'accuracy_metrics': self.accuracy_metrics,
    'last_trained': datetime.now().isoformat(),
    'training_weeks': len(self.training_data),
    'date_range': {
        'start': str(self.training_data.index.min()),
        'end': str(self.training_data.index.max())
    },
    'last_data_date': last_data_date  # Last date from entire dataset
}

with open(self.metadata_file, 'w') as f:
    json.dump(metadata, f, indent=2)
```

**Files Created**:
- `trained/sarima_model.pkl`: Fitted model (binary, ~50-200 KB)
- `trained/sarima_metadata.json`: Model metadata (text, ~2-5 KB)

**Example Output**:
```
Model saved to trained/sarima_model.pkl
```

---

## Detailed Code Walkthrough

### Complete Training Script Example

```python
# Step 1: Import required modules
from data_preprocessor import DataPreprocessor
from sarima_model import SARIMAModel
import os

# Step 2: Set up paths
base_dir = os.path.dirname(os.path.abspath(__file__))
data_dir = os.path.join(base_dir, '../mv registration training')
model_dir = os.path.join(base_dir, '../trained')
csv_path = os.path.join(data_dir, 'DAVOR_data.csv')

# Step 3: Initialize preprocessor
preprocessor = DataPreprocessor(csv_path)

# Step 4: Load and preprocess data
print("Loading and preprocessing data...")
weekly_data, processing_info = preprocessor.load_and_process_data()

print(f"\nData Summary:")
print(f"  Total weeks: {len(weekly_data)}")
print(f"  Date range: {weekly_data.index.min()} to {weekly_data.index.max()}")
print(f"  Total registrations: {weekly_data['count'].sum()}")
print(f"  Mean per week: {weekly_data['count'].mean():.1f}")

# Step 5: Initialize model
print("\nInitializing SARIMA model...")
model = SARIMAModel(model_dir=model_dir, municipality=None)

# Step 6: Train model
print("\nTraining model...")
training_info = model.train(
    data=weekly_data,
    force=False,  # Set to True to retrain existing model
    processing_info=processing_info
)

# Step 7: Display results
print("\n" + "="*60)
print("TRAINING COMPLETE")
print("="*60)
print(f"\nModel Parameters: {training_info['model_params']}")
print(f"\nTraining Accuracy (In-Sample):")
print(f"  MAE: {training_info['accuracy_metrics']['mae']:.2f}")
print(f"  RMSE: {training_info['accuracy_metrics']['rmse']:.2f}")
print(f"  MAPE: {training_info['accuracy_metrics']['mape']:.2f}%")

if training_info['test_accuracy_metrics']:
    print(f"\nTest Accuracy (Out-of-Sample):")
    print(f"  MAE: {training_info['test_accuracy_metrics']['mae']:.2f}")
    print(f"  RMSE: {training_info['test_accuracy_metrics']['rmse']:.2f}")
    print(f"  MAPE: {training_info['test_accuracy_metrics']['mape']:.2f}%")

print(f"\nModel saved to: {model.model_file}")
```

---

## Training Output and Results

### Expected Console Output

```
Loading and preprocessing data...
Found 3 CSV file(s) in directory: /path/to/data
Files: DAVOR_data.csv, DAVOR_data_june.csv, DAVOR_data_july.csv
  - Loaded DAVOR_data.csv: 4000 rows
  - Loaded DAVOR_data_june.csv: 1500 rows
  - Loaded DAVOR_data_july.csv: 500 rows
  - Removed 45 duplicate rows using fileNo + dateOfRenewal
Combined total: 5955 rows from 3 CSV file(s)
Filtered to 5800 rows from Davao Oriental municipalities
After date parsing: 5750 rows
Aggregated to 27 weeks
Date range: 2025-01-05 to 2025-07-06
After filtering zero weeks: 21 weeks with registrations
Weeks with data: 8500 total registrations
Mean per week: 404.8
Actual registration date range: 2025-01-02 to 2025-07-28

Data Summary:
  Total weeks: 21
  Date range: 2025-01-05 00:00:00 to 2025-07-06 00:00:00
  Total registrations: 8500
  Mean per week: 404.8

Initializing SARIMA model...

Training model...
Training SARIMA model...
Total data: 21 weeks
Training set: 16 weeks (76.2%)
Test set: 5 weeks (23.8%)
Training date range: 2025-01-05 to 2025-05-04
Test date range: 2025-05-11 to 2025-07-06
Finding optimal SARIMA parameters...
Small dataset detected (16 weeks). Using conservative parameters.
Optimal parameters: SARIMA(1, 1, 1) x SARIMA(1, 1, 1, 4)
Fitting SARIMA model with parameters: order=(1, 1, 1), seasonal=(1, 1, 1, 4)
Model fitting completed!
Training Accuracy (In-Sample) - MAE: 86.31, RMSE: 113.98, MAPE: 29.07%

=== Test Set Performance (Out-of-Sample) ===
MAE: 93.69, RMSE: 117.43, MAPE: 28.30%
=============================================

=== Model Diagnostics ===
Residuals Random: True (p-value: 0.0823)
Residuals Mean: 0.0234, Std: 98.45
✓ Residuals appear random - model fits well!
=======================

Model saved to trained/sarima_model.pkl

============================================================
TRAINING COMPLETE
============================================================

Model Parameters: {'order': (1, 1, 1), 'seasonal_order': (1, 1, 1, 4), 'full_params': (1, 1, 1, 1, 1, 1, 4)}

Training Accuracy (In-Sample):
  MAE: 86.31
  RMSE: 113.98
  MAPE: 29.07%

Test Accuracy (Out-of-Sample):
  MAE: 93.69
  RMSE: 117.43
  MAPE: 28.30%

Model saved to: trained/sarima_model.pkl
```

---

### Saved Files

#### 1. `sarima_model.pkl` (Pickle File)
- **Format**: Binary pickle file
- **Size**: ~50-200 KB
- **Contents**: Fitted SARIMAXResults object
- **Usage**: Loaded for predictions

#### 2. `sarima_metadata.json` (JSON File)
- **Format**: JSON text file
- **Size**: ~2-5 KB
- **Contents**:
```json
{
  "model_params": {
    "order": [1, 1, 1],
    "seasonal_order": [1, 1, 1, 4],
    "full_params": [1, 1, 1, 1, 1, 1, 4]
  },
  "accuracy_metrics": {
    "mae": 86.31,
    "rmse": 113.98,
    "mape": 29.07,
    "mean_actual": 404.8,
    "std_actual": 125.3
  },
  "last_trained": "2025-07-29T10:30:45.123456",
  "training_weeks": 16,
  "date_range": {
    "start": "2025-01-05 00:00:00",
    "end": "2025-05-04 00:00:00"
  },
  "last_data_date": "2025-07-28 00:00:00"
}
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. **"No CSV files found"**
**Error**: `FileNotFoundError: No CSV files found in: /path/to/data`

**Solution**:
- Check that CSV files exist in `mv registration training/` directory
- Verify file extensions are `.csv` (not `.CSV` or `.csv.txt`)
- Check file permissions

---

#### 2. **"Missing required columns"**
**Error**: `ValueError: CSV file is missing required columns: dateOfRenewal`

**Solution**:
- Ensure CSV has columns: `fileNo`, `dateOfRenewal`, `address_municipality`, `plateNo`
- Check column names match exactly (case-sensitive)
- Verify CSV is not corrupted

---

#### 3. **"No data found for Davao Oriental municipalities"**
**Error**: `ValueError: No data found for Davao Oriental municipalities`

**Solution**:
- Check municipality names in CSV match those in `config.py`
- Verify municipality names are spelled correctly
- Check for extra spaces or special characters

---

#### 4. **"Model fitting failed"**
**Error**: `Error fitting model: ...`

**Possible Causes**:
- Insufficient data (< 10 weeks)
- All zeros in time series
- Numerical instability

**Solution**:
- Ensure at least 10-12 weeks of data
- Check that not all values are zero
- Try using `force=True` to retrain

---

#### 5. **"Test set is empty"**
**Warning**: `Warning: Test set is empty, skipping test metrics`

**Cause**: Dataset too small (< 5 weeks)

**Solution**:
- Collect more data (need at least 10-12 weeks)
- Test metrics require separate test set

---

#### 6. **"ADF test failed"**
**Warning**: `ADF test failed: ... Assuming non-stationary.`

**Solution**:
- This is usually fine (model uses `d=1` to handle non-stationarity)
- If persistent, check data quality

---

### Performance Issues

#### **Training Takes Too Long**
- **Cause**: Large dataset or complex parameters
- **Solution**: 
  - Reduce `maxiter` in grid search (line 138: `maxiter=50`)
  - Use smaller parameter grid
  - For very large datasets, consider sampling

#### **High MAPE (> 40%)**
- **Cause**: Insufficient data or noisy data
- **Solution**:
  - Collect more data (target: 1.5-2 years)
  - Check for outliers
  - Verify data quality

---

## Summary

### Complete Training Flow

```
1. Initialize Model
   ↓
2. Load CSV Files
   ↓
3. Remove Duplicates
   ↓
4. Filter Municipalities
   ↓
5. Parse Dates
   ↓
6. Aggregate to Weekly Totals
   ↓
7. Filter Zero Weeks
   ↓
8. Split Data (80/20)
   ↓
9. Find Optimal Parameters
   ├─ Check dataset size
   ├─ Test stationarity
   ├─ Set seasonal period
   └─ Grid search (if ≥ 20 weeks)
   ↓
10. Create SARIMAX Model
   ↓
11. Fit Model
   ↓
12. Calculate Training Metrics
   ↓
13. Calculate Test Metrics
   ↓
14. Calculate Diagnostics
   ↓
15. Save Model
   ↓
16. DONE! ✅
```

### Key Takeaways

1. **Data Quality Matters**: Clean, deduplicated data produces better models
2. **Chronological Split**: Time series must maintain temporal order
3. **Adaptive Parameters**: Model adapts to dataset size
4. **Comprehensive Evaluation**: Training, test, and diagnostic metrics
5. **Model Persistence**: Trained models are saved for future use

### Next Steps After Training

1. **Load Model**: `model.load_model()`
2. **Generate Predictions**: `model.predict(weeks=4)`
3. **Monitor Performance**: Retrain periodically with new data
4. **Improve Accuracy**: Collect more data (target: 1.5-2 years)

---

**End of Complete Training Guide**

