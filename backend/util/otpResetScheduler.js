import UserModel from "../model/UserModel.js";
import { logUserActivity } from "./userLogger.js";

/**
 * Reset OTP verification status for all users daily at 6:00 AM (weekdays only)
 * This ensures users need to verify OTP daily for security
 * Includes superadmin, admin, and employee roles
 */
export const resetAllUsersOTPStatus = async () => {
  try {
    console.log("Starting daily OTP reset for all users...");
    
    // Find all users with isOtpVerified: true (including superadmin)
    const usersToReset = await UserModel.find({ 
      isOtpVerified: true
      // No role filter - includes all roles: "0" (superadmin), "1" (admin), "2" (employee)
    });

    if (usersToReset.length === 0) {
      console.log("No users found with OTP verification status to reset");
      return {
        success: true,
        message: "No users found with OTP verification status to reset",
        resetCount: 0
      };
    }

    // Reset isOtpVerified to false for all found users (including superadmin)
    const updateResult = await UserModel.updateMany(
      { 
        isOtpVerified: true
        // No role filter - includes all roles
      },
      { 
        $set: { 
          isOtpVerified: false,
          otp: undefined,
          otpExpiresAt: undefined
        }
      }
    );

    // Log the activity for each affected user
    for (const user of usersToReset) {
      try {
        await logUserActivity({
          userId: user._id,
          logType: "otp_reset",
          ipAddress: "system",
          status: "success",
          details: "OTP verification status reset due to daily schedule (weekdays at 6:00 AM)",
          actorId: user._id // System action attributed to the user themselves
        });
      } catch (logError) {
        console.error(`Error logging OTP reset for user ${user.email}:`, logError);
      }
    }

    console.log(`Daily OTP reset completed. ${updateResult.modifiedCount} users affected.`);
    
    return {
      success: true,
      message: `Daily OTP reset completed successfully`,
      resetCount: updateResult.modifiedCount,
      affectedUsers: usersToReset.map(user => ({
        id: user._id,
        email: user.email,
        name: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim()
      }))
    };

  } catch (error) {
    console.error("Error in daily OTP reset:", error);
    return {
      success: false,
      message: "Failed to reset OTP verification status",
      error: error.message
    };
  }
};

/**
 * Check if today is a weekday (Monday-Friday)
 * Returns true if current day is Monday (1) through Friday (5)
 */
export const isWeekday = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5; // 1 = Monday, 5 = Friday
};

/**
 * Get next weekday at 6:00 AM
 * Returns the date of the next weekday (Monday-Friday) at 6:00 AM
 * If today is a weekday and it's before 6:00 AM, returns today at 6:00 AM
 * If today is a weekday and it's after 6:00 AM, returns tomorrow at 6:00 AM (if weekday)
 * If today is weekend, returns next Monday at 6:00 AM
 */
export const getNextWeekdayAt6AM = () => {
  const now = new Date();
  const today = new Date(now);
  today.setHours(6, 0, 0, 0); // Set to 6:00 AM today
  
  const dayOfWeek = now.getDay();
  
  // If today is a weekday (Monday-Friday)
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    // If it's before 6:00 AM today, return today at 6:00 AM
    if (now < today) {
      return today;
    }
    // If it's after 6:00 AM today, return tomorrow at 6:00 AM (if tomorrow is weekday)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDayOfWeek = tomorrow.getDay();
    
    // If tomorrow is a weekday, return tomorrow
    if (tomorrowDayOfWeek >= 1 && tomorrowDayOfWeek <= 5) {
      return tomorrow;
    }
    // If tomorrow is Saturday, return Monday
    if (tomorrowDayOfWeek === 6) {
      const nextMonday = new Date(tomorrow);
      nextMonday.setDate(tomorrow.getDate() + 2); // Saturday + 2 = Monday
      return nextMonday;
    }
    // If tomorrow is Sunday, return Monday
    if (tomorrowDayOfWeek === 0) {
      const nextMonday = new Date(tomorrow);
      nextMonday.setDate(tomorrow.getDate() + 1); // Sunday + 1 = Monday
      return nextMonday;
    }
  }
  
  // If today is Saturday (6) or Sunday (0), return next Monday
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek); // Sunday = 1 day, Saturday = 2 days
  const nextWeekday = new Date(today);
  nextWeekday.setDate(today.getDate() + daysUntilMonday);
  return nextWeekday;
};

/**
 * Calculate milliseconds until next weekday at 6:00 AM
 */
export const getMillisecondsUntilNextWeekdayAt6AM = () => {
  const nextWeekday = getNextWeekdayAt6AM();
  const now = new Date();
  return nextWeekday.getTime() - now.getTime();
};
