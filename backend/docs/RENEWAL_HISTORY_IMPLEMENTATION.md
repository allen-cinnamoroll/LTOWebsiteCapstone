# Renewal History Tracking Implementation

## Overview

This implementation adds comprehensive renewal history tracking to the LTO Website system. Every time a vehicle's `dateOfRenewal` changes, it will be automatically stored in the `RenewalHistoryModel` with a complete history of all renewal dates.

## Changes Made

### 1. Modified RenewalHistoryModel (`backend/model/RenewalHistoryModel.js`)

- **Added `dateOfRenewalHistory` array**: Stores all renewal dates for a vehicle with metadata
- **Added `addRenewalDateToHistory` static method**: Automatically adds new renewal dates to history
- **Added `getVehicleRenewalHistoryWithDates` static method**: Retrieves renewal history with the date array
- **Enhanced schema**: Each date entry includes `date`, `updatedAt`, and `updatedBy` fields

### 2. Updated Vehicle Controller (`backend/controller/vehicleController.js`)

- **Enhanced `createVehicle`**: Automatically adds initial renewal date to history when creating a vehicle
- **Enhanced `updateVehicle`**: Automatically tracks renewal date changes and adds them to history
- **Automatic tracking**: No manual intervention needed - all renewal date changes are tracked

### 3. Enhanced Renewal History Controller (`backend/controller/renewalHistoryController.js`)

- **Added `getVehicleRenewalHistoryWithDates`**: New endpoint to retrieve renewal history with the date array
- **Enhanced data structure**: Returns comprehensive renewal information including all historical dates

### 4. Updated Routes (`backend/routes/renewalHistory.js`)

- **Added new endpoint**: `GET /api/renewal-history/vehicle/:vehicleId/dates`
- **Maintains backward compatibility**: Existing endpoints continue to work

### 5. Migration Script (`backend/scripts/migrate-renewal-history.js`)

- **Populates existing data**: Creates renewal history records for all vehicles with existing `dateOfRenewal`
- **Safe migration**: Checks for existing records to avoid duplicates
- **Comprehensive logging**: Detailed progress and error reporting

## API Endpoints

### New Endpoint

```
GET /api/renewal-history/vehicle/:vehicleId/dates
```

**Response:**

```json
{
  "success": true,
  "data": {
    "vehicleId": "vehicle_id",
    "plateNumber": "AL123",
    "fileNumber": "1101-927319",
    "currentRenewalDate": "2025-10-26T13:27:09.784Z",
    "renewalHistory": {
      /* full renewal history record */
    },
    "dateOfRenewalHistory": [
      {
        "date": "2025-10-26T13:27:09.784Z",
        "updatedAt": "2024-01-15T10:30:00.000Z",
        "updatedBy": {
          "_id": "user_id",
          "fullname": "John Doe",
          "email": "john@example.com"
        }
      }
    ],
    "totalRenewalDates": 1
  }
}
```

## Database Schema Changes

### RenewalHistoryModel

```javascript
{
  vehicleId: ObjectId,
  renewalDate: Date,
  status: String,
  processedBy: ObjectId,
  dateOfRenewalHistory: [{
    date: Date,
    updatedAt: Date,
    updatedBy: ObjectId
  }],
  plateNumber: String,
  // ... other existing fields
}
```

## How It Works

1. **Automatic Tracking**: When a vehicle's `dateOfRenewal` is updated (via `updateVehicle`), the system automatically:

   - Detects the change
   - Adds the new date to the `dateOfRenewalHistory` array
   - Records who made the change and when

2. **Initial Population**: When creating a new vehicle with a `dateOfRenewal`, it's automatically added to the history

3. **Migration**: The migration script populates existing vehicles' renewal history

4. **Retrieval**: The new endpoint provides complete renewal history including all historical dates

## Running the Migration

### Option 1: Using the shell script

```bash
cd backend
chmod +x run-migration.sh
./run-migration.sh
```

### Option 2: Direct Node.js execution

```bash
cd backend
node scripts/migrate-renewal-history.js
```

## Frontend Integration

To display renewal history in your frontend:

1. **Fetch renewal history**:

```javascript
const response = await fetch(`/api/renewal-history/vehicle/${vehicleId}/dates`);
const data = await response.json();
```

2. **Display the history**:

```javascript
data.data.dateOfRenewalHistory.forEach((entry) => {
  console.log(`Date: ${entry.date}, Updated by: ${entry.updatedBy?.fullname}`);
});
```

## Benefits

1. **Complete Audit Trail**: Track every renewal date change with timestamps and user information
2. **Automatic**: No manual intervention required - all changes are tracked automatically
3. **Backward Compatible**: Existing functionality continues to work
4. **Scalable**: Efficient storage and retrieval of renewal history
5. **User Tracking**: Know who made each renewal date change and when

## Testing

After running the migration, test the new functionality:

1. **Check migration results**: Verify that renewal history records were created
2. **Test API endpoint**: Call the new `/dates` endpoint for a vehicle
3. **Test automatic tracking**: Update a vehicle's renewal date and verify it's added to history
4. **Verify frontend integration**: Ensure the renewal history displays correctly in the UI

## Notes

- The migration is safe to run multiple times (it checks for existing records)
- All existing functionality remains unchanged
- The system automatically handles both new vehicles and existing ones
- User tracking requires authentication middleware to be properly configured
