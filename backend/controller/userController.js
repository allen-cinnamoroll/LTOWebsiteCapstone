import UserModel from "../model/UserModel.js";
import UserLog from "../model/UserLogModel.js";
import { logUserActivity, getClientIP, getUserAgent } from "../util/userLogger.js";

export const findUser = async (req, res) => {
  const userId = req.user.userId;
  try {
    const user = await UserModel.findById(userId).select("-password");
 
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
        success: true,
        data: user,
    })
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Get all users (for admin/superadmin)
export const getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.find({}).select("-password -otp -otpExpiresAt");
    
    res.status(200).json({
      success: true,
      users: users,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Update user
export const updateUser = async (req, res) => {
  const { userId } = req.params;
  const { firstName, middleName, lastName, email, role } = req.body;
  
  try {
    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if email is already taken by another user
    if (email !== user.email) {
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already taken",
        });
      }
    }

    // Update user
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      {
        firstName,
        middleName,
        lastName,
        email,
        role,
      },
      { new: true, runValidators: true }
    ).select("-password -otp -otpExpiresAt");

    // Log the update activity
    await logUserActivity({
      userId: updatedUser._id,
      userName: `${updatedUser.firstName} ${updatedUser.middleName ? updatedUser.middleName + ' ' : ''}${updatedUser.lastName}`.trim(),
      email: updatedUser.email,
      role: updatedUser.role,
      logType: "update",
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      status: "success",
      details: `User updated by ${req.user.email}`,
      actorId: req.user.userId, // The user who performed the update
      actorName: req.user.name || req.user.email, // Use name if available, fallback to email
      actorEmail: req.user.email,
      actorRole: req.user.role
    });

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  const { userId } = req.params;
  
  try {
    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Log the delete activity before deleting
    await logUserActivity({
      userId: user._id,
      userName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
      email: user.email,
      role: user.role,
      logType: "delete",
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      status: "success",
      details: `User deleted by ${req.user.email}`,
      actorId: req.user.userId, // The user who performed the delete
      actorName: req.user.name || req.user.email, // Use name if available, fallback to email
      actorEmail: req.user.email,
      actorRole: req.user.role
    });

    // Delete user
    await UserModel.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Get user logs
export const getUserLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      email, 
      role, 
      roles, 
      logType, 
      dateFrom, 
      dateTo 
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (email) {
      filter.email = { $regex: email, $options: 'i' };
    }
    
    if (role) {
      filter.role = role;
    } else if (roles) {
      const roleArray = roles.split(',');
      filter.role = { $in: roleArray };
    }
    
    if (logType && logType !== "all") {
      filter.logType = logType;
    }
    
    if (dateFrom || dateTo) {
      filter.timestamp = {};
      if (dateFrom) {
        filter.timestamp.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.timestamp.$lte = new Date(dateTo);
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Query real logs from the database
    let query = UserLog.find(filter).sort({ timestamp: -1 });
    
    // Apply pagination
    const totalLogs = await UserLog.countDocuments(filter);
    const totalPages = Math.ceil(totalLogs / parseInt(limit));
    const paginatedLogs = await query.skip(skip).limit(parseInt(limit)).lean();

    // Apply client-side filtering for additional filters
    let filteredLogs = paginatedLogs;
    
    if (filter.email) {
      filteredLogs = filteredLogs.filter(log => 
        log.email.toLowerCase().includes(filter.email.$regex.toLowerCase())
      );
    }
    
    if (filter.role) {
      if (typeof filter.role === 'string') {
        filteredLogs = filteredLogs.filter(log => log.role === filter.role);
      } else if (filter.role.$in) {
        filteredLogs = filteredLogs.filter(log => filter.role.$in.includes(log.role));
      }
    }
    
    if (filter.logType && filter.logType !== "all") {
      filteredLogs = filteredLogs.filter(log => log.logType === filter.logType);
    }

    res.status(200).json({
      success: true,
      logs: filteredLogs,
      totalLogs,
      totalPages,
      currentPage: parseInt(page),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};