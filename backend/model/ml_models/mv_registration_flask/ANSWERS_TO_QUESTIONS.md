# Answers to Your Questions

## 1. Hosting: localhost vs VPS IP/Domain

### Current Setup (localhost:5000)

- **What it means**: `localhost` or `127.0.0.1` means the server is only accessible from the VPS itself
- **Can you access it?**: Only from the VPS terminal (using `curl` commands)
- **From browser?**: Not directly accessible from your computer

### Option A: Access from VPS IP Address

If you want to access from your browser using the VPS IP:

**The code already runs on `0.0.0.0`**, which means it's listening on all network interfaces. You just need to:

1. Make sure firewall allows port 5000
2. Access via: `http://YOUR_VPS_IP:5000`

**Example:**

```bash
# On VPS - open firewall (if needed)
sudo ufw allow 5000

# Access from your browser
http://123.456.789.012:5000/api/health
# Replace 123.456.789.012 with your actual VPS IP
```

### Option B: Use Domain Name with Nginx (Production)

For production, you'd typically use Nginx as reverse proxy:

```nginx
# Nginx config at /etc/nginx/sites-available/registration-api
server {
    listen 80;
    server_name api.yourdomain.com;  # or yourdomain.com/api

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Then access via: `http://api.yourdomain.com/api/health`

### Recommendation

- **For testing now**: Use `curl` from VPS terminal (localhost works fine)
- **For browser testing**: Use `http://YOUR_VPS_IP:5000/api/health`
- **For production**: Set up Nginx reverse proxy with domain name

---

## 2. Understanding Accuracy Metrics

### MAE (Mean Absolute Error): 181.27

**What it means**: On average, your predictions are off by **181 registrations** per week.

**Example:**

- If you predict 295 registrations
- Actual could be anywhere from 114 to 476 (±181)
- Average error across all predictions

**Simple terms**: "The model is usually wrong by about 181 registrations"

### RMSE (Root Mean Squared Error): 253.29

**What it means**: Similar to MAE, but penalizes **larger errors more heavily**.

- If MAE = 181, RMSE = 253
- This means you have some **very large errors** that pull the average up
- RMSE > MAE = some predictions are way off

**Simple terms**: "Some predictions are REALLY wrong, pulling average up"

### MAPE (Mean Absolute Percentage Error): 108.84%

**What it means**: Your predictions are off by **108% on average**.

**Example:**

- If you predict 300 registrations
- Being off by 108% means you could predict anywhere from -24 to 624
- In practice: predicting 300 when actual is 140 = 114% error

**Is 108.84% MAPE bad?**

- ✅ **Yes, it's high** - ideal MAPE is < 10%
- ⚠️ **BUT it's expected** with only 5 weeks of data
- ✅ **Normal for proof-of-concept phase**

**Why so high?**

1. **Only 5 weeks of data** - too little to learn patterns
2. **High variability** - registrations fluctuate week-to-week
3. **Model is conservative** - uses simple parameters for small datasets

---

## 3. Actual Weekly Forecasts

### How to See Predictions

After the server starts, run:

```bash
# Get predictions for next 4 weeks
curl http://localhost:5000/api/predict/registrations?weeks=4
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "weekly_predictions": [
      {
        "date": "2025-07-07",
        "week": 28,
        "predicted_count": 295, // ← ACTUAL PREDICTION
        "lower_bound": 100, // ← Minimum likely
        "upper_bound": 490 // ← Maximum likely
      },
      {
        "date": "2025-07-14",
        "week": 29,
        "predicted_count": 310,
        "lower_bound": 115,
        "upper_bound": 505
      }
      // ... more weeks
    ],
    "monthly_aggregation": {
      "total_predicted": 1200, // ← Total for month
      "lower_bound": 450,
      "upper_bound": 1950
    }
  }
}
```

### What the Predictions Mean

Based on your 5 weeks of data (avg 295/week):

- **Weekly predictions**: Likely around **250-350 registrations per week**
- **Monthly total**: Likely around **1000-1400 registrations**

**The wide confidence intervals** (100-490) show the model is **uncertain** due to limited data.

---

## 4. Are Predictions Reliable?

### Current Status: Proof of Concept ✅

**What works:**

- ✅ Model trains successfully
- ✅ API endpoints function correctly
- ✅ Predictions are generated
- ✅ System architecture is correct

**Limitations (Expected):**

- ⚠️ **Accuracy is low** (MAPE 108% = unreliable)
- ⚠️ **Confidence intervals are wide** (±200 registrations)
- ⚠️ **Only 5 weeks of data** - too little to learn patterns

### Reliability by Data Amount

| Data Amount             | Reliability             | MAPE Expected | Use Case             |
| ----------------------- | ----------------------- | ------------- | -------------------- |
| **1 month (5 weeks)**   | ⚠️ Proof of concept     | 50-150%       | Testing system works |
| **3 months (12 weeks)** | 🟡 Limited reliability  | 20-40%        | Rough estimates      |
| **6 months (24 weeks)** | 🟢 Moderate reliability | 15-25%        | General planning     |
| **1 year (52 weeks)**   | ✅ Good reliability     | 10-15%        | Operational use      |
| **2 years (104 weeks)** | ✅✅ High reliability   | <10%          | Production ready     |

### Recommendation for Now

**For 1 Month of Data:**

1. ✅ **System works** - Flask API is functional
2. ✅ **Concept proven** - SARIMA model can train and predict
3. ⚠️ **Predictions unreliable** - Use for testing only
4. ✅ **Continue collecting data** - Target 2 years for production

**Don't use predictions for:**

- ❌ Resource planning
- ❌ Budget allocation
- ❌ Operational decisions

**Use predictions for:**

- ✅ Testing the API
- ✅ Understanding the system
- ✅ Verifying the pipeline works
- ✅ Demonstrating concept

---

## 5. How to Proceed

### Phase 1: Current (1 Month) ✅ DONE

- [x] Flask API working
- [x] Model training successfully
- [x] Predictions generated
- [x] System architecture complete

### Phase 2: Data Collection (Next 3-6 Months)

- Collect weekly registration data
- Monthly retraining recommended:
  ```bash
  curl -X POST http://localhost:5000/api/model/retrain \
    -H "Content-Type: application/json" \
    -d '{"force": true}'
  ```

### Phase 3: Production (After 1-2 Years)

- Accuracy should improve to MAPE < 15%
- Use predictions for actual planning
- Consider municipality-specific models
- Add more sophisticated features

---

## Summary

### 1. Hosting

- **localhost**: Works for VPS terminal testing ✅
- **VPS IP**: Use `http://YOUR_VPS_IP:5000` for browser access
- **Domain**: Set up Nginx for production (future)

### 2. Accuracy Metrics

- **MAE 181**: Off by ~181 registrations on average
- **RMSE 253**: Some very large errors exist
- **MAPE 108%**: High but **expected** with 5 weeks of data
- **Will improve** as more data is collected

### 3. Predictions

- **See them**: Run `curl http://localhost:5000/api/predict/registrations?weeks=4`
- **Expected**: ~250-350 per week (based on 295 avg)
- **Confidence**: Wide intervals (±200) show uncertainty

### 4. Reliability

- **Now**: Proof of concept only ⚠️
- **With more data**: Reliability improves significantly ✅
- **Target**: MAPE < 10% with 2 years of data

---

## Quick Test Commands

```bash
# 1. Check if server is running
curl http://localhost:5000/api/health

# 2. Get actual predictions
curl http://localhost:5000/api/predict/registrations?weeks=4 | python3 -m json.tool

# 3. Get accuracy metrics
curl http://localhost:5000/api/model/accuracy | python3 -m json.tool
```

The `| python3 -m json.tool` formats the JSON for easier reading.

---

**Bottom Line**: Your system works! The high MAPE is normal for minimal data. Continue collecting data and the model will improve over time. 🎉
