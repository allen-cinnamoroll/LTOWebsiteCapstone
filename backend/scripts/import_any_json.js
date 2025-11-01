import mongoose from 'mongoose';
import DriverModel from '../model/DriverModel.js';
import VehicleModel from '../model/VehicleModel.js';
import UserModel from '../model/UserModel.js';
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

const importAnyJson = async (jsonFilePath) => {
  try {
    // Connect to MongoDB using the same environment variables as import_restructured_data.js
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

    // Get Super Admin ID for default createdBy assignment
    console.log('🔍 Finding Super Admin user for default createdBy...');
    let superAdminId = null;
    try {
      const superadmin = await UserModel.findOne({ role: "0" }).select("_id");
      if (superadmin) {
        superAdminId = superadmin._id;
        console.log(`✅ Found Super Admin: ${superAdminId}`);
      } else {
        console.warn('⚠️  No Super Admin found. Records will be created without createdBy.');
      }
    } catch (error) {
      console.warn('⚠️  Error finding Super Admin:', error.message);
    }
    
    // Get current date for default createdAt
    const currentDate = new Date();

    // Check if file exists
    if (!fs.existsSync(jsonFilePath)) {
      console.error(`File not found: ${jsonFilePath}`);
      process.exit(1);
    }

    // Read the JSON file
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    
    console.log(`📊 Found ${jsonData.length} records to import from ${path.basename(jsonFilePath)}`);

    // Keep existing data - no clearing
    console.log('📋 Preserving existing data - importing new records only');

    // Step 1: Import Drivers first
    console.log('👥 Importing drivers...');
    const driverMap = new Map();
    let driverSuccessCount = 0;
    let driverErrorCount = 0;

    for (let i = 0; i < jsonData.length; i++) {
      const record = jsonData[i];
      
      try {
        // Validate required fields
        if (!record.ownerRepresentativeName) {
          console.log(`Skipping record ${i + 1}: Missing ownerRepresentativeName`);
          driverErrorCount++;
          continue;
        }

        // Transform the data to match the DriverModel schema (same as import_restructured_data.js)
        const driverData = {
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
          hasDriversLicense: record.hasDriversLicense === "YES" && !!record.driversLicenseNumber,
          driversLicenseNumber: (record.hasDriversLicense === "YES" && record.driversLicenseNumber) ? record.driversLicenseNumber : null,
          birthDate: (() => {
            if (!record.birthDate) return null;
            try {
              const date = new Date(record.birthDate);
              return isNaN(date.getTime()) ? null : date;
            } catch (error) {
              return null;
            }
          })(),
          isActive: true,
          vehicleIds: [], // Will be populated after vehicles are imported
          // Set default createdBy if not provided in JSON
          createdBy: record.createdBy || superAdminId || null,
          // Set default createdAt if not provided in JSON
          createdAt: record.createdAt ? new Date(record.createdAt) : currentDate,
          // Do NOT set updatedBy or updatedAt during import - leave them untouched
          updatedBy: record.updatedBy || null,
          updatedAt: record.updatedAt ? new Date(record.updatedAt) : undefined
        };
        
        // Remove updatedAt if it's undefined (to let Mongoose handle it via timestamps)
        if (!record.updatedAt) {
          delete driverData.updatedAt;
        }

        // Create driver document with duplicate handling
        try {
          const driver = await DriverModel.create(driverData);
          driverMap.set(record.ownerRepresentativeName, driver._id);
          driverSuccessCount++;
        } catch (error) {
          if (error.code === 11000) {
            // Duplicate key error - find existing driver
            console.log(`⚠️  Driver already exists: ${record.ownerRepresentativeName}`);
            const existingDriver = await DriverModel.findOne({ ownerRepresentativeName: record.ownerRepresentativeName });
            if (existingDriver) {
              driverMap.set(record.ownerRepresentativeName, existingDriver._id);
              driverSuccessCount++;
            }
          } else {
            throw error; // Re-throw other errors
          }
        }
        
        if (driverSuccessCount % 50 === 0) {
          console.log(`  Processed ${driverSuccessCount}/${jsonData.length} drivers...`);
        }
      } catch (error) {
        console.error(`❌ Error creating driver ${record.ownerRepresentativeName}:`, error.message);
        driverErrorCount++;
      }
    }

    console.log(`✅ Drivers import completed: ${driverSuccessCount} successful, ${driverErrorCount} errors`);

    // Step 2: Import Vehicles with Driver References
    console.log('🚗 Importing vehicles...');
    let vehicleSuccessCount = 0;
    let vehicleErrorCount = 0;
    const driverVehicleMap = new Map(); // Track vehicles per driver

    for (let i = 0; i < jsonData.length; i++) {
      const record = jsonData[i];
      
      try {
        // Validate required fields
        if (!record.plateNo || !record.ownerRepresentativeName) {
          console.log(`Skipping record ${i + 1}: Missing plateNo or ownerRepresentativeName`);
          vehicleErrorCount++;
          continue;
        }

        // Get the corresponding driver ID
        const driverId = driverMap.get(record.ownerRepresentativeName);
        if (!driverId) {
          console.error(`❌ Driver not found for vehicle ${record.plateNo} (owner: ${record.ownerRepresentativeName})`);
          vehicleErrorCount++;
          continue;
        }

        // Transform the data to match the VehicleModel schema (same as import_restructured_data.js)
        const vehicleData = {
          fileNo: record.fileNo,
          plateNo: record.plateNo,
          engineNo: record.engineNo,
          serialChassisNumber: record.serialChassisNumber,
          make: record.make || '',
          bodyType: record.bodyType || '',
          color: record.color || '',
          classification: record.classification || '',
          dateOfRenewal: (() => {
            const val = record.dateOfRenewal;
            if (!val) return [];
            if (Array.isArray(val)) {
              return val.filter(d => d).map(d =>
                (typeof d === 'object' && d.date) ? { ...d, processedBy: d.processedBy || superAdminId } : { date: d, processedBy: superAdminId }
              );
            }
            if (typeof val === 'string') {
              return [{ date: val, processedBy: superAdminId }];
            }
            if (typeof val === 'object' && val.date) {
              return [{ ...val, processedBy: val.processedBy || superAdminId }];
            }
            return [];
          })(),
          vehicleStatusType: "Old", // Default to Old as per schema
          status: "1", // Default to active
          driverId: driverId,
          // Set default createdBy if not provided in JSON
          createdBy: record.createdBy || superAdminId || null,
          // Set default createdAt if not provided in JSON
          createdAt: record.createdAt ? new Date(record.createdAt) : currentDate,
          // Do NOT set updatedBy or updatedAt during import - leave them untouched
          updatedBy: record.updatedBy || null,
          updatedAt: record.updatedAt ? new Date(record.updatedAt) : undefined
        };
        
        // Remove updatedAt if it's undefined (to let Mongoose handle it via timestamps)
        if (!record.updatedAt) {
          delete vehicleData.updatedAt;
        }

        // Create vehicle document with duplicate handling
        try {
          const vehicle = await VehicleModel.create(vehicleData);
          vehicleSuccessCount++;
          
          // Track vehicles per driver for updating driver records
          if (!driverVehicleMap.has(driverId)) {
            driverVehicleMap.set(driverId, []);
          }
          driverVehicleMap.get(driverId).push(vehicle._id);
        } catch (error) {
          if (error.code === 11000) {
            // Duplicate key error - skip this vehicle
            console.log(`⚠️  Skipping duplicate vehicle: ${record.plateNo}`);
            vehicleErrorCount++;
            continue;
          } else {
            throw error; // Re-throw other errors
          }
        }
        
        if (vehicleSuccessCount % 50 === 0) {
          console.log(`  Processed ${vehicleSuccessCount}/${jsonData.length} vehicles...`);
        }
      } catch (error) {
        console.error(`❌ Error creating vehicle ${record.plateNo}:`, error.message);
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

// Get file path from command line arguments
const jsonFilePath = process.argv[2];

if (!jsonFilePath) {
  console.log('Usage: node import_any_json.js <path-to-json-file>');
  console.log('Example: node import_any_json.js json/another_file.json');
  process.exit(1);
}

// Run import
importAnyJson(jsonFilePath);
