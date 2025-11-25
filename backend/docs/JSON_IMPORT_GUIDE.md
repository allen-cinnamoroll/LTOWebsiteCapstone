# JSON Import Guide for LTO Website

This guide explains how to import JSON files into the MongoDB database for the LTO Website system.

## 📋 Prerequisites

- Node.js installed on your system
- MongoDB database accessible
- Environment variables properly configured
- Backend dependencies installed (`npm install`)

## 🔧 Environment Setup

### Production Environment Variables

Create a `.env` file in the backend directory with:

```env
NODE_ENV=production
PORT=5000
DATABASE=mongodb://lto_user:your_password@72.60.198.244:27017/lto_website?authSource=lto_website
DB_PASSWORD=your_actual_password
```

### Local Development Environment

```env
NODE_ENV=development
PORT=5000
DATABASE=mongodb://localhost:27017/lto_website
```

## 📁 Available JSON Files

Your system supports importing from the following JSON files in the `backend/json/` directory:

- `merged_2-4-3-5-11.json` - Combined registration data
- `restructured/drivers_collection.json` - Driver data only
- `restructured/vehicles_collection.json` - Vehicle data only
- Any other JSON file with proper structure

## 🚀 Import Methods

### Method 1: Import Any JSON File (Recommended)

```bash
# Navigate to backend directory
cd backend

# Import any JSON file
npm run import-any

# Or run directly
node scripts/import_any_json.js
```

**Features:**

- ✅ Handles any JSON file structure
- ✅ Maintains driver-vehicle relationships
- ✅ Prevents duplicate entries
- ✅ Creates proper indexes
- ✅ Works with production database

### Method 2: Import Restructured Data

```bash
# Import restructured driver and vehicle files
npm run import-restructured

# Or run directly
node scripts/import_restructured_data.js
```

**Use this when:**

- You have separate driver and vehicle JSON files
- Data is already properly structured
- You want faster import for large datasets

### Method 3: Production Import

```bash
# Comprehensive production import
npm run import-production

# Or run directly
node scripts/import_production.js
```

**Features:**

- ✅ Full production environment setup
- ✅ Comprehensive error handling
- ✅ Relationship verification
- ✅ Performance optimization

## 📊 Import Process Steps

### Step 1: Prepare Database

```bash
# Fix any existing index issues
npm run fix-indexes
```

### Step 2: Run Import

```bash
# Choose your import method
npm run import-any
```

### Step 3: Verify Import

```bash
# Verify relationships are maintained
npm run verify
```

## 🔍 Verification Commands

### Check Import Status

```bash
# Verify database connections and relationships
node scripts/verify_relationships.js
```

### Check Data Counts

```javascript
// In MongoDB shell or compass
db.vehicles.countDocuments();
db.drivers.countDocuments();
```

### Check Relationships

```javascript
// Verify driver-vehicle relationships
db.vehicles.find({ driverId: { $exists: true } }).count();
db.drivers.find({ vehicleIds: { $exists: true, $ne: [] } }).count();
```

## 📝 JSON File Structure Requirements

### For Driver Data

```json
{
  "drivers": [
    {
      "_id": "driver_id",
      "ownerRepresentativeName": "Driver Name",
      "licenseNo": "License Number",
      "address": "Driver Address",
      "contactNo": "Contact Number"
    }
  ]
}
```

### For Vehicle Data

```json
{
  "vehicles": [
    {
      "_id": "vehicle_id",
      "plateNo": "Plate Number",
      "fileNo": "File Number",
      "make": "Vehicle Make",
      "bodyType": "Body Type",
      "classification": "PRIVATE",
      "vehicleStatusType": "Old",
      "dateOfRenewal": "2025-06-11",
      "driverId": "driver_id"
    }
  ]
}
```

### For Combined Data

```json
{
  "drivers": [...],
  "vehicles": [...]
}
```

## ⚠️ Important Notes

### Before Import

1. **Backup your database** if it contains important data
2. **Check JSON file format** - ensure it matches expected structure
3. **Verify environment variables** are correctly set
4. **Ensure database is accessible** from your system

### During Import

1. **Monitor console output** for any errors
2. **Check for duplicate entries** warnings
3. **Verify relationship creation** messages
4. **Note any skipped records** and reasons

### After Import

1. **Run verification script** to check relationships
2. **Test frontend display** to ensure data shows correctly
3. **Check for any missing data** in the UI
4. **Verify search functionality** works properly

## 🐛 Troubleshooting

### Common Issues

#### 1. Connection Error

```
Error: connect ECONNREFUSED
```

**Solution:** Check database URL and ensure MongoDB is running

#### 2. Authentication Failed

```
Error: Authentication failed
```

**Solution:** Verify username, password, and database name in connection string

#### 3. Duplicate Key Error

```
Error: E11000 duplicate key error
```

**Solution:** The import script handles this automatically by skipping duplicates

#### 4. No Data in Frontend

**Possible Causes:**

- Backend not running
- Wrong database connection
- Frontend not updated

**Solutions:**

```bash
# Restart backend service
pm2 restart lto-backend

# Check backend logs
pm2 logs lto-backend

# Verify database connection
node scripts/verify_relationships.js
```

## 📈 Performance Tips

### For Large Datasets

1. **Use restructured import** for faster processing
2. **Import during off-peak hours** to avoid conflicts
3. **Monitor system resources** during import
4. **Consider batch processing** for very large files

### For Production

1. **Test import on staging** environment first
2. **Schedule maintenance window** for imports
3. **Have rollback plan** ready
4. **Monitor system performance** during import

## 🔄 Rollback Procedure

If import fails or causes issues:

```bash
# 1. Stop backend service
pm2 stop lto-backend

# 2. Restore from backup (if available)
# This depends on your backup strategy

# 3. Clear problematic collections (CAUTION: This deletes data)
# Only do this if you have backups
mongo your_database_name
db.vehicles.drop()
db.drivers.drop()

# 4. Restart backend
pm2 start lto-backend
```

## 📞 Support

If you encounter issues:

1. **Check console output** for specific error messages
2. **Verify environment variables** are correct
3. **Test database connection** manually
4. **Check JSON file format** matches requirements
5. **Review this guide** for troubleshooting steps

## 🎯 Quick Reference Commands

```bash
# Essential commands for JSON import
cd backend

# Fix indexes
npm run fix-indexes

# Import any JSON
npm run import-any

# Verify relationships
npm run verify

# Check backend status
pm2 status

# Restart backend
pm2 restart lto-backend
```

---

**Last Updated:** December 2024  
**Version:** 1.0  
**Compatible with:** LTO Website v1.0+
