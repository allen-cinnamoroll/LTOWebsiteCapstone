# VPS Debug Commands - Why Still Showing July 28?

Run these commands **one by one** on your VPS to debug the issue:

## Step 1: Check if the fix code exists in the file

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask

# Check if the Sunday calculation code exists
grep -n "days_since_sunday" sarima_model_optimized.py

# Check if the first_week_start logic exists
grep -n "first_week_start" sarima_model_optimized.py

# Check the weekly aggregation section
sed -n '1025,1050p' sarima_model_optimized.py
```

**Expected:** Should show lines 1040-1045 with the Sunday calculation code.

## Step 2: Check what's actually in the weekly aggregation code

```bash
# Show the exact weekly aggregation logic
sed -n '1025,1070p' sarima_model_optimized.py | cat -n
```

**Look for:**
- Line with `days_since_sunday = (date_obj.weekday() + 1) % 7`
- Line with `if week_start < next_month_start:`
- Line with `week_start = first_week_start`

## Step 3: Check if Python is using a cached version

```bash
# Check for .pyc files
find . -name "sarima_model_optimized*.pyc" -ls

# Check __pycache__ directories
find . -type d -name __pycache__ | xargs ls -la

# Check if there's a compiled version being used
python3 -c "import sarima_model_optimized; print(sarima_model_optimized.__file__)"
```

## Step 4: Check the actual code that's running

```bash
# See what Python actually loads
python3 << 'EOF'
import sys
sys.path.insert(0, '/var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask')
import sarima_model_optimized
import inspect

# Get the predict method source
source = inspect.getsource(sarima_model_optimized.OptimizedSARIMAModel.predict)
# Find the weekly aggregation section
lines = source.split('\n')
for i, line in enumerate(lines):
    if 'Aggregate to weekly totals' in line or 'days_since_sunday' in line or 'first_week_start' in line:
        print(f"Line {i}: {line}")
        # Print a few lines around it
        for j in range(max(0, i-2), min(len(lines), i+5)):
            if j != i:
                print(f"  {j}: {lines[j]}")
EOF
```

## Step 5: Add temporary debug logging

Let's add a print statement to see what's happening:

```bash
# Backup the file first
cp sarima_model_optimized.py sarima_model_optimized.py.backup

# Add debug print before weekly aggregation
sed -i '1041a\                print(f"DEBUG: date_obj={date_obj}, week_start={week_start}, next_month_start={next_month_start}, first_week_start={first_week_start}")' sarima_model_optimized.py

# Restart API
sudo systemctl restart mv-prediction-api
sleep 5

# Make a request and check logs
curl "http://localhost:5002/api/predict/registrations?weeks=4" > /dev/null
sudo journalctl -u mv-prediction-api -n 50 --no-pager | grep "DEBUG:"
```

## Step 6: Check if there's a different version of the file

```bash
# Check file modification time
ls -la sarima_model_optimized.py

# Check git status on VPS
cd /var/www/LTOWebsiteCapstone
git status backend/model/ml_models/mv_registration_flask/sarima_model_optimized.py

# Check what commit this file is from
git log -1 --oneline backend/model/ml_models/mv_registration_flask/sarima_model_optimized.py
```

## Step 7: Verify the exact code around line 1040

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask

# Show lines 1035-1050 with line numbers
sed -n '1035,1050p' sarima_model_optimized.py | cat -n

# Check what weekday() returns (should be 0-6, Monday=0, Sunday=6)
python3 << 'EOF'
from datetime import datetime
import pandas as pd
date = pd.Timestamp('2025-08-01')
print(f"August 1, 2025 weekday: {date.weekday()}")  # Should be 4 (Friday)
print(f"Formula result: {(date.weekday() + 1) % 7}")  # Should be 5
EOF
```

## Step 8: Test the logic manually

```bash
python3 << 'EOF'
from datetime import timedelta
import pandas as pd

# Simulate the logic
next_month_start = pd.Timestamp('2025-08-01')
print(f"next_month_start: {next_month_start}")
print(f"next_month_start.weekday(): {next_month_start.weekday()}")  # Friday = 4

# Calculate first_week_start
next_month_start_weekday = next_month_start.weekday()
days_until_sunday = (6 - next_month_start_weekday) % 7
if days_until_sunday == 0 and next_month_start_weekday != 6:
    days_until_sunday = 7
first_week_start = next_month_start + timedelta(days=days_until_sunday)
print(f"first_week_start: {first_week_start}")  # Should be August 3

# Test for August 1
date_obj = pd.Timestamp('2025-08-01')
days_since_sunday = (date_obj.weekday() + 1) % 7
week_start = date_obj - timedelta(days=days_since_sunday)
print(f"For Aug 1: week_start={week_start}")  # Should be July 27
print(f"week_start < next_month_start: {week_start < next_month_start}")  # Should be True
print(f"Final week_start should be: {first_week_start}")  # Should be August 3
EOF
```

---

## What to Look For

After running these commands, check:

1. **Step 1-2**: Does the fix code exist in the file? If not, the file wasn't updated.
2. **Step 3**: Are there cached .pyc files being used?
3. **Step 4**: What code is Python actually loading?
4. **Step 5**: What values are being calculated during prediction?
5. **Step 6**: Is the file the latest version from git?
6. **Step 7-8**: Does the logic work correctly when tested manually?

**Share the output of these commands** and we can identify the exact issue!







