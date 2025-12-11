import mongoose from 'mongoose';
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

// Get all users (for admin/superadmin) with optional role filtering
export const getAllUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 50 } = req.query;
    
    // Build query filter
    const filter = {};
    
    // Filter by role if provided
    if (role) {
      filter.role = role;
    }
    
    // Search filter (by name or email)
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { middleName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count for pagination
    const totalUsers = await UserModel.countDocuments(filter);
    
    // Get users with pagination
    const users = await UserModel.find(filter)
      .select("-password -otp -otpExpiresAt -passwordResetOTP -passwordResetOTPExpiresAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Calculate total pages
    const totalPages = Math.ceil(totalUsers / parseInt(limit));
    
    res.status(200).json({
      success: true,
      users: users,
      pagination: {
        totalUsers,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
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
      logType: "update",
      ipAddress: getClientIP(req),
      status: "success",
      details: `User updated by ${req.user.email}`
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
      logType: "delete",
      ipAddress: getClientIP(req),
      status: "success",
      details: `User deleted by ${req.user.email}`
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
    
    // Collect userIds from different filters
    let userIds = [];
    
    // If filtering by email, first find users with matching email
    if (email) {
      const users = await UserModel.find({ 
        email: { $regex: email, $options: 'i' } 
      }).select('_id');
      const emailUserIds = users.map(user => user._id);
      if (emailUserIds.length === 0) {
        // No users found with this email, return empty result
        return res.status(200).json({
          success: true,
          logs: [],
          totalLogs: 0,
          totalPages: 0,
          currentPage: parseInt(page),
        });
      }
      userIds = emailUserIds;
    }
    
    // If filtering by role, find users with matching role
    let roleUserIds = [];
    if (role) {
      const users = await UserModel.find({ role }).select('_id');
      roleUserIds = users.map(user => user._id);
      if (roleUserIds.length === 0) {
        return res.status(200).json({
          success: true,
          logs: [],
          totalLogs: 0,
          totalPages: 0,
          currentPage: parseInt(page),
        });
      }
    } else if (roles) {
      const roleArray = roles.split(',');
      const users = await UserModel.find({ role: { $in: roleArray } }).select('_id');
      roleUserIds = users.map(user => user._id);
      if (roleUserIds.length === 0) {
        return res.status(200).json({
          success: true,
          logs: [],
          totalLogs: 0,
          totalPages: 0,
          currentPage: parseInt(page),
        });
      }
    }
    
    // Combine userIds from different filters
    if (userIds.length > 0 && roleUserIds.length > 0) {
      // Intersection: only userIds that match both filters
      // Convert to strings for comparison
      const userIdsStr = userIds.map(id => id.toString());
      const roleUserIdsStr = roleUserIds.map(id => id.toString());
      userIds = userIds.filter(id => roleUserIdsStr.includes(id.toString()));
      if (userIds.length === 0) {
        return res.status(200).json({
          success: true,
          logs: [],
          totalLogs: 0,
          totalPages: 0,
          currentPage: parseInt(page),
        });
      }
    } else if (roleUserIds.length > 0) {
      userIds = roleUserIds;
    }
    
    // Apply userId filter if we have any
    if (userIds.length > 0) {
      filter.userId = { $in: userIds };
    }
    
    if (logType && logType !== "all") {
      filter.logType = logType;
    }
    
    if (dateFrom || dateTo) {
      filter.timestamp = {};
      if (dateFrom) {
        // Set to start of day (00:00:00) in local timezone
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        filter.timestamp.$gte = fromDate;
      }
      if (dateTo) {
        // Set to end of day (23:59:59.999)
        // If dateTo is already an ISO string with time, use it directly
        // Otherwise, set it to end of day
        let toDate = new Date(dateTo);
        // Check if the date string already includes time (ISO format)
        // URL-encoded strings might have %3A instead of :, so check for T and any time indicators
        const dateToStr = String(dateTo);
        if (dateToStr.includes('T') && (dateToStr.includes(':') || dateToStr.includes('%3A'))) {
          // Already has time, use as is (decode if URL encoded)
          toDate = new Date(decodeURIComponent(dateToStr));
        } else {
          // Just a date string, set to end of day
          toDate.setHours(23, 59, 59, 999);
        }
        filter.timestamp.$lte = toDate;
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Query real logs from the database with populated userId
    let query = UserLog.find(filter)
      .populate('userId', 'firstName middleName lastName email role')
      .sort({ timestamp: -1 });
    
    // Apply pagination
    const totalLogs = await UserLog.countDocuments(filter);
    const totalPages = Math.ceil(totalLogs / parseInt(limit));
    const paginatedLogs = await query.skip(skip).limit(parseInt(limit)).lean();

    // Transform logs to include user data from populated references
    let filteredLogs = paginatedLogs.map(log => {
      const user = log.userId;
      
      // Check if this is an automatic retrain log - show "System" as performer
      const isAutomaticRetrain = log.logType === 'automatic_retrain_accident' || log.logType === 'automatic_retrain_mv_registration';
      
      return {
        ...log,
        // User (target) data
        userName: user ? `${user.firstName || ''} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName || ''}`.trim() : 'N/A',
        email: user?.email || null,
        role: user?.role || null,
        // Actor (performer) data - show "System" for automatic retrain logs
        actorName: isAutomaticRetrain ? 'System' : (user ? `${user.firstName || ''} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName || ''}`.trim() : 'N/A'),
        actorEmail: isAutomaticRetrain ? null : (user?.email || null),
        actorRole: isAutomaticRetrain ? null : (user?.role || null)
      };
    });

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
    
    // Collect userIds from different filters
    let userIds = [];
    
    // If filtering by email, first find users with matching email
    if (email) {
      const users = await UserModel.find({ 
        email: { $regex: email, $options: 'i' } 
      }).select('_id');
      const emailUserIds = users.map(user => user._id);
      if (emailUserIds.length === 0) {
        // No users found with this email, return empty Excel
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet([]);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Account Logs');
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const filename = `account-logs-${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', excelBuffer.length);
        return res.send(excelBuffer);
      }
      userIds = emailUserIds;
    }
    
    // If filtering by role, find users with matching role
    let roleUserIds = [];
    if (role) {
      const users = await UserModel.find({ role }).select('_id');
      roleUserIds = users.map(user => user._id);
      if (roleUserIds.length === 0) {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet([]);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Account Logs');
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const filename = `account-logs-${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', excelBuffer.length);
        return res.send(excelBuffer);
      }
    } else if (roles) {
      const roleArray = roles.split(',');
      const users = await UserModel.find({ role: { $in: roleArray } }).select('_id');
      roleUserIds = users.map(user => user._id);
      if (roleUserIds.length === 0) {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet([]);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Account Logs');
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const filename = `account-logs-${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', excelBuffer.length);
        return res.send(excelBuffer);
      }
    }
    
    // Combine userIds from different filters
    if (userIds.length > 0 && roleUserIds.length > 0) {
      // Intersection: only userIds that match both filters
      const userIdsStr = userIds.map(id => id.toString());
      const roleUserIdsStr = roleUserIds.map(id => id.toString());
      userIds = userIds.filter(id => roleUserIdsStr.includes(id.toString()));
      if (userIds.length === 0) {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet([]);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Account Logs');
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const filename = `account-logs-${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', excelBuffer.length);
        return res.send(excelBuffer);
      }
    } else if (roleUserIds.length > 0) {
      userIds = roleUserIds;
    }
    
    // Apply userId filter if we have any
    if (userIds.length > 0) {
      filter.userId = { $in: userIds };
    }
    
    if (logType && logType !== "all") {
      filter.logType = logType;
    }
    
    if (dateFrom || dateTo) {
      filter.timestamp = {};
      if (dateFrom) {
        // Set to start of day (00:00:00) in local timezone
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        filter.timestamp.$gte = fromDate;
      }
      if (dateTo) {
        // Set to end of day (23:59:59.999)
        // If dateTo is already an ISO string with time, use it directly
        // Otherwise, set it to end of day
        let toDate = new Date(dateTo);
        // Check if the date string already includes time (ISO format)
        // URL-encoded strings might have %3A instead of :, so check for T and any time indicators
        const dateToStr = String(dateTo);
        if (dateToStr.includes('T') && (dateToStr.includes(':') || dateToStr.includes('%3A'))) {
          // Already has time, use as is (decode if URL encoded)
          toDate = new Date(decodeURIComponent(dateToStr));
        } else {
          // Just a date string, set to end of day
          toDate.setHours(23, 59, 59, 999);
        }
        filter.timestamp.$lte = toDate;
      }
    }

    // Get all logs without pagination for export, populate userId
    const logs = await UserLog.find(filter)
      .populate('userId', 'firstName middleName lastName email role')
      .sort({ timestamp: -1 })
      .lean();

    // Transform logs for Excel export
    const excelData = logs.map(log => {
      const user = log.userId;
      
      // Check if this is an automatic retrain log - show "System" as performer
      const isAutomaticRetrain = log.logType === 'automatic_retrain_accident' || log.logType === 'automatic_retrain_mv_registration';
      
      const userName = isAutomaticRetrain ? 'System' : (user ? `${user.firstName || ''} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName || ''}`.trim() : 'N/A');
      
      return {
        'Performed By': userName,
        'Actor Email': isAutomaticRetrain ? 'N/A' : (user?.email || 'N/A'),
        'Actor Role': isAutomaticRetrain ? 'N/A' : getRoleLabel(user?.role),
        'Timestamp': new Date(log.timestamp).toLocaleString(),
        'User Name': userName,
        'Email': isAutomaticRetrain ? 'N/A' : (user?.email || 'N/A'),
        'Role': isAutomaticRetrain ? 'N/A' : getRoleLabel(user?.role),
        'Activity': getLogTypeLabel(log.logType),
        'Details': log.details || 'N/A',
        'IP Address': log.ipAddress === '::1' ? '127.0.0.1' : 
                     log.ipAddress === '::ffff:127.0.0.1' ? '127.0.0.1' :
                     log.ipAddress || 'N/A',
        'Status': log.status
      };
    });

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

    // Log the export activity BEFORE sending response
    if (req.user && req.user.userId) {
      try {
        const filterDetails = [];
        if (email) filterDetails.push(`Email: ${email}`);
        if (role) filterDetails.push(`Role: ${role}`);
        if (roles) filterDetails.push(`Roles: ${roles}`);
        if (logType) filterDetails.push(`Log Type: ${logType}`);
        if (dateFrom) filterDetails.push(`From: ${dateFrom}`);
        if (dateTo) filterDetails.push(`To: ${dateTo}`);
        
        await logUserActivity({
          userId: req.user.userId,
          logType: 'export_account_logs',
          ipAddress: getClientIP(req),
          status: 'success',
          details: `Exported account logs to Excel (${logs.length} records)${filterDetails.length > 0 ? ` - Filters: ${filterDetails.join(', ')}` : ''}`
        });
      } catch (logError) {
        console.error('Failed to log account logs export:', logError);
      }
    }

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
    "delete": "Delete Account",
    "password_change": "Password Change",
    "password_reset": "Password Reset",
    "password_reset_otp_sent": "Password Reset OTP Sent",
    "password_reset_otp_verified": "Password Reset OTP Verified",
    "otp_verified": "OTP Verification",
    "otp_sent": "OTP Sent",
    "otp_reset": "OTP Reset",
    "profile_update": "Profile Update",
    "add_driver": "Add Owner",
    "add_vehicle": "Add Vehicle",
    "add_accident": "Add Accident",
    "add_violation": "Add Violation",
    "update_driver": "Update Owner",
    "update_vehicle": "Update Vehicle",
    "update_accident": "Update Accident",
    "update_violation": "Update Violation",
    "delete_driver": "Delete Owner",
    "delete_vehicle": "Delete Vehicle",
    "delete_accident": "Delete Accident",
    "delete_violation": "Delete Violation",
    "export_vehicles": "Export Vehicles",
    "export_violations": "Export Violations",
    "export_accidents": "Export Accidents",
    "export_dashboard_report": "Export Dashboard Report",
    "export_account_logs": "Export Account Logs",
    "download_automated_report": "Download Automated Report",
    "automatic_retrain_accident": "Automatic Retrain - Accident Model",
    "automatic_retrain_mv_registration": "Automatic Retrain - MV Registration Model",
    "manual_retrain_accident_model": "Manual Retrain - Accident Model",
    "cancel_retrain_accident_model": "Cancel Retrain - Accident Model"
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

// Log automatic retrain activity (called by Python retrain scripts)
// This endpoint is for internal use by automated scripts
export const logAutomaticRetrain = async (req, res) => {
  try {
    const { logType, status, details } = req.body;

    // Validate required fields
    if (!logType || !status) {
      return res.status(400).json({
        success: false,
        message: "logType and status are required"
      });
    }

    // Validate logType is one of the automatic retrain types
    if (logType !== 'automatic_retrain_accident' && logType !== 'automatic_retrain_mv_registration') {
      return res.status(400).json({
        success: false,
        message: "logType must be 'automatic_retrain_accident' or 'automatic_retrain_mv_registration'"
      });
    }

    // Validate status
    if (!['success', 'failed', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status must be 'success', 'failed', or 'pending'"
      });
    }

    // Find superadmin user (role "0")
    const superadmin = await UserModel.findOne({ role: "0" }).select("_id");
    
    if (!superadmin) {
      return res.status(404).json({
        success: false,
        message: "Superadmin user not found"
      });
    }

    // Get IP address from request (for automated scripts, use localhost)
    const ipAddress = getClientIP(req) || '127.0.0.1';

    // Log the automatic retrain activity with superadmin as the performer
    await logUserActivity({
      userId: superadmin._id,
      logType: logType,
      ipAddress: ipAddress,
      status: status,
      details: details || `Automatic retrain performed by system`
    });

    res.status(200).json({
      success: true,
      message: "Automatic retrain activity logged successfully"
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Manual retrain accident model endpoint with logging
export const retrainAccidentModel = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const userId = req.user.userId;
    const ipAddress = getClientIP(req);
    
    // Get Flask API base URL from environment or use default
    const flaskApiBase = process.env.ACCIDENT_PREDICTION_API_URL || 
                         (process.env.NODE_ENV === 'production' 
                           ? 'http://localhost:5004' 
                           : 'http://localhost:5004');
    
    const retrainUrl = `${flaskApiBase}/api/accidents/retrain`;
    
    // Log the retrain attempt with pending status
    try {
      await logUserActivity({
        userId: userId,
        logType: 'manual_retrain_accident_model',
        ipAddress: ipAddress,
        status: 'pending',
        details: 'Manual retrain of accident prediction model initiated'
      });
    } catch (logError) {
      console.error('Failed to log retrain activity:', logError.message);
      // Continue even if logging fails
    }

    // Forward the request to Flask API
    const response = await fetch(retrainUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ force: true }),
    });

    const data = await response.json();

    // Update log status based on Flask API response
    const logStatus = response.ok && data.success ? 'success' : 'failed';
    const logDetails = response.ok && data.success 
      ? 'Manual retrain of accident prediction model started successfully'
      : `Manual retrain failed: ${data.error || data.message || 'Unknown error'}`;

    try {
      // Find the most recent pending log for this user and update it
      const UserLog = (await import('../model/UserLogModel.js')).default;
      const recentLog = await UserLog.findOne({
        userId: userId,
        logType: 'manual_retrain_accident_model',
        status: 'pending'
      }).sort({ timestamp: -1 });

      if (recentLog) {
        recentLog.status = logStatus;
        recentLog.details = logDetails;
        await recentLog.save();
      } else {
        // If no pending log found, create a new one
        await logUserActivity({
          userId: userId,
          logType: 'manual_retrain_accident_model',
          ipAddress: ipAddress,
          status: logStatus,
          details: logDetails
        });
      }
    } catch (logError) {
      console.error('Failed to update retrain activity log:', logError.message);
      // Continue even if logging fails
    }

    // Return the Flask API response
    return res.status(response.status).json(data);
  } catch (err) {
    // Log as failed if there's an error
    if (req.user && req.user.userId) {
      try {
        await logUserActivity({
          userId: req.user.userId,
          logType: 'manual_retrain_accident_model',
          ipAddress: getClientIP(req),
          status: 'failed',
          details: `Manual retrain failed: ${err.message}`
        });
      } catch (logError) {
        console.error('Failed to log retrain error:', logError.message);
      }
    }

    return res.status(500).json({
      success: false,
      message: err.message,
      error: 'Failed to retrain model'
    });
  }
};

// Cancel retrain accident model endpoint with logging
export const cancelRetrainAccidentModel = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const userId = req.user.userId;
    const ipAddress = getClientIP(req);
    
    // Get Flask API base URL from environment or use default
    const flaskApiBase = process.env.ACCIDENT_PREDICTION_API_URL || 
                         (process.env.NODE_ENV === 'production' 
                           ? 'http://localhost:5004' 
                           : 'http://localhost:5004');
    
    const cancelUrl = `${flaskApiBase}/api/accidents/cancel-training`;
    
    // Forward the request to Flask API
    const response = await fetch(cancelUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    // Log the cancel action
    const logStatus = response.ok && data.success ? 'success' : 'failed';
    const logDetails = response.ok && data.success 
      ? 'Training cancellation requested successfully'
      : `Cancel retrain failed: ${data.error || data.message || 'Unknown error'}`;

    try {
      await logUserActivity({
        userId: userId,
        logType: 'cancel_retrain_accident_model',
        ipAddress: ipAddress,
        status: logStatus,
        details: logDetails
      });
    } catch (logError) {
      console.error('Failed to log cancel retrain activity:', logError.message);
      // Continue even if logging fails
    }

    // Return the Flask API response
    return res.status(response.status).json(data);
  } catch (err) {
    // Log as failed if there's an error
    if (req.user && req.user.userId) {
      try {
        await logUserActivity({
          userId: req.user.userId,
          logType: 'cancel_retrain_accident_model',
          ipAddress: getClientIP(req),
          status: 'failed',
          details: `Cancel retrain failed: ${err.message}`
        });
      } catch (logError) {
        console.error('Failed to log cancel retrain error:', logError.message);
      }
    }

    return res.status(500).json({
      success: false,
      message: err.message,
      error: 'Failed to cancel training'
    });
  }
};