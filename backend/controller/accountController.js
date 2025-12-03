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
      console.log('Created uploads directory:', uploadPath);
    }
    console.log('Multer destination:', uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `avatar-${req.user.userId}-${uniqueSuffix}${path.extname(file.originalname)}`;
    console.log('Multer filename generated:', filename);
    cb(null, filename);
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
      // Verify the file was actually saved
      const newAvatarPath = path.join(process.cwd(), 'uploads', 'avatars', req.file.filename);
      if (!fs.existsSync(newAvatarPath)) {
        console.error('Avatar file was not saved:', newAvatarPath);
        return res.status(500).json({
          success: false,
          message: "Failed to save avatar file. Please try again."
        });
      }
      
      console.log('Avatar file saved successfully:', newAvatarPath);
      
      // Delete old avatar if it exists
      if (user.avatar && user.avatar !== '') {
        const oldAvatarPath = path.join(process.cwd(), user.avatar);
        if (fs.existsSync(oldAvatarPath)) {
          try {
            fs.unlinkSync(oldAvatarPath);
            console.log('Old avatar deleted:', oldAvatarPath);
          } catch (deleteError) {
            console.error('Failed to delete old avatar:', deleteError);
            // Don't fail the request if old avatar deletion fails
          }
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
      logType: "profile_update",
      ipAddress: getClientIP(req),
      status: "success",
      details: `Profile updated successfully${req.file ? ' with new avatar' : ''}`
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
        logType: "profile_update",
        ipAddress: getClientIP(req),
        status: "failed",
        details: `Profile update failed: ${error.message}`
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

// Validate and clean up avatar path
const validateAvatarPath = (avatarPath) => {
  if (!avatarPath || avatarPath === '') {
    return '';
  }
  
  const fullPath = path.join(process.cwd(), avatarPath);
  if (!fs.existsSync(fullPath)) {
    // Avatar file doesn't exist, return empty string
    return '';
  }
  
  return avatarPath;
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

    // Validate and clean up avatar path if it doesn't exist
    const validatedAvatar = validateAvatarPath(user.avatar);
    if (validatedAvatar !== user.avatar) {
      // Avatar file doesn't exist, update user record to remove invalid reference
      user.avatar = '';
      await UserModel.findByIdAndUpdate(userId, { avatar: '' });
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

// Change password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      });
    }

    // Validate new password length
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long"
      });
    }

    // Get user with password field
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      // Log failed password change attempt
      await logUserActivity({
        userId: user._id,
        logType: "password_change",
        ipAddress: getClientIP(req),
        status: "failed",
        details: "Password change failed: Incorrect current password"
      });

      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // Check if new password is the same as current password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password"
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    // Log successful password change
    await logUserActivity({
      userId: user._id,
      logType: "password_change",
      ipAddress: getClientIP(req),
      status: "success",
      details: "Password changed successfully"
    });

    res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error("Change password error:", error);
    
    // Log the failed password change activity
    try {
      await logUserActivity({
        userId: req.user.userId,
        logType: "password_change",
        ipAddress: getClientIP(req),
        status: "failed",
        details: `Password change failed: ${error.message}`
      });
    } catch (logError) {
      console.error("Failed to log password change error:", logError);
    }

    res.status(500).json({
      success: false,
      message: "Failed to change password",
      error: error.message
    });
  }
};
