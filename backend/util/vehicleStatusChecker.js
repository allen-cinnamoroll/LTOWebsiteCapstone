import VehicleModel from "../model/VehicleModel.js";

/**
 * Check if a vehicle's expiration date has passed and update status accordingly
 * @param {Date} expirationDate - The vehicle's expiration date
 * @returns {string} - "0" for expired, "1" for active
 */
export const checkVehicleExpirationStatus = (expirationDate) => {
  const currentDate = new Date();
  const expDate = new Date(expirationDate);
  
  // Reset time to compare only dates
  currentDate.setHours(0, 0, 0, 0);
  expDate.setHours(0, 0, 0, 0);
  
  const isExpired = expDate < currentDate;
  console.log(`Vehicle expiration check: ${expDate.toDateString()} vs ${currentDate.toDateString()} = ${isExpired ? 'EXPIRED' : 'ACTIVE'}`);
  
  return isExpired ? "0" : "1"; // "0" = expired, "1" = active
};

/**
 * Update vehicle status based on expiration date
 * @param {string} vehicleId - The vehicle ID
 * @param {Date} expirationDate - The new expiration date
 * @returns {Promise<Object>} - Updated vehicle object
 */
export const updateVehicleStatusByExpiration = async (vehicleId, expirationDate) => {
  try {
    const newStatus = checkVehicleExpirationStatus(expirationDate);
    console.log(`Updating vehicle ${vehicleId} status to: ${newStatus === "0" ? "EXPIRED" : "ACTIVE"}`);
    
    const updatedVehicle = await VehicleModel.findByIdAndUpdate(
      vehicleId,
      { 
        status: newStatus,
        expirationDate: expirationDate 
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
 * Check and update all vehicles' status based on their expiration dates
 * This can be called periodically or manually
 */
export const checkAllVehiclesExpiration = async () => {
  try {
    const vehicles = await VehicleModel.find();
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    let updatedCount = 0;
    
    for (const vehicle of vehicles) {
      const expDate = new Date(vehicle.expirationDate);
      expDate.setHours(0, 0, 0, 0);
      
      const shouldBeExpired = expDate < currentDate;
      const isCurrentlyExpired = vehicle.status === "0";
      
      // Update status if it doesn't match the expiration date
      if (shouldBeExpired !== isCurrentlyExpired) {
        await VehicleModel.findByIdAndUpdate(
          vehicle._id,
          { status: shouldBeExpired ? "0" : "1" }
        );
        updatedCount++;
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
