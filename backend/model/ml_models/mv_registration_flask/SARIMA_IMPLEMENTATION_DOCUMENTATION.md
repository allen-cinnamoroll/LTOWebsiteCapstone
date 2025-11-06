# SARIMA Model Implementation Documentation

## Table of Contents

1. [Data Preprocessing](#data-preprocessing)
2. [SARIMA Model Configuration](#sarima-model-configuration)
3. [Model Training Process](#model-training-process)
4. [Prediction Generation](#prediction-generation)
5. [Performance Evaluation](#performance-evaluation)
6. [Technical Implementation](#technical-implementation)

---

## Data Preprocessing

### Overview

The data preprocessing pipeline transforms raw daily vehicle registration data from CSV files into a weekly time series format suitable for SARIMA modeling.

### Implementation Location

**File**: `data_preprocessor.py`  
**Class**: `DataPreprocessor`

### Raw Data Cleaning and Preparation

#### 1. **Multi-File Data Loading**

```python
# Location: data_preprocessor.py, lines 38-66
```

**Process:**

- Automatically detects and loads all CSV files in the data directory
- Combines multiple CSV files into a single DataFrame
- Handles missing or corrupted files gracefully (logs warnings, continues)

**Key Steps:**

1. Scans directory for all `.csv` files
2. Loads each file using `pd.read_csv()`
3. Concatenates all DataFrames using `pd.concat()`
4. Tracks total rows loaded and files processed

**Example Output:**

```
Found 3 CSV file(s) in directory: /path/to/data
Files: DAVOR_data.csv, DAVOR_data_june.csv, DAVOR_data_july.csv
  - Loaded DAVOR_data.csv: 4000 rows
  - Loaded DAVOR_data_june.csv: 1500 rows
  - Loaded DAVOR_data_july.csv: 500 rows
```

#### 2. **Duplicate Removal**

```python
# Location: data_preprocessor.py, lines 78-88
```

**Method:**

- Uses `fileNo + dateOfRenewal` as composite key for duplicate detection
- `fileNo` is preferred over `plateNo` because temporary plate numbers can be duplicates
- Keeps the first occurrence (`keep='first'`)

**Why This Approach:**

- Prevents counting the same registration multiple times if data appears in multiple files
- More reliable than using plate numbers alone
- Preserves data integrity

**Implementation:**

```python
df = df.drop_duplicates(subset=['fileNo', 'dateOfRenewal'], keep='first')
```

#### 3. **Data Validation**

**Required Columns:**

- `fileNo`: Unique file identifier
- `dateOfRenewal`: Registration date (format: MM/DD/YYYY)
- `address_municipality`: Municipality name

**Validation Process:**

- Checks for missing required columns
- Raises descriptive error if columns are missing
- Lists found columns to help diagnose issues

#### 4. **Municipality Filtering**

```python
# Location: data_preprocessor.py, lines 92-100
```

**Process:**

- Normalizes municipality names to uppercase and strips whitespace
- Filters for Davao Oriental municipalities only (11 municipalities)
- Municipality list defined in `config.py`:
  - BAGANGA, BANAYBANAY, BOSTON, CARAGA, CATEEL
  - GOVERNOR GENEROSO, LUPON, MANAY, SAN ISIDRO
  - TARRAGONA, CITY OF MATI

**Implementation:**

```python
df['municipality_upper'] = df['address_municipality'].str.upper().str.strip()
davao_mask = df['municipality_upper'].isin(self.davao_oriental_municipalities)
df_filtered = df[davao_mask].copy()
```

### Date Processing and Validation

#### 1. **Date Parsing**

```python
# Location: data_preprocessor.py, lines 105-113
```

**Format**: `MM/DD/YYYY` (e.g., "01/15/2025")

**Process:**

- Uses `pd.to_datetime()` with explicit format specification
- `errors='coerce'` converts invalid dates to `NaT` (Not a Time) instead of raising errors
- Drops rows with invalid dates (cannot parse or NaT values)

**Implementation:**

```python
df_filtered['dateOfRenewal_parsed'] = pd.to_datetime(
    df_filtered['dateOfRenewal'],
    format='%m/%d/%Y',
    errors='coerce'
)
df_filtered = df_filtered.dropna(subset=['dateOfRenewal_parsed'])
```

**Validation:**

- Invalid dates are automatically removed
- Logs count of rows after date parsing
- Ensures only valid dates proceed to aggregation

#### 2. **Date Range Tracking**

```python
# Location: data_preprocessor.py, lines 157-161
```

**Purpose:**

- Tracks actual min/max registration dates (not week_start dates)
- Important for accurate prediction start date calculation
- Stored in `processing_info['actual_date_range']`

### Handling Missing Values and Outliers

#### Missing Values Strategy

**Current Approach:**

- **Date Parsing**: Invalid dates → Dropped (cannot be aggregated)
- **Missing Columns**: → Error raised (data structure issue)
- **Missing Municipalities**: → Filtered out (not in Davao Oriental)

**No Imputation:**

- SARIMA works better with actual data points
- Missing weeks are handled by not filling with zeros (see below)

#### Outlier Handling

**Current Approach:**

- **No explicit outlier removal**: All valid registrations are included
- **Weekly aggregation naturally smooths outliers**: Extreme daily values become part of weekly totals
- **SARIMA handles outliers**: Model accounts for variability in residuals

**Rationale:**

- Extreme values might represent real events (e.g., end-of-month rush)
- Removing them could hide important patterns
- Weekly aggregation reduces impact of single-day spikes

### Weekly Aggregation

```python
# Location: data_preprocessor.py, lines 120-135
```

#### Process:

1. **Extract Temporal Features:**

   - Year, Month, Week (ISO calendar week)
   - Year-Week identifier (e.g., "2025-10")
   - Week start date (Sunday of that week)

2. **Group by Week:**

   - Groups all daily registrations by `week_start` and `year_week`
   - Counts registrations per week using `groupby().agg({'plateNo': 'count'})`

3. **Set Time Series Index:**

   - Uses `week_start` as index
   - Converts to pandas DatetimeIndex for time series operations

4. **Filter Zero Weeks:**

   ```python
   # Location: data_preprocessor.py, lines 146-148
   weekly_data = weekly_data[weekly_data['count'] > 0].copy()
   ```

   **Why Filter Zero Weeks:**

   - SARIMA works better with sparse data (only weeks with activity)
   - Filling zeros creates artificial patterns
   - Model learns from actual registration patterns

**Output:**

- DataFrame with `week_start` as index
- Single `count` column with weekly registration totals
- Only weeks with actual registrations (no zeros)

---

## SARIMA Model Configuration

### Overview

The SARIMA model uses a **grid search approach** to find optimal parameters, with **adaptive strategies** based on dataset size.

### Implementation Location

**File**: `sarima_model.py`  
**Method**: `find_optimal_parameters()` (lines 56-154)

### Parameter Determination Strategy

#### 1. **Dataset Size Detection**

```python
# Location: sarima_model.py, lines 74-89
```

**Small Dataset Strategy (< 20 weeks):**

- Uses **conservative, fixed parameters**
- No grid search (avoids overfitting)
- Parameters: `SARIMA(1,1,1)(1,1,1,4)`

**Rationale:**

- Small datasets have limited patterns
- Complex models risk overfitting
- Conservative parameters generalize better

**Implementation:**

```python
if n_weeks < 20:
    print(f"Small dataset detected ({n_weeks} weeks). Using conservative parameters.")
    p, d, q = 1, 1, 1  # ARIMA(1,1,1)
    P, D, Q, s = 1, 1, 1, 4  # Seasonal: 4-week cycle
    return (p, d, q, P, D, Q, s)
```

#### 2. **Stationarity Testing**

```python
# Location: sarima_model.py, lines 91-109
```

**Method**: Augmented Dickey-Fuller (ADF) Test

**Process:**

1. Filters out zero values (only test non-zero registrations)
2. Requires minimum 10 non-zero values for ADF test
3. Tests null hypothesis: "Series is non-stationary"
4. p-value < 0.05 → Series is stationary → `d = 0`
5. p-value ≥ 0.05 → Series is non-stationary → `d = 1`

**Implementation:**

```python
non_zero_series = series_clean[series_clean != 0]
if len(non_zero_series) > 10:
    adf_result = adfuller(non_zero_series)
    is_stationary = adf_result[1] < 0.05
else:
    is_stationary = False  # Assume non-stationary if too few values

d = 0 if is_stationary else 1
```

#### 3. **Seasonal Period Selection**

```python
# Location: sarima_model.py, line 112
```

**Fixed Seasonal Period**: `s = 4`

**Rationale:**

- Weekly data aggregated into monthly patterns
- 4 weeks ≈ 1 month
- Captures monthly seasonality in vehicle registrations

#### 4. **Grid Search for Larger Datasets**

```python
# Location: sarima_model.py, lines 116-154
```

**Grid Search Parameters:**

For datasets with ≥ 20 weeks, the system tests 5 parameter combinations:

```python
param_grid = [
    (1, d, 1, 1, 1, 1, s),  # SARIMA(1,d,1)(1,1,1)4
    (1, d, 0, 1, 1, 1, s),  # SARIMA(1,d,0)(1,1,1)4
    (0, d, 1, 1, 1, 1, s),  # SARIMA(0,d,1)(1,1,1)4
    (1, d, 1, 0, 1, 1, s),  # SARIMA(1,d,1)(0,1,1)4
    (1, d, 1, 1, 0, 1, s),  # SARIMA(1,d,1)(1,0,1)4
]
```

**Selection Criterion**: **AIC (Akaike Information Criterion)**

- Lower AIC = Better model fit with penalty for complexity
- Balances model fit and model simplicity
- Prevents overfitting

**Process:**

1. For each parameter combination:
   - Creates SARIMAX model
   - Fits model with `maxiter=50` (faster convergence)
   - Calculates AIC
2. Selects parameters with lowest AIC
3. Falls back to default if all combinations fail

**Implementation:**

```python
for params in param_grid:
    try:
        temp_model = SARIMAX(series, order=(p, d, q), seasonal_order=(P, D, Q, s), ...)
        temp_fitted = temp_model.fit(disp=False, maxiter=50)

        if temp_fitted.aic < best_aic:
            best_aic = temp_fitted.aic
            best_params = params
    except Exception as e:
        continue  # Skip failed parameter combinations
```

### Final Parameter Values

#### Typical Parameters for Current Dataset (5 months, ~21 weeks):

**Current Configuration:**

- **Order (p, d, q)**: `(1, 1, 1)`
- **Seasonal Order (P, D, Q, s)**: `(1, 1, 1, 4)`
- **Full Notation**: `SARIMA(1,1,1)(1,1,1,4)`

#### Parameter Interpretation:

**Non-Seasonal Components (p, d, q):**

- **p = 1**: Autoregressive order 1 (uses 1 previous value)
- **d = 1**: First-order differencing (removes trend)
- **q = 1**: Moving average order 1 (uses 1 previous error)

**Seasonal Components (P, D, Q, s):**

- **P = 1**: Seasonal autoregressive order 1
- **D = 1**: Seasonal differencing order 1 (removes seasonal trend)
- **Q = 1**: Seasonal moving average order 1
- **s = 4**: Seasonal period (4 weeks = monthly pattern)

### Model Constraints

**Enforcement Settings:**

```python
# Location: sarima_model.py, lines 205-210
enforce_stationarity=False  # Allows non-stationary data
enforce_invertibility=False  # More flexible parameter estimation
```

**Rationale:**

- Small datasets may not meet strict stationarity requirements
- Relaxed constraints allow model to fit better with limited data
- Trade-off: May produce slightly less stable forecasts (acceptable for small datasets)

---

## Model Training Process

### Overview

The training process follows a **chronological train-test split** approach, ensuring time series integrity.

### Implementation Location

**File**: `sarima_model.py`  
**Method**: `train()` (lines 156-279)

### Data Splitting Strategy

#### Train-Test Split

```python
# Location: sarima_model.py, lines 177-180
```

**Split Ratio**: 80% Training, 20% Testing

**Method**: Chronological split (not random)

**Implementation:**

```python
split_idx = int(len(series) * 0.8)
train_series = series.iloc[:split_idx]  # First 80%
test_series = series.iloc[split_idx:]   # Last 20%
```

**Why Chronological Split:**

- Time series data must maintain temporal order
- Random split would leak future information to training
- Test set represents true "future" predictions

**Example:**

- Total: 27 weeks
- Training: First 21 weeks (80%)
- Test: Last 6 weeks (20%)

### Training Methodology

#### 1. **Parameter Selection**

```python
# Location: sarima_model.py, line 195
```

- Uses **training data only** for parameter selection
- Prevents data leakage (test set not used for model selection)
- Grid search performed on training set

#### 2. **Model Fitting**

```python
# Location: sarima_model.py, lines 205-218
```

**Process:**

1. Creates SARIMAX model with selected parameters
2. Fits model using `fit()` method
3. Maximum iterations: 100 (allows convergence)
4. Disables display output (`disp=False`)

**Implementation:**

```python
self.model = SARIMAX(
    train_series,
    order=(p, d, q),
    seasonal_order=(P, D, Q, s),
    enforce_stationarity=False,
    enforce_invertibility=False
)

self.fitted_model = self.model.fit(disp=False, maxiter=100)
```

#### 3. **Model Storage**

```python
# Location: sarima_model.py, lines 189-192
```

**Stored Data:**

- `self.training_data`: Training set (for in-sample metrics)
- `self.test_data`: Test set (for out-of-sample metrics)
- `self.all_data`: Entire dataset (for correct prediction start date)

### Validation Approach

#### 1. **In-Sample Validation (Training Set)**

```python
# Location: sarima_model.py, lines 281-319
```

**Method:**

- Uses **fitted values** (model's predictions on training data)
- Compares actual vs. fitted values
- Calculates MAE, RMSE, MAPE

**Purpose:**

- Measures how well model fits the training data
- Indicates if model captures patterns in historical data

**Implementation:**

```python
fitted_values = self.fitted_model.fittedvalues
mae = np.mean(np.abs(actual_series - fitted_values))
rmse = np.sqrt(np.mean((actual_series - fitted_values) ** 2))
```

#### 2. **Out-of-Sample Validation (Test Set)**

```python
# Location: sarima_model.py, lines 321-371
```

**Method:**

- Generates **forecasts** for test period (future predictions)
- Compares actual test values vs. forecasted values
- Calculates MAE, RMSE, MAPE

**Purpose:**

- Measures true predictive performance
- Tests model's ability to forecast unseen data
- More reliable than in-sample metrics

**Implementation:**

```python
forecast_steps = len(test_series)
forecast = self.fitted_model.forecast(steps=forecast_steps)

# Compare forecast vs. actual test values
mae = np.mean(np.abs(test_values - forecast))
```

### Cross-Validation

**Current Approach**: **No k-fold cross-validation**

**Rationale:**

- Time series requires chronological validation
- Small dataset size (5 months) makes k-fold impractical
- Train-test split provides sufficient validation

**Alternative Considered:**

- Walk-forward validation (not implemented due to limited data)
- Would require more data (1+ years) to be effective

### Diagnostic Checks

```python
# Location: sarima_model.py, lines 373-476
```

#### 1. **Residual Randomness Test (Ljung-Box)**

**Purpose:**

- Tests if model residuals are random (white noise)
- Random residuals = Model captures all patterns
- Non-random residuals = Model missing patterns

**Method:**

- Ljung-Box test with up to 10 lags
- Null hypothesis: Residuals are random
- p-value > 0.05 → Residuals are random (good!)

**Implementation:**

```python
ljung_box = acorr_ljungbox(residuals_clean, lags=min(10, len(residuals_clean)//2), return_df=True)
ljung_box_pvalue = float(ljung_box['lb_pvalue'].iloc[-1])
residuals_random = ljung_box_pvalue > 0.05
```

#### 2. **Residual Statistics**

- **Mean**: Should be close to 0 (no systematic bias)
- **Standard Deviation**: Measures prediction variability

#### 3. **ACF/PACF Analysis**

**Purpose:**

- Checks for leftover autocorrelation in residuals
- ACF/PACF values should be within ±0.2 for good model

**Implementation:**

```python
acf_values, acf_confint = acf(residuals_clean, nlags=max_lags, alpha=0.05, fft=True)
pacf_values, pacf_confint = pacf(residuals_clean, nlags=max_lags, alpha=0.05)
```

---

## Prediction Generation

### Overview

The prediction system generates weekly forecasts and aggregates them into monthly and yearly totals for different use cases.

### Implementation Location

**File**: `sarima_model.py`  
**Method**: `predict()` (lines 478-564)

### Weekly Forecast Calculation

#### 1. **Forecast Generation**

```python
# Location: sarima_model.py, lines 494-496
```

**Method:**

- Uses fitted model's `forecast()` method
- Generates point forecasts (most likely values)
- Generates confidence intervals (uncertainty bounds)

**Implementation:**

```python
forecast = self.fitted_model.forecast(steps=weeks)
forecast_ci = self.fitted_model.get_forecast(steps=weeks).conf_int()
```

**Output:**

- `forecast`: Array of predicted weekly counts
- `forecast_ci`: Array of [lower_bound, upper_bound] for each week
- Default confidence level: 95% (from statsmodels)

#### 2. **Date Generation**

```python
# Location: sarima_model.py, lines 498-532
```

**Prediction Start Date Logic:**

The system uses a **priority-based approach** to determine the last data date:

1. **Priority 1**: `all_data` (from freshly trained model)

   - Uses maximum date from entire dataset (training + test)
   - Ensures predictions start after all available data

2. **Priority 2**: `last_data_date` from metadata (from loaded model)

   - Uses saved date from model metadata
   - Persists across model reloads

3. **Priority 3**: Reconstruct from `training_data + test_data`

   - Calculates max of both datasets
   - Fallback if metadata not available

4. **Priority 4**: Training data only (backward compatibility)
   - Last resort for old models

**Date Range Generation:**

```python
forecast_dates = pd.date_range(
    start=last_date + timedelta(weeks=1),  # Start week after last data
    periods=weeks,
    freq='W-SUN'  # Weekly frequency, Sunday as week start
)
```

#### 3. **Weekly Predictions Format**

```python
# Location: sarima_model.py, lines 535-543
```

**Output Structure:**

```python
{
    'date': '2025-07-29',           # Week start date (Sunday)
    'week': 31,                      # ISO week number
    'predicted_count': 415,          # Point forecast
    'lower_bound': 320,              # 95% CI lower bound
    'upper_bound': 510               # 95% CI upper bound
}
```

**Ensures Non-Negative:**

- Applies `max(0, value)` to prevent negative predictions
- Vehicle registrations cannot be negative

### Monthly Aggregation

```python
# Location: sarima_model.py, lines 545-548
```

**Method:**

- Sums all weekly predictions within the requested period
- Aggregates confidence intervals by summing bounds

**Implementation:**

```python
monthly_total = int(round(max(0, forecast.sum())))
monthly_lower = int(round(max(0, forecast_ci.iloc[:, 0].sum())))
monthly_upper = int(round(max(0, forecast_ci.iloc[:, 1].sum())))
```

**Note:**

- Monthly aggregation is calculated from weekly predictions
- If 4 weeks requested → Monthly total = sum of 4 weeks
- Confidence intervals are additive (conservative estimate)

### Yearly Aggregation

**Frontend Implementation:**

- Yearly totals are calculated in the frontend (`WeeklyPredictionsChart.jsx`)
- Groups weekly predictions by year
- Sums weekly totals for each year

**Process:**

```javascript
// Location: frontend/src/components/analytics/registration/WeeklyPredictionsChart.jsx
yearlyGrouped[year].totalPredicted += predictedValue;
```

### Prediction Confidence Intervals

#### Calculation Method

**Source**: Statsmodels SARIMAX default behavior

**Confidence Level**: 95% (default)

**Method:**

- Uses asymptotic normal distribution for forecast errors
- Calculates standard errors from model residuals
- Applies t-distribution critical values

**Implementation:**

```python
forecast_ci = self.fitted_model.get_forecast(steps=weeks).conf_int()
# Returns DataFrame with columns: [lower_bound, upper_bound]
```

**Interpretation:**

- **Lower Bound**: 2.5th percentile (95% chance actual ≥ this value)
- **Upper Bound**: 97.5th percentile (95% chance actual ≤ this value)
- **Point Forecast**: Most likely value (median)

---

## Performance Evaluation

### Overview

The system calculates multiple accuracy metrics to assess model performance both in-sample (training) and out-of-sample (test).

### Implementation Location

**File**: `sarima_model.py`  
**Methods**:

- `_calculate_accuracy_metrics()` (lines 281-319)
- `_calculate_test_accuracy()` (lines 321-371)

### Accuracy Metrics Explained

#### 1. **MAE (Mean Absolute Error)**

**Formula:**

```
MAE = mean(|actual - predicted|)
```

**Interpretation:**

- Average prediction error in registration units
- Lower = Better
- Example: MAE = 86.31 means average error is 86 registrations

**Use Case:**

- Easy to interpret (same units as data)
- Robust to outliers (uses absolute values)

**Implementation:**

```python
mae = np.mean(np.abs(actual_series - fitted_values))
```

#### 2. **RMSE (Root Mean Square Error)**

**Formula:**

```
RMSE = sqrt(mean((actual - predicted)²))
```

**Interpretation:**

- Average prediction error (penalizes large errors more)
- Lower = Better
- Example: RMSE = 113.98 means typical error is ~114 registrations

**Use Case:**

- More sensitive to outliers than MAE
- Useful for identifying large prediction errors

**Implementation:**

```python
mse = np.mean((actual_series - fitted_values) ** 2)
rmse = np.sqrt(mse)
```

#### 3. **MAPE (Mean Absolute Percentage Error)**

**Formula:**

```
MAPE = mean(|(actual - predicted) / actual|) × 100%
```

**Interpretation:**

- Average percentage error
- Lower = Better
- Example: MAPE = 28.30% means average error is 28.3% of actual value

**Use Case:**

- Normalized metric (works across different scales)
- Easy to communicate (percentage terms)
- **Accuracy = 100% - MAPE**: MAPE 28.30% = 71.70% accuracy

**Implementation:**

```python
non_zero_mask = actual_series != 0
mape = np.mean(np.abs((actual_series[non_zero_mask] - fitted_values[non_zero_mask])
                      / actual_series[non_zero_mask])) * 100
```

**Note:** Handles division by zero by filtering out zero actual values

### Current Model Performance Assessment

#### Typical Performance (Based on 5 months of data):

**Training Set (In-Sample):**

- **MAPE**: ~29.07% (71% accuracy)
- **MAE**: ~86.31 registrations
- **RMSE**: ~113.98 registrations

**Test Set (Out-of-Sample):**

- **MAPE**: ~28.30% (72% accuracy)
- **MAE**: ~93.69 registrations
- **RMSE**: ~117.43 registrations

#### Performance Interpretation:

**Good Signs:**

- ✅ Test MAPE similar to training MAPE (no overfitting)
- ✅ MAPE < 30% (acceptable for 5 months of data)
- ✅ Model generalizes well (test performance ≈ training performance)

**Areas for Improvement:**

- ⚠️ MAPE ~28-29% (target: <10% for 90% accuracy)
- ⚠️ Requires more data (1.5-2 years) for optimal performance

### Limitations Identified

#### 1. **Dataset Size Limitation**

**Current:** 5 months (~21 weeks of training data)

**Impact:**

- Limited pattern recognition
- Conservative parameters (to avoid overfitting)
- Higher uncertainty in predictions

**Expected Improvement:**

- **1 year of data**: MAPE ~15-25% (75-85% accuracy)
- **2 years of data**: MAPE <10% (90%+ accuracy)

#### 2. **Sparse Data**

**Issue:** Some weeks have zero registrations (filtered out)

**Impact:**

- Irregular time series (not perfectly weekly)
- Model may miss some temporal patterns
- Confidence intervals may be wider

**Mitigation:**

- Only weeks with data are used (SARIMA handles sparse data)
- Weekly aggregation reduces sparsity

#### 3. **Limited Seasonality**

**Issue:** 5 months may not capture full yearly seasonality

**Impact:**

- Model focuses on monthly patterns (s=4)
- May miss yearly trends (holidays, annual cycles)
- Predictions valid for short-term (1-3 months)

**Expected:** With 1+ years of data, can add yearly seasonality (s=52)

---

## Technical Implementation

### Libraries and Frameworks

#### Core Libraries

**1. statsmodels** (`statsmodels.tsa.statespace.sarimax`)

- **Purpose**: SARIMAX model implementation
- **Version**: Compatible with statsmodels 0.13+
- **Key Classes:**
  - `SARIMAX`: Model class
  - `SARIMAXResults`: Fitted model results

**2. pandas** (`pandas`)

- **Purpose**: Data manipulation and time series operations
- **Key Features:**
  - `pd.to_datetime()`: Date parsing
  - `pd.date_range()`: Date sequence generation
  - `groupby()`: Data aggregation
  - `DatetimeIndex`: Time series indexing

**3. numpy** (`numpy`)

- **Purpose**: Numerical computations
- **Key Functions:**
  - `np.mean()`, `np.sqrt()`: Statistical calculations
  - `np.abs()`: Absolute value calculations

**4. scipy** (`scipy.stats`)

- **Purpose**: Statistical tests
- **Key Functions:**
  - `adfuller()`: Augmented Dickey-Fuller test (stationarity)

**5. Standard Library**

- `pickle`: Model serialization
- `json`: Metadata storage
- `datetime`, `timedelta`: Date handling
- `os`: File system operations

### Key Functions and Their Purposes

#### DataPreprocessor Class

**1. `load_and_process_data()`**

- **Purpose**: Main data preprocessing pipeline
- **Returns**: (weekly_data DataFrame, processing_info dict)
- **Key Steps:**
  1. Load and combine CSV files
  2. Remove duplicates
  3. Filter municipalities
  4. Parse dates
  5. Aggregate to weekly totals
  6. Filter zero weeks

**2. `_aggregate_by_week()`**

- **Purpose**: Helper method for weekly aggregation
- **Input**: Filtered DataFrame with parsed dates
- **Output**: Weekly aggregated DataFrame
- **Used By**: `load_and_process_data()` and `load_and_process_data_by_municipality()`

**3. `check_municipality_data_sufficiency()`**

- **Purpose**: Validates if municipality has enough data for modeling
- **Criteria:**
  - Minimum 12 weeks with data
  - Minimum 10 average registrations per week

#### SARIMAModel Class

**1. `find_optimal_parameters()`**

- **Purpose**: Determines best SARIMA parameters via grid search
- **Input**: Time series data
- **Output**: Tuple (p, d, q, P, D, Q, s)
- **Strategy**: Adaptive based on dataset size

**2. `train()`**

- **Purpose**: Trains SARIMA model on data
- **Input**: Processed time series DataFrame
- **Output**: Training info dictionary
- **Process:**
  1. Split data (80/20)
  2. Find optimal parameters
  3. Fit model
  4. Calculate metrics
  5. Save model

**3. `predict()`**

- **Purpose**: Generates future forecasts
- **Input**: Number of weeks to predict
- **Output**: Dictionary with weekly predictions and aggregations
- **Key Features:**
  - Handles prediction start date correctly
  - Generates confidence intervals
  - Aggregates to monthly totals

**4. `_calculate_accuracy_metrics()`**

- **Purpose**: Calculates in-sample accuracy metrics
- **Input**: Actual time series
- **Output**: Dictionary with MAE, RMSE, MAPE

**5. `_calculate_test_accuracy()`**

- **Purpose**: Calculates out-of-sample accuracy metrics
- **Input**: Test time series
- **Output**: Dictionary with MAE, RMSE, MAPE

**6. `_calculate_diagnostics()`**

- **Purpose**: Performs model diagnostic checks
- **Tests:**
  - Ljung-Box test (residual randomness)
  - ACF/PACF analysis
  - Residual statistics

**7. `save_model()` / `load_model()`**

- **Purpose**: Persist model to disk / load from disk
- **Format:**
  - Model: Pickle file (`.pkl`)
  - Metadata: JSON file (`.json`)

### Data Flow: Input to Prediction Output

#### Complete Pipeline

```
1. RAW DATA (CSV Files)
   ↓
2. DataPreprocessor.load_and_process_data()
   - Load CSV files
   - Remove duplicates
   - Filter municipalities
   - Parse dates
   - Aggregate to weekly totals
   ↓
3. WEEKLY TIME SERIES (DataFrame)
   - Index: week_start dates
   - Column: count (weekly registrations)
   ↓
4. SARIMAModel.train()
   - Split data (80/20)
   - Find optimal parameters
   - Fit SARIMAX model
   - Calculate metrics
   - Save model
   ↓
5. TRAINED MODEL (SARIMAXResults)
   - Stored in model_file (.pkl)
   - Metadata in metadata_file (.json)
   ↓
6. SARIMAModel.predict(weeks=N)
   - Load model
   - Generate forecasts
   - Create prediction dates
   - Calculate confidence intervals
   - Aggregate to monthly totals
   ↓
7. PREDICTION OUTPUT (Dictionary)
   {
     'weekly_predictions': [...],
     'monthly_aggregation': {...},
     'prediction_dates': [...],
     ...
   }
   ↓
8. FRONTEND API (Flask Endpoint)
   - GET /api/predict/registrations?weeks=N
   - Returns JSON response
   ↓
9. FRONTEND VISUALIZATION
   - WeeklyPredictionsChart component
   - Processes data for Weekly/Monthly/Yearly views
   - Displays interactive charts
```

#### File Structure

```
backend/model/ml_models/mv_registration_flask/
├── app.py                    # Flask API server
├── sarima_model.py          # SARIMA model implementation
├── data_preprocessor.py     # Data preprocessing pipeline
├── config.py                # Configuration (municipalities, thresholds)
├── trained/                 # Saved models directory
│   ├── sarima_model.pkl     # Fitted model
│   └── sarima_metadata.json # Model metadata
└── mv registration training/ # CSV data directory
    └── DAVOR_data.csv       # Raw registration data
```

### API Endpoints

#### 1. Prediction Endpoint

**Endpoint**: `GET /api/predict/registrations`

**Parameters:**

- `weeks` (int): Number of weeks to predict (default: 4, max: 52)
- `municipality` (str, optional): Municipality filter (if per-municipality enabled)

**Response Structure:**

```json
{
  "success": true,
  "data": {
    "weekly_predictions": [
      {
        "date": "2025-07-29",
        "week": 31,
        "predicted_count": 415,
        "lower_bound": 320,
        "upper_bound": 510
      }
    ],
    "monthly_aggregation": {
      "total_predicted": 1660,
      "lower_bound": 1280,
      "upper_bound": 2040
    },
    "prediction_dates": ["2025-07-29", ...],
    "prediction_weeks": 4,
    "last_training_date": "2025-06-16",
    "last_data_date": "2025-07-28",
    "prediction_start_date": "2025-07-29"
  }
}
```

#### 2. Accuracy Endpoint

**Endpoint**: `GET /api/model/accuracy`

**Response Structure:**

```json
{
  "success": true,
  "data": {
    "mae": 86.31,
    "rmse": 113.98,
    "mape": 29.07,
    "model_parameters": {
      "order": [1, 1, 1],
      "seasonal_order": [1, 1, 1, 4]
    },
    "test_accuracy_metrics": {
      "mae": 93.69,
      "rmse": 117.43,
      "mape": 28.3
    }
  }
}
```

---

## Summary

This documentation covers the complete SARIMA implementation for vehicle registration prediction. The system:

1. **Preprocesses** daily data into weekly time series
2. **Configures** SARIMA parameters adaptively based on data size
3. **Trains** models with proper train-test splitting
4. **Generates** weekly, monthly, and yearly forecasts
5. **Evaluates** performance using multiple metrics
6. **Implements** a complete pipeline from CSV to predictions

The implementation is designed to work with limited data (5 months) while scaling to larger datasets (1-2 years) for improved accuracy.
