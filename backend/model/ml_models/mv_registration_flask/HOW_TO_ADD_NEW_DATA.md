# How to Add New Data from Different CSV Files

## Current Setup

The system currently loads data from:
```
mv registration training/DAVOR_data.csv
```

## Option 1: Combine CSV Files (Recommended) ✅

**Best approach**: Merge all your CSV files into one `DAVOR_data.csv`

### Steps:

**On your local machine:**
1. Combine your CSV files using Excel, Python, or command line
2. Ensure all files have the same column structure
3. Remove duplicate rows (if any)
4. Save as `DAVOR_data.csv`
5. Upload to VPS

**Using Python to combine:**
```python
import pandas as pd

# Load all CSV files
df1 = pd.read_csv('DAVOR_data.csv')
df2 = pd.read_csv('new_data.csv')
df3 = pd.read_csv('another_file.csv')

# Combine them
combined_df = pd.concat([df1, df2, df3], ignore_index=True)

# Remove duplicates (if any)
combined_df = combined_df.drop_duplicates()

# Sort by date
combined_df['dateOfRenewal_parsed'] = pd.to_datetime(combined_df['dateOfRenewal'], format='%m/%d/%Y')
combined_df = combined_df.sort_values('dateOfRenewal_parsed')

# Save combined file
combined_df.to_csv('DAVOR_data.csv', index=False)
```

**Then upload to VPS and retrain.**

## Option 2: Modify Code to Load Multiple CSV Files

I can modify the code to automatically load and combine multiple CSV files.

### What it would do:
- Look for all CSV files in the directory
- Load and combine them automatically
- Process as one dataset

### Example structure:
```
mv registration training/
├── DAVOR_data.csv
├── DAVOR_data_june.csv
├── DAVOR_data_july.csv
└── DAVOR_data_august.csv
```

**Would you like me to implement this?**

## Option 3: Append New Data to Existing CSV

### Using Command Line:
```bash
# On VPS, if you have new_data.csv
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv\ registration\ training

# Append new CSV (skip header from second file)
tail -n +2 new_data.csv >> DAVOR_data.csv
```

**Note**: This assumes both files have the same structure and headers.

## Option 4: Manual Data Entry

If you have new data in a different format:
1. Convert to same format as DAVOR_data.csv
2. Ensure columns match exactly
3. Combine with existing data
4. Upload to VPS

## Recommended Approach

**Option 1 (Combine CSVs) is best because:**
- ✅ Simple and reliable
- ✅ No code changes needed
- ✅ Easy to manage
- ✅ Prevents duplicates
- ✅ Can verify data before uploading

## After Adding New Data

Once you've combined/added new data:

1. **Upload updated CSV to VPS** (if combined locally)
2. **Verify it's there:**
   ```bash
   wc -l /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv\ registration\ training/DAVOR_data.csv
   ```

3. **Retrain the model:**
   ```bash
   curl -X POST http://localhost:5001/api/model/retrain \
     -H "Content-Type: application/json" \
     -d '{"force": true}'
   ```

4. **Check new accuracy:**
   ```bash
   curl http://localhost:5001/api/model/accuracy | python3 -m json.tool
   ```

## Important Notes

### Data Format Requirements:
- ✅ Same column structure
- ✅ Same date format (MM/DD/YYYY)
- ✅ Same municipality names
- ✅ No duplicate rows

### Data Quality:
- ✅ Consistent date ranges (no gaps)
- ✅ Valid dates only
- ✅ Proper municipality names (Davao Oriental)

## Would You Like Me To:

1. **Create a script to combine multiple CSV files automatically?**
2. **Modify the code to load from multiple CSV files?**
3. **Create a data validation script?**

Let me know which approach you prefer!



