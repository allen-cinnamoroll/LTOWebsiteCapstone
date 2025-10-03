import mongoose from "mongoose";
import DriverModel from "../model/DriverModel.js";
import VehicleModel from "../model/VehicleModel.js";
import { config } from "dotenv";

// Load environment variables
config();

const testDriverUpdate = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find a driver
    const driver = await DriverModel.findOne({});
    if (!driver) {
      console.log("No drivers found");
      return;
    }

    console.log(`Testing with driver: ${driver.ownerRepresentativeName} (${driver._id})`);
    console.log(`Current vehicleIds: ${driver.vehicleIds ? driver.vehicleIds.length : 0}`);

    // Create a test vehicle
    const testVehicle = await VehicleModel.create({
      plateNo: "TEST123",
      fileNo: "TEST-001",
      engineNo: "ENG123",
      serialChassisNumber: "CHS123",
      make: "TEST",
      bodyType: "CAR",
      color: "BLUE",
      classification: "PRIVATE",
      vehicleStatusType: "Old",
      driverId: driver._id
    });

    console.log(`Created test vehicle: ${testVehicle._id}`);

    // Try to update driver with vehicle ID
    console.log(`Attempting to update driver ${driver._id} with vehicle ${testVehicle._id}`);
    
    const updatedDriver = await DriverModel.findByIdAndUpdate(
      driver._id,
      {
        $push: {
          vehicleIds: testVehicle._id
        }
      },
      { new: true }
    );

    if (updatedDriver) {
      console.log(`Successfully updated driver`);
      console.log(`Driver now has ${updatedDriver.vehicleIds.length} vehicles`);
      console.log(`Vehicle IDs: ${updatedDriver.vehicleIds}`);
    } else {
      console.log("Failed to update driver");
    }

    // Clean up test vehicle
    await VehicleModel.findByIdAndDelete(testVehicle._id);
    console.log("Cleaned up test vehicle");

  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

// Run test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDriverUpdate();
}

export default testDriverUpdate;
