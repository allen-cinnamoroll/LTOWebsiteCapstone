import mongoose from 'mongoose';
import VehicleModel from './model/VehicleModel.js';
import dotenv from 'dotenv';

dotenv.config();

async function testVehicleSchema() {
  try {
    // Connect to database using the same config as the main app
    const { NODE_ENV, DATABASE, DATABASE_LOCAL, DB_PASSWORD } = process.env;
    
    if (!NODE_ENV || (!DATABASE_LOCAL && !DATABASE)) {
      console.error("Missing required environment variables for database connection.");
      process.exit(1);
    }

    const DB_URI = NODE_ENV === "production" 
      ? DATABASE.replace("<PASSWORD>", DB_PASSWORD)
      : DATABASE_LOCAL;
    
    await mongoose.connect(DB_URI);
    console.log('Connected to MongoDB');

    // Test data with vehicleStatusType
    const testData = {
      fileNo: 'TEST-001',
      plateNo: 'TEST123',
      engineNo: 'ENGINE123',
      serialChassisNumber: 'CHASSIS123',
      make: 'TEST',
      bodyType: 'TEST',
      color: 'TEST',
      classification: 'Private',
      dateOfRenewal: new Date(),
      vehicleStatusType: 'New',
      status: '1',
      driver: null
    };

    console.log('Test data:', testData);
    console.log('vehicleStatusType in test data:', testData.vehicleStatusType);

    // Create a test vehicle
    const vehicle = await VehicleModel.create(testData);
    console.log('Vehicle created successfully:', vehicle);
    console.log('vehicleStatusType in created vehicle:', vehicle.vehicleStatusType);

    // Query the database directly
    const savedVehicle = await VehicleModel.findById(vehicle._id);
    console.log('VehicleStatusType from database query:', savedVehicle?.vehicleStatusType);

    // Clean up - delete the test vehicle
    await VehicleModel.findByIdAndDelete(vehicle._id);
    console.log('Test vehicle deleted');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testVehicleSchema();
