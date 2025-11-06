# How to Check the Log File

## Log File Location

### On Windows (Local):
```
D:\a. Capstone\LTOWebsiteCapstone\backend\model\ml_models\mv_registration_flask\sarima_model.log
```

### On Linux Server (SSH):
```
/var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/sarima_model.log
```

**Note:** If the file doesn't exist yet, it will be created automatically when you retrain the model.

---

## Method 1: Using Windows File Explorer (Easiest)

1. **Open File Explorer**
2. **Navigate to:**
   ```
   D:\a. Capstone\LTOWebsiteCapstone\backend\model\ml_models\mv_registration_flask\
   ```
3. **Look for the file:** `sarima_model.log`
4. **Double-click to open** it in Notepad or your default text editor

---

## Method 2: Using VS Code / Cursor

1. **Open VS Code/Cursor**
2. **Press `Ctrl + P`** (or `Cmd + P` on Mac) to open Quick Open
3. **Type:** `sarima_model.log`
4. **Select the file** when it appears
5. The log file will open in the editor

**Or:**

1. **Right-click** on the `mv_registration_flask` folder in the Explorer
2. **Select "Reveal in File Explorer"**
3. **Find and open** `sarima_model.log`

---

## Method 3: Using Linux/SSH (Server)

### Navigate to the Directory:
```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
```

### View the Entire Log:
```bash
cat sarima_model.log
```

### View Last 50 Lines (Most Recent):
```bash
tail -n 50 sarima_model.log
```

### View Last 50 Lines and Follow (Watch in Real-Time):
```bash
tail -n 50 -f sarima_model.log
```
(Press `Ctrl + C` to stop watching)

### Search for R² Related Messages:
```bash
grep -i "R²\|R2\|DEBUG\|r2" sarima_model.log
```

### Search with Context (2 lines before and after):
```bash
grep -i -C 2 "R²\|R2\|DEBUG.*r2\|r2.*calculated" sarima_model.log
```

### View Last 20 Lines with R² Info:
```bash
tail -n 100 sarima_model.log | grep -i "R²\|R2\|DEBUG\|r2"
```

### Find All Error/Warning Messages:
```bash
grep -i "ERROR\|WARNING\|Error\|Warning" sarima_model.log | tail -20
```

### Watch Log in Real-Time (Recommended):
```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
tail -f sarima_model.log
```

---

## Method 4: Using Command Line (PowerShell - Windows Only)

1. **Open PowerShell**
2. **Navigate to the directory:**
   ```powershell
   cd "D:\a. Capstone\LTOWebsiteCapstone\backend\model\ml_models\mv_registration_flask"
   ```
3. **View the entire log:**
   ```powershell
   Get-Content sarima_model.log
   ```
4. **View last 50 lines (most recent):**
   ```powershell
   Get-Content sarima_model.log -Tail 50
   ```
5. **Search for R² related messages:**
   ```powershell
   Select-String -Path sarima_model.log -Pattern "R²|R2|DEBUG|r2"
   ```
6. **Watch log in real-time (while training):**
   ```powershell
   Get-Content sarima_model.log -Wait -Tail 20
   ```
   (Press `Ctrl + C` to stop watching)

---

## Method 5: Using Command Prompt (CMD - Windows Only)

1. **Open Command Prompt**
2. **Navigate to the directory:**
   ```cmd
   cd "D:\a. Capstone\LTOWebsiteCapstone\backend\model\ml_models\mv_registration_flask"
   ```
3. **View the entire log:**
   ```cmd
   type sarima_model.log
   ```
4. **View last 50 lines:**
   ```cmd
   powershell "Get-Content sarima_model.log -Tail 50"
   ```
5. **Search for R² related messages:**
   ```cmd
   findstr /i "R2 DEBUG r2" sarima_model.log
   ```

---

## What to Look For

### ✅ Success Messages (R² was calculated):
```
DEBUG: Metrics calculated - R² value: 0.8543, type: <class 'float'>
DEBUG: Saved accuracy_metrics.r2 = 0.8543
R² calculated successfully: 0.8543 (variance: 1234.56)
In-Sample Performance:
  R²: 0.8543
```

### ❌ Warning Messages (R² couldn't be calculated):
```
Cannot calculate R²: actual values have zero variance (all values are the same)
R² calculation resulted in NaN/Inf. Actual variance: 0.0000, len: 150
Could not calculate R²: [error message]
Not enough data points to calculate R²
```

### 🔍 Search Patterns:
Look for these keywords:
- `R²` or `R2` - R² calculation messages
- `DEBUG` - Debug information about R²
- `r2` - R² variable references
- `variance` - Variance-related warnings
- `NaN` or `Inf` - Invalid number warnings
- `Insufficient` - Not enough data warnings

---

## How to Search the Log File

### In VS Code/Cursor:
1. **Open the log file**
2. **Press `Ctrl + F`** (or `Cmd + F` on Mac)
3. **Type your search term:** `R²` or `DEBUG` or `r2`
4. **Press Enter** to find matches
5. **Use `F3`** to find next match

### In Notepad:
1. **Open the log file in Notepad**
2. **Press `Ctrl + F`**
3. **Type your search term**
4. **Click "Find Next"**

### In PowerShell:
```powershell
# Search for R² related messages
Select-String -Path sarima_model.log -Pattern "R²|R2|DEBUG.*r2|r2.*calculated" -Context 2,2
```

This will show:
- The matching lines
- 2 lines before and after each match (context)

---

## Watch Log in Real-Time (Recommended)

**Best approach:** Watch the log file while retraining the model:

### Method A: PowerShell (Two Windows)
1. **Open PowerShell window 1** - Start your Flask app
2. **Open PowerShell window 2** - Run:
   ```powershell
   cd "D:\a. Capstone\LTOWebsiteCapstone\backend\model\ml_models\mv_registration_flask"
   Get-Content sarima_model.log -Wait -Tail 30
   ```
3. **In window 1, retrain the model**
4. **Watch window 2** - You'll see new log entries appear in real-time

### Method B: VS Code/Cursor
1. **Open the log file** in VS Code/Cursor
2. **Click the file** to make it active
3. **The file will auto-refresh** when new content is added
4. **Scroll to bottom** to see latest entries

---

## Quick Check Commands

### Linux/SSH Commands:

```bash
# Navigate to the directory
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask

# View last 100 lines
tail -n 100 sarima_model.log

# Search for R² messages
grep -i "R²\|R2\|DEBUG\|r2" sarima_model.log | tail -20

# Find all errors/warnings
grep -i "ERROR\|WARNING" sarima_model.log | tail -20

# Find messages from last training session
grep -i "TRAINING COMPLETED\|Training.*Performance\|R²" sarima_model.log | tail -30

# Watch log in real-time (while training)
tail -f sarima_model.log
```

### Windows PowerShell Commands:

```powershell
# View last 100 lines
Get-Content sarima_model.log -Tail 100

# Find all R² related messages
Select-String -Path sarima_model.log -Pattern "R²|R2|r2|DEBUG.*r2" | Select-Object -Last 20

# Find all error messages
Select-String -Path sarima_model.log -Pattern "ERROR|WARNING|Error|Warning" | Select-Object -Last 20

# Find messages from last training session
Select-String -Path sarima_model.log -Pattern "TRAINING COMPLETED|Training.*Performance|R²" | Select-Object -Last 30
```

---

## Understanding the Log Format

Each log entry follows this format:
```
2025-01-15 14:30:25,123 - __main__ - INFO - R² calculated successfully: 0.8543 (variance: 1234.56)
```

Breaking it down:
- `2025-01-15 14:30:25,123` - Timestamp
- `__main__` - Logger name
- `INFO` - Log level (INFO, WARNING, ERROR, DEBUG)
- `R² calculated successfully: ...` - The actual message

---

## Common Issues

### Issue: "File not found"
**Solution:** The log file is created when you first run the model. Retrain the model and it will be created.

### Issue: "Log file is too large"
**Solution:** Use `-Tail` parameter to only see recent entries:
```powershell
Get-Content sarima_model.log -Tail 50
```

### Issue: "Can't see recent entries"
**Solution:** 
1. Close and reopen the file
2. Or use `-Wait` to watch in real-time:
   ```powershell
   Get-Content sarima_model.log -Wait -Tail 20
   ```

---

## Example: What You Should See After Retraining

After retraining, search for "DEBUG" and you should see something like:

```
2025-01-15 14:30:25 - __main__ - INFO - DEBUG: Metrics calculated - R² value: 0.8543, type: <class 'float'>
2025-01-15 14:30:25 - __main__ - INFO - DEBUG: Saved accuracy_metrics.r2 = 0.8543
2025-01-15 14:30:25 - __main__ - INFO - R² calculated successfully: 0.8543 (variance: 1234.56)
2025-01-15 14:30:25 - __main__ - INFO - In-Sample Performance:
2025-01-15 14:30:25 - __main__ - INFO -   MAE: 86.31
2025-01-15 14:30:25 - __main__ - INFO -   RMSE: 113.98
2025-01-15 14:30:25 - __main__ - INFO -   MAPE: 29.07%
2025-01-15 14:30:25 - __main__ - INFO -   R²: 0.8543
2025-01-15 14:30:25 - __main__ - INFO - DEBUG: Before training_info - accuracy_metrics.r2 = 0.8543
2025-01-15 14:30:25 - __main__ - INFO - DEBUG: training_info['accuracy_metrics']['r2'] = 0.8543
```

If you see `R²: N/A` or no R² value, look for warning/error messages above it.

