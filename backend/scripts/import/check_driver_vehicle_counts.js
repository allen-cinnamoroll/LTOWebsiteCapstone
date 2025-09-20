import mongoose from 'mongoose';
import DriverModel from '../model/DriverModel.js';
import VehicleModel from '../model/VehicleModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const checkCounts = async () => {
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

    // Get counts
    const totalDrivers = await DriverModel.countDocuments();
    const totalVehicles = await VehicleModel.countDocuments();
    
    console.log(`\n📊 Database Counts:`);
    console.log(`- Total Drivers: ${totalDrivers}`);
    console.log(`- Total Vehicles: ${totalVehicles}`);
    console.log(`- Difference: ${totalVehicles - totalDrivers} more vehicles than drivers`);

    // Check for drivers with multiple vehicles
    const driversWithMultipleVehicles = await DriverModel.aggregate([
      {
        $lookup: {
          from: 'vehicles',
          localField: '_id',
          foreignField: 'driver',
          as: 'vehicles'
        }
      },
      {
        $match: {
          'vehicles.1': { $exists: true } // Has more than 1 vehicle
        }
      },
      {
        $project: {
          ownerRepresentativeName: 1,
          vehicleCount: { $size: '$vehicles' },
          plateNumbers: '$vehicles.plateNo'
        }
      }
    ]);

    console.log(`\n🚗 Drivers with Multiple Vehicles: ${driversWithMultipleVehicles.length}`);
    
    if (driversWithMultipleVehicles.length > 0) {
      console.log(`\nSample drivers with multiple vehicles:`);
      driversWithMultipleVehicles.slice(0, 5).forEach((driver, index) => {
        console.log(`${index + 1}. ${driver.ownerRepresentativeName}: ${driver.vehicleCount} vehicles`);
        console.log(`   Plates: ${driver.plateNumbers.join(', ')}`);
      });
    }

    // Check for vehicles without drivers
    const vehiclesWithoutDrivers = await VehicleModel.countDocuments({
      $or: [
        { driver: { $exists: false } },
        { driver: null }
      ]
    });

    console.log(`\n❌ Vehicles without driver references: ${vehiclesWithoutDrivers}`);

    // Check for drivers without vehicles
    const driversWithoutVehicles = await DriverModel.aggregate([
      {
        $lookup: {
          from: 'vehicles',
          localField: '_id',
          foreignField: 'driver',
          as: 'vehicles'
        }
      },
      {
        $match: {
          vehicles: { $size: 0 }
        }
      }
    ]);

    console.log(`❌ Drivers without vehicles: ${driversWithoutVehicles.length}`);

    if (driversWithoutVehicles.length > 0) {
      console.log(`\nSample drivers without vehicles:`);
      driversWithoutVehicles.slice(0, 3).forEach((driver, index) => {
        console.log(`${index + 1}. ${driver.ownerRepresentativeName}`);
      });
    }

  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run check
checkCounts();
