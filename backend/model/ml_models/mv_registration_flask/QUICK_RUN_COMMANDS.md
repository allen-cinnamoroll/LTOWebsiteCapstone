# Quick Commands to Run Flask App

## Step-by-Step Commands

### 1. Navigate to Directory
```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
```

### 2. Pull Latest Code (if you updated on GitHub)
```bash
cd /var/www/LTOWebsiteCapstone
git pull origin main
cd backend/model/ml_models/mv_registration_flask
```

### 3. Activate Virtual Environment
```bash
source venv/bin/activate
```

**Look for:** `(venv)` prefix in your prompt

### 4. Run Flask Application
```bash
python3 app.py
```

## Complete Command Sequence (Copy-Paste)

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
source venv/bin/activate
python3 app.py
```

## If You See Import Errors

If you see `ModuleNotFoundError: No module named 'config'`, make sure you're in the right directory:

```bash
# Check you're in the right place
pwd
# Should show: /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask

# Check config.py exists
ls -la config.py
```

## If Port 5000 is in Use

**Option 1: Kill the process using port 5000**
```bash
lsof -i :5000
kill -9 <PID>
```

**Option 2: Use different port**
Edit `app.py` last line:
```python
app.run(host='0.0.0.0', port=5001, debug=False)
```

## Expected Output

When running successfully, you should see:
```
Initializing Vehicle Registration Prediction API...
Initializing aggregated model...
Loading existing aggregated model...
OR
Training aggregated model...
...
Model initialized successfully!
Starting Flask server...
 * Running on http://0.0.0.0:5000
```

## Test the API

In a **new terminal window** (keep Flask running):

```bash
# Health check
curl http://localhost:5000/api/health

# Get predictions
curl http://localhost:5000/api/predict/registrations?weeks=4

# Get accuracy
curl http://localhost:5000/api/model/accuracy
```

## Run in Background (Optional)

If you want to run it in the background:

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
source venv/bin/activate
nohup python3 app.py > flask_api.log 2>&1 &
```

Then check logs:
```bash
tail -f flask_api.log
```

