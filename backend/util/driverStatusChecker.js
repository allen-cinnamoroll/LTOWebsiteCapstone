import DriverModel from "../model/DriverModel.js";
import VehicleModel from "../model/VehicleModel.js";
import { getVehicleStatus, getExpirationInfo } from "./plateStatusCalculator.js";

/**
 * Check if a driver's renewal date has passed and update status accordingly
 * Uses plate-based calculation for consistency with vehicle status
 * @param {string} plateNo - The plate number
 * @param {Date} renewalDate - The driver's renewal date
 * @returns {string} - "0" for expired, "1" for active
 */
export const checkDriverExpirationStatus = (plateNo, renewalDate) => {
  // Use plate-based status calculation for consistency with vehicle status
  const status = getVehicleStatus(plateNo, renewalDate);
  console.log(`Driver expiration check for plate ${plateNo}: ${renewalDate ? new Date(renewalDate).toDateString() : 'No date'} = ${status === "0" ? 'EXPIRED' : 'ACTIVE'}`);
  
  return status; // "0" = expired, "1" = active
};

/**
 * Update driver status based on renewal date
 * @param {string} driverId - The driver ID
 * @param {string} plateNo - The plate number
 * @param {Date} renewalDate - The new renewal date
 * @returns {Promise<Object>} - Updated driver object
 */
export const updateDriverStatusByExpiration = async (driverId, plateNo, renewalDate) => {
  try {
    const newStatus = checkDriverExpirationStatus(plateNo, renewalDate);
    console.log(`Updating driver ${driverId} status to: ${newStatus === "0" ? "EXPIRED" : "ACTIVE"}`);
    
    const updatedDriver = await DriverModel.findByIdAndUpdate(
      driverId,
      { 
        status: newStatus,
        dateOfRenewal: renewalDate 
      },
      { new: true }
    );
    
    console.log(`Driver ${driverId} status updated successfully`);
    return updatedDriver;
  } catch (error) {
    console.error(`Error updating driver ${driverId} status:`, error);
    throw new Error(`Failed to update driver status: ${error.message}`);
  }
};

/**
 * Update driver status when vehicle renewal date changes
 * @param {string} plateNo - The plate number to find related driver
 * @param {Date} renewalDate - The new renewal date from vehicle
 */
export const updateDriverStatusByVehicleRenewal = async (plateNo, renewalDate) => {
  try {
    // Find driver by plate number (handle array format)
    const driver = await DriverModel.findOne({ plateNo: { $in: [plateNo] } });
    
    if (!driver) {
      console.log(`No driver found with plate number ${plateNo}`);
      return null;
    }
    
    const newStatus = checkDriverExpirationStatus(plateNo, renewalDate);
    console.log(`Updating driver ${driver._id} status to: ${newStatus === "0" ? "EXPIRED" : "ACTIVE"} based on vehicle renewal date`);
    
    const updatedDriver = await DriverModel.findByIdAndUpdate(
      driver._id,
      { status: newStatus },
      { new: true }
    );
    
    console.log(`Driver ${driver._id} status updated successfully`);
    return updatedDriver;
  } catch (error) {
    console.error(`Error updating driver status for plate ${plateNo}:`, error);
    throw new Error(`Failed to update driver status: ${error.message}`);
  }
};

/**
 * Check and update all drivers' status based on their renewal dates
 * Uses plate-based calculation for consistency with vehicle status
 * This can be called periodically or manually
 */
export const checkAllDriversExpiration = async () => {
  try {
    const drivers = await DriverModel.find();
    
    let updatedCount = 0;
    
    for (const driver of drivers) {
      // Get renewal date from vehicle using plate number
      // Handle both array and string plateNo formats for drivers
      const driverPlates = Array.isArray(driver.plateNo) ? driver.plateNo : 
                          (driver.plateNo ? driver.plateNo.split(',').map(p => p.trim()) : []);
      
      let vehicle = null;
      for (const plate of driverPlates) {
        vehicle = await VehicleModel.findOne({ plateNo: plate });
        if (vehicle) break;
      }
      
      if (!vehicle || !vehicle.dateOfRenewal) {
        console.log(`No vehicle or renewal date found for driver ${driver._id} with plate ${driver.plateNo}`);
        continue;
      }
      
      // Use plate-based status calculation for consistency
      const firstPlate = driverPlates[0];
      const correctStatus = getVehicleStatus(firstPlate, vehicle.dateOfRenewal);
      const currentStatus = driver.status;
      
      // Update status if it doesn't match the plate-based calculation
      if (correctStatus !== currentStatus) {
        await DriverModel.findByIdAndUpdate(
          driver._id,
          { status: correctStatus }
        );
        updatedCount++;
        console.log(`Updated driver ${driver._id} status to: ${correctStatus === "0" ? "EXPIRED" : "ACTIVE"} based on plate-based calculation for plate ${firstPlate}`);
      }
    }
    
    return {
      success: true,
      message: `Updated ${updatedCount} drivers' status`,
      updatedCount
    };
  } catch (error) {
    throw new Error(`Failed to check drivers expiration: ${error.message}`);
  }
};
