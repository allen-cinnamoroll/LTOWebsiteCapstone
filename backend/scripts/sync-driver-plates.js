import mongoose from 'mongoose';
import DriverModel from '../model/DriverModel.js';
import VehicleModel from '../model/VehicleModel.js';
import { config } from 'dotenv';

// Load environment variables
config();

const syncDriverPlates = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lto-website');
    console.log('Connected to MongoDB');

    // Get all drivers
    const drivers = await DriverModel.find({});
    console.log(`Found ${drivers.length} drivers to sync`);

    let syncedCount = 0;

    for (const driver of drivers) {
      // Find all vehicles associated with this driver
      const vehicles = await VehicleModel.find({ driver: driver._id }).select('plateNo');
      
      if (vehicles.length > 0) {
        // Extract plate numbers from vehicles
        const vehiclePlates = vehicles.map(vehicle => vehicle.plateNo);
        
        // Get current driver plates
        const currentPlates = driver.plateNo || [];
        
        // Combine and deduplicate
        const allPlates = [...new Set([...currentPlates, ...vehiclePlates])];
        
        // Only update if there are changes
        if (allPlates.length !== currentPlates.length || 
            !allPlates.every(plate => currentPlates.includes(plate))) {
          
          driver.plateNo = allPlates;
          await driver.save();
          
          console.log(`Synced driver ${driver.ownerRepresentativeName}: ${currentPlates.join(', ')} → ${allPlates.join(', ')}`);
          syncedCount++;
        }
      }
    }

    console.log(`\nSync completed! Updated ${syncedCount} drivers.`);
    
  } catch (error) {
    console.error('Error syncing driver plates:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the sync
syncDriverPlates();
