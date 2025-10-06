import VehicleModel from "../model/VehicleModel.js";
import { getVehicleStatus } from "./plateStatusCalculator.js";

/**
 * Check if a vehicle's status based on plate number logic
 * @param {string} plateNo - The vehicle's plate number
 * @param {string} vehicleStatusType - The vehicle status type ("New" or "Old")
 * @returns {string} - "0" for expired, "1" for active
 */
export const checkVehicleExpirationStatus = (plateNo, vehicleStatusType = "Old") => {
  return getVehicleStatus(plateNo, null, vehicleStatusType);
};

/**
 * Update vehicle status based on plate number logic
 * @param {string} vehicleId - The vehicle ID
 * @param {string} plateNo - The vehicle's plate number
 * @param {string} vehicleStatusType - The vehicle status type ("New" or "Old")
 * @returns {Promise<Object>} - Updated vehicle object
 */
export const updateVehicleStatusByExpiration = async (vehicleId, plateNo, vehicleStatusType = "Old") => {
  try {
    const newStatus = checkVehicleExpirationStatus(plateNo, vehicleStatusType);
    console.log(`Updating vehicle ${vehicleId} (${plateNo}) status to: ${newStatus === "0" ? "EXPIRED" : "ACTIVE"}`);
    
    const updatedVehicle = await VehicleModel.findByIdAndUpdate(
      vehicleId,
      { status: newStatus },
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
 * Check and update all vehicles' status based on plate number logic
 * This can be called periodically or manually
 */
export const checkAllVehiclesExpiration = async () => {
  try {
    const vehicles = await VehicleModel.find();
    let updatedCount = 0;
    
    for (const vehicle of vehicles) {
      // Skip vehicles without plate number
      if (!vehicle.plateNo) {
        console.log(`Skipping vehicle ${vehicle._id} - no plate number`);
        continue;
      }
      
      // Calculate correct status based on plate number and vehicle status type
      const correctStatus = getVehicleStatus(vehicle.plateNo, null, vehicle.vehicleStatusType || "Old");
      const currentStatus = vehicle.status;
      
      // Update status if it doesn't match the plate-based calculation
      if (correctStatus !== currentStatus) {
        await VehicleModel.findByIdAndUpdate(
          vehicle._id,
          { status: correctStatus }
        );
        updatedCount++;
        console.log(`Updated vehicle ${vehicle._id} (${vehicle.plateNo}) status from ${currentStatus} to ${correctStatus} (${correctStatus === "0" ? "EXPIRED" : "ACTIVE"})`);
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
