import mongoose from "mongoose";
import DriverModel from "../model/DriverModel.js";
import VehicleModel from "../model/VehicleModel.js";
import { config } from "dotenv";

// Load environment variables
config();

const testDriverVehicleRelationship = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find a driver with vehicles
    const driver = await DriverModel.findOne({ vehicleIds: { $exists: true, $ne: [] } })
      .populate('vehicleIds', 'plateNo fileNo make');
    
    if (driver) {
      console.log(`\nDriver: ${driver.ownerRepresentativeName}`);
      console.log(`Driver ID: ${driver._id}`);
      console.log(`Vehicle IDs: ${driver.vehicleIds.length}`);
      
      if (driver.vehicleIds.length > 0) {
        console.log("\nVehicles:");
        driver.vehicleIds.forEach((vehicle, index) => {
          console.log(`  ${index + 1}. ${vehicle.plateNo} (${vehicle.fileNo}) - ${vehicle.make}`);
        });
      }
    } else {
      console.log("No drivers with vehicles found");
    }

    // Find vehicles with driverId
    const vehicles = await VehicleModel.find({ driverId: { $exists: true } })
      .populate('driverId', 'ownerRepresentativeName');
    
    console.log(`\nVehicles with driver references: ${vehicles.length}`);
    
    if (vehicles.length > 0) {
      console.log("\nVehicle-Driver relationships:");
      vehicles.forEach((vehicle, index) => {
        console.log(`  ${index + 1}. ${vehicle.plateNo} -> ${vehicle.driverId?.ownerRepresentativeName || 'No driver'}`);
      });
    }

    // Check for orphaned relationships
    const orphanedVehicles = await VehicleModel.find({ 
      driverId: { $exists: true },
      driverId: { $ne: null }
    });
    
    console.log(`\nChecking for orphaned vehicles...`);
    for (const vehicle of orphanedVehicles) {
      const driver = await DriverModel.findById(vehicle.driverId);
      if (!driver) {
        console.log(`  Orphaned vehicle: ${vehicle.plateNo} (${vehicle._id}) references non-existent driver: ${vehicle.driverId}`);
      } else {
        const hasVehicleInArray = driver.vehicleIds.some(id => id.toString() === vehicle._id.toString());
        if (!hasVehicleInArray) {
          console.log(`  Inconsistent relationship: Vehicle ${vehicle.plateNo} references driver ${driver.ownerRepresentativeName}, but driver doesn't have this vehicle in vehicleIds array`);
        }
      }
    }
    
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
};

// Run test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDriverVehicleRelationship();
}

export default testDriverVehicleRelationship;
