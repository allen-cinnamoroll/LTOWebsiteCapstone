import mongoose from "mongoose";
import DriverModel from "../model/DriverModel.js";
import VehicleModel from "../model/VehicleModel.js";
import { config } from "dotenv";

// Load environment variables
config();

const migrateDriverVehicleRelationship = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Get all drivers
    const drivers = await DriverModel.find({});
    console.log(`Found ${drivers.length} drivers to migrate`);

    for (const driver of drivers) {
      console.log(`Processing driver: ${driver.ownerRepresentativeName} (${driver._id})`);
      
      // Initialize vehicles array if it doesn't exist
      if (!driver.vehicles) {
        driver.vehicles = [];
      }

      // Find all vehicles that reference this driver
      const vehicles = await VehicleModel.find({ driverId: driver._id });
      console.log(`Found ${vehicles.length} vehicles for driver ${driver._id}`);

      // Update driver's vehicles array with denormalized data
      const vehicleUpdates = vehicles.map(vehicle => ({
        vehicleId: vehicle._id,
        plateNumber: vehicle.plateNo,
        fileNumber: vehicle.fileNo
      }));

      // Update the driver with the vehicles array
      await DriverModel.findByIdAndUpdate(
        driver._id,
        { 
          $set: { 
            vehicles: vehicleUpdates 
          } 
        },
        { new: true }
      );

      console.log(`Updated driver ${driver._id} with ${vehicleUpdates.length} vehicles`);
    }

    // Handle vehicles that don't have a driverId but have plate numbers in driver's plateNo array
    const vehiclesWithoutDriverId = await VehicleModel.find({ 
      driverId: { $exists: false } 
    });
    
    console.log(`Found ${vehiclesWithoutDriverId.length} vehicles without driverId`);

    for (const vehicle of vehiclesWithoutDriverId) {
      // Find driver by plate number
      const driver = await DriverModel.findOne({ 
        plateNo: { $in: [vehicle.plateNo] } 
      });

      if (driver) {
        // Update vehicle with driverId
        await VehicleModel.findByIdAndUpdate(
          vehicle._id,
          { driverId: driver._id }
        );

        // Add vehicle to driver's vehicles array
        await DriverModel.findByIdAndUpdate(
          driver._id,
          {
            $push: {
              vehicles: {
                vehicleId: vehicle._id,
                plateNumber: vehicle.plateNo,
                fileNumber: vehicle.fileNo
              }
            }
          }
        );

        console.log(`Linked vehicle ${vehicle.plateNo} to driver ${driver._id}`);
      } else {
        console.log(`No driver found for vehicle ${vehicle.plateNo}`);
      }
    }

    console.log("Migration completed successfully!");
    
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateDriverVehicleRelationship();
}

export default migrateDriverVehicleRelationship;
