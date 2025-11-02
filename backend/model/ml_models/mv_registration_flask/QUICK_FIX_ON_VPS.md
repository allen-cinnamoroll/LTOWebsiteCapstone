# Quick Fix Instructions for VPS

The VPS is still running the old code. You need to update the files.

## Option 1: Pull from GitHub (if you pushed the fixes)

```bash
cd /var/www/LTOWebsiteCapstone
git pull origin main
cd backend/model/ml_models/mv_registration_flask
```

## Option 2: Manual Fix on VPS

### Step 1: Update data_preprocessor.py

```bash
nano data_preprocessor.py
```

Find the section around line 93-109 and replace:

**OLD CODE (line 93-108):**

```python
        # Set week_start as index for time series
        weekly_data = weekly_data.set_index('week_start')
        weekly_data.index = pd.to_datetime(weekly_data.index)

        # Resample to ensure weekly frequency (fill missing weeks with 0)
        date_range = pd.date_range(
            start=weekly_data.index.min(),
            end=weekly_data.index.max(),
            freq='W-SUN'
        )

        weekly_data = weekly_data.reindex(date_range, fill_value=0)
        weekly_data['count'] = weekly_data['count'].fillna(0).astype(int)

        print(f"After resampling: {len(weekly_data)} weeks")

        return weekly_data[['count']]
```

**REPLACE WITH:**

```python
        # Set week_start as index for time series
        weekly_data = weekly_data.set_index('week_start')
        weekly_data.index = pd.to_datetime(weekly_data.index)

        # For sparse data, only keep weeks with actual registrations
        # Don't fill with zeros as it causes issues with SARIMA
        weekly_data = weekly_data[weekly_data['count'] > 0].copy()

        # Sort by date to ensure proper time series order
        weekly_data = weekly_data.sort_index()

        print(f"After filtering zero weeks: {len(weekly_data)} weeks with registrations")
        print(f"Weeks with data: {weekly_data['count'].sum()} total registrations")
        print(f"Mean per week: {weekly_data['count'].mean():.1f}")

        return weekly_data[['count']]
```

### Step 2: Update sarima_model.py

```bash
nano sarima_model.py
```

Find the section around line 58-87 and replace:

**OLD CODE (around line 58-73):**

```python
        # For small datasets (3 months = ~12 weeks), use simpler parameters
        # This is a conservative approach suitable for limited data
        n_weeks = len(series)

        if n_weeks < 20:
            print(f"Small dataset detected ({n_weeks} weeks). Using conservative parameters.")
            # Conservative parameters for small datasets
            p, d, q = 1, 1, 1  # ARIMA(1,1,1)
            P, D, Q, s = 1, 1, 1, 4  # Seasonal: 4-week cycle
            return (p, d, q, P, D, Q, s)

        # Check stationarity
        adf_result = adfuller(series.dropna())
        is_stationary = adf_result[1] < 0.05
```

**REPLACE WITH:**

```python
        # For small datasets (3 months = ~12 weeks), use simpler parameters
        # This is a conservative approach suitable for limited data
        n_weeks = len(series)

        # Check if series is constant (all same values or all zeros)
        series_clean = series.dropna()
        if len(series_clean) == 0 or series_clean.nunique() <= 1:
            print(f"Warning: Series is constant or empty. Using default parameters.")
            return (1, 1, 1, 1, 1, 1, 4)

        if n_weeks < 20:
            print(f"Small dataset detected ({n_weeks} weeks). Using conservative parameters.")
            # Conservative parameters for small datasets
            p, d, q = 1, 1, 1  # ARIMA(1,1,1)
            P, D, Q, s = 1, 1, 1, 4  # Seasonal: 4-week cycle
            return (p, d, q, P, D, Q, s)

        # Check stationarity - only if we have enough non-zero values
        try:
            non_zero_series = series_clean[series_clean != 0]
            if len(non_zero_series) > 10:  # Need at least 10 non-zero values
                adf_result = adfuller(non_zero_series)
                is_stationary = adf_result[1] < 0.05
            else:
                # Too many zeros, assume non-stationary
                is_stationary = False
        except (ValueError, Exception) as e:
            # If ADF test fails (e.g., constant data), assume non-stationary
            print(f"ADF test failed: {str(e)}. Assuming non-stationary.")
            is_stationary = False
```

Then save both files (Ctrl+X, Y, Enter).

### Step 3: Test Again

```bash
python3 app.py
```
