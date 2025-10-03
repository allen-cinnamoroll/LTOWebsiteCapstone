import mongoose from "mongoose";
import DriverModel from "../model/DriverModel.js";
import VehicleModel from "../model/VehicleModel.js";
import { config } from "dotenv";

// Load environment variables
config();

const cleanDriverVehicleStructure = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Get all drivers
    const drivers = await DriverModel.find({});
    console.log(`Found ${drivers.length} drivers to clean`);

    for (const driver of drivers) {
      console.log(`Processing driver: ${driver.ownerRepresentativeName} (${driver._id})`);
      
      // Initialize vehicleIds array if it doesn't exist
      if (!driver.vehicleIds) {
        driver.vehicleIds = [];
      }

      // Find all vehicles that reference this driver
      const vehicles = await VehicleModel.find({ driverId: driver._id });
      console.log(`Found ${vehicles.length} vehicles for driver ${driver._id}`);

      // Extract vehicle IDs
      const vehicleIds = vehicles.map(vehicle => vehicle._id);

      // Update the driver with the vehicleIds array
      await DriverModel.findByIdAndUpdate(
        driver._id,
        { 
          $set: { 
            vehicleIds: vehicleIds 
          },
          $unset: {
            plateNo: 1,
            fileNo: 1,
            vehicles: 1
          }
        },
        { new: true }
      );

      console.log(`Updated driver ${driver._id} with ${vehicleIds.length} vehicle IDs`);
    }

    // Handle vehicles that don't have a driverId but might be linked through other means
    const vehiclesWithoutDriverId = await VehicleModel.find({ 
      driverId: { $exists: false } 
    });
    
    console.log(`Found ${vehiclesWithoutDriverId.length} vehicles without driverId`);

    for (const vehicle of vehiclesWithoutDriverId) {
      // Try to find driver by other means (if any exist)
      // This is a fallback for any vehicles that might not be properly linked
      console.log(`Vehicle ${vehicle.plateNo} (${vehicle._id}) has no driverId - manual review needed`);
    }

    console.log("Data structure cleanup completed successfully!");
    
  } catch (error) {
    console.error("Cleanup failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

// Run cleanup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanDriverVehicleStructure();
}

export default cleanDriverVehicleStructure;
