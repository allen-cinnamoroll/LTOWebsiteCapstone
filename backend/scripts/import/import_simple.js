import mongoose from 'mongoose';
import DriverModel from '../model/DriverModel.js';
import VehicleModel from '../model/VehicleModel.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const importSimple = async () => {
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

    // Clear existing data
    console.log('Clearing existing data...');
    await DriverModel.deleteMany({});
    await VehicleModel.deleteMany({});
    console.log('Existing data cleared');

    let driverCount = 0;
    let vehicleCount = 0;
    let errorCount = 0;

    // Process each record individually
    for (let i = 0; i < jsonData.length; i++) {
      const record = jsonData[i];
      
      try {
        // Parse birth date safely
        let birthDate = null;
        if (record.birthDate && record.birthDate !== null) {
          try {
            birthDate = new Date(record.birthDate);
            if (isNaN(birthDate.getTime())) {
              birthDate = null;
            }
          } catch (error) {
            birthDate = null;
          }
        }

        // Create driver data
        const driverData = {
          plateNo: [record.plateNo],
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

        // Create driver
        const driver = new DriverModel(driverData);
        const savedDriver = await driver.save();
        driverCount++;

        // Create vehicle data
        const vehicleData = {
          plateNo: record.plateNo,
          fileNo: record.fileNo,
          engineNo: record.engineNo,
          serialChassisNumber: record.serialChassisNumber,
          make: record.make,
          bodyType: record.bodyType,
          color: record.color,
          classification: record.classification,
          dateOfRenewal: record.dateOfRenewal ? new Date(record.dateOfRenewal) : null,
          status: "1",
          driver: savedDriver._id
        };

        // Create vehicle
        const vehicle = new VehicleModel(vehicleData);
        await vehicle.save();
        vehicleCount++;

        if (i % 100 === 0) {
          console.log(`Processed ${i + 1}/${jsonData.length} records...`);
        }

      } catch (error) {
        console.error(`Error processing record ${i + 1} (${record.plateNo}):`, error.message);
        errorCount++;
      }
    }

    console.log(`\nImport Summary:`);
    console.log(`- Drivers created: ${driverCount}`);
    console.log(`- Vehicles created: ${vehicleCount}`);
    console.log(`- Errors: ${errorCount}`);

    // Verify relationships
    console.log('\nVerifying relationships...');
    const vehiclesWithDrivers = await VehicleModel.find({ driver: { $exists: true, $ne: null } }).populate('driver');
    console.log(`Vehicles with driver references: ${vehiclesWithDrivers.length}`);
    
    const driversWithVehicles = await DriverModel.find({ plateNo: { $exists: true, $ne: [] } });
    console.log(`Drivers with plate numbers: ${driversWithVehicles.length}`);

    // Show sample relationships
    if (vehiclesWithDrivers.length > 0) {
      console.log('\nSample relationships:');
      const sampleSize = Math.min(3, vehiclesWithDrivers.length);
      for (let i = 0; i < sampleSize; i++) {
        const vehicle = vehiclesWithDrivers[i];
        console.log(`${i + 1}. Vehicle: ${vehicle.plateNo} -> Driver: ${vehicle.driver.ownerRepresentativeName}`);
      }
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
                     process.argv[1] && process.argv[1].endsWith('import_simple.js');

if (isMainModule) {
  importSimple();
}

export default importSimple;
