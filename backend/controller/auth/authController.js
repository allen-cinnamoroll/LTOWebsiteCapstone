import OwnerModel from "../../model/OwnerModel.js";
import UserModel from "../../model/UserModel.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { sendOTPEmail, sendPasswordResetOTP } from "../../util/emailService.js";
import { logUserActivity, getClientIP, getUserAgent } from "../../util/userLogger.js";

dotenv.config();
const ACCESS_KEY = process.env.ACCESS_TOKEN_SECRET;
const ACCESS_EXPIRATION = process.env.ACCESS_TOKEN_EXPIRATION;
const REFRESH_KEY = process.env.REFRESH_TOKEN_SECRET;
const REFRESH_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION;

export const register = async (req, res) => {
  const { firstName, middleName, lastName, email, password, role } = req.body;
  try {
    const userExists = await UserModel.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Email already taken",
      });
    }

    // Validate required fields
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "First name and last name are required",
      });
    }

    const newUser = await UserModel.create({
      firstName,
      middleName,
      lastName,
      email,
      password,
      role: role || "2", // Default to employee if no role provided
    });

    // Log the registration activity
    await logUserActivity({
      userId: newUser._id,
      logType: "register",
      ipAddress: getClientIP(req),
      status: "success",
      details: `User registered with role: ${role || "2"}`,
      actorId: newUser._id
    });

    res.status(200).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if email is a license number (Driver)
    const driver = await OwnerModel.findOne({ licenseNo: email, isActive:true });

    let user;

    if (driver) {
      // If a driver is found, retrieve the associated user account
      user = await UserModel.findById(driver.userAccount);
    } else {
      // Otherwise, check email or email in UserModel
      user = await UserModel.findOne({
        $or: [{ email }],
      });
    }

    // If no user is found, return error
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email is incorrect",
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Password is incorrect",
      });
    }

    // Check if user is superadmin (role "0") - skip OTP
    if (user.role === "0") {
      // Generate JWT token directly for superadmin
      const token = jwt.sign(
        {
          userId: user._id,
          role: user.role,
          email: user.email,
          firstName: user.firstName,
          middleName: user.middleName,
          lastName: user.lastName,
          avatar: user.avatar,
          isPasswordChange: user.isPasswordChange,
          isOtpVerified: user.isOtpVerified
        },
        ACCESS_KEY,
        { expiresIn: ACCESS_EXPIRATION }
      );

      // Generate refresh token
      const refreshToken = jwt.sign({ userId: user._id }, REFRESH_KEY, {
        expiresIn: REFRESH_EXPIRATION,
      });

      // Store refresh token in HTTP-only cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Update lastSeenAt and lastLoginAt
      user.lastSeenAt = new Date();
      user.lastLoginAt = new Date();
      await user.save();

      // Log the successful login activity
      await logUserActivity({
        userId: user._id,
        logType: "login",
        ipAddress: getClientIP(req),
        status: "success",
        details: "Superadmin direct login (no OTP required)",
        actorId: user._id
      });

      return res.status(200).json({
        success: true,
        message: "Login successful",
        token,
      });
    }

    // For admin and employee roles, check if OTP verification is required
    if (user.isOtpVerified === false) {
      // Generate OTP only if user needs verification
      const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
      user.otp = otp;
      user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes
      
      try {
      await user.save();
      } catch (saveError) {
        console.error('Error saving user OTP:', saveError);
        return res.status(500).json({
          success: false,
          message: "Failed to generate OTP. Please try again.",
        });
      }

      // Send OTP via email
      let emailSent = false;
      try {
        emailSent = await sendOTPEmail(user.email, otp);
      } catch (emailError) {
        console.error('Error in sendOTPEmail:', emailError);
        // Continue to log the failure
      }
      
      if (!emailSent) {
        // Log failed OTP send (don't await to avoid blocking)
        logUserActivity({
          userId: user._id,
          logType: "otp_sent",
          ipAddress: getClientIP(req),
          status: "failed",
          details: "Failed to send OTP email - email service not configured or error occurred",
          actorId: user._id
        }).catch(err => console.error('Error logging failed OTP send:', err));

        return res.status(500).json({
          success: false,
          message: "Failed to send OTP email. Please check your email configuration or contact support.",
        });
      }

      // Log successful OTP send (don't await to avoid blocking response)
      logUserActivity({
        userId: user._id,
        logType: "otp_sent",
        ipAddress: getClientIP(req),
        status: "success",
        details: "OTP sent to email for login verification",
        actorId: user._id
      }).catch(err => console.error('Error logging successful OTP send:', err));

      // Generate JWT token with isOtpVerified: false for users who need OTP
      const token = jwt.sign(
        {
          userId: user._id,
          role: user.role,
          email: user.email,
          firstName: user.firstName,
          middleName: user.middleName,
          lastName: user.lastName,
          avatar: user.avatar,
          isPasswordChange: user.isPasswordChange,
          isOtpVerified: false // User needs OTP verification
        },
        ACCESS_KEY,
        { expiresIn: ACCESS_EXPIRATION }
      );

      // Generate refresh token
      const refreshToken = jwt.sign({ userId: user._id }, REFRESH_KEY, {
        expiresIn: REFRESH_EXPIRATION,
      });

      // Store refresh token in HTTP-only cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.status(200).json({
        success: true,
        message: "OTP has been sent to your email",
        email: user.email,
        requiresOTP: true,
        token: token
      });
    } else {
      // User is already OTP verified, allow direct login
      // Update lastSeenAt and lastLoginAt
      user.lastSeenAt = new Date();
      user.lastLoginAt = new Date();
      await user.save();
      
      // Log the successful login activity
      await logUserActivity({
        userId: user._id,
        logType: "login",
        ipAddress: getClientIP(req),
        status: "success",
        details: "Direct login (OTP already verified)",
        actorId: user._id
      });

      // Generate JWT token with isOtpVerified: true for already verified users
      const token = jwt.sign(
        {
          userId: user._id,
          role: user.role,
          email: user.email,
          firstName: user.firstName,
          middleName: user.middleName,
          lastName: user.lastName,
          avatar: user.avatar,
          isPasswordChange: user.isPasswordChange,
          isOtpVerified: true // User is already verified
        },
        ACCESS_KEY,
        { expiresIn: ACCESS_EXPIRATION }
      );

      // Generate refresh token
      const refreshToken = jwt.sign({ userId: user._id }, REFRESH_KEY, {
        expiresIn: REFRESH_EXPIRATION,
      });

      // Store refresh token in HTTP-only cookie
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.status(200).json({
        success: true,
        message: "Login successful",
        token,
      });
    }

  } catch (err) {
    console.error('Login error:', err);
    console.error('Error stack:', err.stack);
    
    // Return a user-friendly error message
    const errorMessage = err.message || "An unexpected error occurred during login. Please try again.";
    
    return res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};

export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Validate required fields
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Validate OTP format (should be 6 digits)
    if (typeof otp !== 'string' && typeof otp !== 'number') {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP format",
      });
    }

    // Convert OTP to string for comparison
    const otpString = String(otp).trim();

    if (otpString.length !== 6 || !/^\d{6}$/.test(otpString)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be a 6-digit number",
      });
    }

    const user = await UserModel.findOne({ email: email.trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user has an OTP
    if (!user.otp) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new OTP.",
      });
    }

    // Compare OTP (both as strings to ensure consistency)
    if (String(user.otp) !== otpString) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Check if OTP has expired
    if (!user.otpExpiresAt || new Date(user.otpExpiresAt) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    // Clear the OTP and update verification status first
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    user.isOtpVerified = true;
    user.lastSeenAt = new Date();
    user.lastLoginAt = new Date();
    await user.save();

    // Generate JWT token after successful OTP verification with updated status
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        avatar: user.avatar,
        isPasswordChange: user.isPasswordChange,
        isOtpVerified: true // Use true since we just updated it
      },
      ACCESS_KEY,
      { expiresIn: ACCESS_EXPIRATION }
    );

    // Generate refresh token
    const refreshToken = jwt.sign({ userId: user._id }, REFRESH_KEY, {
      expiresIn: REFRESH_EXPIRATION,
    });

    // Store refresh token in HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Log the successful OTP verification and login
    await logUserActivity({
      userId: user._id,
      logType: "otp_verified",
      ipAddress: getClientIP(req),
      status: "success",
      details: "OTP verified successfully",
      actorId: user._id
    });

    await logUserActivity({
      userId: user._id,
      logType: "login",
      ipAddress: getClientIP(req),
      status: "success",
      details: "Login successful after OTP verification",
      actorId: user._id
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
    });
  } catch (err) {
    console.error('OTP verification error:', err);
    console.error('Error stack:', err.stack);
    
    return res.status(500).json({
      success: false,
      message: err.message || "An unexpected error occurred during OTP verification. Please try again.",
    });
  }
};

export const refreshAccessToken = async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;

  // Check if the refresh token exists
  if (!refreshToken) {
    const error = new Error("Refresh token required");
    error.status = 401;
    error.success = false;
    return next(error);
  }

  // Verify the refresh token
  jwt.verify(refreshToken, REFRESH_KEY, async (err, user, next) => {
    if (err) {
      const error = new Error("Invalid refresh token");
      error.status = 403;
      error.success = false;
      return next(error);
    }

    try {
      // Fetch user details using the user ID
      const currentUser = await UserModel.findById(user.userId);

      // If user is not found
      if (!currentUser) {
        const error = new Error("User not found");
        error.status = 404;
        error.success = false;
        return next(error);
      }

      // Generate a new access token with both id and email in the payload
      const newAccessToken = jwt.sign(
        {
          userId: currentUser._id,
          role: currentUser.role,
          email: currentUser.email,
          firstName: currentUser.firstName,
          middleName: currentUser.middleName,
          lastName: currentUser.lastName,
          avatar: currentUser.avatar,
          isPasswordChange: currentUser.isPasswordChange,
          isOtpVerified: currentUser.isOtpVerified
        },
        ACCESS_KEY, //secret key
        { expiresIn: ACCESS_EXPIRATION } // Token expiration time
      );

      // Return the new access token
      return res.json({
        success: true,
        message: "Access token generated successfully",
        role: currentUser.role,
        token: newAccessToken,
      });
    } catch (err) {
      const error = new Error("Failed to refresh access token");
      error.status = 403;
      error.success = false;
      return next(error);
    }
  });
};

export const logout = async (req, res) => {
  try {
    // Get user from JWT token
    const userId = req.user.userId;
    const user = await UserModel.findById(userId);
    
    if (user) {
      // Clear lastSeenAt to mark user as offline
      user.lastSeenAt = null;
      await user.save();
      
      // Log the logout activity
      await logUserActivity({
        userId: user._id,
        logType: "logout",
        ipAddress: getClientIP(req),
        status: "success",
        details: "User logged out successfully",
        actorId: user._id
      });
    }

    // Clear the refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const resetOTPStatus = async (req, res) => {
  try {
    // Only superadmin can manually reset OTP status
    if (req.user.role !== "0") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only superadmin can reset OTP status.",
      });
    }

    // Import the OTP reset function
    const { resetAllUsersOTPStatus } = await import("../../util/otpResetScheduler.js");
    
    // Run the OTP reset
    const result = await resetAllUsersOTPStatus();
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        resetCount: result.resetCount,
        affectedUsers: result.affectedUsers
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user exists
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email not found in our system",
      });
    }

    // Generate password reset OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    user.passwordResetOTP = otp;
    user.passwordResetOTPExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes
    await user.save();

    // Send password reset OTP via email
    const emailSent = await sendPasswordResetOTP(user.email, otp);
    
    if (!emailSent) {
      // Log failed password reset OTP send
      await logUserActivity({
        userId: user._id,
        logType: "password_reset_otp_sent",
        ipAddress: getClientIP(req),
        status: "failed",
        details: "Failed to send password reset OTP email",
        actorId: user._id
      });

      return res.status(500).json({
        success: false,
        message: "Failed to send password reset email. Please try again.",
      });
    }

    // Log successful password reset OTP send
    await logUserActivity({
      userId: user._id,
      logType: "password_reset_otp_sent",
      ipAddress: getClientIP(req),
      status: "success",
      details: "Password reset OTP sent to email",
      actorId: user._id
    });

    res.status(200).json({
      success: true,
      message: "Password reset OTP has been sent to your email",
      email: user.email,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const verifyPasswordResetOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.passwordResetOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (user.passwordResetOTPExpiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // Generate a temporary token for password reset
    const resetToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        purpose: "password_reset"
      },
      ACCESS_KEY,
      { expiresIn: "15m" } // Token expires in 15 minutes
    );

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      resetToken,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body;

  try {
    // Verify the reset token
    const decoded = jwt.verify(resetToken, ACCESS_KEY);
    
    if (decoded.purpose !== "password_reset") {
      return res.status(400).json({
        success: false,
        message: "Invalid reset token",
      });
    }

    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update password
    user.password = newPassword;
    user.passwordResetOTP = undefined;
    user.passwordResetOTPExpiresAt = undefined;
    await user.save();

    // Log successful password reset
    await logUserActivity({
      userId: user._id,
      logType: "password_reset",
      ipAddress: getClientIP(req),
      status: "success",
      details: "Password reset successfully",
      actorId: user._id
    });

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }
    
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
