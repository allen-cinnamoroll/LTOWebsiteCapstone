/**
 * Script to create sample renewal history records for testing
 * This demonstrates how the renewal history system works
 */

import mongoose from "mongoose";
import RenewalHistoryModel from "../model/RenewalHistoryModel.js";
import VehicleModel from "../model/VehicleModel.js";
import { calculateRenewalStatus } from "../util/renewalStatusCalculator.js";
import { config } from "dotenv";

// Load environment variables
config();

const createSampleRenewalHistory = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/lto-database");
    console.log("Connected to MongoDB");

    // Get a sample vehicle
    const vehicle = await VehicleModel.findOne();
    if (!vehicle) {
      console.log("No vehicles found. Please create a vehicle first.");
      return;
    }

    console.log(`Creating sample renewal history for vehicle: ${vehicle.plateNo}`);

    // Create sample renewal records with different statuses
    const sampleRenewals = [
      {
        vehicleId: vehicle._id,
        plateNo: vehicle.plateNo,
        renewalDate: new Date("2023-01-15"), // Early renewal
        notes: "Early renewal - customer wanted to avoid rush"
      },
      {
        vehicleId: vehicle._id,
        plateNo: vehicle.plateNo,
        renewalDate: new Date("2023-06-20"), // On-time renewal
        notes: "Renewed within scheduled week"
      },
      {
        vehicleId: vehicle._id,
        plateNo: vehicle.plateNo,
        renewalDate: new Date("2023-12-10"), // Late renewal
        notes: "Late renewal - customer forgot to renew on time"
      }
    ];

    for (const renewalData of sampleRenewals) {
      // Calculate renewal status
      const renewalInfo = calculateRenewalStatus(renewalData.plateNo, renewalData.renewalDate);
      
      const renewalRecord = new RenewalHistoryModel({
        ...renewalData,
        status: renewalInfo.status,
        scheduledWeek: renewalInfo.scheduledWeek,
        dueDate: renewalInfo.dueDate,
        processedBy: "System"
      });

      await renewalRecord.save();
      console.log(`Created renewal record: ${renewalData.renewalDate.toDateString()} - ${renewalInfo.status}`);

      // Update vehicle's renewal history
      await VehicleModel.findByIdAndUpdate(
        vehicle._id,
        { 
          $push: { renewalHistory: renewalRecord._id },
          $set: { dateOfRenewal: renewalData.renewalDate }
        }
      );
    }

    console.log("Sample renewal history created successfully!");
    console.log("You can now view the renewal history in the vehicle details modal.");

  } catch (error) {
    console.error("Error creating sample renewal history:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

// Run the script
createSampleRenewalHistory();
