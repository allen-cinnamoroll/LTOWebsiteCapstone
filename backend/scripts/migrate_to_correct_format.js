import mongoose from 'mongoose';
import DriverModel from '../model/DriverModel.js';
import VehicleModel from '../model/VehicleModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const migrateToCorrectFormat = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Migrate Drivers - convert string plateNo to array
    console.log('Starting driver migration...');
    const drivers = await DriverModel.find({ plateNo: { $type: 'string' } });
    console.log(`Found ${drivers.length} drivers with string plateNo`);

    for (const driver of drivers) {
      if (typeof driver.plateNo === 'string') {
        // Convert comma-separated string to array
        const plateArray = driver.plateNo.split(',').map(plate => plate.trim()).filter(plate => plate.length > 0);
        
        await DriverModel.findByIdAndUpdate(driver._id, { plateNo: plateArray });
        console.log(`Updated driver ${driver._id}: "${driver.plateNo}" -> [${plateArray.join(', ')}]`);
      }
    }

    // Migrate Vehicles - convert array plateNo to string (take first plate)
    console.log('Starting vehicle migration...');
    const vehicles = await VehicleModel.find({ plateNo: { $type: 'array' } });
    console.log(`Found ${vehicles.length} vehicles with array plateNo`);

    for (const vehicle of vehicles) {
      if (Array.isArray(vehicle.plateNo)) {
        // Take the first plate number from the array
        const firstPlate = vehicle.plateNo[0];
        
        await VehicleModel.findByIdAndUpdate(vehicle._id, { plateNo: firstPlate });
        console.log(`Updated vehicle ${vehicle._id}: [${vehicle.plateNo.join(', ')}] -> "${firstPlate}"`);
      }
    }

    console.log('Migration completed successfully!');
    
    // Verify migration
    const remainingStringDrivers = await DriverModel.countDocuments({ plateNo: { $type: 'string' } });
    const remainingArrayVehicles = await VehicleModel.countDocuments({ plateNo: { $type: 'array' } });
    
    console.log(`Remaining string plateNo - Drivers: ${remainingStringDrivers}`);
    console.log(`Remaining array plateNo - Vehicles: ${remainingArrayVehicles}`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateToCorrectFormat();
}

export default migrateToCorrectFormat;
