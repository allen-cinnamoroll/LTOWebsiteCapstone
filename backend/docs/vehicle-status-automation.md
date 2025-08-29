# Vehicle Status Automation

## Overview
The system now automatically manages vehicle status based on expiration dates. When a vehicle's expiration date passes, its status is automatically changed to "Expired". When an admin updates the expiration date to a future date, the status automatically changes to "Active". **Vehicle status cannot be manually edited** - it is completely controlled by the expiration date.

## Features

### 1. Automatic Status Updates
- **On Vehicle Creation**: Status is automatically set based on expiration date
- **On Vehicle Update**: When expiration date is changed, status is automatically updated
- **Scheduled Checks**: Daily/hourly checks to update expired vehicles
- **Manual Trigger**: Admin can manually trigger status checks
- **Read-Only Status**: Status cannot be manually edited by users

### 2. Status Logic
- **Active (1)**: Expiration date is in the future
- **Expired (0)**: Expiration date has passed

### 3. Implementation Details

#### Backend Files Modified:
- `backend/util/vehicleStatusChecker.js` - Core logic for status checking
- `backend/util/scheduler.js` - Scheduled tasks for automatic checks
- `backend/controller/vehicleController.js` - Updated to use automatic status
- `backend/server.js` - Starts the scheduler on server startup
- `backend/routes/vehicle.js` - Added manual check endpoint

#### Key Functions:
- `checkVehicleExpirationStatus(expirationDate)` - Determines if vehicle should be expired
- `updateVehicleStatusByExpiration(vehicleId, expirationDate)` - Updates vehicle status
- `checkAllVehiclesExpiration()` - Checks all vehicles in database
- `scheduleVehicleExpirationCheck()` - Runs scheduled checks

### 4. API Endpoints

#### New Endpoint:
- `GET /api/vehicle/check-expiration` - Manually trigger status check

#### Updated Endpoints:
- `POST /api/vehicle` - Now automatically sets status on creation
- `PATCH /api/vehicle/:id` - Now automatically updates status when expiration date changes (ignores manual status changes)
- `GET /api/vehicle` - Now runs status check before returning data

#### Blocked Endpoints:
- `PATCH /api/vehicle/:id/status` - Returns 403 error (status cannot be manually updated)

### 5. Usage Examples

#### Creating a Vehicle:
```javascript
// Status will be automatically set based on expiration date
const vehicleData = {
  plateNo: "ABC123",
  expirationDate: "2024-12-31", // Will be ACTIVE
  // ... other fields
};
```

#### Updating Expiration Date:
```javascript
// Status will automatically change to ACTIVE
const updateData = {
  expirationDate: "2025-12-31" // Future date = ACTIVE
};

// Status will automatically change to EXPIRED
const updateData = {
  expirationDate: "2023-01-01" // Past date = EXPIRED
};
```

#### Manual Status Check:
```javascript
// Trigger manual check
fetch('/api/vehicle/check-expiration', {
  headers: { Authorization: token }
});
```

### 6. Scheduling
- **Development**: Checks every hour for testing
- **Production**: Can be configured to check daily at midnight
- **Manual**: Can be triggered via API endpoint

### 7. Logging
The system logs all status changes for debugging:
- Vehicle creation with status
- Status updates on expiration date changes
- Scheduled check results
- Manual check results

### 8. Error Handling
- Graceful handling of database errors
- Logging of all errors for debugging
- Fallback to manual status updates if automatic fails
- Blocking of manual status update attempts

### 9. Security Features
- **Status Protection**: Manual status changes are blocked at both frontend and backend
- **Automatic Only**: Status can only be changed through expiration date updates
- **Audit Trail**: All automatic status changes are logged
- **API Protection**: Dedicated endpoint returns 403 error for manual status updates
