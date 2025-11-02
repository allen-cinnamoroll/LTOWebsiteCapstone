# Step-by-Step Setup Guide

Follow these steps **one by one** and send a screenshot after each step so I can evaluate the progress.

## Step 1: Navigate to Flask App Directory

Run this command:

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
```

**Expected Output:** You should see your prompt change to show you're in the `mv_registration_flask` directory.

**Send screenshot of:** The terminal showing you're in the correct directory.

---

## Step 2: Check if Virtual Environment Exists

Run this command:

```bash
ls -la
```

**Expected Output:** You should see files like `app.py`, `requirements.txt`, `README.md`, etc. There may or may not be a `venv` directory.

**Send screenshot of:** The directory listing.

---

## Step 3: Create Virtual Environment

Run this command:

```bash
python3 -m venv venv
```

**Expected Output:** No errors, command completes successfully.

**What to look for:**

- No error messages
- A `venv` directory should be created (check with `ls -la` if needed)

**Send screenshot of:** The command execution.

---

## Step 4: Activate Virtual Environment

Run this command:

```bash
source venv/bin/activate
```

**Expected Output:** Your prompt should change to show `(venv)` at the beginning.

**What to look for:** The prompt should show something like:

```
(venv) root@srv1030173:/var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask#
```

**Send screenshot of:** The activated virtual environment (notice the `(venv)` prefix).

---

## Step 5: Upgrade pip

Run this command:

```bash
pip install --upgrade pip
```

**Expected Output:** pip should upgrade successfully.

**What to look for:**

- No major errors
- Shows "Successfully installed pip-x.x.x" or similar

**Send screenshot of:** The pip upgrade output.

---

## Step 6: Install Dependencies

Run this command:

```bash
pip install -r requirements.txt
```

**Expected Output:** All packages should install successfully.

**What to look for:**

- Flask, pandas, numpy, statsmodels, etc. installing
- No major errors
- "Successfully installed" message at the end

**This may take a few minutes** - especially installing statsmodels and scipy.

**Send screenshot of:** The installation progress and completion.

---

## Step 7: Verify CSV File Exists

Run this command:

```bash
ls -la "../../mv registration training/DAVOR_data.csv"
```

**Expected Output:** Should show the file details or an error if file doesn't exist.

**What to look for:**

- File exists and shows file size
- Or error: "No such file or directory"

**Send screenshot of:** The file check result.

---

## Step 8: Create Trained Models Directory

Run this command:

```bash
mkdir -p ../trained
```

**Expected Output:** No errors, directory created.

**Send screenshot of:** The command execution (or verify with `ls -la ../trained`).

---

## Step 9: Run the Flask Application

Run this command:

```bash
python3 app.py
```

**Expected Output:** The Flask app should start and show:

- Initialization messages
- Model loading/training messages
- "Starting Flask server..."
- "Running on http://0.0.0.0:5000" or similar

**What to look for:**

- Model initialization success
- Any errors during model training/loading
- Server starting successfully

**This is the critical step** - this will train the model if it's the first run.

**Send screenshot of:** The full startup output (all the initialization messages).

---

## Step 10: Test Health Endpoint (In Another Terminal)

Open a **new terminal** (keep Flask app running in the first terminal) and run:

```bash
curl http://localhost:5000/api/health
```

**Expected Output:** JSON response showing the API is healthy.

**What to look for:**

- JSON response with `"success": true`
- `"status": "healthy"`
- `"model_initialized": true`

**Send screenshot of:** The curl response.

---

## Step 11: Test Prediction Endpoint

In the same second terminal, run:

```bash
curl http://localhost:5000/api/predict/registrations?weeks=4
```

**Expected Output:** JSON response with prediction data.

**What to look for:**

- `"success": true`
- `"weekly_predictions"` array with 4 predictions
- `"monthly_aggregation"` with totals

**Send screenshot of:** The prediction response (you may need to format it with `| python3 -m json.tool` to make it readable).

---

## Step 12: Test Accuracy Endpoint

In the same second terminal, run:

```bash
curl http://localhost:5000/api/model/accuracy
```

**Expected Output:** JSON response with accuracy metrics.

**What to look for:**

- `"success": true`
- `"mae"`, `"rmse"`, `"mape"` values
- `"model_parameters"` showing SARIMA params

**Send screenshot of:** The accuracy response.

---

## Troubleshooting Tips

If you encounter errors at any step:

1. **Python not found:** Make sure you're using `python3`, not `python`
2. **Permission errors:** You may need `sudo` for some operations
3. **Port already in use:** Check if port 5000 is used: `lsof -i :5000`
4. **Import errors:** Make sure virtual environment is activated (`(venv)` in prompt)
5. **CSV file not found:** Verify the path and file name

## What I'll Evaluate from Screenshots

1. **Step 1-4:** Directory navigation and virtual environment setup
2. **Step 5-6:** Dependency installation success
3. **Step 7:** Data file availability
4. **Step 9:** Model initialization and training (most critical)
5. **Step 10-12:** API endpoint functionality

Send screenshots after each step, and I'll help troubleshoot any issues!
