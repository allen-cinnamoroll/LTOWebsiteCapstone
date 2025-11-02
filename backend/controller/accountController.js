import UserModel from "../model/UserModel.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { logUserActivity, getClientIP, getUserAgent } from "../util/userLogger.js";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(process.cwd(), 'uploads', 'avatars');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${req.user.userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WebP) are allowed!'));
  }
};

// Configure multer
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// Update user profile (including avatar)
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { firstName, middleName, lastName, email } = req.body;
    
    // Get current user data
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Prepare update data
    const updateData = {};
    
    if (firstName !== undefined) updateData.firstName = firstName;
    if (middleName !== undefined) updateData.middleName = middleName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined && email !== user.email) {
      // Check if email is already taken by another user
      const existingUser = await UserModel.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email is already taken"
        });
      }
      updateData.email = email;
    }

    // Handle avatar upload
    if (req.file) {
      // Delete old avatar if it exists
      if (user.avatar && user.avatar !== '') {
        const oldAvatarPath = path.join(process.cwd(), user.avatar);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }
      
      // Set new avatar path (relative to project root)
      updateData.avatar = `uploads/avatars/${req.file.filename}`;
    }

    // Update user data
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, select: '-password -otp -otpExpiresAt -passwordResetOTP -passwordResetOTPExpiresAt' }
    );

    // Log the profile update activity
    await logUserActivity({
      userId: updatedUser._id,
      userName: `${updatedUser.firstName} ${updatedUser.middleName ? updatedUser.middleName + ' ' : ''}${updatedUser.lastName}`.trim(),
      email: updatedUser.email,
      role: updatedUser.role,
      logType: "profile_update",
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      status: "success",
      details: `Profile updated successfully${req.file ? ' with new avatar' : ''}`,
      actorId: updatedUser._id,
      actorName: `${updatedUser.firstName} ${updatedUser.middleName ? updatedUser.middleName + ' ' : ''}${updatedUser.lastName}`.trim(),
      actorEmail: updatedUser.email,
      actorRole: updatedUser.role
    });

    // Return updated user data
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser
    });

  } catch (error) {
    console.error("Profile update error:", error);
    
    // Log the failed profile update activity
    try {
      await logUserActivity({
        userId: req.user.userId,
        userName: req.user.userName || 'Unknown',
        email: req.user.email || 'Unknown',
        role: req.user.role || 'Unknown',
        logType: "profile_update",
        ipAddress: getClientIP(req),
        userAgent: getUserAgent(req),
        status: "failed",
        details: `Profile update failed: ${error.message}`,
        actorId: req.user.userId,
        actorName: req.user.userName || 'Unknown',
        actorEmail: req.user.email || 'Unknown',
        actorRole: req.user.role || 'Unknown'
      });
    } catch (logError) {
      console.error("Failed to log profile update error:", logError);
    }

    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message
    });
  }
};

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await UserModel.findById(userId)
      .select('-password -otp -otpExpiresAt -passwordResetOTP -passwordResetOTPExpiresAt');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: error.message
    });
  }
};
