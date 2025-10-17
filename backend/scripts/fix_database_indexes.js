import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const fixDatabaseIndexes = async (db) => {
  try {
    console.log('🔧 Fixing database indexes...');
    
    // Get the drivers collection
    const driversCollection = db.collection('drivers');
    
    // Drop the problematic index on driversLicenseNumber
    try {
      await driversCollection.dropIndex('driversLicenseNumber_1');
      console.log('✅ Dropped driversLicenseNumber_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  driversLicenseNumber_1 index does not exist');
      } else {
        console.log('⚠️  Error dropping driversLicenseNumber_1 index:', error.message);
      }
    }
    
    // Drop the problematic index on licenseNo
    try {
      await driversCollection.dropIndex('licenseNo_1');
      console.log('✅ Dropped licenseNo_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  licenseNo_1 index does not exist');
      } else {
        console.log('⚠️  Error dropping licenseNo_1 index:', error.message);
      }
    }
    
    // Get the vehicles collection
    const vehiclesCollection = db.collection('vehicles');
    
    // Drop the unique index on plateNo for vehicles
    try {
      await vehiclesCollection.dropIndex('plateNo_1');
      console.log('✅ Dropped plateNo_1 unique index from vehicles');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  plateNo_1 index does not exist on vehicles');
      } else {
        console.log('⚠️  Error dropping plateNo_1 index from vehicles:', error.message);
      }
    }
    
    // Drop the sparse unique index if it exists
    try {
      await driversCollection.dropIndex('driversLicenseNumber_sparse_unique');
      console.log('✅ Dropped driversLicenseNumber_sparse_unique index');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  driversLicenseNumber_sparse_unique index does not exist');
      } else {
        console.log('⚠️  Error dropping driversLicenseNumber_sparse_unique index:', error.message);
      }
    }
    
    // Create a regular (non-unique) index on driversLicenseNumber for performance
    try {
      await driversCollection.createIndex(
        { driversLicenseNumber: 1 }, 
        { 
          name: 'driversLicenseNumber_index',
          sparse: true
        }
      );
      console.log('✅ Created regular index on driversLicenseNumber (non-unique)');
    } catch (error) {
      console.log('⚠️  Error creating regular index:', error.message);
    }
    
    // Create performance indexes
    try {
      await vehiclesCollection.createIndex({ plateNo: 1 });
      console.log('✅ Created index on plateNo');
    } catch (error) {
      console.log('⚠️  Error creating plateNo index:', error.message);
    }
    
    try {
      await vehiclesCollection.createIndex({ driverId: 1 });
      console.log('✅ Created index on driverId');
    } catch (error) {
      console.log('⚠️  Error creating driverId index:', error.message);
    }
    
    console.log('✅ Database indexes fixed!');
  } catch (error) {
    console.error('Failed to fix database indexes:', error);
  }
};

const main = async () => {
  try {
    // Connect to MongoDB using the same environment variables as other scripts
    const { NODE_ENV, DATABASE } = process.env;
    
    if (!DATABASE) {
      console.error("Missing required environment variables for database connection.");
      console.error("Please ensure DATABASE is set in your .env file.");
      process.exit(1);
    }

    // Use the database connection string directly from .env
    const DB_URI = DATABASE;

    console.log('Connecting to MongoDB...');
    await mongoose.connect(DB_URI);
    console.log(`✅ Connected to MongoDB (${NODE_ENV || 'production'} environment)`);

    // Fix database indexes
    const db = mongoose.connection.db;
    await fixDatabaseIndexes(db);

    console.log('✅ Database indexes setup completed!');

  } catch (error) {
    console.error('❌ Failed to fix database indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run if this file is executed directly
main();