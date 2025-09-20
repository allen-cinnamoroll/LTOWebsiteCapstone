# Next Steps - Data Migration Guide

## 🎯 **What's Been Completed**

✅ **Data Restructuring**: Your `merged_2-4-3-5-11.json` has been split into:

- `drivers_collection.json` (340 unique drivers)
- `vehicles_collection.json` (342 vehicles)

✅ **Model Updates**: Updated your MongoDB models to match the new structure:

- `VehicleModel.js` - Now uses `ownerId` instead of `driver`
- `DriverModel.js` - Updated to use `fullName` and nested address structure

✅ **Controller Updates**: Updated `vehicleController.js` to work with the new schema

✅ **Migration Scripts**: Created scripts to import and test the data

## 🚀 **Immediate Next Steps**

### **Step 1: Run the Migration Script**

```bash
# Navigate to your backend directory
cd backend

# Run the migration script
node scripts/migrate_restructured_data.js
```

This script will:

- Connect to your MongoDB database
- Clear existing data (optional)
- Import all drivers first
- Import all vehicles with proper `ownerId` references
- Verify the migration was successful

### **Step 2: Test the Relationships**

```bash
# Run the relationship test script
node scripts/test_relationships.js
```

This will verify that:

- Vehicles can be linked to their owners
- You can query vehicles by owner
- You can find owners with multiple vehicles
- All relationships are working correctly

### **Step 3: Update Your Frontend (If Needed)**

If your frontend expects the old field names, you may need to update:

- Change `driver` to `ownerId` in vehicle forms
- Update API calls to use the new field names
- Update any hardcoded field references

## 📊 **New Data Structure**

### **Drivers Collection**

```javascript
{
  _id: ObjectId,
  fullName: "GUILABTAN, JONA ARBOL",
  address: {
    purok: "MALINAWON LIMATOC",
    barangay: "CENTRAL",
    municipality: "CITY OF MATI",
    province: "DAVAO ORIENTAL",
    region: "REGION 11"
  },
  contactNumber: null,
  emailAddress: null,
  hasDriversLicense: false,
  driversLicenseNumber: null,
  birthDate: null,
  isActive: true
}
```

### **Vehicles Collection**

```javascript
{
  _id: ObjectId,
  plateNo: "110105",
  fileNo: "1101-992919",
  engineNo: "16LFMJKLLL818O",
  serialChassisNumber: "LF3PCK5OLMB8O38LO",
  make: "MITSU",
  bodyType: "TC",
  color: "BLACK",
  classification: "FOR HIRE",
  dateOfRenewal: "2025-06-02T00:00:00.000Z",
  status: "1",
  ownerId: ObjectId // References driver's _id
}
```

## 🔍 **Querying the New Structure**

### **Find all vehicles owned by a driver**

```javascript
const vehicles = await VehicleModel.find({ ownerId: driverId });
```

### **Find a vehicle with its owner details**

```javascript
const vehicle = await VehicleModel.findById(vehicleId).populate("ownerId");
```

### **Find all vehicles with owner information**

```javascript
const vehiclesWithOwners = await VehicleModel.find().populate("ownerId");
```

### **Find drivers who own multiple vehicles**

```javascript
const driversWithMultipleVehicles = await VehicleModel.aggregate([
  {
    $group: {
      _id: "$ownerId",
      vehicleCount: { $sum: 1 },
      vehicles: { $push: "$plateNo" },
    },
  },
  { $match: { vehicleCount: { $gt: 1 } } },
  {
    $lookup: {
      from: "drivers",
      localField: "_id",
      foreignField: "_id",
      as: "driver",
    },
  },
]);
```

## ⚠️ **Important Notes**

1. **Backup Your Data**: Before running the migration, make sure to backup your existing database
2. **Environment Variables**: Ensure your `MONGODB_URI` environment variable is set correctly
3. **Field Mapping**: The migration script handles the field name changes automatically
4. **Backward Compatibility**: Virtual fields are added to maintain compatibility with existing code

## 🛠️ **Troubleshooting**

### **If Migration Fails**

1. Check your MongoDB connection
2. Ensure you have write permissions to the database
3. Check the console output for specific error messages

### **If Relationships Don't Work**

1. Run the test script to identify issues
2. Check that both collections were imported successfully
3. Verify that `ownerId` fields contain valid ObjectIds

### **If Frontend Breaks**

1. Update API calls to use `ownerId` instead of `driver`
2. Update form field names
3. Check for any hardcoded field references

## 📈 **Benefits of the New Structure**

1. **Better Performance**: Separate collections allow for better indexing and querying
2. **Data Integrity**: Proper foreign key relationships prevent orphaned records
3. **Scalability**: Easier to add new fields to drivers or vehicles independently
4. **Flexibility**: Can easily query vehicles by owner or find owners with multiple vehicles
5. **Normalization**: Eliminates data duplication and maintains consistency

## 🎉 **You're Ready!**

Your data has been successfully restructured and your application is ready to use the new MongoDB collections. The migration scripts will handle all the complex data transformation, and the test scripts will verify everything is working correctly.

Run the migration script when you're ready to import your data into MongoDB!
