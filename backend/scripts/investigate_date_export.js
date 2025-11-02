import mongoose from "mongoose";
import database from "../database/database.js";
import VehicleModel from "../model/VehicleModel.js";

/**
 * Investigation Script: Date Discrepancy in dateOfRenewal Export
 * 
 * This script investigates:
 * 1. How dates are stored in MongoDB
 * 2. How dates are retrieved by Mongoose
 * 3. The exact transformation at each step
 */

async function investigateDateExport() {
  try {
    await database;
    console.log("=== DATE OF RENEWAL INVESTIGATION ===\n");

    // Step 1: Query MongoDB directly to see raw storage
    console.log("STEP 1: Raw MongoDB Query");
    console.log("----------------------------------------");
    const rawVehicle = await VehicleModel.findOne({ 
      dateOfRenewal: { $exists: true, $ne: null, $not: { $size: 0 } }
    }).lean();
    
    if (!rawVehicle) {
      console.log("Vehicle found:", rawVehicle.plateNo);
      console.log("dateOfRenewal type in DB:", typeof rawVehicle.dateOfRenewal);
      console.log("dateOfRenewal is array:", Array.isArray(rawVehicle.dateOfRenewal));
      console.log("dateOfRenewal length:", rawVehicle.dateOfRenewal?.length);
      
      if (rawVehicle.dateOfRenewal && rawVehicle.dateOfRenewal.length > 0) {
        const latestEntry = rawVehicle.dateOfRenewal[rawVehicle.dateOfRenewal.length - 1];
        console.log("Latest entry:", JSON.stringify(latestEntry, null, 2));
        console.log("Latest entry type:", typeof latestEntry);
        console.log("Latest entry.date type:", typeof latestEntry?.date);
        console.log("Latest entry.date instanceof Date:", latestEntry?.date instanceof Date);
        console.log("Latest entry.date value:", latestEntry?.date);
        console.log("Latest entry.date toISOString:", latestEntry?.date?.toISOString?.());
        console.log("Latest entry.date toString:", latestEntry?.date?.toString?.());
      }
    }
    console.log("\n");

    // Step 2: Query with Mongoose (normal query)
    console.log("STEP 2: Mongoose Query (Normal)");
    console.log("----------------------------------------");
    const mongooseVehicle = await VehicleModel.findOne({ 
      dateOfRenewal: { $exists: true, $ne: null, $not: { $size: 0 } }
    });
    
    if (mongooseVehicle) {
      console.log("Vehicle found:", mongooseVehicle.plateNo);
      const renewalDates = mongooseVehicle.dateOfRenewal || [];
      if (renewalDates.length > 0) {
        const latestEntry = renewalDates[renewalDates.length - 1];
        console.log("Latest entry:", latestEntry);
        console.log("Latest entry type:", typeof latestEntry);
        console.log("Latest entry instanceof Date:", latestEntry instanceof Date);
        console.log("Latest entry.date:", latestEntry?.date);
        console.log("Latest entry.date type:", typeof latestEntry?.date);
        console.log("Latest entry.date instanceof Date:", latestEntry?.date instanceof Date);
        if (latestEntry?.date) {
          const date = latestEntry.date;
          console.log("Date.toISOString():", date.toISOString());
          console.log("Date.getUTCFullYear():", date.getUTCFullYear());
          console.log("Date.getUTCMonth()+1:", date.getUTCMonth() + 1);
          console.log("Date.getUTCDate():", date.getUTCDate());
          console.log("Date.getFullYear():", date.getFullYear());
          console.log("Date.getMonth()+1:", date.getMonth() + 1);
          console.log("Date.getDate():", date.getDate());
          console.log("Server timezone offset (minutes):", date.getTimezoneOffset());
        }
      }
    }
    console.log("\n");

    // Step 3: Convert to Object (as done in export)
    console.log("STEP 3: After toObject() Conversion");
    console.log("----------------------------------------");
    if (mongooseVehicle) {
      const vehicleObj = mongooseVehicle.toObject();
      const renewalDates = vehicleObj.dateOfRenewal || [];
      if (renewalDates.length > 0) {
        const latestEntry = renewalDates[renewalDates.length - 1];
        console.log("Latest entry after toObject():", JSON.stringify(latestEntry, null, 2));
        console.log("Latest entry type:", typeof latestEntry);
        console.log("Latest entry.date type:", typeof latestEntry?.date);
        
        if (latestEntry?.date) {
          let dateValue = latestEntry.date;
          
          // Test different extraction methods
          console.log("\n--- Date Extraction Methods ---");
          
          // Method 1: Direct ISO string extraction
          let isoString;
          if (dateValue instanceof Date) {
            isoString = dateValue.toISOString();
          } else if (typeof dateValue === 'string') {
            isoString = dateValue.includes('Z') ? dateValue : new Date(dateValue).toISOString();
          } else {
            isoString = new Date(dateValue).toISOString();
          }
          console.log("ISO String:", isoString);
          
          // Extract from ISO string
          const isoMatch = isoString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
          if (isoMatch) {
            console.log("From ISO - Year:", isoMatch[1], "Month:", isoMatch[2], "Day:", isoMatch[3], "Hour:", isoMatch[4]);
            console.log("Current logic result (hour >= 12 adds day):", 
              parseInt(isoMatch[4]) >= 12 ? "Would add 1 day" : "No adjustment");
          }
          
          // Method 2: UTC methods
          const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
          console.log("UTC methods - Year:", date.getUTCFullYear(), "Month:", date.getUTCMonth() + 1, "Day:", date.getUTCDate());
          
          // Method 3: Local methods
          console.log("Local methods - Year:", date.getFullYear(), "Month:", date.getMonth() + 1, "Day:", date.getDate());
        }
      }
    }
    console.log("\n");

    // Step 4: Test with actual export filter
    console.log("STEP 4: Test Export Filter (February 2025)");
    console.log("----------------------------------------");
    const testMonth = 2;
    const testYear = 2025;
    
    // Build the same filter as export
    const startDate = new Date(testYear, testMonth - 1, 1);
    const endDate = new Date(testYear, testMonth, 0, 23, 59, 59, 999);
    
    console.log("Filter range:");
    console.log("Start:", startDate.toISOString(), "UTC:", startDate.toISOString().substring(0, 10));
    console.log("End:", endDate.toISOString(), "UTC:", endDate.toISOString().substring(0, 10));
    
    // Use same filter logic as export
    const dateFilter = {
      $expr: {
        $gt: [
          {
            $size: {
              $filter: {
                input: { $ifNull: ["$dateOfRenewal", []] },
                as: "renewal",
                cond: {
                  $let: {
                    vars: {
                      renewalDate: {
                        $cond: {
                          if: { $eq: [{ $type: "$$renewal" }, "object"] },
                          then: "$$renewal.date",
                          else: {
                            $cond: {
                              if: { $eq: [{ $type: "$$renewal" }, "date"] },
                              then: "$$renewal",
                              else: null
                            }
                          }
                        }
                      }
                    },
                    in: {
                      $and: [
                        { $ne: ["$$renewalDate", null] },
                        { $gte: ["$$renewalDate", startDate] },
                        { $lte: ["$$renewalDate", endDate] }
                      ]
                    }
                  }
                }
              }
            }
          },
          0
        ]
      }
    };
    
    const filteredVehicles = await VehicleModel.find(dateFilter).limit(5);
    console.log(`Found ${filteredVehicles.length} vehicles for ${testMonth}/${testYear}`);
    
    filteredVehicles.forEach((v, idx) => {
      const renewalDates = v.dateOfRenewal || [];
      if (renewalDates.length > 0) {
        const latest = renewalDates[renewalDates.length - 1];
        const latestDate = latest?.date || latest;
        if (latestDate) {
          const iso = latestDate instanceof Date ? latestDate.toISOString() : new Date(latestDate).toISOString();
          const isoMatch = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
          console.log(`\nVehicle ${idx + 1} (${v.plateNo}):`);
          console.log(`  ISO: ${iso}`);
          console.log(`  Extracted: ${isoMatch ? `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}` : 'N/A'}`);
          console.log(`  Hour UTC: ${isoMatch ? isoMatch[4] : 'N/A'}`);
        }
      }
    });

    console.log("\n=== INVESTIGATION COMPLETE ===");
    process.exit(0);
  } catch (error) {
    console.error("Investigation error:", error);
    process.exit(1);
  }
}

investigateDateExport();

