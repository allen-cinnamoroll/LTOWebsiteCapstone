# Predictive & Prescriptive Analytics Enhancement Plan

## Research Objectives Alignment

### 1. **Predictive Analytics**: Forecast Future Trends & High-Risk Areas
### 2. **Prescriptive Analytics**: Recommend Actions for Road Safety

---

## Current System State

### ✅ What's Already Implemented:

1. **ML Model**:
   - Random Forest Classifier predicting offense type (Crimes Against Persons vs Property)
   - 65.7% accuracy with realistic performance
   - Geographic and temporal feature extraction

2. **Basic Analytics**:
   - Historical trend analysis
   - Geographic distribution
   - Risk level classification

3. **Prescriptive Actions**:
   - Generic recommendations for high/medium/low risk levels

### ❌ Gaps to Address:

1. **No Spatial-Temporal Forecasting**: Can't predict where/when accidents will increase
2. **No Hotspot Analysis**: Can't identify emerging high-risk areas
3. **Limited Prescriptive Analytics**: Generic recommendations, not location-specific
4. **No Trend Forecasting**: Can't anticipate future patterns

---

## Enhancement Plan

## Phase 1: Enhanced Predictive Analytics

### 1.1 Spatial-Temporal Risk Prediction Model

**Purpose**: Predict high-risk areas and time periods

**Implementation**:

```python
# New model: Predict accident probability by location and time
target_features:
  - accident_occurrence (binary: 0/1)
  - accident_severity (multi-class)
  - offense_type (current model)

spatial_features:
  - lat, lng
  - municipality, barangay
  - road_type
  - nearby_landmarks
  - historical_accident_density

temporal_features:
  - month, day_of_week, hour
  - is_holiday
  - is_rush_hour
  - season
  - historical_trends

spatial_temporal_features:
  - accident_count_last_30days_in_area
  - accident_trend_in_municipality
  - time_since_last_accident_in_area
```

### 1.2 Hotspot Detection & Forecasting

**Purpose**: Identify and predict accident hotspots

**Techniques**:
1. **Kernel Density Estimation (KDE)**: Identify current hotspots
2. **Time Series Forecasting**: Predict future accident counts per area
3. **Spatial Clustering**: Group similar high-risk areas

**Output**:
```json
{
  "hotspots": [
    {
      "location": {"municipality": "Mati", "barangay": "Central"},
      "current_risk_score": 0.85,
      "predicted_30day_accidents": 12,
      "confidence": 0.78,
      "contributing_factors": ["high traffic", "poor lighting", "intersection"],
      "trend": "increasing"
    }
  ]
}
```

### 1.3 Trend Forecasting by Municipality

**Purpose**: Predict accident trends for next 30/60/90 days

**Method**: Time series analysis (ARIMA or Prophet)

```python
# Forecast accidents by municipality
forecasts = {
  "Mati": {
    "next_30_days": 15,
    "next_60_days": 28,
    "next_90_days": 42,
    "trend": "increasing",
    "seasonal_pattern": "higher_on_weekends"
  }
}
```

---

## Phase 2: Enhanced Prescriptive Analytics

### 2.1 Location-Specific Recommendations

**Purpose**: Provide actionable recommendations based on specific locations

**Implementation**:

```yaml
prescriptive_actions:
  # By Location Type
  urban_high_traffic:
    - "Install traffic cameras at intersections"
    - "Deploy traffic enforcers during rush hours (7-9 AM, 5-7 PM)"
    - "Implement stricter speed limits"
    - "Add pedestrian crossings with signals"
    
  rural_highway:
    - "Install road reflectors and lighting"
    - "Add warning signs for curves and intersections"
    - "Conduct speed monitoring operations"
    - "Regular road maintenance patrols"
  
  school_zones:
    - "Deploy traffic aide during school hours"
    - "Install speed bumps"
    - "Conduct road safety education programs"
    - "Enforce strict speed limits (20 km/h)"
  
  # By Offense Type
  crimes_against_persons:
    - "Immediate medical response units on standby"
    - "Stricter DUI checkpoints"
    - "Mandatory helmet and seatbelt enforcement"
    - "Public awareness campaigns on reckless driving"
  
  crimes_against_property:
    - "Enhanced vehicle documentation checks"
    - "Insurance compliance monitoring"
    - "Driver's license verification campaigns"
  
  # By Time Pattern
  nighttime_accidents:
    - "Increase street lighting"
    - "Night patrol frequency doubled"
    - "Sobriety checkpoints after 10 PM"
  
  weekend_spikes:
    - "Enhanced weekend patrol"
    - "Public transport promotion campaigns"
    - "DUI prevention programs"
  
  # By Municipality
  high_risk_municipalities:
    - "Establish permanent traffic checkpoint"
    - "Monthly road safety seminars"
    - "Coordinate with local barangay councils"
    - "Deploy mobile medical units"
```

### 2.2 Dynamic Resource Allocation

**Purpose**: Optimize patrol routes and resource deployment

**Features**:
- **Patrol Optimization**: Suggest patrol routes based on predicted hotspots
- **Resource Distribution**: Recommend medical unit placement
- **Enforcement Planning**: Schedule checkpoints at high-risk times/locations

```json
{
  "resource_allocation": {
    "patrol_units": [
      {
        "unit_id": "P-001",
        "assigned_area": "Mati Central",
        "priority": "high",
        "recommended_hours": ["17:00-20:00"],
        "reason": "Historical spike in accidents during evening rush"
      }
    ],
    "medical_units": [
      {
        "unit_id": "M-001",
        "deployment_location": "Dahican-Central corridor",
        "rationale": "High incidence of Crimes Against Persons"
      }
    ]
  }
}
```

### 2.3 Public Outreach Initiatives

**Purpose**: Data-driven public awareness campaigns

**Recommendations**:
```python
outreach_recommendations = {
  "target_areas": ["Mati Central", "Dahican"],
  "target_demographics": ["young drivers (18-25)", "motorcycle riders"],
  "campaign_themes": [
    "Helmet usage awareness",
    "Speed limit compliance",
    "DUI prevention"
  ],
  "timing": "Before holiday season (Nov-Dec)",
  "channels": ["social media", "barangay meetings", "school seminars"],
  "expected_impact": "15-20% reduction in target demographics"
}
```

---

## Phase 3: System Integration

### 3.1 Enhanced ML Pipeline

**File**: `backend/model/ml_models/training/model_config.yaml`

Add new prediction targets and features:

```yaml
# Enhanced Configuration
data:
  raw_data_path: "../../../data/raw/cleaned_accidents_data.csv"
  train_test_split: 0.8
  random_state: 42

features:
  spatial_features:
    - lat
    - lng
    - municipality
    - barangay
    - road_type
    - accident_density_radius_1km  # New
    - accident_density_radius_5km  # New
    
  temporal_features:
    - year
    - month
    - day_of_week
    - hour
    - is_weekend
    - is_rush_hour
    - is_holiday  # New
    - season  # New
    
  historical_features:  # New
    - accidents_last_30days_in_area
    - accidents_last_90days_in_municipality
    - days_since_last_accident_in_barangay
    
  contextual_features:
    - incidentType
    - stageOfFelony
    - province
    - region

multi_target_prediction:
  offense_type:
    enabled: true
    target: offenseType
  
  risk_score:  # New
    enabled: true
    target: risk_level
    type: regression
  
  hotspot_probability:  # New
    enabled: true
    target: is_hotspot_area
    type: binary

# Enhanced Prescriptive System
prescriptive_analytics:
  recommendation_engine:
    enabled: true
    factors:
      - location_type
      - offense_type
      - time_pattern
      - historical_effectiveness
    
  resource_optimization:
    enabled: true
    constraints:
      max_patrol_units: 10
      max_medical_units: 5
      operating_hours: [6, 22]  # 6 AM to 10 PM
    
  outreach_planning:
    enabled: true
    target_reduction: 0.20  # 20% reduction goal
    budget_constraint: true
```

### 3.2 New Backend Endpoints

**File**: `backend/controller/predictionController.js`

```javascript
// 1. Spatial-Temporal Prediction
GET /api/predictions/hotspots?timeframe=30days
Response: {
  hotspots: [...],
  forecasted_accidents: {...},
  confidence_scores: {...}
}

// 2. Prescriptive Recommendations
GET /api/prescriptive/recommendations?location=Mati&offense_type=persons
Response: {
  immediate_actions: [...],
  long_term_strategies: [...],
  resource_allocation: {...},
  expected_impact: {...}
}

// 3. Resource Allocation
GET /api/prescriptive/resource-allocation?date=2024-01-15
Response: {
  patrol_recommendations: [...],
  medical_unit_deployment: [...],
  checkpoint_locations: [...]
}

// 4. Trend Forecasting
GET /api/predictions/trends?municipality=Mati&horizon=90days
Response: {
  forecasted_counts: [...],
  trend_direction: "increasing",
  confidence_interval: {...},
  contributing_factors: [...]
}

// 5. Public Outreach Planning
GET /api/prescriptive/outreach-plan?target_reduction=0.20
Response: {
  campaigns: [...],
  target_areas: [...],
  target_demographics: [...],
  estimated_cost: {...},
  expected_impact: {...}
}
```

### 3.3 Frontend Dashboard Enhancement

**File**: `frontend/src/components/analytics/accident/AccidentAnalytics.jsx`

Add new visualizations:

1. **Predictive Hotspot Map**:
   - Heatmap showing predicted high-risk areas
   - Color-coded by risk level (30-day forecast)
   - Interactive: Click for recommendations

2. **Trend Forecast Charts**:
   - Line chart with historical + predicted trends
   - Confidence intervals shown
   - Filter by municipality

3. **Prescriptive Dashboard**:
   - Recommended actions by location
   - Resource allocation map
   - Patrol route optimizer
   - Outreach campaign planner

4. **Impact Tracker**:
   - Track effectiveness of implemented recommendations
   - Before/after analysis
   - ROI calculator

---

## Implementation Roadmap

### **Week 1-2: Enhanced Feature Engineering**
- [ ] Add spatial density features (accidents within radius)
- [ ] Add temporal pattern features (historical trends)
- [ ] Create holiday and season indicators
- [ ] Implement data aggregation for municipality-level analysis

### **Week 3-4: Multi-Target Model Development**
- [ ] Develop risk score prediction model
- [ ] Create hotspot probability classifier
- [ ] Implement time series forecasting (ARIMA/Prophet)
- [ ] Validate models with cross-validation

### **Week 5-6: Prescriptive Engine**
- [ ] Build rule-based recommendation engine
- [ ] Create location-specific action mappings
- [ ] Implement resource allocation optimizer
- [ ] Develop outreach planning module

### **Week 7-8: Backend Integration**
- [ ] Create new API endpoints
- [ ] Integrate ML models with Flask/Node
- [ ] Implement caching for predictions
- [ ] Add batch prediction capabilities

### **Week 9-10: Frontend Enhancement**
- [ ] Build predictive hotspot map
- [ ] Create forecast visualization components
- [ ] Develop prescriptive dashboard
- [ ] Implement recommendation display

### **Week 11-12: Testing & Validation**
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] User acceptance testing
- [ ] Documentation

---

## Expected Outcomes

### Predictive Analytics Deliverables:
✅ **Spatial-Temporal Risk Model**: Predicts where accidents will likely occur
✅ **Hotspot Forecasting**: Identifies emerging high-risk areas 30-90 days ahead
✅ **Trend Analysis**: Municipality-level accident forecasts
✅ **Pattern Detection**: Identifies temporal patterns (rush hours, weekends, seasons)

### Prescriptive Analytics Deliverables:
✅ **Location-Specific Recommendations**: Actionable strategies for each area
✅ **Resource Optimization**: Data-driven patrol and medical unit deployment
✅ **Enforcement Planning**: Strategic checkpoint placement and timing
✅ **Outreach Programs**: Targeted public awareness campaigns
✅ **Impact Measurement**: Track effectiveness of interventions

### Research Contributions:
✅ Novel application of ML to traffic accident prediction in Davao Oriental
✅ Integration of spatial-temporal analysis for Philippine road safety
✅ Evidence-based policy recommendations for LTO
✅ Reproducible methodology for other regions

---

## Technical Stack Additions

### Python Libraries:
```
# Time Series
prophet==1.1.5
statsmodels==0.14.0

# Spatial Analysis
geopandas==0.14.0
scipy==1.11.0

# Advanced ML
xgboost==2.0.0
lightgbm==4.1.0

# Optimization
pulp==2.7.0  # Linear programming for resource allocation
```

### Data Requirements:
- Historical accident data (✅ Have: 347 records)
- Road network data (future enhancement)
- Traffic volume data (future enhancement)
- Weather data (future enhancement)
- Holiday calendar (✅ Can add)

---

## Quick Start Implementation

### 1. Update Model Configuration (NOW)

Already partially done! Need to add:
- Spatial density features
- Historical trend features
- Enhanced prescriptive actions

### 2. Create Enhanced Feature Engineering Module

```python
# backend/model/ml_models/training/enhanced_features.py
class EnhancedFeatureEngineer(FeatureEngineer):
    def add_spatial_features(self, df):
        """Add accident density around each location"""
        # Calculate accidents within 1km radius
        # Calculate accidents within 5km radius
        pass
    
    def add_temporal_trends(self, df):
        """Add historical trend features"""
        # Accidents in last 30 days in same area
        # Trend direction (increasing/decreasing)
        pass
    
    def add_contextual_features(self, df):
        """Add holidays, seasons, etc."""
        pass
```

### 3. Enhance Config (IMMEDIATE)

See next section for config updates...

---

## Conclusion

This enhancement plan transforms your system from:
- ❌ **Reactive** (analyzing past accidents)
- ✅ **Proactive** (predicting and preventing future accidents)

It fully addresses your research objectives:
1. **Predictive Analytics**: ✅ Forecasts trends and high-risk areas
2. **Prescriptive Analytics**: ✅ Provides actionable recommendations

**Current Status**: Basic ML model working (65.7% accuracy)
**Next Goal**: Implement spatial-temporal prediction + location-specific recommendations
**Timeline**: 12 weeks for full implementation
**Expected Impact**: 15-20% reduction in accidents in target areas

