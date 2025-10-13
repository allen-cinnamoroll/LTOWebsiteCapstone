/**
 * Test script to verify renewal history functionality
 * This script tests the renewal history creation and status determination
 */

import mongoose from "mongoose";
import VehicleModel from "../model/VehicleModel.js";
import RenewalHistoryModel from "../model/RenewalHistoryModel.js";
import { createRenewalStatusRecord, determineRenewalStatus } from "../util/renewalStatusCalculator.js";

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

// Test renewal status determination
const testRenewalStatusDetermination = () => {
  console.log("=== Testing Renewal Status Determination ===");
  
  const testCases = [
    {
      plateNo: "ABC123",
      renewalDate: new Date("2024-01-15"),
      vehicleStatusType: "Old",
      expectedStatus: "On-Time Renewal"
    },
    {
      plateNo: "XYZ789",
      renewalDate: new Date("2024-02-01"),
      vehicleStatusType: "Old",
      expectedStatus: "Early Renewal"
    },
    {
      plateNo: "DEF456",
      renewalDate: new Date("2024-03-30"),
      vehicleStatusType: "Old",
      expectedStatus: "Late Renewal"
    }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`\nTest Case ${index + 1}:`);
    console.log(`Plate: ${testCase.plateNo}`);
    console.log(`Renewal Date: ${testCase.renewalDate.toDateString()}`);
    console.log(`Vehicle Status Type: ${testCase.vehicleStatusType}`);
    
    try {
      const result = determineRenewalStatus(
        testCase.plateNo,
        testCase.renewalDate,
        testCase.vehicleStatusType
      );
      
      console.log(`Result Status: ${result.status}`);
      console.log(`Result Description: ${result.statusDescription}`);
      console.log(`Expected: ${testCase.expectedStatus}`);
      console.log(`Match: ${result.status === testCase.expectedStatus ? '✅' : '❌'}`);
      
    } catch (error) {
      console.error(`Error in test case ${index + 1}:`, error.message);
    }
  });
};

// Test renewal history creation
const testRenewalHistoryCreation = async () => {
  console.log("\n=== Testing Renewal History Creation ===");
  
  try {
    // Find a test vehicle
    const testVehicle = await VehicleModel.findOne({ 
      dateOfRenewal: { $exists: true, $ne: null } 
    });
    
    if (!testVehicle) {
      console.log("No vehicle with renewal date found for testing");
      return;
    }
    
    console.log(`Testing with vehicle: ${testVehicle.plateNo}`);
    console.log(`Vehicle ID: ${testVehicle._id}`);
    console.log(`Renewal Date: ${testVehicle.dateOfRenewal}`);
    
    // Create renewal status record
    const renewalStatusData = createRenewalStatusRecord(testVehicle, testVehicle.dateOfRenewal);
    console.log(`Created renewal status data:`, renewalStatusData);
    
    // Check if renewal record already exists
    const existingRecord = await RenewalHistoryModel.findOne({
      vehicleId: testVehicle._id,
      renewalDate: testVehicle.dateOfRenewal
    });
    
    if (existingRecord) {
      console.log("Renewal record already exists, skipping creation");
      console.log(`Existing record status: ${existingRecord.status}`);
    } else {
      // Create renewal history record
      const renewalRecord = new RenewalHistoryModel(renewalStatusData);
      await renewalRecord.save();
      console.log("✅ Renewal history record created successfully");
      console.log(`Record ID: ${renewalRecord._id}`);
      console.log(`Status: ${renewalRecord.status}`);
    }
    
  } catch (error) {
    console.error("Error testing renewal history creation:", error);
  }
};

// Test API endpoints (simulated)
const testAPIEndpoints = async () => {
  console.log("\n=== Testing API Endpoints ===");
  
  try {
    // Test getting renewal history
    const testVehicle = await VehicleModel.findOne();
    if (testVehicle) {
      console.log(`Testing with vehicle ID: ${testVehicle._id}`);
      
      const renewalHistory = await RenewalHistoryModel.find({ vehicleId: testVehicle._id })
        .sort({ renewalDate: -1 })
        .limit(10)
        .lean();
      
      console.log(`Found ${renewalHistory.length} renewal records`);
      
      if (renewalHistory.length > 0) {
        console.log("Sample renewal record:");
        console.log(`- Date: ${renewalHistory[0].renewalDate}`);
        console.log(`- Status: ${renewalHistory[0].status}`);
        console.log(`- Plate: ${renewalHistory[0].plateNumber}`);
      }
    }
    
  } catch (error) {
    console.error("Error testing API endpoints:", error);
  }
};

// Test error handling
const testErrorHandling = () => {
  console.log("\n=== Testing Error Handling ===");
  
  // Test with invalid plate number
  try {
    const result = determineRenewalStatus("", new Date(), "Old");
    console.log("Empty plate number test:", result);
  } catch (error) {
    console.log("✅ Empty plate number properly handled:", error.message);
  }
  
  // Test with invalid date
  try {
    const result = determineRenewalStatus("ABC123", "invalid-date", "Old");
    console.log("Invalid date test:", result);
  } catch (error) {
    console.log("✅ Invalid date properly handled:", error.message);
  }
  
  // Test with null values
  try {
    const result = determineRenewalStatus(null, null, "Old");
    console.log("Null values test:", result);
  } catch (error) {
    console.log("✅ Null values properly handled:", error.message);
  }
};

// Main test function
const runTests = async () => {
  try {
    await connectDB();
    
    console.log("🧪 Starting Renewal History Tests...\n");
    
    testRenewalStatusDetermination();
    await testRenewalHistoryCreation();
    await testAPIEndpoints();
    testErrorHandling();
    
    console.log("\n✅ All tests completed!");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };
