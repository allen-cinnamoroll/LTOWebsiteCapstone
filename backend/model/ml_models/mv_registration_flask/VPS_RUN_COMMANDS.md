# Exact Commands to Run Flask API on Hostinger VPS

## Step-by-Step Instructions

### Step 1: Navigate to Flask App Directory

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
```

### Step 2: Verify Data File Exists

```bash
ls -la "../mv registration training/DAVOR_data.csv"
```

**Expected output:** Should show the CSV file with its size.

### Step 3: Activate Virtual Environment

```bash
source venv/bin/activate
```

**Look for:** `(venv)` prefix in your prompt:

```
(venv) root@srv1030173:/var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask#
```

### Step 4: Install Dependencies (if not already done)

```bash
pip install -r requirements.txt
```

**Note:** This should already be done, but run it to be sure.

### Step 5: Run Flask Application

```bash
python3 app.py
```

## Expected Output

When you run `python3 app.py`, you should see:

```
Initializing Vehicle Registration Prediction API...
No existing model found. Training new model...
Loading data from: /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv registration training/DAVOR_data.csv
Loaded 2432 rows
Filtered to 2415 rows from Davao Oriental municipalities
After date parsing: 2415 rows
Aggregated to 9 weeks
Date range: 2025-02-10 00:00:00 to 2025-06-30 00:00:00
After filtering zero weeks: X weeks with registrations
Training SARIMA model...
Training on X weeks of data
Date range: 2025-02-16 00:00:00 to 2025-06-29 00:00:00
Finding optimal SARIMA parameters...
Small dataset detected (X weeks). Using conservative parameters.
Fitting SARIMA model with parameters: order=(1, 1, 1), seasonal=(1, 1, 1, 4)
Model fitting completed!
Model Accuracy - MAE: X.XX, RMSE: X.XX, MAPE: X.XX%
Model saved to /var/www/LTOWebsiteCapstone/backend/model/ml_models/trained/sarima_model.pkl
Model initialized successfully!
Starting Flask server...
 * Running on http://0.0.0.0:5000
```

## Test the API

**In a NEW terminal window** (keep Flask running), test:

### Test 1: Health Check

```bash
curl http://localhost:5000/api/health
```

### Test 2: Get Predictions

```bash
curl http://localhost:5000/api/predict/registrations?weeks=4
```

### Test 3: Get Accuracy Metrics

```bash
curl http://localhost:5000/api/model/accuracy
```

## Complete Command Sequence (Copy-Paste Ready)

```bash
# Navigate to directory
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask

# Verify data file
ls -la "../mv registration training/DAVOR_data.csv"

# Activate virtual environment
source venv/bin/activate

# Run Flask app
python3 app.py
```

## Troubleshooting

### If "CSV file not found" error:

Check the path:

```bash
pwd  # Should show: /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
ls -la "../mv registration training/"
```

### If "Module not found" error:

```bash
source venv/bin/activate
pip install -r requirements.txt
```

### If port 5000 is in use:

Find and kill the process:

```bash
lsof -i :5000
kill -9 <PID>
```

Or change port in app.py (last line):

```python
app.run(host='0.0.0.0', port=5001, debug=False)
```

## Running in Background (Optional)

If you want to run it in the background:

```bash
# Using nohup
nohup python3 app.py > flask_api.log 2>&1 &

# Check if running
ps aux | grep app.py

# View logs
tail -f flask_api.log

# Stop it
pkill -f app.py
```

## Data File Location

**Current Path:**

```
/var/www/LTOWebsiteCapstone/backend/model/ml_models/mv registration training/DAVOR_data.csv
```

**Relative from Flask app:**

```
../mv registration training/DAVOR_data.csv
```

The code automatically finds this path - no manual configuration needed!
