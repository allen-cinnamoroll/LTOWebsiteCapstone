import UserModel from "../model/UserModel.js";
import { logUserActivity } from "./userLogger.js";

/**
 * Reset OTP verification status for all users every Monday
 * This ensures users need to verify OTP weekly for security
 */
export const resetAllUsersOTPStatus = async () => {
  try {
    console.log("Starting weekly OTP reset for all users...");
    
    // Find all users with isOtpVerified: true
    const usersToReset = await UserModel.find({ 
      isOtpVerified: true,
      role: { $in: ["1", "2"] } // Only reset for admin and employee roles
    });

    if (usersToReset.length === 0) {
      console.log("No users found with OTP verification status to reset");
      return {
        success: true,
        message: "No users found with OTP verification status to reset",
        resetCount: 0
      };
    }

    // Reset isOtpVerified to false for all found users
    const updateResult = await UserModel.updateMany(
      { 
        isOtpVerified: true,
        role: { $in: ["1", "2"] }
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
          userName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
          email: user.email,
          role: user.role,
          logType: "otp_reset",
          ipAddress: "system",
          userAgent: "scheduler",
          status: "success",
          details: "OTP verification status reset due to weekly schedule",
          actorId: "system",
          actorName: "System Scheduler",
          actorEmail: "system@lto.com",
          actorRole: "0"
        });
      } catch (logError) {
        console.error(`Error logging OTP reset for user ${user.email}:`, logError);
      }
    }

    console.log(`Weekly OTP reset completed. ${updateResult.modifiedCount} users affected.`);
    
    return {
      success: true,
      message: `Weekly OTP reset completed successfully`,
      resetCount: updateResult.modifiedCount,
      affectedUsers: usersToReset.map(user => ({
        id: user._id,
        email: user.email,
        name: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim()
      }))
    };

  } catch (error) {
    console.error("Error in weekly OTP reset:", error);
    return {
      success: false,
      message: "Failed to reset OTP verification status",
      error: error.message
    };
  }
};

/**
 * Check if today is Monday
 * Returns true if current day is Monday (1)
 */
export const isMonday = () => {
  const today = new Date();
  return today.getDay() === 1; // 0 = Sunday, 1 = Monday, etc.
};

/**
 * Get next Monday date
 * Returns the date of the next Monday
 */
export const getNextMonday = () => {
  const today = new Date();
  const daysUntilMonday = (1 - today.getDay() + 7) % 7;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
  nextMonday.setHours(0, 0, 0, 0); // Set to start of day
  return nextMonday;
};

/**
 * Calculate milliseconds until next Monday at 12:00 AM
 */
export const getMillisecondsUntilNextMonday = () => {
  const nextMonday = getNextMonday();
  const now = new Date();
  return nextMonday.getTime() - now.getTime();
};
