import DriverModel from "../model/DriverModel.js";
import VehicleModel from "../model/VehicleModel.js";

/**
 * Check if a driver's renewal date has passed and update status accordingly
 * @param {Date} renewalDate - The driver's renewal date
 * @returns {string} - "0" for expired, "1" for active
 */
export const checkDriverExpirationStatus = (renewalDate) => {
  const currentDate = new Date();
  const renewalDateObj = new Date(renewalDate);
  
  // Reset time to compare only dates
  currentDate.setHours(0, 0, 0, 0);
  renewalDateObj.setHours(0, 0, 0, 0);
  
  const isExpired = renewalDateObj < currentDate;
  console.log(`Driver expiration check: ${renewalDateObj.toDateString()} vs ${currentDate.toDateString()} = ${isExpired ? 'EXPIRED' : 'ACTIVE'}`);
  
  return isExpired ? "0" : "1"; // "0" = expired, "1" = active
};

/**
 * Update driver status based on renewal date
 * @param {string} driverId - The driver ID
 * @param {Date} renewalDate - The new renewal date
 * @returns {Promise<Object>} - Updated driver object
 */
export const updateDriverStatusByExpiration = async (driverId, renewalDate) => {
  try {
    const newStatus = checkDriverExpirationStatus(renewalDate);
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
    // Find driver by plate number
    const driver = await DriverModel.findOne({ plateNo });
    
    if (!driver) {
      console.log(`No driver found with plate number ${plateNo}`);
      return null;
    }
    
    const newStatus = checkDriverExpirationStatus(renewalDate);
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
 * This can be called periodically or manually
 */
export const checkAllDriversExpiration = async () => {
  try {
    const drivers = await DriverModel.find();
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    let updatedCount = 0;
    
    for (const driver of drivers) {
      // Get renewal date from vehicle using plate number
      const vehicle = await VehicleModel.findOne({ plateNo: driver.plateNo });
      
      if (!vehicle || !vehicle.dateOfRenewal) {
        console.log(`No vehicle or renewal date found for driver ${driver._id} with plate ${driver.plateNo}`);
        continue;
      }
      
      const renewalDate = new Date(vehicle.dateOfRenewal);
      renewalDate.setHours(0, 0, 0, 0);
      
      const shouldBeExpired = renewalDate < currentDate;
      const isCurrentlyExpired = driver.status === "0";
      
      // Update status if it doesn't match the renewal date
      if (shouldBeExpired !== isCurrentlyExpired) {
        await DriverModel.findByIdAndUpdate(
          driver._id,
          { status: shouldBeExpired ? "0" : "1" }
        );
        updatedCount++;
        console.log(`Updated driver ${driver._id} status to: ${shouldBeExpired ? "EXPIRED" : "ACTIVE"} based on vehicle renewal date ${renewalDate.toDateString()}`);
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
