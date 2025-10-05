/**
 * Script to fix driver-vehicle relationships
 * This script will populate the driver's vehicleIds array based on existing vehicles
 */

import mongoose from 'mongoose';
import DriverModel from '../model/DriverModel.js';
import VehicleModel from '../model/VehicleModel.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lto_database');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const fixDriverVehicleRelationships = async () => {
  try {
    console.log('Starting driver-vehicle relationship fix...');
    
    // Get all drivers
    const drivers = await DriverModel.find({});
    console.log(`Found ${drivers.length} drivers`);
    
    // Get all vehicles
    const vehicles = await VehicleModel.find({});
    console.log(`Found ${vehicles.length} vehicles`);
    
    // Create a map of driverId to vehicles
    const driverVehicleMap = {};
    vehicles.forEach(vehicle => {
      if (vehicle.driverId) {
        if (!driverVehicleMap[vehicle.driverId.toString()]) {
          driverVehicleMap[vehicle.driverId.toString()] = [];
        }
        driverVehicleMap[vehicle.driverId.toString()].push(vehicle._id);
      }
    });
    
    console.log('Driver-vehicle mapping created');
    
    // Update each driver's vehicleIds array
    let updatedCount = 0;
    for (const driver of drivers) {
      const driverId = driver._id.toString();
      const vehicleIds = driverVehicleMap[driverId] || [];
      
      // Update the driver's vehicleIds array
      await DriverModel.findByIdAndUpdate(
        driver._id,
        { $set: { vehicleIds: vehicleIds } },
        { new: true }
      );
      
      if (vehicleIds.length > 0) {
        console.log(`Updated driver ${driver.ownerRepresentativeName} with ${vehicleIds.length} vehicles`);
        updatedCount++;
      }
    }
    
    console.log(`Fixed relationships for ${updatedCount} drivers`);
    console.log('Driver-vehicle relationship fix completed successfully!');
    
  } catch (error) {
    console.error('Error fixing driver-vehicle relationships:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the script
connectDB().then(() => {
  fixDriverVehicleRelationships();
});