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
    console.log('🔧 Setting up database indexes...');
    
    // Get the drivers collection
    const driversCollection = db.collection('drivers');
    
    // Drop existing problematic indexes
    const indexesToDrop = [
      'driversLicenseNumber_1',
      'licenseNo_1', 
      'driversLicenseNumber_sparse_unique',
      'plateNo_1'
    ];
    
    for (const indexName of indexesToDrop) {
      try {
        await driversCollection.dropIndex(indexName);
        console.log(`✅ Dropped ${indexName} index`);
      } catch (error) {
        if (error.code === 27) {
          console.log(`ℹ️  ${indexName} index does not exist`);
        } else {
          console.log(`⚠️  Error dropping ${indexName} index:`, error.message);
        }
      }
    }
    
    // Get the vehicles collection
    const vehiclesCollection = db.collection('vehicles');
    
    // Drop existing problematic indexes on vehicles
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
    
    // Create performance indexes
    try {
      await driversCollection.createIndex(
        { driversLicenseNumber: 1 }, 
        { 
          name: 'driversLicenseNumber_index',
          sparse: true
        }
      );
      console.log('✅ Created sparse index on driversLicenseNumber');
    } catch (error) {
      console.log('⚠️  Error creating driversLicenseNumber index:', error.message);
    }
    
    try {
      await vehiclesCollection.createIndex({ plateNo: 1 });
      console.log('✅ Created index on plateNo');
    } catch (error) {
      console.log('⚠️  Error creating plateNo index:', error.message);
    }
    
    try {
      await vehiclesCollection.createIndex({ driverId: 1 });
      console.log('✅ Created index on driverId');
    } catch (error) {
      console.log('⚠️  Error creating driverId index:', error.message);
    }
    
    console.log('✅ Database indexes configured!');
  } catch (error) {
    console.error('Failed to configure database indexes:', error);
  }
};

const importRestructuredData = async (customDriversFile = null, customVehiclesFile = null) => {
  try {
    // Connect to MongoDB using the provided environment variables
    const { NODE_ENV, DATABASE } = process.env;
    
    if (!DATABASE) {
      console.error("Missing required environment variables for database connection.");
      console.error("Please ensure DATABASE is set in your .env file.");
      process.exit(1);
    }

    // Use the database connection string directly from .env
    const DB_URI = DATABASE;
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(DB_URI);
    console.log(`✅ Connected to MongoDB (${NODE_ENV || 'production'} environment)`);

    // Fix database indexes before importing
    const db = mongoose.connection.db;
    await fixDatabaseIndexes(db);

    // Read the JSON files - use custom paths if provided, otherwise use default restructured paths
    const driversFilePath = customDriversFile || path.join(process.cwd(), 'json', 'restructured', 'drivers_collection.json');
    const vehiclesFilePath = customVehiclesFile || path.join(process.cwd(), 'json', 'restructured', 'vehicles_collection.json');
    
    if (!fs.existsSync(driversFilePath) || !fs.existsSync(vehiclesFilePath)) {
      console.error('❌ Restructured JSON files not found!');
      console.error('Expected files:');
      console.error(`- ${driversFilePath}`);
      console.error(`- ${vehiclesFilePath}`);
      process.exit(1);
    }
    
    const driversData = JSON.parse(fs.readFileSync(driversFilePath, 'utf8'));
    const vehiclesData = JSON.parse(fs.readFileSync(vehiclesFilePath, 'utf8'));
    
    console.log(`📊 Found ${driversData.length} drivers and ${vehiclesData.length} vehicles to import`);

    // Clear existing data (optional - remove this if you want to keep existing data)
    console.log('🧹 Clearing existing data...');
    await DriverModel.deleteMany({});
    await VehicleModel.deleteMany({});
    console.log('✅ Existing data cleared');

    // Step 1: Import Drivers
    console.log('👥 Importing drivers...');
    const driverMap = new Map();
    let driverSuccessCount = 0;
    let driverErrorCount = 0;

    for (const driverRecord of driversData) {
      try {
         // Transform the data to match the DriverModel schema
         const driverData = {
           ownerRepresentativeName: driverRecord.fullName,
           address: {
             purok: driverRecord.address.purok || '',
             barangay: driverRecord.address.barangay || '',
             municipality: driverRecord.address.municipality || '',
             province: driverRecord.address.province || '',
             region: driverRecord.address.region || ''
           },
           contactNumber: driverRecord.contactNumber ? driverRecord.contactNumber.toString() : null,
           emailAddress: driverRecord.emailAddress || null,
           hasDriversLicense: driverRecord.hasDriversLicense === "YES" && !!driverRecord.driversLicenseNumber,
           driversLicenseNumber: (driverRecord.hasDriversLicense === "YES" && driverRecord.driversLicenseNumber) ? driverRecord.driversLicenseNumber : null,
           birthDate: (() => {
             if (!driverRecord.birthDate) return null;
             try {
               const date = new Date(driverRecord.birthDate);
               return isNaN(date.getTime()) ? null : date;
             } catch (error) {
               return null;
             }
           })(),
           isActive: true,
           vehicleIds: [] // Will be populated after vehicles are imported
         };

        // Create driver document
        const driver = await DriverModel.create(driverData);
        driverMap.set(driverRecord._id, driver._id);
        driverSuccessCount++;
        
        if (driverSuccessCount % 50 === 0) {
          console.log(`  Processed ${driverSuccessCount}/${driversData.length} drivers...`);
        }
      } catch (error) {
        console.error(`❌ Error creating driver ${driverRecord.fullName}:`, error.message);
        driverErrorCount++;
      }
    }

    console.log(`✅ Drivers import completed: ${driverSuccessCount} successful, ${driverErrorCount} errors`);

    // Step 2: Import Vehicles with Driver References
    console.log('🚗 Importing vehicles...');
    let vehicleSuccessCount = 0;
    let vehicleErrorCount = 0;
    const driverVehicleMap = new Map(); // Track vehicles per driver

    for (const vehicleRecord of vehiclesData) {
      try {
        // Get the corresponding driver ID
        const driverId = driverMap.get(vehicleRecord.ownerId);
        if (!driverId) {
          console.error(`❌ Driver not found for vehicle ${vehicleRecord.plateNo} (ownerId: ${vehicleRecord.ownerId})`);
          vehicleErrorCount++;
          continue;
        }

         // Transform the data to match the VehicleModel schema
         const vehicleData = {
           fileNo: vehicleRecord.fileNo,
           plateNo: vehicleRecord.plateNo,
           engineNo: vehicleRecord.engineNo,
           serialChassisNumber: vehicleRecord.serialChassisNumber,
           make: vehicleRecord.make || '',
           bodyType: vehicleRecord.bodyType || '',
           color: vehicleRecord.color || '',
           classification: vehicleRecord.classification || '',
           dateOfRenewal: (() => {
             if (!vehicleRecord.dateOfRenewal) return null;
             try {
               const date = new Date(vehicleRecord.dateOfRenewal);
               return isNaN(date.getTime()) ? null : date;
             } catch (error) {
               return null;
             }
           })(),
           vehicleStatusType: "Old", // Default to Old as per schema
           status: "1", // Default to active
           driverId: driverId
         };

        // Create vehicle document
        const vehicle = await VehicleModel.create(vehicleData);
        vehicleSuccessCount++;
        
        // Track vehicles per driver for updating driver records
        if (!driverVehicleMap.has(driverId)) {
          driverVehicleMap.set(driverId, []);
        }
        driverVehicleMap.get(driverId).push(vehicle._id);
        
        if (vehicleSuccessCount % 50 === 0) {
          console.log(`  Processed ${vehicleSuccessCount}/${vehiclesData.length} vehicles...`);
        }
      } catch (error) {
        console.error(`❌ Error creating vehicle ${vehicleRecord.plateNo}:`, error.message);
        vehicleErrorCount++;
      }
    }

    console.log(`✅ Vehicles import completed: ${vehicleSuccessCount} successful, ${vehicleErrorCount} errors`);

    // Step 3: Update Driver records with vehicle references
    console.log('🔗 Updating driver-vehicle relationships...');
    let relationshipUpdateCount = 0;

    for (const [driverId, vehicleIds] of driverVehicleMap) {
      try {
        await DriverModel.findByIdAndUpdate(
          driverId,
          { vehicleIds: vehicleIds },
          { new: true }
        );
        relationshipUpdateCount++;
        
        if (relationshipUpdateCount % 50 === 0) {
          console.log(`  Updated ${relationshipUpdateCount}/${driverVehicleMap.size} driver relationships...`);
        }
      } catch (error) {
        console.error(`❌ Error updating driver ${driverId} with vehicles:`, error.message);
      }
    }

    console.log(`✅ Updated ${relationshipUpdateCount} driver-vehicle relationships`);

    // Step 4: Verify the import
    console.log('\n🔍 Verifying import...');
    
    const totalDrivers = await DriverModel.countDocuments();
    const totalVehicles = await VehicleModel.countDocuments();
    const vehiclesWithDrivers = await VehicleModel.countDocuments({ driverId: { $exists: true, $ne: null } });
    const driversWithVehicles = await DriverModel.countDocuments({ vehicleIds: { $exists: true, $ne: [] } });
    
    console.log(`📊 Import Summary:`);
    console.log(`  - Total Drivers: ${totalDrivers}`);
    console.log(`  - Total Vehicles: ${totalVehicles}`);
    console.log(`  - Vehicles with Driver References: ${vehiclesWithDrivers}`);
    console.log(`  - Drivers with Vehicle References: ${driversWithVehicles}`);
    console.log(`  - Driver Import Errors: ${driverErrorCount}`);
    console.log(`  - Vehicle Import Errors: ${vehicleErrorCount}`);

    // Show sample relationships
    const sampleVehicles = await VehicleModel.find({ driverId: { $exists: true } })
      .populate('driverId', 'ownerRepresentativeName vehicleIds')
      .limit(3);
    
    if (sampleVehicles.length > 0) {
      console.log('\n🔗 Sample relationships:');
      sampleVehicles.forEach((vehicle, index) => {
        console.log(`  ${index + 1}. Vehicle: ${vehicle.plateNo} -> Driver: ${vehicle.driverId.ownerRepresentativeName} (has ${vehicle.driverId.vehicleIds.length} vehicles)`);
      });
    }

    // Show drivers with multiple vehicles
    const driversWithMultipleVehicles = await DriverModel.find({ 
      vehicleIds: { $exists: true, $ne: [] } 
    }).populate('vehicleIds', 'plateNo');
    
    const multiVehicleDrivers = driversWithMultipleVehicles.filter(driver => driver.vehicleIds.length > 1);
    if (multiVehicleDrivers.length > 0) {
      console.log(`\n👥 Drivers with multiple vehicles: ${multiVehicleDrivers.length}`);
      multiVehicleDrivers.slice(0, 3).forEach((driver, index) => {
        const vehiclePlates = driver.vehicleIds.map(v => v.plateNo).join(', ');
        console.log(`  ${index + 1}. ${driver.ownerRepresentativeName}: ${vehiclePlates}`);
      });
    }

    console.log('\n✅ Import completed successfully!');

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run import if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1] && process.argv[1].endsWith('import_restructured_data.js');

if (isMainModule) {
  // Check for command line arguments
  const args = process.argv.slice(2);
  let customDriversFile = null;
  let customVehiclesFile = null;
  
  if (args.length > 0) {
    customDriversFile = args[0];
    console.log(`📁 Using custom drivers file: ${customDriversFile}`);
  }
  
  if (args.length > 1) {
    customVehiclesFile = args[1];
    console.log(`📁 Using custom vehicles file: ${customVehiclesFile}`);
  }
  
  importRestructuredData(customDriversFile, customVehiclesFile);
}

export default importRestructuredData;

