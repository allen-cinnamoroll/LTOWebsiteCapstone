/**
 * Migration script to convert single dateOfRenewal fields to arrays
 * This script should be run once to migrate existing data
 */

import mongoose from "mongoose";
import VehicleModel from "../model/VehicleModel.js";

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
const migrateDateOfRenewalToArray = async () => {
  try {
    console.log("Starting dateOfRenewal migration to array format...");
    
    // Find all vehicles that have dateOfRenewal as a single Date (not array)
    const vehicles = await VehicleModel.find({
      dateOfRenewal: { $exists: true, $not: { $type: "array" } }
    });
    
    console.log(`Found ${vehicles.length} vehicles with single dateOfRenewal to migrate`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const vehicle of vehicles) {
      try {
        console.log(`Migrating vehicle ${vehicle.plateNo} (${vehicle._id})`);
        console.log(`Current dateOfRenewal:`, vehicle.dateOfRenewal);
        console.log(`Current type:`, typeof vehicle.dateOfRenewal);
        
        // Convert single date to array
        const renewalDates = vehicle.dateOfRenewal ? [vehicle.dateOfRenewal] : [];
        
        // Update the vehicle with array format
        await VehicleModel.findByIdAndUpdate(
          vehicle._id,
          { dateOfRenewal: renewalDates },
          { new: true }
        );
        
        console.log(`✅ Migrated vehicle ${vehicle.plateNo}: ${renewalDates.length} renewal(s)`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error migrating vehicle ${vehicle.plateNo}:`, error.message);
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
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log("\n=== Errors ===");
      errors.forEach(error => {
        console.log(`Vehicle ${error.plateNo}: ${error.error}`);
      });
    }
    
    console.log(`DateOfRenewal migration completed: ${successCount} migrated, ${errorCount} errors`);
    
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await migrateDateOfRenewalToArray();
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

export { migrateDateOfRenewalToArray };
