# MongoDB Import Instructions

## Overview

Your data has been successfully restructured into two separate collections that can be properly linked in MongoDB:

- **drivers_collection.json**: 340 unique drivers
- **vehicles_collection.json**: 342 vehicles
- **Relationship**: Each vehicle has an `ownerId` field that references a driver's `_id`

## Import Commands

### 1. Import Drivers Collection

```bash
mongoimport --db lto_database --collection drivers --file drivers_collection.json --jsonArray
```

### 2. Import Vehicles Collection

```bash
mongoimport --db lto_database --collection vehicles --file vehicles_collection.json --jsonArray
```

## Alternative: Using MongoDB Compass

1. Open MongoDB Compass
2. Connect to your database
3. Create a new database called `lto_database`
4. Import `drivers_collection.json` into a collection named `drivers`
5. Import `vehicles_collection.json` into a collection named `vehicles`

## Data Structure

### Drivers Collection Schema

```javascript
{
  "_id": "driver_1",                    // Unique driver identifier
  "fullName": "GUILABTAN, JONA ARBOL",  // Driver's full name
  "address": {                          // Nested address object
    "purok": "MALINAWON LIMATOC",
    "barangay": "CENTRAL",
    "municipality": "CITY OF MATI",
    "province": "DAVAO ORIENTAL",
    "region": "REGION 11"
  },
  "contactNumber": null,                // Phone number
  "emailAddress": null,                 // Email address
  "hasDriversLicense": "NO",            // License status
  "driversLicenseNumber": null,         // License number if available
  "birthDate": null,                    // Date of birth
  "createdAt": "2025-09-19T22:52:30.947Z",
  "updatedAt": "2025-09-19T22:52:30.947Z"
}
```

### Vehicles Collection Schema

```javascript
{
  "_id": "vehicle_1",                   // Unique vehicle identifier
  "plateNo": "110105",                  // License plate number
  "fileNo": "1101-992919",              // File number
  "engineNo": "16LFMJKLLL818O",         // Engine number
  "serialChassisNumber": "LF3PCK5OLMB8O38LO", // Chassis number
  "make": "MITSU",                      // Vehicle manufacturer
  "bodyType": "TC",                     // Body type
  "color": "BLACK",                     // Vehicle color
  "classification": "FOR HIRE",         // Vehicle classification
  "dateOfRenewal": "06/02/2025",        // Renewal date
  "ownerId": "driver_1",                // Reference to driver's _id
  "createdAt": "2025-09-19T22:52:30.943Z",
  "updatedAt": "2025-09-19T22:52:30.943Z"
}
```

## Querying Related Data

### Find all vehicles owned by a specific driver

```javascript
db.vehicles.find({ ownerId: "driver_1" });
```

### Find driver information for a specific vehicle

```javascript
db.vehicles.aggregate([
  { $match: { _id: "vehicle_1" } },
  {
    $lookup: {
      from: "drivers",
      localField: "ownerId",
      foreignField: "_id",
      as: "owner",
    },
  },
]);
```

### Find all vehicles with their owner information

```javascript
db.vehicles.aggregate([
  {
    $lookup: {
      from: "drivers",
      localField: "ownerId",
      foreignField: "_id",
      as: "owner",
    },
  },
]);
```

### Find drivers who own multiple vehicles

```javascript
db.vehicles.aggregate([
  {
    $group: {
      _id: "$ownerId",
      vehicleCount: { $sum: 1 },
      vehicles: { $push: "$plateNo" },
    },
  },
  { $match: { vehicleCount: { $gt: 1 } } },
]);
```

## Indexes for Performance

### Recommended Indexes

```javascript
// Index on ownerId for faster lookups
db.vehicles.createIndex({ ownerId: 1 });

// Index on plateNo for vehicle searches
db.vehicles.createIndex({ plateNo: 1 });

// Index on fullName for driver searches
db.drivers.createIndex({ fullName: 1 });

// Index on driversLicenseNumber for license lookups
db.drivers.createIndex({ driversLicenseNumber: 1 });
```

## Data Statistics

- **Total Original Records**: 342
- **Unique Drivers**: 340
- **Total Vehicles**: 342
- **Average Vehicles per Driver**: 1.01

This means most drivers own only one vehicle, with a few drivers potentially owning multiple vehicles.
