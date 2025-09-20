import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const fixDatabaseIndexes = async () => {
  try {
    // Connect to MongoDB
    const { NODE_ENV, DATABASE, DATABASE_LOCAL, DB_PASSWORD } = process.env;
    
    if (!NODE_ENV || (!DATABASE_LOCAL && !DATABASE)) {
      console.error("Missing required environment variables for database connection.");
      process.exit(1);
    }

    const DB_URI = NODE_ENV === "production" 
      ? DATABASE.replace("<PASSWORD>", DB_PASSWORD)
      : DATABASE_LOCAL;

    await mongoose.connect(DB_URI);
    console.log(`Connected to MongoDB (${NODE_ENV} environment)`);

    const db = mongoose.connection.db;
    
    // Get the drivers collection
    const driversCollection = db.collection('drivers');
    
    // List all indexes
    console.log('Current indexes on drivers collection:');
    const indexes = await driversCollection.indexes();
    indexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
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
          name: 'driversLicenseNumber_index'
        }
      );
      console.log('✅ Created regular index on driversLicenseNumber (non-unique)');
    } catch (error) {
      console.log('⚠️  Error creating regular index:', error.message);
    }
    
    // List indexes again to confirm
    console.log('\nUpdated indexes on drivers collection:');
    const updatedIndexes = await driversCollection.indexes();
    updatedIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('\n✅ Database indexes fixed!');
    console.log('Now you can run the import script without duplicate key errors.');

  } catch (error) {
    console.error('Failed to fix database indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1] && process.argv[1].endsWith('fix_database_indexes.js');

if (isMainModule) {
  fixDatabaseIndexes();
}

export default fixDatabaseIndexes;
