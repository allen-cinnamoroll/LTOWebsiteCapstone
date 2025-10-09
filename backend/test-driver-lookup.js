/**
 * Test script to verify driver lookup by ID
 */

import mongoose from 'mongoose';
import DriverModel from './model/DriverModel.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lto_database');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const testDriverLookup = async () => {
  try {
    console.log('Testing driver lookup...');
    
    // Test with the driverId from your JSON data
    const driverId = '68e2210789412bab0fdccc2e';
    console.log(`Looking for driver with ID: ${driverId}`);
    
    const driver = await DriverModel.findById(driverId);
    
    if (driver) {
      console.log('Driver found:', {
        _id: driver._id,
        ownerRepresentativeName: driver.ownerRepresentativeName,
        contactNumber: driver.contactNumber,
        emailAddress: driver.emailAddress,
        address: driver.address
      });
    } else {
      console.log('Driver not found');
    }
    
    // Also check if there are any drivers at all
    const allDrivers = await DriverModel.find({}).limit(5);
    console.log(`Total drivers in database: ${allDrivers.length}`);
    if (allDrivers.length > 0) {
      console.log('Sample driver:', {
        _id: allDrivers[0]._id,
        ownerRepresentativeName: allDrivers[0].ownerRepresentativeName
      });
    }
    
  } catch (error) {
    console.error('Error testing driver lookup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the test
connectDB().then(() => {
  testDriverLookup();
});


