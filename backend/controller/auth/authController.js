import DriverModel from "../../model/DriverModel.js";
import UserModel from "../../model/UserModel.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { sendOTPEmail } from "../../util/emailService.js";
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
      userName: `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim(),
      email: email,
      role: role || "2",
      logType: "register",
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      status: "success",
      details: `User registered with role: ${role || "2"}`,
      actorId: newUser._id, // Same user for self-registration
      actorName: `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim(),
      actorEmail: email,
      actorRole: role || "2"
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
    const driver = await DriverModel.findOne({ licenseNo: email, isActive:true });

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

      // Log the successful login activity
      await logUserActivity({
        userId: user._id,
        userName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
        email: user.email,
        role: user.role,
        logType: "login",
        ipAddress: getClientIP(req),
        userAgent: getUserAgent(req),
        status: "success",
        details: "Superadmin direct login (no OTP required)",
        actorId: user._id, // Same user for self-login
        actorName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
        actorEmail: user.email,
        actorRole: user.role
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
      await user.save();

      // Send OTP via email
      const emailSent = await sendOTPEmail(user.email, otp);
      
      if (!emailSent) {
        // Log failed OTP send
        await logUserActivity({
          userId: user._id,
          userName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
          email: user.email,
          role: user.role,
          logType: "otp_sent",
          ipAddress: getClientIP(req),
          userAgent: getUserAgent(req),
          status: "failed",
          details: "Failed to send OTP email"
        });

        return res.status(500).json({
          success: false,
          message: "Failed to send OTP email. Please try again.",
        });
      }

      // Log successful OTP send
      await logUserActivity({
        userId: user._id,
        userName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
        email: user.email,
        role: user.role,
        logType: "otp_sent",
        ipAddress: getClientIP(req),
        userAgent: getUserAgent(req),
        status: "success",
        details: "OTP sent to email for login verification",
        actorId: user._id, // Same user for self-OTP request
        actorName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
        actorEmail: user.email,
        actorRole: user.role
      });

      // Generate JWT token with isOtpVerified: false for users who need OTP
      const token = jwt.sign(
        {
          userId: user._id,
          role: user.role,
          email: user.email,
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
      // Log the successful login activity
      await logUserActivity({
        userId: user._id,
        userName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
        email: user.email,
        role: user.role,
        logType: "login",
        ipAddress: getClientIP(req),
        userAgent: getUserAgent(req),
        status: "success",
        details: "Direct login (OTP already verified)",
        actorId: user._id, // Same user for self-login
        actorName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
        actorEmail: user.email,
        actorRole: user.role
      });

      // Generate JWT token with isOtpVerified: true for already verified users
      const token = jwt.sign(
        {
          userId: user._id,
          role: user.role,
          email: user.email,
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
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (user.otpExpiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // Clear the OTP and update verification status first
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    user.isOtpVerified = true;
    await user.save();

    // Generate JWT token after successful OTP verification with updated status
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        email: user.email,
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
      userName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
      email: user.email,
      role: user.role,
      logType: "otp_verified",
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      status: "success",
      details: "OTP verified successfully",
      actorId: user._id, // Same user for self-OTP verification
      actorName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
      actorEmail: user.email,
      actorRole: user.role
    });

    await logUserActivity({
      userId: user._id,
      userName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
      email: user.email,
      role: user.role,
      logType: "login",
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      status: "success",
      details: "Login successful after OTP verification",
      actorId: user._id, // Same user for self-login
      actorName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
      actorEmail: user.email,
      actorRole: user.role
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
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
          username: currentUser.username,
          role: currentUser.role,
          email: currentUser.email,
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
      // Log the logout activity
      await logUserActivity({
        userId: user._id,
        userName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
        email: user.email,
        role: user.role,
        logType: "logout",
        ipAddress: getClientIP(req),
        userAgent: getUserAgent(req),
        status: "success",
        details: "User logged out successfully",
        actorId: user._id, // Same user for self-logout
        actorName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
        actorEmail: user.email,
        actorRole: user.role
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
