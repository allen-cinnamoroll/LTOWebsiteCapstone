# Production JSON Import Guide

This guide explains how to import JSON files into your production MongoDB database while maintaining proper relationships between Vehicle and Driver collections.

## Environment Setup

Your production environment variables should be configured as follows:

```env
NODE_ENV=production  
PORT=5000  
DATABASE=mongodb://lto_user:${DB_PASSWORD}@72.60.198.244:27017/lto_website?authSource=lto_website  
DB_PASSWORD=jessa_allen_kent
```

## Available Import Commands

### 1. Fix Database Indexes (One-time setup)
```bash
cd backend
npm run fix-indexes
```
This removes problematic unique constraints that cause import errors.

### 2. Import Your Main JSON File
```bash
cd backend
npm run import-production json/merged_2-4-3-5-11.json
```

### 3. Import with Data Clearing (if needed)
```bash
cd backend
npm run import-production json/merged_2-4-3-5-11.json --clear
```

### 4. Import Any Other JSON File (adds to existing data)
```bash
cd backend
node scripts/import_production.js json/your_other_file.json
```

### 5. Verify the Import
```bash
cd backend
npm run verify
```

## How the Import Process Works

### Relationship Structure
- **Vehicle Model**: Has `driverId` field referencing the Driver document
- **Driver Model**: Has `vehicleIds` array containing references to Vehicle documents
- This creates a proper bidirectional relationship

### Import Process Steps
1. **Fix Database Indexes**: Removes problematic unique constraints
2. **Import Drivers**: Creates driver documents with proper validation
3. **Import Vehicles**: Links vehicles to their corresponding drivers
4. **Update Relationships**: Populates driver records with vehicle references
5. **Verification**: Shows summary and sample relationships

### Key Features
- ✅ **Adds to existing data** (doesn't clear previous imports unless `--clear` is used)
- ✅ **Handles duplicates intelligently** (updates existing records)
- ✅ **Maintains relationships** (vehicles linked to drivers)
- ✅ **Shows total counts** (includes all previous data)
- ✅ **Production-ready** (uses your production database connection)

## Example Usage

### First Import (merged_2-4-3-5-11.json)
```bash
# 1. Navigate to backend
cd backend

# 2. Fix database indexes (one-time setup)
npm run fix-indexes

# 3. Import your main JSON file
npm run import-production json/merged_2-4-3-5-11.json

# 4. Verify everything worked
npm run verify
```

### Additional Imports
```bash
# Import additional files (adds to existing data)
node scripts/import_production.js json/vehicles_2024.json
node scripts/import_production.js json/vehicles_2025.json
node scripts/import_production.js json/company_vehicles.json

# Check total data
npm run verify
```

## Troubleshooting

### Common Issues
1. **Connection Errors**: Ensure your `.env` file has the correct `DATABASE` variable
2. **Index Errors**: Run `npm run fix-indexes` before importing
3. **Duplicate Errors**: The import process handles duplicates automatically
4. **Relationship Issues**: Use `npm run verify` to check relationships

### Verification Output
The verification script will show:
- Total drivers and vehicles
- Vehicles with driver references
- Drivers with vehicle references
- Sample relationships
- Drivers with multiple vehicles

## Data Structure Requirements

Your JSON files should contain records with these fields:
- `ownerRepresentativeName` (required)
- `plateNo` (required)
- `fileNo`, `engineNo`, `serialChassisNumber`
- `address_purok`, `address_barangay`, `address_municipality`, etc.
- `contactNumber`, `emailAddress`
- `hasDriversLicense`, `driversLicenseNumber`
- `birthDate`, `dateOfRenewal`
- `make`, `bodyType`, `color`, `classification`

## Production Safety

- The import process uses upsert operations to handle duplicates
- Database indexes are optimized for performance
- All operations are logged for debugging
- Relationships are verified after import
- No data loss during import process
