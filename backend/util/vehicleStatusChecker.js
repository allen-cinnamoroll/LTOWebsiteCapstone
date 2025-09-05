import VehicleModel from "../model/VehicleModel.js";

/**
 * Check if a vehicle's renewal date has passed and update status accordingly
 * @param {Date} renewalDate - The vehicle's renewal date
 * @returns {string} - "0" for expired, "1" for active
 */
export const checkVehicleExpirationStatus = (renewalDate) => {
  const currentDate = new Date();
  const renewalDateObj = new Date(renewalDate);
  
  // Reset time to compare only dates
  currentDate.setHours(0, 0, 0, 0);
  renewalDateObj.setHours(0, 0, 0, 0);
  
  const isExpired = renewalDateObj < currentDate;
  console.log(`Vehicle expiration check: ${renewalDateObj.toDateString()} vs ${currentDate.toDateString()} = ${isExpired ? 'EXPIRED' : 'ACTIVE'}`);
  
  return isExpired ? "0" : "1"; // "0" = expired, "1" = active
};

/**
 * Update vehicle status based on renewal date
 * @param {string} vehicleId - The vehicle ID
 * @param {Date} renewalDate - The new renewal date
 * @returns {Promise<Object>} - Updated vehicle object
 */
export const updateVehicleStatusByExpiration = async (vehicleId, renewalDate) => {
  try {
    const newStatus = checkVehicleExpirationStatus(renewalDate);
    console.log(`Updating vehicle ${vehicleId} status to: ${newStatus === "0" ? "EXPIRED" : "ACTIVE"}`);
    
    const updatedVehicle = await VehicleModel.findByIdAndUpdate(
      vehicleId,
      { 
        status: newStatus,
        dateOfRenewal: renewalDate 
      },
      { new: true }
    );
    
    console.log(`Vehicle ${vehicleId} status updated successfully`);
    return updatedVehicle;
  } catch (error) {
    console.error(`Error updating vehicle ${vehicleId} status:`, error);
    throw new Error(`Failed to update vehicle status: ${error.message}`);
  }
};

/**
 * Check and update all vehicles' status based on their renewal dates
 * This can be called periodically or manually
 */
export const checkAllVehiclesExpiration = async () => {
  try {
    const vehicles = await VehicleModel.find();
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    let updatedCount = 0;
    
    for (const vehicle of vehicles) {
      // Skip vehicles without renewal date
      if (!vehicle.dateOfRenewal) {
        continue;
      }
      
      const renewalDate = new Date(vehicle.dateOfRenewal);
      renewalDate.setHours(0, 0, 0, 0);
      
      const shouldBeExpired = renewalDate < currentDate;
      const isCurrentlyExpired = vehicle.status === "0";
      
      // Update status if it doesn't match the renewal date
      if (shouldBeExpired !== isCurrentlyExpired) {
        await VehicleModel.findByIdAndUpdate(
          vehicle._id,
          { status: shouldBeExpired ? "0" : "1" }
        );
        updatedCount++;
        console.log(`Updated vehicle ${vehicle._id} status to: ${shouldBeExpired ? "EXPIRED" : "ACTIVE"}`);
      }
    }
    
    return {
      success: true,
      message: `Updated ${updatedCount} vehicles' status`,
      updatedCount
    };
  } catch (error) {
    throw new Error(`Failed to check vehicles expiration: ${error.message}`);
  }
};
