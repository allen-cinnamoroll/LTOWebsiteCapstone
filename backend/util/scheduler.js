import { checkAllVehiclesExpiration } from "./vehicleStatusChecker.js";

/**
 * Schedule daily vehicle expiration check
 * Runs every day at 12:00 AM
 */
export const scheduleVehicleExpirationCheck = () => {
  // Check every hour for development/testing
  // In production, you might want to run this once daily
  const checkInterval = 60 * 60 * 1000; // 1 hour in milliseconds
  
  setInterval(async () => {
    try {
      console.log("Running scheduled vehicle expiration check...");
      const result = await checkAllVehiclesExpiration();
      console.log(`Scheduled check completed: ${result.message}`);
    } catch (error) {
      console.error("Error in scheduled vehicle expiration check:", error);
    }
  }, checkInterval);
  
  console.log("Vehicle expiration scheduler started");
};

/**
 * Run vehicle expiration check immediately
 * Useful for testing or manual triggers
 */
export const runVehicleExpirationCheck = async () => {
  try {
    console.log("Running immediate vehicle expiration check...");
    const result = await checkAllVehiclesExpiration();
    console.log(`Immediate check completed: ${result.message}`);
    return result;
  } catch (error) {
    console.error("Error in immediate vehicle expiration check:", error);
    throw error;
  }
};
