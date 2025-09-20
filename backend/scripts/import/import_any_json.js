import mongoose from 'mongoose';
import DriverModel from '../model/DriverModel.js';
import VehicleModel from '../model/VehicleModel.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const importAnyJson = async (jsonFilePath) => {
  try {
    // Connect to MongoDB
    const { NODE_ENV, DATABASE, DATABASE_LOCAL, DB_PASSWORD } = process.env;
    
    if (!NODE_ENV || (!DATABASE_LOCAL && !DATABASE)) {
      console.error("Missing required environment variables for database connection.");
      process.exit(1);
    }

    const DB_URI = NODE_ENV === "production" 
      ? DATABASE.replace("<PASSWORD>", DB_PASSWORD)
      : DATABASE_LOCAL;

    await mongoose.connect(DB_URI);
    console.log(`Connected to MongoDB (${NODE_ENV} environment)`);

    // Check if file exists
    if (!fs.existsSync(jsonFilePath)) {
      console.error(`File not found: ${jsonFilePath}`);
      process.exit(1);
    }

    // Read the JSON file
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    
    console.log(`Found ${jsonData.length} records to import from ${path.basename(jsonFilePath)}`);

    let driverCount = 0;
    let vehicleCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Process each record individually
    for (let i = 0; i < jsonData.length; i++) {
      const record = jsonData[i];
      
      try {
        // Validate required fields (only plateNo and ownerRepresentativeName are required)
        if (!record.plateNo || !record.ownerRepresentativeName) {
          const missingFields = [];
          if (!record.plateNo) missingFields.push('plateNo');
          if (!record.ownerRepresentativeName) missingFields.push('ownerRepresentativeName');
          
          console.log(`Skipping record ${i + 1} (File: ${record.fileNo || 'N/A'}, Plate: ${record.plateNo || 'N/A'}): Missing required fields [${missingFields.join(', ')}]`);
          skippedCount++;
          continue;
        }

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

        // Create driver data with proper validation
        const driverData = {
          plateNo: [record.plateNo],
          fileNo: record.fileNo || null,
          ownerRepresentativeName: record.ownerRepresentativeName,
          address: {
            purok: record.address_purok || '',
            barangay: record.address_barangay || '',
            municipality: record.address_municipality || '',
            province: record.address_province || '',
            region: record.address_region || ''
          },
          contactNumber: record.contactNumber ? record.contactNumber.toString() : null,
          emailAddress: record.emailAddress || null,
          hasDriversLicense: record.hasDriversLicense === "YES",
          driversLicenseNumber: record.hasDriversLicense === "YES" && record.driversLicenseNumber 
            ? record.driversLicenseNumber 
            : null,
          birthDate: birthDate,
          isActive: true
        };

        // Create driver using upsert to handle duplicates
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
        
        driverCount++;

        // Create vehicle data
        const vehicleData = {
          plateNo: record.plateNo,
          fileNo: record.fileNo || null,
          engineNo: record.engineNo || '',
          serialChassisNumber: record.serialChassisNumber || '',
          make: record.make || '',
          bodyType: record.bodyType || '',
          color: record.color || '',
          classification: record.classification || '',
          dateOfRenewal: record.dateOfRenewal ? new Date(record.dateOfRenewal) : null,
          status: "1",
          driver: driver._id
        };

        // Create vehicle using upsert to handle duplicates based on plateNo + engineNo + serialChassisNumber
        const vehicle = await VehicleModel.findOneAndUpdate(
          { 
            plateNo: vehicleData.plateNo,
            engineNo: vehicleData.engineNo,
            serialChassisNumber: vehicleData.serialChassisNumber
          },
          vehicleData,
          { 
            upsert: true, 
            new: true,
            setDefaultsOnInsert: true
          }
        );
        
        vehicleCount++;

        if (i % 100 === 0) {
          console.log(`Processed ${i + 1}/${jsonData.length} records...`);
        }

      } catch (error) {
        console.error(`Error processing record ${i + 1} (${record.plateNo}):`, error.message);
        errorCount++;
      }
    }

    console.log(`\nImport Summary for ${path.basename(jsonFilePath)}:`);
    console.log(`- Drivers created/updated: ${driverCount}`);
    console.log(`- Vehicles created/updated: ${vehicleCount}`);
    console.log(`- Records skipped (missing fields): ${skippedCount}`);
    console.log(`- Errors: ${errorCount}`);

    // Verify relationships
    console.log('\nVerifying relationships...');
    const vehiclesWithDrivers = await VehicleModel.find({ driver: { $exists: true, $ne: null } }).populate('driver');
    console.log(`Total vehicles with driver references: ${vehiclesWithDrivers.length}`);
    
    const driversWithVehicles = await DriverModel.find({ plateNo: { $exists: true, $ne: [] } });
    console.log(`Total drivers with plate numbers: ${driversWithVehicles.length}`);

  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Get file path from command line arguments
const jsonFilePath = process.argv[2];

if (!jsonFilePath) {
  console.log('Usage: node import_any_json.js <path-to-json-file>');
  console.log('Example: node import_any_json.js json/another_file.json');
  process.exit(1);
}

// Run import
importAnyJson(jsonFilePath);
