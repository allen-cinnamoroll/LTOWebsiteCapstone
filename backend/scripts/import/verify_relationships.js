import mongoose from 'mongoose';
import DriverModel from '../model/DriverModel.js';
import VehicleModel from '../model/VehicleModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const verifyRelationships = async () => {
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

    console.log('=== RELATIONSHIP VERIFICATION ===\n');

    // 1. Count total documents
    const totalDrivers = await DriverModel.countDocuments();
    const totalVehicles = await VehicleModel.countDocuments();
    console.log(`Total Drivers: ${totalDrivers}`);
    console.log(`Total Vehicles: ${totalVehicles}\n`);

    // 2. Check vehicles with driver references
    const vehiclesWithDrivers = await VehicleModel.find({ 
      driver: { $exists: true, $ne: null } 
    }).populate('driver');
    
    const vehiclesWithoutDrivers = await VehicleModel.countDocuments({ 
      $or: [
        { driver: { $exists: false } },
        { driver: null }
      ]
    });

    console.log(`Vehicles with driver references: ${vehiclesWithDrivers.length}`);
    console.log(`Vehicles without driver references: ${vehiclesWithoutDrivers}\n`);

    // 3. Check drivers with vehicles
    const driversWithVehicles = await DriverModel.find({ 
      plateNo: { $exists: true, $ne: [] } 
    });
    
    const driversWithoutVehicles = await DriverModel.countDocuments({ 
      $or: [
        { plateNo: { $exists: false } },
        { plateNo: [] }
      ]
    });

    console.log(`Drivers with plate numbers: ${driversWithVehicles.length}`);
    console.log(`Drivers without plate numbers: ${driversWithoutVehicles}\n`);

    // 4. Show sample relationships
    console.log('=== SAMPLE RELATIONSHIPS ===');
    const sampleSize = Math.min(5, vehiclesWithDrivers.length);
    for (let i = 0; i < sampleSize; i++) {
      const vehicle = vehiclesWithDrivers[i];
      console.log(`${i + 1}. Vehicle: ${vehicle.plateNo}`);
      console.log(`   Driver: ${vehicle.driver.ownerRepresentativeName}`);
      console.log(`   Driver ID: ${vehicle.driver._id}`);
      console.log(`   Driver Plates: [${vehicle.driver.plateNo.join(', ')}]`);
      console.log('');
    }

    // 5. Check for orphaned relationships
    console.log('=== ORPHANED RELATIONSHIPS CHECK ===');
    
    // Find vehicles that reference non-existent drivers
    const orphanedVehicles = await VehicleModel.aggregate([
      {
        $lookup: {
          from: 'drivers',
          localField: 'driver',
          foreignField: '_id',
          as: 'driverInfo'
        }
      },
      {
        $match: {
          driver: { $ne: null },
          driverInfo: { $size: 0 }
        }
      }
    ]);

    console.log(`Orphaned vehicles (referencing non-existent drivers): ${orphanedVehicles.length}`);

    // 6. Check for duplicate plate numbers
    console.log('\n=== DUPLICATE CHECK ===');
    const duplicatePlates = await VehicleModel.aggregate([
      {
        $group: {
          _id: '$plateNo',
          count: { $sum: 1 },
          vehicles: { $push: '$_id' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    console.log(`Duplicate plate numbers found: ${duplicatePlates.length}`);
    if (duplicatePlates.length > 0) {
      console.log('Duplicate plates:');
      duplicatePlates.forEach(dup => {
        console.log(`  - ${dup._id}: ${dup.count} vehicles`);
      });
    }

    // 7. Summary
    console.log('\n=== SUMMARY ===');
    const relationshipIntegrity = vehiclesWithDrivers.length === totalVehicles && 
                                 vehiclesWithoutDrivers === 0 && 
                                 orphanedVehicles.length === 0;
    
    console.log(`Relationship Integrity: ${relationshipIntegrity ? '✅ GOOD' : '❌ ISSUES FOUND'}`);
    
    if (!relationshipIntegrity) {
      console.log('\nIssues found:');
      if (vehiclesWithoutDrivers > 0) {
        console.log(`- ${vehiclesWithoutDrivers} vehicles without driver references`);
      }
      if (orphanedVehicles.length > 0) {
        console.log(`- ${orphanedVehicles.length} vehicles with orphaned driver references`);
      }
    }

  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run verification if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyRelationships();
}

export default verifyRelationships;
