import mongoose from 'mongoose';
import DriverModel from '../model/DriverModel.js';
import VehicleModel from '../model/VehicleModel.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Script started

const importWithRelationships = async () => {
  try {
    // Connect to MongoDB using the same configuration as the main app
    const { NODE_ENV, DATABASE, DATABASE_LOCAL, DB_PASSWORD } = process.env;
    
    if (!NODE_ENV || (!DATABASE_LOCAL && !DATABASE)) {
      console.error("Missing required environment variables for database connection.");
      console.error("Please create a .env file with DATABASE_LOCAL or DATABASE variables.");
      process.exit(1);
    }

    const DB_URI = NODE_ENV === "production" 
      ? DATABASE.replace("<PASSWORD>", DB_PASSWORD)
      : DATABASE_LOCAL;

    await mongoose.connect(DB_URI);
    console.log(`Connected to MongoDB (${NODE_ENV} environment)`);

    // Read the JSON file
    const jsonFilePath = path.join(process.cwd(), 'json', 'merged_2-4-3-5-11.json');
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    
    console.log(`Found ${jsonData.length} records to import`);

    // Clear existing data (optional - remove this if you want to keep existing data)
    console.log('Clearing existing data...');
    await DriverModel.deleteMany({});
    await VehicleModel.deleteMany({});
    console.log('Existing data cleared');

    // Step 1: Create a map to track drivers by their unique identifier
    const driverMap = new Map();
    const vehicleData = [];

    // Process each record to separate driver and vehicle data
    for (const record of jsonData) {
      // Create a unique key for the driver based on ownerRepresentativeName and address
      const driverKey = `${record.ownerRepresentativeName}_${record.address_purok}_${record.address_barangay}_${record.address_municipality}`;
      
      // If driver doesn't exist in map, create driver data
      if (!driverMap.has(driverKey)) {
        // Parse birth date safely
        let birthDate = null;
        if (record.birthDate && record.birthDate !== null) {
          try {
            birthDate = new Date(record.birthDate);
            // Check if the date is valid
            if (isNaN(birthDate.getTime())) {
              birthDate = null;
            }
          } catch (error) {
            birthDate = null;
          }
        }

        const driverData = {
          plateNo: [record.plateNo], // Start with current plate number
          fileNo: record.fileNo,
          ownerRepresentativeName: record.ownerRepresentativeName,
          address: {
            purok: record.address_purok,
            barangay: record.address_barangay,
            municipality: record.address_municipality,
            province: record.address_province,
            region: record.address_region
          },
          contactNumber: record.contactNumber ? record.contactNumber.toString() : null,
          emailAddress: record.emailAddress,
          hasDriversLicense: record.hasDriversLicense === "YES",
          driversLicenseNumber: record.hasDriversLicense === "YES" ? record.driversLicenseNumber : null,
          birthDate: birthDate,
          isActive: true
        };
        
        driverMap.set(driverKey, driverData);
      } else {
        // If driver exists, add this plate number to their plateNo array
        const existingDriver = driverMap.get(driverKey);
        if (!existingDriver.plateNo.includes(record.plateNo)) {
          existingDriver.plateNo.push(record.plateNo);
        }
      }

      // Prepare vehicle data
      const vehicleDataItem = {
        plateNo: record.plateNo,
        fileNo: record.fileNo,
        engineNo: record.engineNo,
        serialChassisNumber: record.serialChassisNumber,
        make: record.make,
        bodyType: record.bodyType,
        color: record.color,
        classification: record.classification,
        dateOfRenewal: record.dateOfRenewal ? new Date(record.dateOfRenewal) : null,
        status: "1", // Default to active
        driverKey: driverKey // Temporary reference to link later
      };
      
      vehicleData.push(vehicleDataItem);
    }

    console.log(`Processed ${driverMap.size} unique drivers and ${vehicleData.length} vehicles`);

    // Step 2: Create Driver documents
    console.log('Creating driver documents...');
    const createdDrivers = new Map();
    
    for (const [driverKey, driverData] of driverMap) {
      try {
        // Use upsert to handle potential duplicates
        const driver = await DriverModel.findOneAndUpdate(
          { 
            ownerRepresentativeName: driverData.ownerRepresentativeName,
            'address.purok': driverData.address.purok,
            'address.barangay': driverData.address.barangay,
            'address.municipality': driverData.address.municipality
          },
          driverData,
          { 
            upsert: true, 
            new: true,
            setDefaultsOnInsert: true
          }
        );
        
        createdDrivers.set(driverKey, driver._id);
        console.log(`Created/Updated driver: ${driverData.ownerRepresentativeName} (${driverData.plateNo.length} vehicles)`);
      } catch (error) {
        console.error(`Error creating driver ${driverData.ownerRepresentativeName}:`, error.message);
      }
    }

    // Step 3: Create Vehicle documents with driver references
    console.log('Creating vehicle documents...');
    let successCount = 0;
    let errorCount = 0;

    for (const vehicleItem of vehicleData) {
      try {
        const driverId = createdDrivers.get(vehicleItem.driverKey);
        if (!driverId) {
          console.error(`Driver not found for vehicle ${vehicleItem.plateNo}`);
          errorCount++;
          continue;
        }

        // Remove the temporary driverKey field
        const { driverKey, ...vehicleDataClean } = vehicleItem;
        
        // Use upsert to handle potential duplicates
        const vehicle = await VehicleModel.findOneAndUpdate(
          { plateNo: vehicleDataClean.plateNo },
          {
            ...vehicleDataClean,
            driver: driverId
          },
          { 
            upsert: true, 
            new: true,
            setDefaultsOnInsert: true
          }
        );
        
        successCount++;
        console.log(`Created/Updated vehicle: ${vehicleItem.plateNo} -> Driver: ${driverId}`);
      } catch (error) {
        console.error(`Error creating vehicle ${vehicleItem.plateNo}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\nImport Summary:`);
    console.log(`- Drivers created: ${createdDrivers.size}`);
    console.log(`- Vehicles created: ${successCount}`);
    console.log(`- Errors: ${errorCount}`);

    // Step 4: Verify relationships
    console.log('\nVerifying relationships...');
    const vehiclesWithDrivers = await VehicleModel.find({ driver: { $exists: true, $ne: null } }).populate('driver');
    console.log(`Vehicles with driver references: ${vehiclesWithDrivers.length}`);
    
    const driversWithVehicles = await DriverModel.find({ plateNo: { $exists: true, $ne: [] } });
    console.log(`Drivers with plate numbers: ${driversWithVehicles.length}`);

    // Show sample relationships
    if (vehiclesWithDrivers.length > 0) {
      console.log('\nSample relationship:');
      const sample = vehiclesWithDrivers[0];
      console.log(`Vehicle: ${sample.plateNo} -> Driver: ${sample.driver.ownerRepresentativeName}`);
    }

  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run import if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1] && process.argv[1].endsWith('import_with_relationships.js');

if (isMainModule) {
  importWithRelationships();
}

export default importWithRelationships;
