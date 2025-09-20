import mongoose from 'mongoose';
import DriverModel from '../model/DriverModel.js';
import VehicleModel from '../model/VehicleModel.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

const fixDatabaseIndexes = async (db) => {
  try {
    console.log('🔧 Fixing database indexes...');
    
    // Get the drivers collection
    const driversCollection = db.collection('drivers');
    
    // Drop the problematic index on driversLicenseNumber
    try {
      await driversCollection.dropIndex('driversLicenseNumber_1');
      console.log('✅ Dropped driversLicenseNumber_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  driversLicenseNumber_1 index does not exist');
      } else {
        console.log('⚠️  Error dropping driversLicenseNumber_1 index:', error.message);
      }
    }
    
    // Drop the problematic index on licenseNo
    try {
      await driversCollection.dropIndex('licenseNo_1');
      console.log('✅ Dropped licenseNo_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  licenseNo_1 index does not exist');
      } else {
        console.log('⚠️  Error dropping licenseNo_1 index:', error.message);
      }
    }
    
    // Get the vehicles collection
    const vehiclesCollection = db.collection('vehicles');
    
    // Drop the unique index on plateNo for vehicles
    try {
      await vehiclesCollection.dropIndex('plateNo_1');
      console.log('✅ Dropped plateNo_1 unique index from vehicles');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  plateNo_1 index does not exist on vehicles');
      } else {
        console.log('⚠️  Error dropping plateNo_1 index from vehicles:', error.message);
      }
    }
    
    // Drop the sparse unique index if it exists
    try {
      await driversCollection.dropIndex('driversLicenseNumber_sparse_unique');
      console.log('✅ Dropped driversLicenseNumber_sparse_unique index');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  driversLicenseNumber_sparse_unique index does not exist');
      } else {
        console.log('⚠️  Error dropping driversLicenseNumber_sparse_unique index:', error.message);
      }
    }
    
    // Create a regular (non-unique) index on driversLicenseNumber for performance
    try {
      await driversCollection.createIndex(
        { driversLicenseNumber: 1 }, 
        { 
          name: 'driversLicenseNumber_index'
        }
      );
      console.log('✅ Created regular index on driversLicenseNumber (non-unique)');
    } catch (error) {
      console.log('⚠️  Error creating regular index:', error.message);
    }
    
    console.log('✅ Database indexes fixed!');
  } catch (error) {
    console.error('Failed to fix database indexes:', error);
  }
};

const importRobust = async () => {
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

    // Fix database indexes before importing
    const db = mongoose.connection.db;
    await fixDatabaseIndexes(db);

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

    console.log(`\nImport Summary:`);
    console.log(`- Drivers created/updated: ${driverCount}`);
    console.log(`- Vehicles created/updated: ${vehicleCount}`);
    console.log(`- Records skipped (missing fields): ${skippedCount}`);
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
      const sampleSize = Math.min(5, vehiclesWithDrivers.length);
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
                     process.argv[1] && process.argv[1].endsWith('import_robust.js');

if (isMainModule) {
  importRobust();
}

export default importRobust;
