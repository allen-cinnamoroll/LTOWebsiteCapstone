import UserModel from "../model/UserModel.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { logUserActivity, getClientIP, getUserAgent } from "../util/userLogger.js";

// Configure multer for avatar uploads with enhanced validation
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
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${req.user.userId}-${uniqueSuffix}${ext}`);
  }
});

// Enhanced file filter with strict validation
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
export const uploadAvatar = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// Upload/Update avatar only (separate from profile update)
export const updateAvatar = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file uploaded"
      });
    }

    // Get current user data
    const user = await UserModel.findById(userId);
    if (!user) {
      // Delete uploaded file if user not found
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Delete old avatar if it exists
    if (user.avatar && user.avatar !== '') {
      const oldAvatarPath = path.join(process.cwd(), user.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        try {
          fs.unlinkSync(oldAvatarPath);
          console.log('Old avatar deleted:', oldAvatarPath);
        } catch (err) {
          console.error('Error deleting old avatar:', err);
          // Continue even if deletion fails
        }
      }
    }

    // Set new avatar path (relative to project root)
    const avatarPath = `uploads/avatars/${req.file.filename}`;
    
    // Update user avatar in database
    user.avatar = avatarPath;
    await user.save();

    // Log the avatar update activity
    await logUserActivity({
      userId: user._id,
      userName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
      email: user.email,
      role: user.role,
      logType: "avatar_update",
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      status: "success",
      details: `Avatar updated successfully: ${avatarPath}`,
      actorId: user._id,
      actorName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
      actorEmail: user.email,
      actorRole: user.role
    });

    // Return updated avatar path
    res.status(200).json({
      success: true,
      message: "Avatar updated successfully",
      avatar: avatarPath,
      user: {
        _id: user._id,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        email: user.email,
        avatar: avatarPath,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Avatar update error:", error);
    
    // Delete uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error deleting uploaded file:', err);
      }
    }
    
    // Log the failed avatar update activity
    try {
      await logUserActivity({
        userId: req.user.userId,
        userName: req.user.userName || 'Unknown',
        email: req.user.email || 'Unknown',
        role: req.user.role || 'Unknown',
        logType: "avatar_update",
        ipAddress: getClientIP(req),
        userAgent: getUserAgent(req),
        status: "failed",
        details: `Avatar update failed: ${error.message}`,
        actorId: req.user.userId,
        actorName: req.user.userName || 'Unknown',
        actorEmail: req.user.email || 'Unknown',
        actorRole: req.user.role || 'Unknown'
      });
    } catch (logError) {
      console.error("Failed to log avatar update error:", logError);
    }

    res.status(500).json({
      success: false,
      message: "Failed to update avatar",
      error: error.message
    });
  }
};

// Delete avatar
export const deleteAvatar = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get current user data
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Delete avatar file if it exists
    if (user.avatar && user.avatar !== '') {
      const avatarPath = path.join(process.cwd(), user.avatar);
      if (fs.existsSync(avatarPath)) {
        try {
          fs.unlinkSync(avatarPath);
          console.log('Avatar deleted:', avatarPath);
        } catch (err) {
          console.error('Error deleting avatar:', err);
        }
      }
    }

    // Update user to remove avatar
    user.avatar = '';
    await user.save();

    // Log the avatar deletion activity
    await logUserActivity({
      userId: user._id,
      userName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
      email: user.email,
      role: user.role,
      logType: "avatar_delete",
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      status: "success",
      details: "Avatar deleted successfully",
      actorId: user._id,
      actorName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
      actorEmail: user.email,
      actorRole: user.role
    });

    res.status(200).json({
      success: true,
      message: "Avatar deleted successfully"
    });

  } catch (error) {
    console.error("Avatar delete error:", error);
    
    res.status(500).json({
      success: false,
      message: "Failed to delete avatar",
      error: error.message
    });
  }
};

