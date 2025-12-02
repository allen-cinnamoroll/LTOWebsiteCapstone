import { checkAllVehiclesExpiration } from "./vehicleStatusChecker.js";
import { 
  resetAllUsersOTPStatus, 
  isWeekday, 
  getMillisecondsUntilNextWeekdayAt6AM 
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
 * Schedule daily OTP reset every weekday at 6:00 AM
 * Resets isOtpVerified to false for all users (including superadmin)
 * Skips weekends (Saturday and Sunday)
 */
export const scheduleDailyOTPReset = () => {
  const runOTPReset = async () => {
    try {
      console.log("Running scheduled daily OTP reset...");
      const result = await resetAllUsersOTPStatus();
      console.log(`Daily OTP reset completed: ${result.message}`);
      
      // Schedule next OTP reset for next weekday at 6:00 AM
      scheduleNextOTPReset();
    } catch (error) {
      console.error("Error in scheduled daily OTP reset:", error);
      // Still schedule next reset even if current one failed
      scheduleNextOTPReset();
    }
  };

  const scheduleNextOTPReset = () => {
    const msUntilNextWeekday = getMillisecondsUntilNextWeekdayAt6AM();
    const nextResetDate = new Date(Date.now() + msUntilNextWeekday);
    console.log(`Next OTP reset scheduled for: ${nextResetDate.toLocaleString()}`);
    
    setTimeout(() => {
      runOTPReset();
    }, msUntilNextWeekday);
  };

  // Check if today is a weekday and it's before 6:00 AM
  const now = new Date();
  const todayAt6AM = new Date(now);
  todayAt6AM.setHours(6, 0, 0, 0);
  
  if (isWeekday() && now < todayAt6AM) {
    // Today is a weekday and it's before 6:00 AM, schedule for today at 6:00 AM
    const msUntil6AM = todayAt6AM.getTime() - now.getTime();
    console.log(`Today is a weekday before 6:00 AM, scheduling OTP reset for today at 6:00 AM...`);
    setTimeout(() => {
      runOTPReset();
    }, msUntil6AM);
  } else {
    // Schedule for next weekday at 6:00 AM
    console.log("Scheduling OTP reset for next weekday at 6:00 AM...");
    scheduleNextOTPReset();
  }

  console.log("Daily OTP reset scheduler started (weekdays at 6:00 AM)");
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
