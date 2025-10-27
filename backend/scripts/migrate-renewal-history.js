import mongoose from "mongoose";
import VehicleModel from "../model/VehicleModel.js";
import RenewalHistoryModel from "../model/RenewalHistoryModel.js";
import { config } from "dotenv";

// Load environment variables
config();

/**
 * Migration script to populate renewal history for existing vehicles
 * This script will:
 * 1. Find all vehicles with dateOfRenewal
 * 2. Create renewal history records for each vehicle
 * 3. Add the current dateOfRenewal to the dateOfRenewalHistory array
 */

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/Ito_website");
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

const migrateRenewalHistory = async () => {
  try {
    console.log("🚀 Starting renewal history migration...");
    
    // Find all vehicles with dateOfRenewal
    const vehicles = await VehicleModel.find({ 
      dateOfRenewal: { $exists: true, $ne: null } 
    }).select('_id plateNo fileNo dateOfRenewal');
    
    console.log(`📊 Found ${vehicles.length} vehicles with renewal dates`);
    
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const vehicle of vehicles) {
      try {
        // Check if renewal history already exists for this vehicle
        const existingHistory = await RenewalHistoryModel.findOne({ 
          vehicleId: vehicle._id 
        });
        
        if (existingHistory) {
          console.log(`⏭️  Skipping vehicle ${vehicle.plateNo} - renewal history already exists`);
          skippedCount++;
          continue;
        }
        
        // Create renewal history record
        const renewalHistory = new RenewalHistoryModel({
          vehicleId: vehicle._id,
          renewalDate: vehicle.dateOfRenewal,
          status: "On-Time Renewal", // Default status
          plateNumber: vehicle.plateNo,
          dateOfRenewalHistory: [{
            date: vehicle.dateOfRenewal,
            updatedAt: new Date(),
            updatedBy: null // System migration
          }]
        });
        
        await renewalHistory.save();
        console.log(`✅ Created renewal history for vehicle ${vehicle.plateNo} (${vehicle.fileNo})`);
        processedCount++;
        
      } catch (error) {
        console.error(`❌ Error processing vehicle ${vehicle.plateNo}:`, error.message);
        errorCount++;
      }
    }
    
    console.log("\n📈 Migration Summary:");
    console.log(`✅ Processed: ${processedCount} vehicles`);
    console.log(`⏭️  Skipped: ${skippedCount} vehicles`);
    console.log(`❌ Errors: ${errorCount} vehicles`);
    console.log(`📊 Total: ${vehicles.length} vehicles`);
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
};

const verifyMigration = async () => {
  try {
    console.log("\n🔍 Verifying migration...");
    
    // Count vehicles with renewal dates
    const vehiclesWithRenewal = await VehicleModel.countDocuments({ 
      dateOfRenewal: { $exists: true, $ne: null } 
    });
    
    // Count renewal history records
    const renewalHistoryCount = await RenewalHistoryModel.countDocuments();
    
    console.log(`📊 Vehicles with renewal dates: ${vehiclesWithRenewal}`);
    console.log(`📊 Renewal history records: ${renewalHistoryCount}`);
    
    if (vehiclesWithRenewal === renewalHistoryCount) {
      console.log("✅ Migration verification successful!");
    } else {
      console.log("⚠️  Migration verification failed - counts don't match");
    }
    
  } catch (error) {
    console.error("❌ Verification failed:", error);
  }
};

const main = async () => {
  try {
    await connectDB();
    await migrateRenewalHistory();
    await verifyMigration();
    console.log("\n🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
    process.exit(0);
  }
};

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { migrateRenewalHistory, verifyMigration };
