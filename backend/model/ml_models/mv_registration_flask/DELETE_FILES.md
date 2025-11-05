# How to Delete Files on VPS

## Delete CSV Files from Training Directory

### 1. Navigate to CSV Directory

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv\ registration\ training
```

### 2. List Files First (to see what you're deleting)

```bash
ls -lh *.csv
```

### 3. Delete a Specific CSV File

```bash
# Delete a single file
rm DAVOR_data.csv

# Delete with confirmation prompt
rm -i DAVOR_data.csv

# Delete file with timestamp (if you uploaded with timestamp)
rm jan2025_20250115_143022.csv
```

### 4. Delete Multiple CSV Files

```bash
# Delete multiple specific files
rm file1.csv file2.csv file3.csv

# Delete all CSV files (BE CAREFUL!)
rm *.csv

# Delete all CSV files with confirmation
rm -i *.csv
```

### 5. Delete Files by Pattern

```bash
# Delete files starting with specific pattern
rm jan2025*.csv

# Delete files with specific date pattern
rm *_202501*.csv
```

### 6. Delete Files Safely (with Backup)

```bash
# First, create a backup
mkdir -p ~/csv_backup
cp *.csv ~/csv_backup/

# Then delete
rm DAVOR_data.csv
```

### 7. Delete Files Older Than X Days

```bash
# Delete CSV files older than 30 days
find . -name "*.csv" -type f -mtime +30 -delete

# Delete files older than 7 days (with confirmation)
find . -name "*.csv" -type f -mtime +7 -exec rm -i {} \;
```

### 8. Delete Files with Specific Size

```bash
# Delete files larger than 100MB
find . -name "*.csv" -type f -size +100M -delete

# Delete empty CSV files
find . -name "*.csv" -type f -empty -delete
```

## Delete Files from Different Locations

### Delete Model Files (Trained Models)

```bash
cd /var/www/LTOWebsiteCapstone/backend/model/ml_models/trained
rm sarima_model.pkl
rm sarima_metadata.json
```

### Delete Log Files

```bash
# Delete application logs
rm /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv_registration_flask/*.log

# Delete old log files
find /var/www -name "*.log" -mtime +30 -delete
```

### Delete Temporary Files

```bash
# Delete all temporary files
find /tmp -name "*csv*" -type f -delete
```

## Safe Deletion Methods

### 1. Move to Trash/Backup First

```bash
# Create a backup directory
mkdir -p ~/deleted_files

# Move file instead of deleting (can recover later)
mv DAVOR_data.csv ~/deleted_files/
```

### 2. Use Trash Command (if installed)

```bash
# Install trash-cli first
sudo apt-get install trash-cli

# Move to trash (can recover)
trash DAVOR_data.csv

# View trash
trash-list

# Restore from trash
trash-restore

# Empty trash
trash-empty
```

### 3. Delete with Verbose Output

```bash
# See what's being deleted
rm -v *.csv
```

## Delete Files via Python (if needed)

```python
import os
import glob

# Delete a specific file
os.remove('/var/www/LTOWebsiteCapstone/backend/model/ml_models/mv registration training/DAVOR_data.csv')

# Delete multiple files
files_to_delete = glob.glob('/var/www/LTOWebsiteCapstone/backend/model/ml_models/mv registration training/*.csv')
for file in files_to_delete:
    if os.path.exists(file):
        os.remove(file)
        print(f"Deleted: {file}")
```

## Recover Deleted Files

### If you just deleted it (and haven't closed the terminal)

```bash
# Check if file is still in memory
lsof | grep DAVOR_data.csv

# If process is still using it, you might recover from /proc
# (This is advanced and may not always work)
```

### From Backup

```bash
# If you have backups
cp ~/csv_backup/DAVOR_data.csv /var/www/LTOWebsiteCapstone/backend/model/ml_models/mv\ registration\ training/
```

## Important Notes

⚠️ **WARNING:**

- `rm` command permanently deletes files (no recycle bin on Linux)
- Always list files first with `ls` before deleting
- Use `rm -i` for interactive deletion (asks for confirmation)
- Consider backing up important files before deletion
- Double-check file paths before running delete commands

## Common Delete Commands Summary

```bash
# Delete single file
rm filename.csv

# Delete with confirmation
rm -i filename.csv

# Delete multiple files
rm file1.csv file2.csv

# Delete all CSV files (careful!)
rm *.csv

# Delete all CSV files with confirmation
rm -i *.csv

# Force delete (no prompts)
rm -f filename.csv

# Delete recursively (for directories)
rm -r directory_name

# Delete directory and all contents
rm -rf directory_name
```

## Check File Before Deleting

```bash
# Check file size
ls -lh filename.csv

# Check file contents
head filename.csv

# Check when file was last modified
stat filename.csv

# Check if file is being used by any process
lsof filename.csv
```
