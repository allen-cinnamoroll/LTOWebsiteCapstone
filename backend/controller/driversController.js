import DriverModel from "../model/DriverModel.js";
import VehicleModel from "../model/VehicleModel.js";
import UserModel from "../model/UserModel.js";
import { logUserActivity, getClientIP, getUserAgent } from "../util/userLogger.js";

export const createDriver = async (req, res) => {
  const { driversLicenseNumber, emailAddress } = req.body;
  try {
    // Check if driver with drivers license number already exists
    if (driversLicenseNumber) {
      const existingDriver = await DriverModel.findOne({ driversLicenseNumber });
      if (existingDriver) {
        return res.status(400).json({
          success: false,
          message: "Driver with this drivers license number already exists",
        });
      }
    }

    // Check if driver with email already exists (only if email is provided)
    if (emailAddress && emailAddress.trim() !== '') {
      const existingEmailDriver = await DriverModel.findOne({ emailAddress });
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
    console.log('=== DRIVER CREATION DEBUG ===');
    console.log('req.user:', req.user);
    console.log('req.user type:', typeof req.user);
    if (req.user) {
      console.log('req.user keys:', Object.keys(req.user));
      console.log('req.user.firstName:', req.user.firstName);
      console.log('req.user.lastName:', req.user.lastName);
      console.log('req.user.userId:', req.user.userId);
    }
    console.log('=== END DEBUG ===');
    
    const userName = req.user ? `${req.user.firstName} ${req.user.lastName}`.trim() : 'SuperAdmin';
    const userId = req.user ? req.user.userId : null;
    
    const userTrackingData = {
      ...driverData,
      createdBy: userId,
      updatedBy: userId,
      createdByName: userName,
      updatedByName: userName
    };
    
    const newDriver = await DriverModel.create(userTrackingData);

    // Log the activity
    if (req.user) {
      // Fetch full user details from database since JWT only contains userId, role, email
      const fullUser = await UserModel.findById(req.user.userId);
      if (fullUser) {
        await logUserActivity({
          userId: fullUser._id,
          userName: `${fullUser.firstName} ${fullUser.middleName ? fullUser.middleName + ' ' : ''}${fullUser.lastName}`.trim(),
          email: fullUser.email,
          role: fullUser.role,
          logType: 'add_driver',
          ipAddress: getClientIP(req),
          userAgent: getUserAgent(req),
          status: 'success',
          details: `Added driver: ${req.body.ownerRepresentativeName} (License: ${driversLicenseNumber || 'N/A'})`,
          actorId: fullUser._id,
          actorName: `${fullUser.firstName} ${fullUser.middleName ? fullUser.middleName + ' ' : ''}${fullUser.lastName}`.trim(),
          actorEmail: fullUser.email,
          actorRole: fullUser.role
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "Driver registered successfully",
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
    const drivers = await DriverModel.find()
      .select("fullname ownerRepresentativeName contactNumber emailAddress hasDriversLicense driversLicenseNumber birthDate address isActive vehicleIds")
      .populate('vehicleIds', 'plateNo fileNo make bodyType color status')
      .sort({createdAt:-1})

    // Return drivers with their vehicle information
    const driversWithVehicles = drivers.map(driver => {
      const driverObj = driver.toObject();
      // Add vehicle count for quick reference
      driverObj.vehicleCount = driverObj.vehicleIds ? driverObj.vehicleIds.length : 0;
      return driverObj;
    });

    res.status(200).json({
      success: true,
      data: driversWithVehicles,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const findDriver = async (req, res) => {
  const driverId = req.params.id;
  try {
    const driver = await DriverModel.findById(driverId)
      .select("fullname ownerRepresentativeName contactNumber emailAddress hasDriversLicense driversLicenseNumber birthDate address isActive vehicleIds")
      .populate('vehicleIds', 'plateNo fileNo make bodyType color status dateOfRenewal');

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
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
  const driverId = req.params.id;
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
    
    
    // Add user tracking for update with SuperAdmin fallback
    const userName = req.user ? `${req.user.firstName} ${req.user.lastName}`.trim() : 'SuperAdmin';
    const userId = req.user ? req.user.userId : null;
    
    const updateDataWithUser = {
      ...updateData,
      updatedBy: userId,
      updatedByName: userName
    };
    
    const driver = await DriverModel.findByIdAndUpdate(driverId, updateDataWithUser);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // Log the activity
    if (req.user) {
      // Fetch full user details from database since JWT only contains userId, role, email
      const fullUser = await UserModel.findById(req.user.userId);
      if (fullUser) {
        await logUserActivity({
          userId: fullUser._id,
          userName: `${fullUser.firstName} ${fullUser.middleName ? fullUser.middleName + ' ' : ''}${fullUser.lastName}`.trim(),
          email: fullUser.email,
          role: fullUser.role,
          logType: 'update_driver',
          ipAddress: getClientIP(req),
          userAgent: getUserAgent(req),
          status: 'success',
          details: `Updated driver: ${driver.ownerRepresentativeName} (License: ${driver.driversLicenseNumber || 'N/A'})`,
          actorId: fullUser._id,
          actorName: `${fullUser.firstName} ${fullUser.middleName ? fullUser.middleName + ' ' : ''}${fullUser.lastName}`.trim(),
          actorEmail: fullUser.email,
          actorRole: fullUser.role
        });
      }
    }


    res.status(200).json({
      success: true,
      message: "Driver updated",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Delete driver
export const deleteDriver = async (req, res) => {
  const driverId = req.params.id;
  try {
    const driver = await DriverModel.findById(driverId);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    // Log the activity before deleting
    if (req.user) {
      // Fetch full user details from database since JWT only contains userId, role, email
      const fullUser = await UserModel.findById(req.user.userId);
      if (fullUser) {
        await logUserActivity({
          userId: fullUser._id,
          userName: `${fullUser.firstName} ${fullUser.middleName ? fullUser.middleName + ' ' : ''}${fullUser.lastName}`.trim(),
          email: fullUser.email,
          role: fullUser.role,
          logType: 'delete_driver',
          ipAddress: getClientIP(req),
          userAgent: getUserAgent(req),
          status: 'success',
          details: `Deleted driver: ${driver.ownerRepresentativeName} (License: ${driver.driversLicenseNumber || 'N/A'})`,
          actorId: fullUser._id,
          actorName: `${fullUser.firstName} ${fullUser.middleName ? fullUser.middleName + ' ' : ''}${fullUser.lastName}`.trim(),
          actorEmail: fullUser.email,
          actorRole: fullUser.role
        });
      }
    }

    await DriverModel.findByIdAndDelete(driverId);

    res.status(200).json({
      success: true,
      message: "Driver deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// Search drivers by name for vehicle form
export const searchDrivers = async (req, res) => {
  try {
    const { name } = req.query;
    
    console.log('=== SEARCH DRIVERS API CALLED ===');
    console.log('Search term:', name);
    
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name search term must be at least 2 characters long",
      });
    }

    console.log('Querying database for:', name.trim());
    const drivers = await DriverModel.find({
      ownerRepresentativeName: { $regex: name.trim(), $options: 'i' }
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

