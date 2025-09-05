import DriverModel from "../model/DriverModel.js";
import UserModel from "../model/UserModel.js";
import VehicleModel from "../model/VehicleModel.js";
import { 
  checkDriverExpirationStatus, 
  updateDriverStatusByExpiration,
  checkAllDriversExpiration 
} from "../util/driverStatusChecker.js";
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

    // Set initial status to active (will be updated based on vehicle renewal date)
    const driverData = { ...req.body, status: "1" };
    
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
    const newDriver = await DriverModel.create(driverData);

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
    // First, check and update all drivers' expiration status
    await checkAllDriversExpiration();
    
    const drivers = await DriverModel.find().select("fullname plateNo ownerRepresentativeName contactNumber emailAddress hasDriversLicense driversLicenseNumber birthDate isActive status").sort({createdAt:-1})

    res.status(200).json({
      success: true,
      data: drivers,
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
    const driver = await DriverModel.findById(driverId).select("fullname plateNo ownerRepresentativeName contactNumber emailAddress hasDriversLicense driversLicenseNumber birthDate address isActive status");

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    res.status(200).json({
      success: true,
      data: driver,
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
    
    // Clean up optional fields - convert empty strings and undefined to null
    if (!updateData.contactNumber || updateData.contactNumber === '' || updateData.contactNumber === undefined) {
      updateData.contactNumber = null;
    }
    if (!updateData.emailAddress || updateData.emailAddress === '' || updateData.emailAddress === undefined) {
      updateData.emailAddress = null;
    }
    if (!updateData.birthDate || updateData.birthDate === '' || updateData.birthDate === undefined) {
      updateData.birthDate = null;
    }
    
    // Remove status from updateData to prevent manual status changes
    delete updateData.status;
    
    const driver = await DriverModel.findByIdAndUpdate(driverId, updateData);

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

    // Check and update driver status based on vehicle renewal date
    await checkAllDriversExpiration();

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

// Manual endpoint to check and update all drivers' expiration status
export const checkDriversExpiration = async (req, res) => {
  try {
    const result = await checkAllDriversExpiration();
    
    res.status(200).json({
      success: true,
      message: result.message,
      updatedCount: result.updatedCount
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Block manual status updates - status can only be changed automatically
export const updateDriverStatus = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: "Driver status cannot be manually updated. Status is automatically managed based on renewal date.",
  });
};

