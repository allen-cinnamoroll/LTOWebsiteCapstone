import mongoose from 'mongoose';
import DriverModel from '../model/DriverModel.js';
import VehicleModel from '../model/VehicleModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const fixLguLuponIssues = async () => {
  try {
    // Connect to MongoDB
    const { DATABASE } = process.env;
    
    if (!DATABASE) {
      console.error("Missing required environment variables for database connection.");
      console.error("Please ensure DATABASE is set in your .env file.");
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(DATABASE);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 DIAGNOSING LGU LUPON ISSUES...\n');

    // Step 1: Find all LGU LUPON drivers
    const lguDrivers = await DriverModel.find({ 
      ownerRepresentativeName: { $regex: 'LGU.*LUPON', $options: 'i' } 
    }).populate('vehicleIds');

    console.log(`📊 Found ${lguDrivers.length} LGU LUPON drivers:`);
    lguDrivers.forEach((driver, index) => {
      console.log(`  ${index + 1}. ${driver.ownerRepresentativeName}`);
      console.log(`     - ID: ${driver._id}`);
      console.log(`     - Vehicle Count: ${driver.vehicleIds.length}`);
      console.log(`     - Vehicles: ${driver.vehicleIds.map(v => v.plateNo).join(', ') || 'None'}`);
      console.log('');
    });

    // Step 2: Find all vehicles that should belong to LGU LUPON
    const allVehicles = await VehicleModel.find({}).populate('driverId');
    const lguVehicles = allVehicles.filter(v => 
      v.driverId && v.driverId.ownerRepresentativeName && 
      v.driverId.ownerRepresentativeName.toLowerCase().includes('lgu') &&
      v.driverId.ownerRepresentativeName.toLowerCase().includes('lupon')
    );

    console.log(`🚗 Found ${lguVehicles.length} vehicles owned by LGU LUPON:`);
    lguVehicles.forEach((vehicle, index) => {
      console.log(`  ${index + 1}. ${vehicle.plateNo} -> ${vehicle.driverId.ownerRepresentativeName}`);
    });

    // Step 3: Identify the issues
    console.log('\n🔧 IDENTIFYING ISSUES...\n');

    // Issue 1: Duplicate drivers
    const duplicateNames = {};
    lguDrivers.forEach(driver => {
      const name = driver.ownerRepresentativeName.toLowerCase().trim();
      if (!duplicateNames[name]) {
        duplicateNames[name] = [];
      }
      duplicateNames[name].push(driver);
    });

    const duplicates = Object.entries(duplicateNames).filter(([name, drivers]) => drivers.length > 1);
    
    if (duplicates.length > 0) {
      console.log('❌ DUPLICATE DRIVERS FOUND:');
      duplicates.forEach(([name, drivers]) => {
        console.log(`  - "${name}" has ${drivers.length} entries:`);
        drivers.forEach((driver, index) => {
          console.log(`    ${index + 1}. ID: ${driver._id}, Vehicles: ${driver.vehicleIds.length}`);
        });
      });
    } else {
      console.log('✅ No duplicate drivers found');
    }

    // Issue 2: Vehicles not linked properly
    console.log('\n🔗 CHECKING VEHICLE-DRIVER RELATIONSHIPS...');
    
    for (const driver of lguDrivers) {
      const actualVehicles = lguVehicles.filter(v => v.driverId._id.toString() === driver._id.toString());
      console.log(`Driver: ${driver.ownerRepresentativeName}`);
      console.log(`  - Stored vehicle IDs: ${driver.vehicleIds.length}`);
      console.log(`  - Actual vehicles in DB: ${actualVehicles.length}`);
      
      if (driver.vehicleIds.length !== actualVehicles.length) {
        console.log(`  ❌ MISMATCH: Driver has ${driver.vehicleIds.length} vehicles in vehicleIds array but ${actualVehicles.length} vehicles actually linked`);
      } else {
        console.log(`  ✅ Relationship looks correct`);
      }
    }

    // Step 4: Fix the issues
    console.log('\n🛠️  FIXING ISSUES...\n');

    if (duplicates.length > 0) {
      console.log('🔧 FIXING DUPLICATE DRIVERS...');
      
      for (const [name, duplicateDrivers] of duplicates) {
        console.log(`\nMerging ${duplicateDrivers.length} duplicate entries for "${name}"`);
        
        // Keep the driver with the most vehicles, or the first one if equal
        const primaryDriver = duplicateDrivers.reduce((prev, current) => 
          current.vehicleIds.length > prev.vehicleIds.length ? current : prev
        );
        
        const driversToMerge = duplicateDrivers.filter(d => d._id.toString() !== primaryDriver._id.toString());
        
        console.log(`  - Keeping driver: ${primaryDriver._id} (${primaryDriver.vehicleIds.length} vehicles)`);
        console.log(`  - Merging ${driversToMerge.length} other drivers`);
        
        // Collect all vehicles from drivers to be merged
        const allVehicleIds = [...primaryDriver.vehicleIds];
        
        for (const driverToMerge of driversToMerge) {
          console.log(`    - Merging driver: ${driverToMerge._id} (${driverToMerge.vehicleIds.length} vehicles)`);
          
          // Add vehicles from this driver to the primary driver
          allVehicleIds.push(...driverToMerge.vehicleIds);
          
          // Update vehicles to point to primary driver
          await VehicleModel.updateMany(
            { driverId: driverToMerge._id },
            { driverId: primaryDriver._id }
          );
          
          // Delete the duplicate driver
          await DriverModel.findByIdAndDelete(driverToMerge._id);
          console.log(`    ✅ Deleted duplicate driver: ${driverToMerge._id}`);
        }
        
        // Update primary driver with all vehicles
        await DriverModel.findByIdAndUpdate(
          primaryDriver._id,
          { vehicleIds: allVehicleIds.map(v => v._id) }
        );
        
        console.log(`  ✅ Updated primary driver with ${allVehicleIds.length} vehicles`);
      }
    }

    // Step 5: Fix vehicle relationships
    console.log('\n🔧 FIXING VEHICLE-DRIVER RELATIONSHIPS...');
    
    const updatedDrivers = await DriverModel.find({ 
      ownerRepresentativeName: { $regex: 'LGU.*LUPON', $options: 'i' } 
    });

    for (const driver of updatedDrivers) {
      // Find all vehicles that belong to this driver
      const driverVehicles = await VehicleModel.find({ driverId: driver._id });
      
      // Update driver's vehicleIds array
      await DriverModel.findByIdAndUpdate(
        driver._id,
        { vehicleIds: driverVehicles.map(v => v._id) }
      );
      
      console.log(`✅ Updated ${driver.ownerRepresentativeName} with ${driverVehicles.length} vehicles`);
    }

    // Step 6: Final verification
    console.log('\n🔍 FINAL VERIFICATION...\n');
    
    const finalLguDrivers = await DriverModel.find({ 
      ownerRepresentativeName: { $regex: 'LGU.*LUPON', $options: 'i' } 
    }).populate('vehicleIds');

    console.log(`📊 Final LGU LUPON drivers (${finalLguDrivers.length}):`);
    finalLguDrivers.forEach((driver, index) => {
      console.log(`  ${index + 1}. ${driver.ownerRepresentativeName}`);
      console.log(`     - Vehicle Count: ${driver.vehicleIds.length}`);
      console.log(`     - Vehicles: ${driver.vehicleIds.map(v => v.plateNo).join(', ') || 'None'}`);
      console.log('');
    });

    // Check if vehicles are properly linked
    const finalLguVehicles = await VehicleModel.find({}).populate('driverId');
    const finalLinkedVehicles = finalLguVehicles.filter(v => 
      v.driverId && v.driverId.ownerRepresentativeName && 
      v.driverId.ownerRepresentativeName.toLowerCase().includes('lgu') &&
      v.driverId.ownerRepresentativeName.toLowerCase().includes('lupon')
    );

    console.log(`🚗 Final LGU LUPON vehicles (${finalLinkedVehicles.length}):`);
    finalLinkedVehicles.forEach((vehicle, index) => {
      console.log(`  ${index + 1}. ${vehicle.plateNo} -> ${vehicle.driverId.ownerRepresentativeName}`);
    });

    console.log('\n✅ LGU LUPON issues fixed!');
    console.log('\n📋 SUMMARY:');
    console.log(`  - Drivers: ${finalLguDrivers.length}`);
    console.log(`  - Vehicles: ${finalLinkedVehicles.length}`);
    console.log(`  - Total vehicle-driver relationships: ${finalLguDrivers.reduce((sum, d) => sum + d.vehicleIds.length, 0)}`);

  } catch (error) {
    console.error('❌ Error fixing LGU LUPON issues:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

// Run the fix
fixLguLuponIssues();
