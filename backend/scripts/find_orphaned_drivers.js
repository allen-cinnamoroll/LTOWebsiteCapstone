import mongoose from 'mongoose';
import DriverModel from '../model/DriverModel.js';
import VehicleModel from '../model/VehicleModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { NODE_ENV, DATABASE } = process.env;

if (!DATABASE) {
  console.error("Missing required environment variables for database connection.");
  process.exit(1);
}

const DB_URI = DATABASE;

const findOrphanedDrivers = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(DB_URI);
    console.log(`✅ Connected to MongoDB (${NODE_ENV} environment)`);

    console.log('🔍 Finding drivers without vehicles...');
    
    // Find drivers with empty or no vehicleIds
    const orphanedDrivers = await DriverModel.find({
      $or: [
        { vehicleIds: { $exists: false } },
        { vehicleIds: { $size: 0 } },
        { vehicleIds: null }
      ]
    });

    console.log(`📊 Found ${orphanedDrivers.length} drivers without vehicles:`);
    
    if (orphanedDrivers.length > 0) {
      console.log('\n🚨 Orphaned Drivers:');
      orphanedDrivers.forEach((driver, index) => {
        console.log(`\n${index + 1}. Driver ID: ${driver._id}`);
        console.log(`   Name: ${driver.ownerRepresentativeName}`);
        console.log(`   License: ${driver.licenseNo || 'N/A'}`);
        console.log(`   Address: ${driver.address || 'N/A'}`);
        console.log(`   Vehicle IDs: ${JSON.stringify(driver.vehicleIds || [])}`);
        console.log(`   Created: ${driver.createdAt || 'N/A'}`);
      });

      // Check if there are vehicles that should be linked to these drivers
      console.log('\n🔍 Checking for vehicles that might belong to these drivers...');
      
      for (const driver of orphanedDrivers) {
        // Look for vehicles with matching driver name
        const potentialVehicles = await VehicleModel.find({
          $or: [
            { driverId: driver._id },
            { 'driverId.ownerRepresentativeName': driver.ownerRepresentativeName }
          ]
        });

        if (potentialVehicles.length > 0) {
          console.log(`\n🚗 Found ${potentialVehicles.length} vehicles for driver "${driver.ownerRepresentativeName}":`);
          potentialVehicles.forEach(vehicle => {
            console.log(`   - Vehicle ID: ${vehicle._id}`);
            console.log(`   - Plate: ${vehicle.plateNo}`);
            console.log(`   - Current Driver ID: ${vehicle.driverId}`);
          });
        }
      }

      // Ask user what to do
      console.log('\n🤔 What would you like to do?');
      console.log('1. Delete orphaned drivers (if they are truly duplicates)');
      console.log('2. Keep them (if they are legitimate drivers without vehicles)');
      console.log('3. Investigate further');
      
    } else {
      console.log('✅ No orphaned drivers found! All drivers have vehicles.');
    }

    // Also check for vehicles without drivers
    console.log('\n🔍 Checking for vehicles without drivers...');
    const orphanedVehicles = await VehicleModel.find({
      $or: [
        { driverId: { $exists: false } },
        { driverId: null },
        { driverId: '' }
      ]
    });

    if (orphanedVehicles.length > 0) {
      console.log(`\n🚨 Found ${orphanedVehicles.length} vehicles without drivers:`);
      orphanedVehicles.forEach((vehicle, index) => {
        console.log(`\n${index + 1}. Vehicle ID: ${vehicle._id}`);
        console.log(`   Plate: ${vehicle.plateNo}`);
        console.log(`   Driver ID: ${vehicle.driverId || 'N/A'}`);
      });
    } else {
      console.log('✅ All vehicles have drivers assigned.');
    }

    // Summary
    const totalDrivers = await DriverModel.countDocuments();
    const totalVehicles = await VehicleModel.countDocuments();
    const driversWithVehicles = await DriverModel.countDocuments({
      vehicleIds: { $exists: true, $not: { $size: 0 } }
    });

    console.log('\n📊 Summary:');
    console.log(`   👥 Total Drivers: ${totalDrivers}`);
    console.log(`   🚗 Total Vehicles: ${totalVehicles}`);
    console.log(`   🔗 Drivers with Vehicles: ${driversWithVehicles}`);
    console.log(`   🚨 Orphaned Drivers: ${orphanedDrivers.length}`);
    console.log(`   🚨 Orphaned Vehicles: ${orphanedVehicles.length}`);

  } catch (error) {
    console.error('❌ Error finding orphaned drivers:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the script
findOrphanedDrivers();