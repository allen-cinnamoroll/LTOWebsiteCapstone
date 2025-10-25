import mongoose from 'mongoose';
import DriverModel from '../model/DriverModel.js';
import VehicleModel from '../model/VehicleModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { NODE_ENV, DATABASE } = process.env;

if (!DATABASE) {
  console.error("Missing required environment variables for database connection.");
  process.exit(1);
}

const DB_URI = DATABASE;

const fixDuplicateDrivers = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(DB_URI);
    console.log(`✅ Connected to MongoDB (${NODE_ENV} environment)`);

    console.log('🔍 Finding duplicate drivers...');
    
    // Find drivers with the same ownerRepresentativeName
    const duplicateGroups = await DriverModel.aggregate([
      {
        $group: {
          _id: '$ownerRepresentativeName',
          drivers: { $push: '$$ROOT' },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    console.log(`📊 Found ${duplicateGroups.length} groups of duplicate drivers`);

    let totalMerged = 0;
    let totalVehiclesMoved = 0;

    for (const group of duplicateGroups) {
      const drivers = group.drivers;
      console.log(`\n🔄 Processing duplicates for: "${group._id}"`);
      console.log(`   Found ${drivers.length} duplicate entries`);

      // Sort drivers by number of vehicles (descending) to keep the one with most vehicles
      drivers.sort((a, b) => (b.vehicleIds?.length || 0) - (a.vehicleIds?.length || 0));
      
      const primaryDriver = drivers[0]; // Keep this one
      const duplicateDrivers = drivers.slice(1); // Remove these

      console.log(`   Primary driver: ${primaryDriver._id} (${primaryDriver.vehicleIds?.length || 0} vehicles)`);
      console.log(`   Duplicate drivers: ${duplicateDrivers.map(d => `${d._id} (${d.vehicleIds?.length || 0} vehicles)`).join(', ')}`);

      // Collect all vehicle IDs from all drivers
      const allVehicleIds = [...new Set([
        ...(primaryDriver.vehicleIds || []),
        ...duplicateDrivers.flatMap(d => d.vehicleIds || [])
      ])];

      // Update the primary driver with all vehicles
      await DriverModel.findByIdAndUpdate(primaryDriver._id, {
        vehicleIds: allVehicleIds
      });

      // Update all vehicles to point to the primary driver
      for (const vehicleId of allVehicleIds) {
        await VehicleModel.findByIdAndUpdate(vehicleId, {
          driverId: primaryDriver._id
        });
      }

      // Delete duplicate drivers
      const duplicateIds = duplicateDrivers.map(d => d._id);
      await DriverModel.deleteMany({ _id: { $in: duplicateIds } });

      const vehiclesMoved = allVehicleIds.length - (primaryDriver.vehicleIds?.length || 0);
      totalVehiclesMoved += vehiclesMoved;
      totalMerged += duplicateDrivers.length;

      console.log(`   ✅ Merged ${duplicateDrivers.length} duplicate drivers`);
      console.log(`   ✅ Moved ${vehiclesMoved} vehicles to primary driver`);
      console.log(`   ✅ Primary driver now has ${allVehicleIds.length} vehicles`);
    }

    console.log(`\n🎉 Duplicate driver cleanup completed!`);
    console.log(`   📊 Total duplicate drivers removed: ${totalMerged}`);
    console.log(`   🚗 Total vehicles consolidated: ${totalVehiclesMoved}`);

    // Verify the results
    console.log('\n🔍 Verifying results...');
    const finalDuplicateCount = await DriverModel.aggregate([
      {
        $group: {
          _id: '$ownerRepresentativeName',
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    if (finalDuplicateCount.length === 0) {
      console.log('✅ No more duplicate drivers found!');
    } else {
      console.log(`⚠️  Still found ${finalDuplicateCount.length} groups of duplicates`);
    }

    // Show final driver count
    const totalDrivers = await DriverModel.countDocuments();
    const totalVehicles = await VehicleModel.countDocuments();
    console.log(`\n📊 Final counts:`);
    console.log(`   👥 Total drivers: ${totalDrivers}`);
    console.log(`   🚗 Total vehicles: ${totalVehicles}`);

  } catch (error) {
    console.error('❌ Error fixing duplicate drivers:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the script
fixDuplicateDrivers();



