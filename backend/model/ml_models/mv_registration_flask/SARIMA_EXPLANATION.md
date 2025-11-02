# SARIMA Model Explanation & Output Structure

## What is SARIMA?

**SARIMA** stands for **Seasonal AutoRegressive Integrated Moving Average**. It's a time series forecasting model used to predict future values based on historical patterns.

### Breaking Down SARIMA:

**SARIMA(p, d, q)(P, D, Q, s)** has 7 parameters:

1. **p** - Autoregressive (AR) order: How many past values to use
2. **d** - Differencing order: How many times to difference the data to make it stationary
3. **q** - Moving Average (MA) order: How many past forecast errors to use
4. **P** - Seasonal AR order: Seasonal autoregressive component
5. **D** - Seasonal differencing: Seasonal differencing order
6. **Q** - Seasonal MA order: Seasonal moving average component
7. **s** - Seasonal period: Length of the seasonal cycle (e.g., 4 for monthly data, 52 for yearly)

### Simple Analogy:

Think of SARIMA like predicting tomorrow's weather:

- **AR (p)**: "Yesterday it rained, so today might rain"
- **MA (q)**: "My prediction was off by X yesterday, so I'll adjust"
- **Seasonal**: "Every 4 weeks (monthly), registrations peak"
- **Integrated (d)**: "Remove trends to make data stable for analysis"

## How SARIMA Works in This Project

### Step 1: Data Preparation

- Loads CSV with vehicle registrations from Davao Oriental
- Filters by municipality (Davao Oriental only)
- Aggregates registrations by week
- Creates time series: Week → Number of Registrations

**Example Data:**

```
Week Start Date    | Count
2025-02-10         | 150
2025-02-17         | 200
2025-02-24         | 180
...
```

### Step 2: Model Training

- Finds optimal parameters (p, d, q, P, D, Q, s)
- Trains SARIMA model on historical data
- Calculates accuracy metrics

### Step 3: Prediction

- Forecasts future weeks
- Provides confidence intervals (uncertainty bounds)
- Aggregates weekly predictions to monthly totals

## API Output Structure

### 1. Prediction Endpoint: `GET /api/predict/registrations?weeks=4`

**What it returns:**

```json
{
  "success": true,
  "data": {
    "weekly_predictions": [
      {
        "date": "2025-07-07", // Date of the week (Sunday)
        "week": 28, // Week number of the year
        "predicted_count": 175, // Predicted registrations
        "lower_bound": 140, // Lower estimate (confidence interval)
        "upper_bound": 210 // Upper estimate (confidence interval)
      },
      {
        "date": "2025-07-14",
        "week": 29,
        "predicted_count": 185,
        "lower_bound": 150,
        "upper_bound": 220
      }
      // ... 2 more weeks (total of 4)
    ],
    "monthly_aggregation": {
      "total_predicted": 720, // Sum of all 4 weeks = monthly total
      "lower_bound": 580, // Lower bound for the month
      "upper_bound": 860 // Upper bound for the month
    },
    "prediction_dates": [
      "2025-07-07",
      "2025-07-14",
      "2025-07-21",
      "2025-07-28"
    ],
    "prediction_weeks": 4,
    "last_training_date": "2025-06-30", // Last date in training data
    "prediction_start_date": "2025-07-07" // First prediction date
  }
}
```

**Explanation:**

- **weekly_predictions**: Array of predictions for each week
  - `predicted_count`: Most likely number of registrations
  - `lower_bound` / `upper_bound`: Range where actual value likely falls (80-95% confidence)
- **monthly_aggregation**: Sum of all weekly predictions
- **prediction_dates**: All dates being predicted

### 2. Accuracy Endpoint: `GET /api/model/accuracy`

**What it returns:**

```json
{
  "success": true,
  "data": {
    "mae": 12.5, // Mean Absolute Error
    "rmse": 15.3, // Root Mean Squared Error
    "mape": 8.2, // Mean Absolute Percentage Error (%)
    "mean_actual": 145.0, // Average registrations per week
    "std_actual": 25.5, // Standard deviation
    "model_parameters": {
      "order": [1, 1, 1], // (p, d, q)
      "seasonal_order": [1, 1, 1, 4], // (P, D, Q, s)
      "full_params": [1, 1, 1, 1, 1, 1, 4]
    },
    "last_trained": "2025-06-30"
  }
}
```

**Understanding Accuracy Metrics:**

- **MAE (Mean Absolute Error)**: Average difference between predicted and actual
  - Example: MAE of 12.5 means predictions are off by ~13 registrations on average
  - Lower = Better
- **RMSE (Root Mean Squared Error)**: Similar to MAE but penalizes larger errors more
  - Example: RMSE of 15.3
  - Lower = Better
- **MAPE (Mean Absolute Percentage Error)**: Error as a percentage
  - Example: MAPE of 8.2% means predictions are off by ~8% on average
  - Lower = Better (typically < 10% is considered good)

### 3. Retrain Endpoint: `POST /api/model/retrain`

**Request:**

```json
{
  "force": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "Model retrained successfully",
  "data": {
    "model_params": {
      "order": [1, 1, 1],
      "seasonal_order": [1, 1, 1, 4]
    },
    "training_weeks": 9,
    "date_range": {
      "start": "2025-02-10",
      "end": "2025-06-30"
    },
    "accuracy_metrics": {
      "mae": 12.5,
      "rmse": 15.3,
      "mape": 8.2
    },
    "aic": 245.6, // Akaike Information Criterion
    "bic": 252.3 // Bayesian Information Criterion
  }
}
```

**Understanding AIC/BIC:**

- Lower values = Better model fit
- Used to compare different parameter combinations

## Real-World Example

**Scenario:** You want to predict vehicle registrations for the next month.

**Input:**

```
Historical Data (9 weeks):
Week 1: 150 registrations
Week 2: 200 registrations
Week 3: 180 registrations
...
Week 9: 165 registrations
```

**Model Training:**

- Analyzes patterns in the 9 weeks
- Finds: "Registrations average 170/week with 4-week cycles"
- Trains SARIMA(1,1,1)(1,1,1,4)

**Prediction Output:**

```
Next 4 weeks:
Week 10: ~175 registrations (range: 140-210)
Week 11: ~185 registrations (range: 150-220)
Week 12: ~170 registrations (range: 135-205)
Week 13: ~190 registrations (range: 155-225)

Monthly Total: ~720 registrations (range: 580-860)
```

## Visual Representation

```
Historical Data (Training)          Future (Predictions)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
| 150 | 200 | 180 | ... | 165 | → | 175 | 185 | 170 | 190 |
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       Training Data (9 weeks)     Predictions (4 weeks)
```

## Model Parameters in Your Project

For your 3-month dataset:

- **SARIMA(1,1,1)(1,1,1,4)**
  - Simple model suitable for limited data
  - 4-week seasonal cycle (monthly pattern)
  - Will improve as more data is collected

**As data grows:**

- Model will automatically find better parameters
- Accuracy will improve
- Predictions become more reliable

## Limitations with Small Datasets

**Current (3 months):**

- ✅ Can predict short-term (1 month ahead)
- ⚠️ Limited accuracy due to small sample
- ⚠️ Conservative parameters used

**With more data (1-2 years):**

- ✅ Better accuracy
- ✅ Can predict longer horizons (3-6 months)
- ✅ More sophisticated patterns detected

## Summary

**SARIMA Output = Predictions + Confidence Intervals**

- Predicts how many vehicle registrations will occur
- Provides uncertainty ranges (lower/upper bounds)
- Aggregates weekly to monthly
- Tracks model accuracy for quality assurance

The model learns from past patterns and projects them forward, similar to forecasting sales or weather patterns!
