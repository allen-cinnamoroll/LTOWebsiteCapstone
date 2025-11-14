# How to View All CSV Registration Data on VPS

## Quick Commands

### 1. Navigate to CSV Directory

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv\ registration\ training
```

Or if the directory has no spaces:
```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_training
```

### 2. List All CSV Files

```bash
# List all CSV files with details
ls -lh *.csv

# Or more detailed
ls -lah *.csv
```

### 3. Count Total CSV Files

```bash
ls -1 *.csv | wc -l
```

### 4. View File Sizes

```bash
du -h *.csv
```

### 5. View Contents of a Specific CSV File

#### View First Few Lines (Header + Sample Data)
```bash
# View first 10 lines
head -n 10 DAVOR_data.csv

# View first 20 lines
head -n 20 DAVOR_data.csv

# View with column alignment (if you have column command)
head -n 20 DAVOR_data.csv | column -t -s,
```

#### View Last Few Lines
```bash
tail -n 10 DAVOR_data.csv
```

#### View Entire File (for small files)
```bash
cat DAVOR_data.csv
```

#### View File with Pagination (for large files)
```bash
# Use less (scroll with arrow keys, press 'q' to quit)
less DAVOR_data.csv

# Or use more (press space to scroll)
more DAVOR_data.csv
```

### 6. Count Total Rows in CSV Files

```bash
# Count rows in main file (subtract 1 for header)
wc -l DAVOR_data.csv

# Count rows in all CSV files
wc -l *.csv

# Count total rows across all files (excluding headers)
awk 'END {print NR-1}' *.csv
```

### 7. View CSV File Structure (Columns)

```bash
# Show first line (header)
head -n 1 DAVOR_data.csv

# Show column names in a readable format
head -n 1 DAVOR_data.csv | tr ',' '\n' | nl
```

### 8. Search Within CSV Files

```bash
# Search for specific text/pattern
grep "search_term" *.csv

# Case-insensitive search
grep -i "search_term" *.csv

# Show line numbers
grep -n "search_term" *.csv

# Count matches
grep -c "search_term" *.csv
```

### 9. View Data Summary

#### Count Unique Values in a Column (if you know column position)
```bash
# Example: Count unique values in column 5 (adjust number as needed)
cut -d',' -f5 DAVOR_data.csv | sort | uniq -c | sort -rn | head -20
```

#### View Date Range (if dates are in a specific column)
```bash
# Example: Show date range from column 3
cut -d',' -f3 DAVOR_data.csv | sort | head -1  # First date
cut -d',' -f3 DAVOR_data.csv | sort | tail -1  # Last date
```

### 10. Download CSV File to View Locally

#### Using SCP (from your local machine)
```bash
# On your LOCAL machine (Windows PowerShell or Git Bash)
scp root@72.60.198.244:/var/www/LTOWebsiteCapstone/backend/model/ml_models/mv\ registration\ training/DAVOR_data.csv ./
```

#### Using SFTP Client
1. Connect to VPS with FileZilla/WinSCP
2. Navigate to: `/var/www/LTOWebsiteCapstone/backend/model/ml_models/mv registration training/`
3. Download CSV files to your local machine

### 11. View All Uploaded CSV Files (with timestamps)

```bash
# List all CSV files with upload dates
ls -lht *.csv

# Show files sorted by modification time
ls -lt *.csv
```

### 12. Check Total Data Size

```bash
# Total size of all CSV files
du -sh /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv\ registration\ training/
```

## Python Script to View CSV Data

You can also create a simple Python script to view CSV data:

```bash
# Create a script
cat > /tmp/view_csv.py << 'EOF'
import pandas as pd
import os
import glob

# Find CSV directory
base_dir = "/var/www/LTOWebsiteCapstone/backend/model/ml_models"
data_dir = os.path.join(base_dir, "mv registration training")
if not os.path.exists(data_dir):
    data_dir = os.path.join(base_dir, "mv_registration_training")

# Find all CSV files
csv_files = glob.glob(os.path.join(data_dir, "*.csv"))

print(f"Found {len(csv_files)} CSV file(s):\n")
for csv_file in csv_files:
    print(f"\n{'='*60}")
    print(f"File: {os.path.basename(csv_file)}")
    print(f"Size: {os.path.getsize(csv_file) / 1024:.2f} KB")
    print(f"{'='*60}")
    
    try:
        df = pd.read_csv(csv_file)
        print(f"Rows: {len(df)}")
        print(f"Columns: {len(df.columns)}")
        print(f"\nColumns: {', '.join(df.columns.tolist())}")
        print(f"\nFirst 5 rows:")
        print(df.head())
        print(f"\nLast 5 rows:")
        print(df.tail())
        print(f"\nData types:")
        print(df.dtypes)
    except Exception as e:
        print(f"Error reading file: {e}")
EOF

# Run the script
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask
source venv/bin/activate
python3 /tmp/view_csv.py
```

## Quick One-Liner Commands

### See all CSV files with row counts
```bash
for file in *.csv; do echo "$file: $(wc -l < "$file") rows"; done
```

### See file sizes and row counts
```bash
for file in *.csv; do echo "$file: $(du -h "$file" | cut -f1) - $(wc -l < "$file") rows"; done
```

### View specific columns (e.g., columns 1, 3, 5)
```bash
cut -d',' -f1,3,5 DAVOR_data.csv | head -20
```

## Troubleshooting

### If directory doesn't exist:
```bash
# Check if it's in a different location
find /var/www -name "*.csv" -type f 2>/dev/null

# Or check alternative path
ls -la /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_training/
```

### If you get permission errors:
```bash
# Use sudo
sudo ls -la /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv\ registration\ training/
```

## View via API (Alternative Method)

You can also check what CSV files the system knows about by checking the Flask API logs:

```bash
# View Flask logs
sudo journalctl -u mv-prediction-api -n 100 | grep -i csv
```

Or check the processing info from the retrain endpoint response, which includes information about which CSV files were combined.


