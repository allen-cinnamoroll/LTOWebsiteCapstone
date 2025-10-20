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

const showMultipleVehicles = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(DB_URI);
    console.log(`✅ Connected to MongoDB (${NODE_ENV} environment)`);

    console.log('🔍 Finding drivers with multiple vehicles...');
    
    // Find drivers with more than 1 vehicle
    const driversWithMultipleVehicles = await DriverModel.find({
      vehicleIds: { $exists: true, $not: { $size: 0 } }
    }).populate('vehicleIds');

    // Filter to only those with multiple vehicles
    const multipleVehicleDrivers = driversWithMultipleVehicles.filter(
      driver => driver.vehicleIds && driver.vehicleIds.length > 1
    );

    console.log(`\n📊 Found ${multipleVehicleDrivers.length} drivers with multiple vehicles:\n`);

    // Display each driver with their vehicles
    multipleVehicleDrivers.forEach((driver, index) => {
      console.log(`${index + 1}. ${driver.ownerRepresentativeName}`);
      console.log(`   Driver ID: ${driver._id}`);
      console.log(`   Total Vehicles: ${driver.vehicleIds.length}`);
      console.log(`   Address: ${driver.address?.province || 'N/A'}, ${driver.address?.municipality || 'N/A'}, ${driver.address?.barangay || 'N/A'}`);
      console.log(`   Contact: ${driver.contactNumber || 'N/A'}`);
      console.log(`   License: ${driver.hasDriversLicense ? driver.driversLicenseNumber || 'Yes' : 'No'}`);
      console.log(`   Vehicles:`);
      
      driver.vehicleIds.forEach((vehicle, vehicleIndex) => {
        console.log(`     ${vehicleIndex + 1}. Plate: ${vehicle.plateNo || 'N/A'}`);
        console.log(`        File No: ${vehicle.fileNo || 'N/A'}`);
        console.log(`        Make: ${vehicle.make || 'N/A'}`);
        console.log(`        Body Type: ${vehicle.bodyType || 'N/A'}`);
        console.log(`        Color: ${vehicle.color || 'N/A'}`);
        console.log(`        Classification: ${vehicle.classification || 'N/A'}`);
        console.log(`        Status: ${vehicle.status || 'N/A'}`);
        console.log(`        Date of Renewal: ${vehicle.dateOfRenewal ? new Date(vehicle.dateOfRenewal).toLocaleDateString() : 'N/A'}`);
        console.log(`        Vehicle ID: ${vehicle._id}`);
        console.log('');
      });
      
      console.log('   ' + '─'.repeat(80));
      console.log('');
    });

    // Summary statistics
    console.log('\n📈 Summary Statistics:');
    console.log(`   👥 Total drivers with multiple vehicles: ${multipleVehicleDrivers.length}`);
    
    const totalVehicles = multipleVehicleDrivers.reduce((sum, driver) => sum + driver.vehicleIds.length, 0);
    console.log(`   🚗 Total vehicles owned by these drivers: ${totalVehicles}`);
    
    const averageVehicles = (totalVehicles / multipleVehicleDrivers.length).toFixed(2);
    console.log(`   📊 Average vehicles per driver: ${averageVehicles}`);
    
    // Find the driver with the most vehicles
    const maxVehicles = Math.max(...multipleVehicleDrivers.map(driver => driver.vehicleIds.length));
    const driverWithMostVehicles = multipleVehicleDrivers.find(driver => driver.vehicleIds.length === maxVehicles);
    
    if (driverWithMostVehicles) {
      console.log(`   🏆 Driver with most vehicles: ${driverWithMostVehicles.ownerRepresentativeName} (${maxVehicles} vehicles)`);
    }

    // Show vehicle distribution
    console.log('\n📊 Vehicle Distribution:');
    const vehicleCounts = {};
    multipleVehicleDrivers.forEach(driver => {
      const count = driver.vehicleIds.length;
      vehicleCounts[count] = (vehicleCounts[count] || 0) + 1;
    });
    
    Object.keys(vehicleCounts).sort((a, b) => parseInt(a) - parseInt(b)).forEach(count => {
      console.log(`   ${count} vehicles: ${vehicleCounts[count]} drivers`);
    });

  } catch (error) {
    console.error('❌ Error showing multiple vehicles:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the script
showMultipleVehicles();
