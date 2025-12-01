import OwnerModel from "../model/OwnerModel.js";
import VehicleModel from "../model/VehicleModel.js";
import UserModel from "../model/UserModel.js";
import { logUserActivity, getClientIP, getUserAgent } from "../util/userLogger.js";

export const createDriver = async (req, res) => {
  const { driversLicenseNumber, emailAddress } = req.body;
  try {
    // Check if driver with drivers license number already exists
    if (driversLicenseNumber) {
      const existingDriver = await OwnerModel.findOne({ driversLicenseNumber });
      if (existingDriver) {
        return res.status(400).json({
          success: false,
          message: "Driver with this drivers license number already exists",
        });
      }
    }

    // Check if driver with email already exists (only if email is provided)
    if (emailAddress && emailAddress.trim() !== '') {
      const existingEmailDriver = await OwnerModel.findOne({ emailAddress });
      if (existingEmailDriver) {
        return res.status(400).json({
          success: false,
          message: "Driver with this email address already exists",
        });
      }
    }

    const driverData = { ...req.body };
    
    // Initialize vehicleIds array
    driverData.vehicleIds = [];
    
    // Clean up optional fields - convert empty strings and undefined to null
    if (!driverData.contactNumber || driverData.contactNumber === '' || driverData.contactNumber === undefined) {
      driverData.contactNumber = null;
    }
    if (!driverData.emailAddress || driverData.emailAddress === '' || driverData.emailAddress === undefined) {
      driverData.emailAddress = null;
    }
    if (!driverData.birthDate || driverData.birthDate === '' || driverData.birthDate === undefined) {
      driverData.birthDate = null;
    }

    // const accCreated = await generateUserAcc(birthDate, lastName, firstName);
    
    // // Attach the generated user account ID to the request body
    // req.body.userAccount = accCreated._id;
    
    // Add user tracking fields with SuperAdmin fallback
    let userId;
    if (req.user && req.user.userId) {
      userId = req.user.userId;
    } else {
      // Find a superadmin
      const superadmin = await UserModel.findOne({ role: "0" }).select("_id");
      userId = superadmin ? superadmin._id : null;
    }

    const userTrackingData = {
      ...driverData,
      createdBy: userId,
      updatedBy: null // Only set when actually updated
    };
    
    const newDriver = await OwnerModel.create(userTrackingData);

    // Populate driver and user information
    await newDriver.populate([
      { path: "createdBy", select: "firstName middleName lastName" },
      { path: "updatedBy", select: "firstName middleName lastName" }
    ]);

    // Log the activity
    if (req.user) {
      // Fetch full user details from database since JWT only contains userId, role, email
      const fullUser = await UserModel.findById(req.user.userId);
      if (fullUser) {
        await logUserActivity({
          userId: fullUser._id,
          logType: 'add_driver',
          ipAddress: getClientIP(req),
          status: 'success',
          details: `Added owner: ${req.body.ownerRepresentativeName} (License: ${driversLicenseNumber || 'N/A'})`
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "Owner registered successfully",
      data: newDriver
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getDrivers = async (req, res) => {
  try {
    const { page = 1, limit, search, fetchAll } = req.query;
    
    // If fetchAll is true, don't apply pagination
    const isFetchAll = fetchAll === 'true' || fetchAll === true || fetchAll === '1' || fetchAll === 1;
    const shouldPaginate = !isFetchAll;
    const limitValue = shouldPaginate ? (parseInt(limit) || 100) : null;
    const skip = shouldPaginate ? (page - 1) * limitValue : 0;

    let query = { deletedAt: null };

    // Add search functionality
    if (search) {
      query.$or = [
        { ownerRepresentativeName: { $regex: search, $options: "i" } },
        { contactNumber: { $regex: search, $options: "i" } },
        { emailAddress: { $regex: search, $options: "i" } },
        { driversLicenseNumber: { $regex: search, $options: "i" } },
      ];
    }

    // OPTIMIZATION: Select only fields needed for listing page
    // Reduces payload size and improves query performance
    // Indexes used: createdAt (for sorting), deletedAt (for filtering)
    let driversQuery = OwnerModel.find(query)
      .select("fullname ownerRepresentativeName contactNumber emailAddress hasDriversLicense driversLicenseNumber birthDate address isActive vehicleIds createdBy updatedBy createdAt updatedAt")
      .populate('vehicleIds', 'plateNo fileNo make bodyType color status')
      .populate('createdBy', 'firstName middleName lastName')
      .populate('updatedBy', 'firstName middleName lastName')
      .sort({createdAt:-1});

    // Only apply skip and limit if pagination is enabled
    if (shouldPaginate) {
      driversQuery = driversQuery.skip(skip);
      if (limitValue) {
        driversQuery = driversQuery.limit(limitValue);
      }
    }

    const drivers = await driversQuery;
    const total = await OwnerModel.countDocuments(query);

    // Return drivers with their vehicle information and user tracking
    const driversWithVehicles = drivers.map(driver => {
      const driverObj = driver.toObject();
      // Add vehicle count for quick reference
      driverObj.vehicleCount = driverObj.vehicleIds ? driverObj.vehicleIds.length : 0;
      
      // Add user tracking with populated names
      driverObj.createdBy = driverObj.createdBy ? {
        _id: driverObj.createdBy._id,
        name: `${driverObj.createdBy.firstName} ${driverObj.createdBy.lastName}`.trim()
      } : null;
      
      driverObj.updatedBy = driverObj.updatedBy ? {
        _id: driverObj.updatedBy._id,
        name: `${driverObj.updatedBy.firstName} ${driverObj.updatedBy.lastName}`.trim()
      } : null;
      
      return driverObj;
    });

    res.status(200).json({
      success: true,
      data: driversWithVehicles,
      pagination: {
        current: shouldPaginate ? parseInt(page) : 1,
        pages: shouldPaginate ? Math.ceil(total / (limitValue || 100)) : 1,
        total,
        limit: limitValue || null,
        fetchAll: !shouldPaginate,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const findDriver = async (req, res) => {
  const ownerId = req.params.id;
  try {
    const driver = await OwnerModel.findOne({ _id: ownerId, deletedAt: null })
      .select("fullname ownerRepresentativeName contactNumber emailAddress hasDriversLicense driversLicenseNumber birthDate address isActive vehicleIds createdBy updatedBy createdAt updatedAt")
      .populate('vehicleIds', 'plateNo fileNo make bodyType color status dateOfRenewal')
      .populate('createdBy', 'firstName middleName lastName')
      .populate('updatedBy', 'firstName middleName lastName');

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Owner not found",
      });
    }

    const driverWithCalculatedStatus = driver.toObject();

    res.status(200).json({
      success: true,
      data: driverWithCalculatedStatus,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const updateDriver = async (req, res) => {
  const ownerId = req.params.id;
  try {
    let updateData = { ...req.body };
    
    // Convert plateNo to array if it's a string
    if (updateData.plateNo && typeof updateData.plateNo === 'string') {
      updateData.plateNo = updateData.plateNo.split(',').map(plate => plate.trim()).filter(plate => plate.length > 0);
    }
    
    // Clean up optional fields - convert empty strings and undefined to null
    if (!updateData.contactNumber || updateData.contactNumber === '' || updateData.contactNumber === undefined) {
      updateData.contactNumber = null;
    }
    if (!updateData.emailAddress || updateData.emailAddress === '' || updateData.emailAddress === undefined) {
      updateData.emailAddress = null;
    }
    if (!updateData.fileNo || updateData.fileNo === '' || updateData.fileNo === undefined) {
      updateData.fileNo = null;
    }
    if (!updateData.birthDate || updateData.birthDate === '' || updateData.birthDate === undefined) {
      updateData.birthDate = null;
    }
    
    
    // Add user tracking for update
    const userId = req.user ? req.user.userId : null;
    
    const updateDataWithUser = {
      ...updateData,
      updatedBy: userId
    };
    
    const driver = await OwnerModel.findByIdAndUpdate(
      ownerId, 
      updateDataWithUser,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'firstName middleName lastName')
      .populate('updatedBy', 'firstName middleName lastName');

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Owner not found",
      });
    }

    // Log the activity
    if (req.user) {
      // Fetch full user details from database since JWT only contains userId, role, email
      const fullUser = await UserModel.findById(req.user.userId);
      if (fullUser) {
        await logUserActivity({
          userId: fullUser._id,
          logType: 'update_driver',
          ipAddress: getClientIP(req),
          status: 'success',
          details: `Updated driver: ${driver.ownerRepresentativeName} (License: ${driver.driversLicenseNumber || 'N/A'})`
        });
      }
    }


    res.status(200).json({
      success: true,
      message: "Owner updated",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Soft delete driver (move to bin)
export const deleteDriver = async (req, res) => {
  const ownerId = req.params.id;
  try {
    const driver = await OwnerModel.findById(ownerId);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Owner not found",
      });
    }

    if (driver.deletedAt) {
      return res.status(400).json({
        success: false,
        message: "Owner is already deleted",
      });
    }

    // Check if owner has vehicles
    if (driver.vehicleIds && Array.isArray(driver.vehicleIds) && driver.vehicleIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete owner with associated vehicles. Please remove or reassign vehicles first.",
      });
    }

    // Soft delete by setting deletedAt
    driver.deletedAt = new Date();
    driver.updatedBy = req.user ? req.user.userId : null;
    await driver.save();

    // Log the activity before deleting
    if (req.user) {
      // Fetch full user details from database since JWT only contains userId, role, email
      const fullUser = await UserModel.findById(req.user.userId);
      if (fullUser) {
          await logUserActivity({
            userId: fullUser._id,
            logType: 'delete_driver',
            ipAddress: getClientIP(req),
            status: 'success',
            details: `Owner moved to bin: ${driver.ownerRepresentativeName} (License: ${driver.driversLicenseNumber || 'N/A'})`
          });
      }
    }

    res.status(200).json({
      success: true,
      message: "Owner moved to bin successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Get deleted drivers (bin)
export const getDeletedDrivers = async (req, res) => {
  try {
    const { page = 1, limit, search, fetchAll } = req.query;
    
    // If fetchAll is true, don't apply pagination
    const isFetchAll = fetchAll === 'true' || fetchAll === true || fetchAll === '1' || fetchAll === 1;
    const shouldPaginate = !isFetchAll;
    const limitValue = shouldPaginate ? (parseInt(limit) || 100) : null;
    const skip = shouldPaginate ? (page - 1) * limitValue : 0;

    let query = { deletedAt: { $ne: null } }; // Only deleted items

    // Add search functionality
    if (search) {
      query.$or = [
        { ownerRepresentativeName: { $regex: search, $options: "i" } },
        { contactNumber: { $regex: search, $options: "i" } },
        { emailAddress: { $regex: search, $options: "i" } },
      ];
    }

    // OPTIMIZATION: Select only fields needed for listing page
    let driversQuery = OwnerModel.find(query)
      .select("fullname ownerRepresentativeName contactNumber emailAddress hasDriversLicense driversLicenseNumber birthDate address isActive vehicleIds createdBy updatedBy createdAt updatedAt deletedAt")
      .populate('vehicleIds', 'plateNo fileNo make bodyType color status')
      .populate('createdBy', 'firstName middleName lastName')
      .populate('updatedBy', 'firstName middleName lastName')
      .sort({ deletedAt: -1 });

    // Only apply skip and limit if pagination is enabled
    if (shouldPaginate) {
      driversQuery = driversQuery.skip(skip);
      if (limitValue) {
        driversQuery = driversQuery.limit(limitValue);
      }
    }

    const drivers = await driversQuery;
    const total = await OwnerModel.countDocuments(query);

    res.status(200).json({
      success: true,
      data: drivers,
      pagination: {
        current: shouldPaginate ? parseInt(page) : 1,
        pages: shouldPaginate ? Math.ceil(total / (limitValue || 100)) : 1,
        total,
        limit: limitValue || null,
        fetchAll: !shouldPaginate,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Restore driver from bin
export const restoreDriver = async (req, res) => {
  try {
    const driver = await OwnerModel.findById(req.params.id);
    
    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: "Owner not found" 
      });
    }

    if (!driver.deletedAt) {
      return res.status(400).json({
        success: false,
        message: "Owner is not deleted",
      });
    }

    // Restore by clearing deletedAt
    driver.deletedAt = null;
    driver.updatedBy = req.user ? req.user.userId : null;
    await driver.save();

    // Log the activity
    if (req.user && req.user.userId) {
      try {
        const fullUser = await UserModel.findById(req.user.userId);
        if (fullUser) {
          await logUserActivity({
            userId: fullUser._id,
            logType: 'restore_driver',
            ipAddress: getClientIP(req),
            status: 'success',
            details: `Owner restored from bin: ${driver.ownerRepresentativeName} (License: ${driver.driversLicenseNumber || 'N/A'})`
          });
        }
      } catch (logError) {
        console.error('Failed to log user activity:', logError.message);
      }
    }
    
    res.json({ 
      success: true, 
      message: "Owner restored successfully",
      data: driver
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Permanently delete driver
export const permanentDeleteDriver = async (req, res) => {
  try {
    const driver = await OwnerModel.findById(req.params.id);
    
    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: "Owner not found" 
      });
    }

    if (!driver.deletedAt) {
      return res.status(400).json({
        success: false,
        message: "Owner must be in bin before permanent deletion",
      });
    }

    // Check if owner has vehicles
    if (driver.vehicleIds && Array.isArray(driver.vehicleIds) && driver.vehicleIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot permanently delete owner with associated vehicles. Please remove or reassign vehicles first.",
      });
    }

    const ownerName = driver.ownerRepresentativeName;
    const licenseNumber = driver.driversLicenseNumber || 'N/A';

    // Permanently delete from database
    await OwnerModel.findByIdAndDelete(req.params.id);

    // Log the activity
    if (req.user && req.user.userId) {
      try {
        const fullUser = await UserModel.findById(req.user.userId);
        if (fullUser) {
          await logUserActivity({
            userId: fullUser._id,
            logType: 'permanent_delete_driver',
            ipAddress: getClientIP(req),
            status: 'success',
            details: `Owner permanently deleted: ${ownerName} (License: ${licenseNumber})`
          });
        }
      } catch (logError) {
        console.error('Failed to log user activity:', logError.message);
      }
    }
    
    res.json({ 
      success: true, 
      message: "Owner permanently deleted successfully" 
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};


// Search drivers by name for vehicle form
export const searchDrivers = async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name search term must be at least 2 characters long",
      });
    }

    const drivers = await OwnerModel.find({
      ownerRepresentativeName: { $regex: name.trim(), $options: 'i' },
      deletedAt: null // Exclude deleted items
    }).lean();

    res.status(200).json({
      success: true,
      data: drivers,
    });
  } catch (err) {
    console.error('Error in searchDrivers:', err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

