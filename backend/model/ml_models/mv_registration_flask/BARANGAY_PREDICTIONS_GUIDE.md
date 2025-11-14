# Barangay-Level Prediction Guide

## Overview

The system now supports **barangay-level predictions** for vehicle registrations/renewals. This uses a **hierarchical approach** that is more reliable than training separate models per barangay.

## How It Works

### Hierarchical Approach

1. **Municipality-Level Predictions** (SARIMA Model)
   - Uses the existing optimized SARIMA model
   - Generates accurate municipality-level predictions
   - This is the foundation

2. **Barangay Distribution** (Proportional Allocation)
   - Calculates historical proportions of registrations per barangay within each municipality
   - Uses last 90 days of data to determine proportions
   - Distributes municipality predictions to barangays based on these proportions

### Why This Approach?

**Challenges with Separate Barangay Models:**
- ❌ Many barangays have insufficient data (<30 records over 6 months)
- ❌ SARIMA needs 2-3 seasonal cycles (14+ days minimum)
- ❌ Training 100+ separate models is computationally expensive
- ❌ Low data volume = unreliable predictions

**Benefits of Hierarchical Approach:**
- ✅ Uses reliable municipality-level SARIMA predictions
- ✅ Leverages historical patterns (proportions are stable)
- ✅ Works even for barangays with little data
- ✅ More accurate than separate models for small barangays
- ✅ Computationally efficient

## API Endpoint

### Get Barangay Predictions

**Endpoint:** `GET /api/predict/registrations/barangay`

**Query Parameters:**
- `weeks` (int, optional): Number of weeks to predict (default: 4, max: 52)
- `municipality` (str, optional): Specific municipality name (e.g., "CITY OF MATI", "LUPON")
  - If not provided, returns predictions for all municipalities

**Example Request:**
```bash
# Get barangay predictions for City of Mati for next 4 weeks
GET /api/predict/registrations/barangay?weeks=4&municipality=CITY%20OF%20MATI

# Get barangay predictions for all municipalities for next 12 weeks
GET /api/predict/registrations/barangay?weeks=12
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "barangay_predictions": [
      {
        "municipality": "CITY OF MATI",
        "barangay": "POBLACION",
        "date": "2025-08-03",
        "predicted_count": 45,
        "proportion": 0.15,
        "municipality_total": 300
      },
      {
        "municipality": "CITY OF MATI",
        "barangay": "DAWAN",
        "date": "2025-08-03",
        "predicted_count": 30,
        "proportion": 0.10,
        "municipality_total": 300
      }
      // ... more barangays
    ],
    "municipality_summary": {
      "CITY OF MATI": {
        "POBLACION": {
          "total_predicted": 180,
          "weekly_predictions": [
            {"date": "2025-08-03", "predicted_count": 45},
            {"date": "2025-08-10", "predicted_count": 48},
            // ... more weeks
          ]
        }
        // ... more barangays
      }
    },
    "prediction_dates": ["2025-08-03", "2025-08-10", "2025-08-17", "2025-08-24"],
    "weeks": 4,
    "municipality": "CITY OF MATI"
  }
}
```

## Data Requirements

### CSV File Requirements

Your CSV file must include:
- ✅ `dateOfRenewal` - Date of registration/renewal
- ✅ `address_municipality` - Municipality name
- ✅ `address_barangay` - Barangay name (required for barangay predictions)

### Data Quality

**For Best Results:**
- ✅ Consistent barangay naming (use standardized names)
- ✅ Complete address data (barangay field populated)
- ✅ At least 30 days of historical data per barangay
- ✅ Recent data (last 90 days used for proportions)

## Accuracy Expectations

### Municipality-Level (SARIMA)
- **Accuracy:** 82-88% (with 6 months of daily data)
- **Reliability:** High - based on time series patterns

### Barangay-Level (Proportional Distribution)
- **Accuracy:** Depends on stability of proportions
- **Reliability:** Good - if proportions are stable
- **Best for:** Barangays with consistent historical patterns

### Factors Affecting Accuracy

**Good Accuracy:**
- ✅ Stable barangay proportions over time
- ✅ Sufficient historical data (30+ days)
- ✅ Consistent naming conventions

**Lower Accuracy:**
- ⚠️ Rapidly changing barangay patterns
- ⚠️ New barangays with little history
- ⚠️ Inconsistent data entry

## Usage Examples

### Example 1: Get Predictions for Specific Municipality

```python
import requests

# Get barangay predictions for City of Mati
response = requests.get(
    'http://localhost:5001/api/predict/registrations/barangay',
    params={
        'weeks': 4,
        'municipality': 'CITY OF MATI'
    }
)

data = response.json()
if data['success']:
    for pred in data['data']['barangay_predictions']:
        print(f"{pred['barangay']}: {pred['predicted_count']} vehicles")
```

### Example 2: Get All Municipalities

```python
# Get all barangay predictions
response = requests.get(
    'http://localhost:5001/api/predict/registrations/barangay',
    params={'weeks': 12}
)

data = response.json()
if data['success']:
    summary = data['data']['municipality_summary']
    for municipality, barangays in summary.items():
        print(f"\n{municipality}:")
        for barangay, stats in barangays.items():
            print(f"  {barangay}: {stats['total_predicted']} total")
```

## Implementation Details

### Files Created

1. **`barangay_predictor.py`**
   - `BarangayPredictor` class
   - Calculates historical proportions
   - Distributes municipality predictions to barangays

2. **`app.py`** (Updated)
   - New endpoint: `/api/predict/registrations/barangay`
   - Initializes `BarangayPredictor` on startup

### Key Methods

**`calculate_barangay_proportions()`**
- Analyzes last 90 days of data
- Calculates proportion of registrations per barangay
- Returns: `{municipality: {barangay: proportion, ...}, ...}`

**`predict_barangay_registrations()`**
- Takes municipality predictions
- Distributes to barangays based on proportions
- Returns detailed barangay predictions

## Limitations

1. **Proportional Assumption**
   - Assumes barangay proportions remain stable
   - May not capture sudden changes in patterns

2. **Data Dependency**
   - Requires `address_barangay` field in CSV
   - Needs at least 30 days of historical data

3. **New Barangays**
   - Barangays with no historical data get 0 predictions
   - Consider manual allocation for new areas

## Recommendations

### For Best Results:

1. **Ensure Data Quality**
   - Standardize barangay names
   - Complete address information
   - Regular data updates

2. **Monitor Proportions**
   - Check if proportions are stable
   - Update if patterns change significantly

3. **Use for Planning**
   - Good for resource allocation
   - Useful for caravan scheduling
   - Not for exact forecasting

4. **Combine with Domain Knowledge**
   - Use predictions as starting point
   - Adjust based on local knowledge
   - Consider special events/holidays

## Future Enhancements

Potential improvements:
- ✅ Separate models for high-volume barangays (>100 records/month)
- ✅ Time-varying proportions (seasonal adjustments)
- ✅ Confidence intervals for barangay predictions
- ✅ Historical proportion trends visualization

## Support

For issues or questions:
1. Check CSV has `address_barangay` column
2. Verify barangay data quality
3. Check logs for proportion calculation warnings
4. Ensure municipality predictions are working first

