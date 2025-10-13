/**
 * Quick migration script to populate renewal history for existing vehicles
 */

import mongoose from "mongoose";
import VehicleModel from "./backend/model/VehicleModel.js";
import RenewalHistoryModel from "./backend/model/RenewalHistoryModel.js";
import { createRenewalStatusRecord } from "./backend/util/renewalStatusCalculator.js";

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/lto_system");
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

// Migration function
const migrateRenewalHistory = async () => {
  try {
    console.log("🚀 Starting renewal history migration...");
    
    // Get all vehicles with renewal dates
    const vehicles = await VehicleModel.find({ 
      dateOfRenewal: { $exists: true, $ne: null } 
    }).lean();
    
    console.log(`📊 Found ${vehicles.length} vehicles with renewal dates`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const vehicle of vehicles) {
      try {
        // Check if renewal record already exists
        const existingRecord = await RenewalHistoryModel.findOne({
          vehicleId: vehicle._id,
          renewalDate: vehicle.dateOfRenewal
        });
        
        if (existingRecord) {
          console.log(`⏭️  Skipping vehicle ${vehicle.plateNo} - renewal record already exists`);
          skipCount++;
          continue;
        }
        
        // Create renewal status record
        const renewalStatusData = createRenewalStatusRecord(vehicle, vehicle.dateOfRenewal);
        
        // Create renewal history record
        const renewalRecord = new RenewalHistoryModel(renewalStatusData);
        await renewalRecord.save();
        
        console.log(`✅ Created renewal history for vehicle ${vehicle.plateNo}: ${renewalStatusData.status}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error processing vehicle ${vehicle.plateNo}:`, error.message);
        errorCount++;
      }
    }
    
    console.log("\n📈 === Migration Summary ===");
    console.log(`Total vehicles processed: ${vehicles.length}`);
    console.log(`✅ Successfully created: ${successCount}`);
    console.log(`⏭️  Skipped (already exists): ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await migrateRenewalHistory();
    console.log("🎉 Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
};

main();
