/**
 * Migration script to create renewal history records for existing vehicles
 * This script should be run once to populate the renewal history for existing vehicles
 */

import mongoose from "mongoose";
import VehicleModel from "../model/VehicleModel.js";
import RenewalHistoryModel from "../model/RenewalHistoryModel.js";
import { createRenewalStatusRecord } from "../util/renewalStatusCalculator.js";
// import { logger } from "../util/logger.js";

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/lto_system");
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

// Migration function
const migrateRenewalHistory = async () => {
  try {
    console.log("Starting renewal history migration...");
    
    // Get all vehicles with renewal dates
    const vehicles = await VehicleModel.find({ 
      dateOfRenewal: { $exists: true, $ne: null } 
    }).lean();
    
    console.log(`Found ${vehicles.length} vehicles with renewal dates`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const vehicle of vehicles) {
      try {
        // Check if renewal record already exists
        const existingRecord = await RenewalHistoryModel.findOne({
          vehicleId: vehicle._id,
          renewalDate: vehicle.dateOfRenewal
        });
        
        if (existingRecord) {
          console.log(`Skipping vehicle ${vehicle.plateNo} - renewal record already exists`);
          skipCount++;
          continue;
        }
        
        // Create renewal status record
        const renewalStatusData = createRenewalStatusRecord(vehicle, vehicle.dateOfRenewal);
        
        // Create renewal history record
        const renewalRecord = new RenewalHistoryModel(renewalStatusData);
        await renewalRecord.save();
        
        console.log(`Created renewal history for vehicle ${vehicle.plateNo}: ${renewalStatusData.status}`);
        successCount++;
        
      } catch (error) {
        console.error(`Error processing vehicle ${vehicle.plateNo}:`, error.message);
        errors.push({
          vehicleId: vehicle._id,
          plateNo: vehicle.plateNo,
          error: error.message
        });
        errorCount++;
      }
    }
    
    console.log("\n=== Migration Summary ===");
    console.log(`Total vehicles processed: ${vehicles.length}`);
    console.log(`Successfully created: ${successCount}`);
    console.log(`Skipped (already exists): ${skipCount}`);
    console.log(`Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log("\n=== Errors ===");
      errors.forEach(error => {
        console.log(`Vehicle ${error.plateNo}: ${error.error}`);
      });
    }
    
    console.log(`Renewal history migration completed: ${successCount} created, ${skipCount} skipped, ${errorCount} errors`);
    
  } catch (error) {
    console.error("Migration failed:", error);
    console.error("Renewal history migration failed:", error);
    process.exit(1);
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await migrateRenewalHistory();
    console.log("Migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { migrateRenewalHistory };
