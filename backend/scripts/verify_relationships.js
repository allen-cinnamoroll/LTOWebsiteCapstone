import mongoose from 'mongoose';
import DriverModel from '../model/DriverModel.js';
import VehicleModel from '../model/VehicleModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const verifyRelationships = async () => {
  try {
    // Connect to MongoDB using the same environment variables as other scripts
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

    // Verify the import
    console.log('\n🔍 Verifying database relationships...');

    const totalDrivers = await DriverModel.countDocuments();
    const totalVehicles = await VehicleModel.countDocuments();
    const vehiclesWithDrivers = await VehicleModel.countDocuments({ driverId: { $exists: true, $ne: null } });
    const driversWithVehicles = await DriverModel.countDocuments({ vehicleIds: { $exists: true, $ne: [] } });
    
    console.log(`📊 Database Summary:`);
    console.log(`  - Total Drivers: ${totalDrivers}`);
    console.log(`  - Total Vehicles: ${totalVehicles}`);
    console.log(`  - Vehicles with Driver References: ${vehiclesWithDrivers}`);
    console.log(`  - Drivers with Vehicle References: ${driversWithVehicles}`);

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

    // Check for orphaned records
    const orphanedVehicles = await VehicleModel.countDocuments({ driverId: { $exists: false } });
    const orphanedDrivers = await DriverModel.countDocuments({ vehicleIds: { $exists: false } });
    
    if (orphanedVehicles > 0) {
      console.log(`⚠️  Found ${orphanedVehicles} vehicles without driver references`);
    }
    
    if (orphanedDrivers > 0) {
      console.log(`⚠️  Found ${orphanedDrivers} drivers without vehicle references`);
    }

    if (orphanedVehicles === 0 && orphanedDrivers === 0) {
      console.log('\n✅ All relationships are properly maintained!');
    }

    console.log('\n✅ Verification completed successfully!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run if this file is executed directly
  verifyRelationships();