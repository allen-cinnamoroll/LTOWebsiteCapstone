import VehicleModel from "../model/VehicleModel.js";
import UserModel from "../model/UserModel.js";
import DriverModel from "../model/DriverModel.js";
import { logAction } from "../util/logger.js";
import { 
  checkVehicleExpirationStatus, 
  updateVehicleStatusByExpiration,
  checkAllVehiclesExpiration 
} from "../util/vehicleStatusChecker.js";
import { updateDriverStatusByVehicleRenewal } from "../util/driverStatusChecker.js";
import { logUserActivity, getClientIP, getUserAgent } from "../util/userLogger.js";
import { getVehicleStatus, calculateExpirationDate, getExpirationInfo } from "../util/plateStatusCalculator.js";

export const createVehicle = async (req, res) => {
  const plateNo = req.body.plateNo;
  try {
    // Check if plate number is already taken
    const plateNoTaken = await VehicleModel.findOne({ plateNo });

    if (plateNoTaken) {
      return res.status(400).json({
        success: false,
        message: "Vehicle already registered",
      });
    }

    // Calculate status based on plate number and date of renewal
    const dateOfRenewal = req.body.dateOfRenewal || null;
    const plateBasedStatus = getVehicleStatus(plateNo, dateOfRenewal);
    const expirationDate = calculateExpirationDate(plateNo, dateOfRenewal);
    
    // Use plate-based status calculation
    const status = plateBasedStatus;
    
    // Map frontend field names to database field names
    const vehicleData = {
      ...req.body,
      serialChassisNumber: req.body.chassisNo, // Map chassisNo to serialChassisNumber
      status,
      // Add calculated expiration date if not manually provided
      dateOfRenewal: dateOfRenewal || expirationDate
    };
    
    // Remove the original chassisNo field to avoid confusion
    delete vehicleData.chassisNo;
    
    // Ensure no old chassisNo field exists
    if (vehicleData.chassisNo !== undefined) {
      delete vehicleData.chassisNo;
    }
    
    // Handle empty driver field - convert empty string to null
    if (vehicleData.driver === "" || vehicleData.driver === undefined) {
      vehicleData.driver = null;
    }

    const vehicle = await VehicleModel.create(vehicleData);

    // If a driver is specified, update the driver's plateNo list
    if (vehicleData.driver) {
      try {
        const driver = await DriverModel.findById(vehicleData.driver);
        if (driver) {
          // Get current plate numbers and add the new one if not already present
          const currentPlates = Array.isArray(driver.plateNo) ? driver.plateNo : 
                               (driver.plateNo ? driver.plateNo.split(',').map(p => p.trim()) : []);
          
          if (!currentPlates.includes(plateNo)) {
            currentPlates.push(plateNo);
            await DriverModel.findByIdAndUpdate(vehicleData.driver, {
              plateNo: currentPlates
            });
          }
        }
      } catch (driverError) {
        console.error("Error updating driver plateNo:", driverError);
        // Don't fail the vehicle creation if driver update fails
      }
    }

    // Sync driver status if renewal date is provided
    if (req.body.dateOfRenewal) {
      await updateDriverStatusByVehicleRenewal(plateNo, req.body.dateOfRenewal);
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
          logType: 'add_vehicle',
          ipAddress: getClientIP(req),
          userAgent: getUserAgent(req),
          status: 'success',
          details: `Added vehicle: ${plateNo} (${req.body.make} ${req.body.bodyType})`,
          actorId: fullUser._id,
          actorName: `${fullUser.firstName} ${fullUser.middleName ? fullUser.middleName + ' ' : ''}${fullUser.lastName}`.trim(),
          actorEmail: fullUser.email,
          actorRole: fullUser.role
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "Vehicle registered",
    });
  } catch (err) {
    console.error("Vehicle creation error:", err.message);
    console.error("Vehicle creation error details:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getVehicle = async (req, res) => {
  try {
    // First, check and update all vehicles' expiration status
    await checkAllVehiclesExpiration();
    
    const vehicles = await VehicleModel.find().sort({ createdAt: -1 });

    const vehicleDetails = vehicles.map((data) => {
      // Calculate current status based on plate number and date of renewal
      const currentStatus = getVehicleStatus(data.plateNo, data.dateOfRenewal);
      const expirationInfo = getExpirationInfo(data.plateNo, data.dateOfRenewal);
      
      return {
        _id: data._id,
        plateNo: data.plateNo, // This is a single string
        fileNo: data.fileNo,
        engineNo: data.engineNo,
        chassisNo: data.serialChassisNumber, // Map serialChassisNumber back to chassisNo
        make: data.make,
        bodyType: data.bodyType,
        color: data.color,
        classification: data.classification,
        dateOfRenewal: data.dateOfRenewal,
        status: currentStatus, // Use calculated status
        expirationInfo: expirationInfo // Include expiration details
      };
    });

    res.status(200).json({
      success: true,
      data: vehicleDetails,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const findVehicle = async (req, res) => {
  const vehicleId = req.params.id;
  try {
    const vehicle = await VehicleModel.findById(vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Calculate current status based on plate number and date of renewal
    const currentStatus = getVehicleStatus(vehicle.plateNo, vehicle.dateOfRenewal);
    const expirationInfo = getExpirationInfo(vehicle.plateNo, vehicle.dateOfRenewal);

    const vehicleDetails = {
      _id: vehicle._id,
      plateNo: vehicle.plateNo,
      fileNo: vehicle.fileNo,
      engineNo: vehicle.engineNo,
      chassisNo: vehicle.serialChassisNumber, // Map serialChassisNumber back to chassisNo
      make: vehicle.make,
      bodyType: vehicle.bodyType,
      color: vehicle.color,
      classification: vehicle.classification,
      dateOfRenewal: vehicle.dateOfRenewal,
      status: currentStatus, // Use calculated status
      expirationInfo: expirationInfo // Include expiration details
    };

    res.status(200).json({
      success: true,
      data: vehicleDetails,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const updateVehicle = async (req, res) => {
  const vehicleId = req.params.id;

  try {
    let updateData = { ...req.body };
    
    // Map frontend field names to database field names
    if (updateData.chassisNo) {
      updateData.serialChassisNumber = updateData.chassisNo;
      delete updateData.chassisNo;
    }
    
    // Handle empty driver field - convert empty string to null
    if (updateData.driver === "" || updateData.driver === undefined) {
      updateData.driver = null;
    }
    
    // Remove status from updateData to prevent manual status changes
    delete updateData.status;
    
    // Get current vehicle to check plate number
    const currentVehicle = await VehicleModel.findById(vehicleId);
    if (!currentVehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }
    
    // Calculate new status based on plate number and date of renewal
    const plateNo = updateData.plateNo || currentVehicle.plateNo;
    const dateOfRenewal = updateData.dateOfRenewal || currentVehicle.dateOfRenewal;
    const plateBasedStatus = getVehicleStatus(plateNo, dateOfRenewal);
    const calculatedExpirationDate = calculateExpirationDate(plateNo, dateOfRenewal);
    
    // If date of renewal is being updated, use that; otherwise use calculated date
    if (req.body.dateOfRenewal) {
      const updatedVehicle = await updateVehicleStatusByExpiration(
        vehicleId, 
        req.body.dateOfRenewal
      );
      
      if (!updatedVehicle) {
        return res.status(404).json({
          success: false,
          message: "Vehicle not found",
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
            logType: 'update_vehicle',
            ipAddress: getClientIP(req),
            userAgent: getUserAgent(req),
            status: 'success',
            details: `Updated vehicle: ${updatedVehicle.plateNo} (${updatedVehicle.make} ${updatedVehicle.bodyType}) with status adjustment`,
            actorId: fullUser._id,
            actorName: `${fullUser.firstName} ${fullUser.middleName ? fullUser.middleName + ' ' : ''}${fullUser.lastName}`.trim(),
            actorEmail: fullUser.email,
            actorRole: fullUser.role
          });
        }
      }
      
      // Sync driver status with the new renewal date
      await updateDriverStatusByVehicleRenewal(updatedVehicle.plateNo, req.body.dateOfRenewal);
      
      res.status(200).json({
        success: true,
        message: "Vehicle updated with automatic status adjustment and driver sync",
        data: {
          status: updatedVehicle.status,
          dateOfRenewal: updatedVehicle.dateOfRenewal
        }
      });
    } else {
      // Regular update - use plate-based status and expiration date
      updateData.status = plateBasedStatus;
      updateData.dateOfRenewal = updateData.dateOfRenewal || calculatedExpirationDate;
      
      const vehicle = await VehicleModel.findByIdAndUpdate(vehicleId, updateData);

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: "Vehicle not found",
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
            logType: 'update_vehicle',
            ipAddress: getClientIP(req),
            userAgent: getUserAgent(req),
            status: 'success',
            details: `Updated vehicle: ${vehicle.plateNo} (${vehicle.make} ${vehicle.bodyType})`,
            actorId: fullUser._id,
            actorName: `${fullUser.firstName} ${fullUser.middleName ? fullUser.middleName + ' ' : ''}${fullUser.lastName}`.trim(),
            actorEmail: fullUser.email,
            actorRole: fullUser.role
          });
        }
      }

      // Handle driver plate number synchronization if driver is being updated
      if (updateData.driver !== undefined) {
        try {
          const updatedVehicle = await VehicleModel.findById(vehicleId);
          if (updatedVehicle) {
            // If a driver is specified, update the driver's plateNo list
            if (updateData.driver) {
              const driver = await DriverModel.findById(updateData.driver);
              if (driver) {
                // Get current plate numbers and add the new one if not already present
                const currentPlates = Array.isArray(driver.plateNo) ? driver.plateNo : 
                                     (driver.plateNo ? driver.plateNo.split(',').map(p => p.trim()) : []);
                
                if (!currentPlates.includes(updatedVehicle.plateNo)) {
                  currentPlates.push(updatedVehicle.plateNo);
                  await DriverModel.findByIdAndUpdate(updateData.driver, {
                    plateNo: currentPlates
                  });
                }
              }
            }
            // If driver is being set to null, we could remove the plate from the old driver
            // but that's more complex and might not be necessary for this use case
          }
        } catch (driverError) {
          console.error("Error updating driver plateNo during vehicle update:", driverError);
          // Don't fail the vehicle update if driver update fails
        }
      }

      res.status(200).json({
        success: true,
        message: "Vehicle updated",
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Delete vehicle
export const deleteVehicle = async (req, res) => {
  const vehicleId = req.params.id;
  try {
    const vehicle = await VehicleModel.findById(vehicleId);
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
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
          logType: 'delete_vehicle',
          ipAddress: getClientIP(req),
          userAgent: getUserAgent(req),
          status: 'success',
          details: `Deleted vehicle: ${vehicle.plateNo} (${vehicle.make} ${vehicle.bodyType})`,
          actorId: fullUser._id,
          actorName: `${fullUser.firstName} ${fullUser.middleName ? fullUser.middleName + ' ' : ''}${fullUser.lastName}`.trim(),
          actorEmail: fullUser.email,
          actorRole: fullUser.role
        });
      }
    }

    await VehicleModel.findByIdAndDelete(vehicleId);

    res.status(200).json({
      success: true,
      message: "Vehicle deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Manual endpoint to check and update all vehicles' expiration status
export const checkVehiclesExpiration = async (req, res) => {
  try {
    const result = await checkAllVehiclesExpiration();
    
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
export const updateVehicleStatus = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: "Vehicle status cannot be manually updated. Status is automatically managed based on expiration date.",
  });
};

// Get vehicle owner information by plate number
export const getVehicleOwnerByPlate = async (req, res) => {
  const { plateNo } = req.params;
  
  try {
    // Find the vehicle first
    const vehicle = await VehicleModel.findOne({ plateNo });
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }
    
    // Find the driver/owner by plate number (handle array format)
    const driver = await DriverModel.findOne({ plateNo: { $in: [plateNo] } });
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Vehicle owner not found",
      });
    }
    
    // Get expiration info using plate-based calculation
    const expirationInfo = getExpirationInfo(plateNo, vehicle.dateOfRenewal);
    
    // Calculate current status using plate-based calculation for consistency
    const currentStatus = getVehicleStatus(plateNo, vehicle.dateOfRenewal);
    
    res.status(200).json({
      success: true,
      data: {
        vehicle: {
          _id: vehicle._id,
          plateNo: vehicle.plateNo, // This is a single string
          make: vehicle.make,
          bodyType: vehicle.bodyType,
          color: vehicle.color,
          dateOfRenewal: vehicle.dateOfRenewal,
          status: currentStatus // Use calculated status instead of database status
        },
        owner: {
          name: driver.ownerRepresentativeName,
          address: driver.address,
          contactNumber: driver.contactNumber,
          emailAddress: driver.emailAddress,
          driversLicenseNumber: driver.driversLicenseNumber
        },
        expirationInfo: expirationInfo
      }
    });
  } catch (err) {
    console.error("Get vehicle owner error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
