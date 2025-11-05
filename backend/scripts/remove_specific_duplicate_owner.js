import mongoose from 'mongoose';
import DriverModel from '../model/DriverModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { DATABASE } = process.env;

if (!DATABASE) {
  console.error("Missing required environment variables for database connection.");
  process.exit(1);
}

const removeSpecificDuplicate = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(DATABASE);
    console.log('✅ Connected to MongoDB');

    // Find the specific owner with 0 vehicles
    const ownerToDelete = await DriverModel.findOne({
      ownerRepresentativeName: "MOB RURAL KONSRA K INCORPO RATED",
      $expr: { $eq: [{ $size: { $ifNull: ["$vehicleIds", []] } }, 0] }
    });

    if (ownerToDelete) {
      console.log(`\n🗑️  Found owner to delete: ${ownerToDelete.ownerRepresentativeName}`);
      console.log(`   ID: ${ownerToDelete._id}`);
      console.log(`   Vehicles: ${ownerToDelete.vehicleIds?.length || 0}`);

      // Delete the owner
      await DriverModel.findByIdAndDelete(ownerToDelete._id);
      console.log(`\n✅ Successfully deleted duplicate owner with 0 vehicles`);
    } else {
      console.log('\n⚠️  Owner not found or already deleted');
    }

    // Verify the other owner still exists
    const remainingOwner = await DriverModel.findOne({
      ownerRepresentativeName: "MOB RURAL KONSTRAK INCORPORATED"
    });

    if (remainingOwner) {
      console.log(`\n✅ Remaining owner found: ${remainingOwner.ownerRepresentativeName}`);
      console.log(`   ID: ${remainingOwner._id}`);
      console.log(`   Vehicles: ${remainingOwner.vehicleIds?.length || 0}`);
    }

  } catch (error) {
    console.error('❌ Error removing duplicate owner:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

// Run the script
removeSpecificDuplicate();

