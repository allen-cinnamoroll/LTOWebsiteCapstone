import { checkAllVehiclesExpiration } from "./vehicleStatusChecker.js";
import { 
  resetAllUsersOTPStatus, 
  isMonday, 
  getMillisecondsUntilNextMonday 
} from "./otpResetScheduler.js";

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
 * Schedule weekly OTP reset every Monday at 12:00 AM
 * Resets isOtpVerified to false for all admin and employee users
 */
export const scheduleWeeklyOTPReset = () => {
  const runOTPReset = async () => {
    try {
      console.log("Running scheduled weekly OTP reset...");
      const result = await resetAllUsersOTPStatus();
      console.log(`Weekly OTP reset completed: ${result.message}`);
      
      // Schedule next OTP reset for next Monday
      scheduleNextOTPReset();
    } catch (error) {
      console.error("Error in scheduled weekly OTP reset:", error);
      // Still schedule next reset even if current one failed
      scheduleNextOTPReset();
    }
  };

  const scheduleNextOTPReset = () => {
    const msUntilNextMonday = getMillisecondsUntilNextMonday();
    console.log(`Next OTP reset scheduled for: ${new Date(Date.now() + msUntilNextMonday).toLocaleString()}`);
    
    setTimeout(() => {
      runOTPReset();
    }, msUntilNextMonday);
  };

  // Check if today is Monday, if so run immediately, otherwise schedule for next Monday
  if (isMonday()) {
    console.log("Today is Monday, running OTP reset immediately...");
    runOTPReset();
  } else {
    console.log("Scheduling OTP reset for next Monday...");
    scheduleNextOTPReset();
  }

  console.log("Weekly OTP reset scheduler started");
};

/**
 * Run OTP reset immediately
 * Useful for testing or manual triggers
 */
export const runOTPReset = async () => {
  try {
    console.log("Running immediate OTP reset...");
    const result = await resetAllUsersOTPStatus();
    console.log(`Immediate OTP reset completed: ${result.message}`);
    return result;
  } catch (error) {
    console.error("Error in immediate OTP reset:", error);
    throw error;
  }
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
