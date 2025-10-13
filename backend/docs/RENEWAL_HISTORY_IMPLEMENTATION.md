# Renewal History Implementation

## Overview

The Renewal History feature tracks all vehicle renewal records with automatic status determination based on renewal timing relative to the scheduled renewal week.

## Features

### Status Types

- **Early Renewal**: Vehicle renewed before the scheduled week
- **On-Time Renewal**: Vehicle renewed within the scheduled week
- **Late Renewal**: Vehicle renewed after the due date

### Key Components

#### Backend

1. **RenewalHistoryModel** (`backend/model/RenewalHistoryModel.js`)

   - Stores renewal records with status, dates, and metadata
   - Linked to vehicles via `vehicleId` reference

2. **Renewal Status Calculator** (`backend/util/renewalStatusCalculator.js`)

   - Calculates scheduled renewal week based on plate number
   - Determines renewal status (Early/On-Time/Late)
   - Provides utility functions for date calculations

3. **Renewal History Controller** (`backend/controller/renewalHistoryController.js`)

   - CRUD operations for renewal records
   - Statistics and reporting endpoints
   - Automatic status calculation on record creation

4. **API Routes** (`backend/routes/renewalHistory.js`)
   - RESTful endpoints for renewal history management
   - Authentication required for all operations

#### Frontend

1. **RenewalHistoryTab Component** (`frontend/src/components/vehicle/RenewalHistoryTab.jsx`)

   - Displays renewal history in a table format
   - Shows summary statistics
   - Pagination support
   - Status badges with color coding

2. **Integration with VehicleDetailsModal**
   - Seamlessly integrated as the "Renewal History" tab
   - Passes vehicle ID and plate number to the component

## API Endpoints

### Create Renewal Record

```
POST /api/renewal-history
```

**Body:**

```json
{
  "vehicleId": "vehicle_id",
  "plateNo": "ABC-1234",
  "renewalDate": "2024-01-15",
  "notes": "Optional notes",
  "processedBy": "Admin User"
}
```

### Get Vehicle Renewal History

```
GET /api/renewal-history/vehicle/:vehicleId?page=1&limit=10
```

### Get Renewal History by Plate

```
GET /api/renewal-history/plate/:plateNo?page=1&limit=10
```

### Get Renewal Statistics

```
GET /api/renewal-history/vehicle/:vehicleId/statistics
```

### Update Renewal Record

```
PUT /api/renewal-history/:id
```

### Delete Renewal Record

```
DELETE /api/renewal-history/:id
```

## Status Calculation Logic

### Scheduled Week Calculation

The scheduled renewal week is determined by the last digit of the plate number:

- Each digit (0-9) corresponds to approximately 5.2 weeks in the year
- Week 0 starts at the beginning of the year
- The scheduled week is the Monday of that week

### Status Determination

1. **Early Renewal**: Renewal date < scheduled week start
2. **On-Time Renewal**: Renewal date >= scheduled week start AND <= due date (Sunday)
3. **Late Renewal**: Renewal date > due date

## Database Schema

### RenewalHistory Collection

```javascript
{
  _id: ObjectId,
  vehicleId: ObjectId, // Reference to Vehicles collection
  plateNo: String,
  renewalDate: Date,
  status: String, // "Early Renewal" | "On-Time Renewal" | "Late Renewal"
  scheduledWeek: Date,
  dueDate: Date,
  notes: String,
  processedBy: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Vehicle Model Updates

- Added `renewalHistory` array field to store renewal record references
- Automatically updated when new renewal records are created

## Usage Examples

### Creating a Renewal Record

```javascript
const renewalData = {
  vehicleId: "64f8a1b2c3d4e5f6a7b8c9d0",
  plateNo: "ABC-1234",
  renewalDate: "2024-01-15",
  notes: "Customer renewed early to avoid rush",
  processedBy: "Admin User",
};

const response = await fetch("/api/renewal-history", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(renewalData),
});
```

### Fetching Renewal History

```javascript
const response = await fetch(
  `/api/renewal-history/vehicle/${vehicleId}?page=1&limit=10`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const data = await response.json();
console.log(data.data); // Array of renewal records
```

## Testing

### Sample Data Creation

Use the provided script to create sample renewal history:

```bash
node backend/scripts/createSampleRenewalHistory.js
```

This will create sample renewal records with different statuses for testing purposes.

## Frontend Integration

The renewal history is automatically displayed in the Vehicle Details Modal:

1. Open any vehicle's details
2. Click on the "Renewal History" tab
3. View the renewal records with status indicators
4. See summary statistics at the top

## Future Enhancements

1. **Bulk Renewal Import**: Import multiple renewal records from CSV/Excel
2. **Renewal Reminders**: Automated notifications for upcoming renewals
3. **Advanced Analytics**: Trends, patterns, and compliance reports
4. **Renewal Scheduling**: Allow scheduling of future renewals
5. **Document Management**: Attach renewal documents to records

## Troubleshooting

### Common Issues

1. **No renewal history displayed**: Ensure the vehicle has renewal records in the database
2. **Status calculation errors**: Check that the plate number format is correct
3. **API authentication errors**: Verify that the user has proper permissions

### Debug Information

- Check browser console for API errors
- Verify database connection and data integrity
- Ensure proper authentication tokens are being sent

## Security Considerations

- All renewal history operations require authentication
- User permissions should be checked before allowing renewal record modifications
- Sensitive renewal data should be properly encrypted in transit and at rest
- Audit logs should track all renewal record changes
