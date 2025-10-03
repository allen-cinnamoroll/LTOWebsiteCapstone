import mongoose from "mongoose";
import DriverModel from "../model/DriverModel.js";
import { config } from "dotenv";

// Load environment variables
config();

const initializeVehicleIds = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find all drivers without vehicleIds array
    const drivers = await DriverModel.find({
      $or: [
        { vehicleIds: { $exists: false } },
        { vehicleIds: null }
      ]
    });

    console.log(`Found ${drivers.length} drivers without vehicleIds array`);

    for (const driver of drivers) {
      console.log(`Initializing vehicleIds for driver: ${driver.ownerRepresentativeName} (${driver._id})`);
      
      // Initialize vehicleIds array
      await DriverModel.findByIdAndUpdate(
        driver._id,
        {
          $set: {
            vehicleIds: []
          }
        }
      );
      
      console.log(`  Initialized vehicleIds array`);
    }

    console.log("Initialization completed successfully!");
    
  } catch (error) {
    console.error("Initialization failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

// Run initialization if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeVehicleIds();
}

export default initializeVehicleIds;
