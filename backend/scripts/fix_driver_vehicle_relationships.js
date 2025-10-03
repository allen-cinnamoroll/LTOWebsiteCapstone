import mongoose from "mongoose";
import DriverModel from "../model/DriverModel.js";
import VehicleModel from "../model/VehicleModel.js";
import { config } from "dotenv";

// Load environment variables
config();

const fixDriverVehicleRelationships = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Get all vehicles with driverId
    const vehicles = await VehicleModel.find({ driverId: { $exists: true, $ne: null } });
    console.log(`Found ${vehicles.length} vehicles with driver references`);

    for (const vehicle of vehicles) {
      console.log(`\nProcessing vehicle: ${vehicle.plateNo} (${vehicle._id})`);
      
      // Find the driver
      const driver = await DriverModel.findById(vehicle.driverId);
      if (!driver) {
        console.log(`  Driver not found for vehicle ${vehicle.plateNo}`);
        continue;
      }

      console.log(`  Driver: ${driver.ownerRepresentativeName} (${driver._id})`);

      // Initialize vehicleIds array if it doesn't exist
      if (!driver.vehicleIds) {
        driver.vehicleIds = [];
      }

      // Check if vehicle ID is already in the array
      const vehicleIdExists = driver.vehicleIds.some(id => id.toString() === vehicle._id.toString());
      
      if (!vehicleIdExists) {
        // Add vehicle ID to driver's vehicleIds array
        await DriverModel.findByIdAndUpdate(
          driver._id,
          {
            $push: {
              vehicleIds: vehicle._id
            }
          }
        );
        console.log(`  Added vehicle ${vehicle._id} to driver's vehicleIds array`);
      } else {
        console.log(`  Vehicle ${vehicle._id} already in driver's vehicleIds array`);
      }
    }

    // Verify the relationships
    console.log("\nVerifying relationships...");
    const driversWithVehicles = await DriverModel.find({ vehicleIds: { $exists: true, $ne: [] } })
      .populate('vehicleIds', 'plateNo fileNo');
    
    for (const driver of driversWithVehicles) {
      console.log(`\nDriver: ${driver.ownerRepresentativeName}`);
      console.log(`  Vehicle count: ${driver.vehicleIds.length}`);
      
      for (const vehicle of driver.vehicleIds) {
        console.log(`    - ${vehicle.plateNo} (${vehicle.fileNo})`);
      }
    }

    console.log("\nRelationship fix completed successfully!");
    
  } catch (error) {
    console.error("Fix failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

// Run fix if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixDriverVehicleRelationships();
}

export default fixDriverVehicleRelationships;
