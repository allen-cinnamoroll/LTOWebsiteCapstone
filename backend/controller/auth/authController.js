import DriverModel from "../../model/DriverModel.js";
import UserModel from "../../model/UserModel.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { sendOTPEmail } from "../../util/emailService.js";

dotenv.config();
const ACCESS_KEY = process.env.ACCESS_TOKEN_SECRET;
const ACCESS_EXPIRATION = process.env.ACCESS_TOKEN_EXPIRATION;
const REFRESH_KEY = process.env.REFRESH_TOKEN_SECRET;
const REFRESH_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION;

export const register = async (req, res) => {
  const { firstName, middleName, lastName, email, password } = req.body;
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

    await UserModel.create({
      firstName,
      middleName,
      lastName,
      email,
      password,
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
        message: "Email or license number is incorrect",
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

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes
    user.isOtpVerified = false;
    await user.save();

    // Send OTP via email
    const emailSent = await sendOTPEmail(user.email, otp);
    
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP has been sent to your email",
      email: user.email,
      requiresOTP: true
    });

    // Generate JWT token (this part will move to verifyOTP)
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        email: user.email,
        isPasswordChange: user.isPasswordChange
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

    // Generate JWT token after successful OTP verification
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        email: user.email,
        isPasswordChange: user.isPasswordChange
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

    // Clear the OTP after successful verification
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    user.isOtpVerified = true;
    await user.save();

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
          isPasswordChange: currentUser.isPasswordChange
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
