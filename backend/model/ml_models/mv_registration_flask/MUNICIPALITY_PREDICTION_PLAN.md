# Per-Municipality Prediction Implementation Plan

## Current Status: NOT IMPLEMENTED

**Reason:** With only 1 month (5 weeks) of data, there isn't enough data per municipality to train reliable models.

## When to Implement

| Data Amount       | Recommendation                                              |
| ----------------- | ----------------------------------------------------------- |
| **Now (1 month)** | ❌ Don't implement - too little data                        |
| **3 months**      | 🟡 Consider for larger municipalities only                  |
| **6 months**      | 🟢 Implement for municipalities with >20 registrations/week |
| **1 year**        | ✅ Implement for most municipalities                        |
| **2 years**       | ✅✅ Full implementation, all municipalities                |

## Why Wait?

### Current Data (5 weeks):

- **Total registrations**: ~1,476
- **Average per municipality**: ~134 registrations total
- **Per week average**: ~27 registrations/week
- **Some municipalities**: May have only 5-10 registrations total

### With 5 Weeks:

- Training a SARIMA model needs **at least 12-20 data points**
- Each municipality would have only 5 weeks
- Most municipalities would have insufficient data
- Models would be **unreliable** (even worse accuracy than current 108% MAPE)

### With 2 Years of Data:

- **104 weeks** per municipality
- **Much more reliable** patterns
- **Better accuracy** (target <10% MAPE)
- **Worth implementing** separate models

## Recommended Approach

### Phase 1: Now (Current)

✅ **Keep aggregated model** - Works with limited data
✅ **Prove concept** - System architecture is correct
✅ **Collect more data** - Focus on data collection

### Phase 2: Prepare Code Structure (Optional)

✅ **Add municipality parameter handling** - Ready but not active
✅ **Create modular code** - Easy to enable later
✅ **Add data validation** - Check minimum data requirements

### Phase 3: When You Have 6+ Months

✅ **Enable per-municipality predictions**
✅ **Train models only for municipalities with sufficient data**
✅ **Use aggregated model as fallback** for sparse municipalities

### Phase 4: When You Have 2 Years

✅ **Full per-municipality implementation**
✅ **All municipalities get their own models**
✅ **High accuracy predictions**

## Code Structure Preparation

I can prepare the code to:

1. **Detect when enough data exists**

   - Minimum threshold: 12+ weeks with registrations
   - Automatic fallback to aggregated model if insufficient

2. **Train per-municipality models conditionally**

   - Only train models for municipalities meeting minimum threshold
   - Store models separately (one file per municipality)

3. **Smart prediction routing**

   - If municipality has model → use it
   - If not → use aggregated model predictions (scaled proportionally)

4. **Easy activation**
   - Feature flag to enable/disable per-municipality mode
   - When you have 2 years: just flip the flag

## Implementation Options

### Option A: Wait Until 2 Years (Recommended)

- **Pros**: Simple, reliable, better accuracy
- **Cons**: Have to wait
- **Best for**: Production-ready system

### Option B: Prepare Structure Now, Enable Later

- **Pros**: Code ready when you have data, easy to enable
- **Cons**: Code complexity now, won't use immediately
- **Best for**: Planning ahead

### Option C: Implement Now, Train Selectively

- **Pros**: Can test infrastructure
- **Cons**: Models will be unreliable, need frequent updates
- **Best for**: Testing/development only

## Recommendation

**Wait until you have at least 6 months of data**, then implement per-municipality models. Here's why:

1. **Better ROI**: Effort invested will give reliable results
2. **User Experience**: Predictions will actually be useful
3. **Maintenance**: Less need to retrain frequently
4. **Accuracy**: Models will be production-quality

**But I can prepare the code structure now** so when you have 2 years of data, enabling per-municipality predictions is just:

- Set `ENABLE_PER_MUNICIPALITY = True`
- Retrain models
- Done!

## Current System

Right now, the system:

- ✅ Works with limited data
- ✅ Provides aggregated predictions
- ✅ Is proof-of-concept ready
- ✅ Will scale to per-municipality when ready

**My suggestion**: Keep it simple for now, add per-municipality when you have 6+ months of data.

Would you like me to:

1. **Just keep current system** (recommended for now)
2. **Prepare code structure** for future per-municipality (enable later)
3. **Implement now with minimum thresholds** (test infrastructure, expect low accuracy)
