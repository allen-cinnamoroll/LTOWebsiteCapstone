import UserModel from "../model/UserModel.js";
import UserLog from "../model/UserLogModel.js";
import { logUserActivity, getClientIP, getUserAgent } from "../util/userLogger.js";
import * as XLSX from 'xlsx';

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

// Get user by id (basic public fields for display)
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await UserModel.findById(userId).select("firstName middleName lastName email username role avatar");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    // Compose fullname for convenience
    const fullname = `${user.firstName || ''} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName || ''}`.trim();
    res.status(200).json({ success: true, data: { ...user.toObject(), fullname } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
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

// Export user logs to Excel
export const exportUserLogs = async (req, res) => {
  try {
    const { 
      email, 
      role, 
      roles, 
      logType, 
      dateFrom, 
      dateTo 
    } = req.query;

    // Build filter object (same as getUserLogs)
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

    // Get all logs without pagination for export
    const logs = await UserLog.find(filter).sort({ timestamp: -1 }).lean();

    // Transform logs for Excel export
    const excelData = logs.map(log => ({
      'Performed By': log.actorName || 'N/A',
      'Actor Email': log.actorEmail || 'N/A',
      'Actor Role': getRoleLabel(log.actorRole),
      'Timestamp': new Date(log.timestamp).toLocaleString(),
      'User Name': log.userName || 'N/A',
      'Email': log.email,
      'Role': getRoleLabel(log.role),
      'Activity': getLogTypeLabel(log.logType),
      'Details': log.details || 'N/A',
      'IP Address': log.ipAddress === '::1' ? '127.0.0.1' : 
                   log.ipAddress === '::ffff:127.0.0.1' ? '127.0.0.1' :
                   log.ipAddress || 'N/A',
      'Status': log.status
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 20 }, // Performed By
      { wch: 25 }, // Actor Email
      { wch: 15 }, // Actor Role
      { wch: 20 }, // Timestamp
      { wch: 20 }, // User Name
      { wch: 25 }, // Email
      { wch: 15 }, // Role
      { wch: 20 }, // Activity
      { wch: 30 }, // Details
      { wch: 15 }, // IP Address
      { wch: 10 }  // Status
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Account Logs');

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    });

    // Set response headers for Excel download
    const filename = `account-logs-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);

    // Send Excel file
    res.send(excelBuffer);

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Helper function to get role label
const getRoleLabel = (role) => {
  switch (role) {
    case "0":
      return "Superadmin";
    case "1":
      return "Admin";
    case "2":
      return "Employee";
    default:
      return "Unknown";
  }
};

// Helper function to get log type label
const getLogTypeLabel = (logType) => {
  const logTypes = {
    "login": "Login",
    "logout": "Logout",
    "register": "Registration",
    "update": "Account Update",
    "delete": "Delete",
    "password_change": "Password Change",
    "password_reset": "Password Reset",
    "password_reset_otp_sent": "Password Reset OTP Sent",
    "password_reset_otp_verified": "Password Reset OTP Verified",
    "otp_verified": "OTP Verification",
    "otp_sent": "OTP Sent",
    "otp_reset": "OTP Reset",
    "add_driver": "Add Driver",
    "add_vehicle": "Add Vehicle",
    "add_accident": "Add Accident",
    "add_violation": "Add Violation",
    "update_driver": "Update Driver",
    "update_vehicle": "Update Vehicle",
    "update_accident": "Update Accident",
    "update_violation": "Update Violation",
    "delete_driver": "Delete Driver",
    "delete_vehicle": "Delete Vehicle",
    "delete_accident": "Delete Accident",
    "delete_violation": "Delete Violation"
  };
  return logTypes[logType] || logType;
};

// Get online users based on role
export const getOnlineUsers = async (req, res) => {
  try {
    const currentUser = await UserModel.findById(req.user.userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Define online threshold: 2 minutes (to handle cases where browser is closed without logout)
    // Users are considered online if they have lastSeenAt set and it's within the last 2 minutes
    const ONLINE_THRESHOLD_MINUTES = 2;
    const thresholdTime = new Date(Date.now() - ONLINE_THRESHOLD_MINUTES * 60 * 1000);

    // SUPERADMIN: Can see names of online admins and employees
    if (currentUser.role === "0") {
      const onlineAdmins = await UserModel.find({
        role: "1",
        lastSeenAt: { $ne: null, $gte: thresholdTime }
      })
        .select("_id firstName middleName lastName")
        .lean();

      const onlineEmployees = await UserModel.find({
        role: "2",
        lastSeenAt: { $ne: null, $gte: thresholdTime }
      })
        .select("_id firstName middleName lastName")
        .lean();

      // Format names
      const formatName = (user) => {
        return `${user.firstName || ''} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName || ''}`.trim();
      };

      const admins = onlineAdmins.map(admin => ({
        id: admin._id.toString(),
        name: formatName(admin)
      }));

      const employees = onlineEmployees.map(emp => ({
        id: emp._id.toString(),
        name: formatName(emp)
      }));

      return res.status(200).json({
        success: true,
        data: {
          admins,
          employees
        }
      });
    }

    // ADMIN: Can see names of online employees
    if (currentUser.role === "1") {
      const onlineEmployees = await UserModel.find({
        role: "2",
        lastSeenAt: { $ne: null, $gte: thresholdTime }
      })
        .select("_id firstName middleName lastName")
        .lean();

      // Format names
      const formatName = (user) => {
        return `${user.firstName || ''} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName || ''}`.trim();
      };

      const employees = onlineEmployees.map(emp => ({
        id: emp._id.toString(),
        name: formatName(emp)
      }));

      return res.status(200).json({
        success: true,
        data: {
          employees
        }
      });
    }

    // EMPLOYEE: Can see names of online employees (co-employees)
    if (currentUser.role === "2") {
      const onlineEmployees = await UserModel.find({
        role: "2",
        lastSeenAt: { $ne: null, $gte: thresholdTime }
      })
        .select("_id firstName middleName lastName")
        .lean();

      // Format names
      const formatName = (user) => {
        return `${user.firstName || ''} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName || ''}`.trim();
      };

      const employees = onlineEmployees.map(emp => ({
        id: emp._id.toString(),
        name: formatName(emp)
      }));

      return res.status(200).json({
        success: true,
        data: {
          employees
        }
      });
    }

    // Default: Limited access (just return minimal info)
    return res.status(200).json({
      success: true,
      data: {
        online: true
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Heartbeat endpoint to update lastSeenAt
export const updateHeartbeat = async (req, res) => {
  try {
    const userId = req.user.userId;
    await UserModel.findByIdAndUpdate(
      userId,
      { lastSeenAt: new Date() },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Heartbeat updated",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};