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
import { getVehicleStatus, getVehicleStatusDescription, calculateExpirationDate, getExpirationInfo } from "../util/plateStatusCalculator.js";

export const createVehicle = async (req, res) => {
  const { plateNo, fileNo, driverId } = req.body;
  
  // Debug: Log the request body to see what's being received
  console.log('Vehicle creation request body:', req.body);
  console.log('vehicleStatusType received:', req.body.vehicleStatusType);
  
  try {
    // Validate required fields
    if (!plateNo || !fileNo || !driverId) {
      return res.status(400).json({
        success: false,
        message: "plateNo, fileNo, and driverId are required",
      });
    }

    // Check if plate number is already taken
    const plateNoTaken = await VehicleModel.findOne({ plateNo });

    if (plateNoTaken) {
      return res.status(400).json({
        success: false,
        message: "Vehicle already registered",
      });
    }

    // Check if driver exists
    console.log(`Looking for driver with ID: ${driverId}`);
    const driver = await DriverModel.findById(driverId);
    if (!driver) {
      console.error(`Driver with ID ${driverId} not found`);
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }
    console.log(`Found driver: ${driver.ownerRepresentativeName} (${driver._id})`);

    // Calculate status based on plate number, date of renewal, and vehicle status type
    const dateOfRenewal = req.body.dateOfRenewal || null;
    const vehicleStatusType = req.body.vehicleStatusType || "Old";
    const plateBasedStatus = getVehicleStatus(plateNo, dateOfRenewal);
    const expirationDate = calculateExpirationDate(plateNo, dateOfRenewal, vehicleStatusType);
    
    // Use plate-based status calculation
    const status = plateBasedStatus;
    
    // Map frontend field names to database field names
    const vehicleData = {
      ...req.body,
      serialChassisNumber: req.body.chassisNo, // Map chassisNo to serialChassisNumber
      status,
      driverId, // Add the driverId reference
      // Add calculated expiration date if not manually provided
      dateOfRenewal: dateOfRenewal || expirationDate,
      // Use the processed vehicleStatusType with fallback
      vehicleStatusType: vehicleStatusType
    };
    
    // Remove the original chassisNo field to avoid confusion
    delete vehicleData.chassisNo;
    
    // Ensure no old chassisNo field exists
    if (vehicleData.chassisNo !== undefined) {
      delete vehicleData.chassisNo;
    }
    
    // Handle empty ownerId field - convert empty string to null
    if (vehicleData.ownerId === "" || vehicleData.ownerId === undefined) {
      vehicleData.ownerId = null;
    }

    // Debug: Log the data being saved to database
    console.log('Data being saved to database:', vehicleData);
    console.log('vehicleStatusType in vehicleData:', vehicleData.vehicleStatusType);
    console.log('Keys in vehicleData:', Object.keys(vehicleData));
    console.log('vehicleStatusType explicitly set:', vehicleData.vehicleStatusType);

    // Test the schema validation before saving
    console.log('Testing schema validation with vehicleData:', vehicleData);
    const testVehicle = new VehicleModel(vehicleData);
    const validationError = testVehicle.validateSync();
    if (validationError) {
      console.error('Schema validation error:', validationError);
      console.error('Validation error details:', validationError.errors);
    } else {
      console.log('Schema validation passed');
      console.log('Test vehicle vehicleStatusType:', testVehicle.vehicleStatusType);
    }

    let vehicle;
    try {
      vehicle = await VehicleModel.create(vehicleData);
      
      // Debug: Log the created vehicle to see what was actually saved
      console.log('Vehicle created successfully:', vehicle);
      console.log('vehicleStatusType in created vehicle:', vehicle.vehicleStatusType);
      console.log('All fields in created vehicle:', Object.keys(vehicle.toObject()));
      
      // Double-check by querying the database directly
      const savedVehicle = await VehicleModel.findById(vehicle._id);
      console.log('VehicleStatusType from database query:', savedVehicle?.vehicleStatusType);
      console.log('Full vehicle from database:', savedVehicle);
      
      // Test if the field exists in the raw database document
      const rawVehicle = await VehicleModel.findById(vehicle._id).lean();
      console.log('Raw vehicle document from database:', rawVehicle);
      console.log('vehicleStatusType in raw document:', rawVehicle?.vehicleStatusType);
    } catch (createError) {
      console.error('Error creating vehicle:', createError);
      console.error('Validation errors:', createError.errors);
      throw createError;
    }

    // Update driver's vehicleIds array with the new vehicle ID
    try {
      console.log(`Attempting to update driver ${driverId} with vehicle ID: ${vehicle._id}`);
      
      // First, check if driver exists and get current state
      const driverBeforeUpdate = await DriverModel.findById(driverId);
      console.log(`Driver before update - vehicleIds: ${driverBeforeUpdate?.vehicleIds?.length || 0}`);
      
      // Ensure vehicleIds array exists and is initialized
      if (!driverBeforeUpdate.vehicleIds) {
        console.log(`Initializing vehicleIds array for driver ${driverId}`);
        await DriverModel.findByIdAndUpdate(
          driverId,
          { $set: { vehicleIds: [] } }
        );
      }
      
      // Add the vehicle ID to the array
      const updatedDriver = await DriverModel.findByIdAndUpdate(
        driverId,
        {
          $push: {
            vehicleIds: vehicle._id
          }
        },
        { new: true }
      );
      
      if (updatedDriver) {
        console.log(`Successfully updated driver ${driverId} with vehicle ID: ${vehicle._id}`);
        console.log(`Driver now has ${updatedDriver.vehicleIds.length} vehicles`);
        console.log(`Vehicle IDs: ${updatedDriver.vehicleIds.map(id => id.toString())}`);
      } else {
        console.error(`Driver with ID ${driverId} not found for update`);
      }
    } catch (driverUpdateError) {
      console.error('Error updating driver vehicleIds array:', driverUpdateError);
      console.error('Error details:', driverUpdateError.message);
      // Don't fail the vehicle creation if driver update fails
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
        vehicleStatusType:data.vehicleStatusType,
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
      vehicleStatusType: vehicle.vehicleStatusType, // Include vehicleStatusType
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

      // Handle driver plate number synchronization
      const oldDriverId = currentVehicle.driver;
      const newDriverId = updateData.driver;
      const oldPlateNo = currentVehicle.plateNo;
      const newPlateNo = updateData.plateNo;

      // If driver changed, update both old and new drivers
      if (oldDriverId !== newDriverId) {
        // Remove plate from old driver
        if (oldDriverId) {
          try {
            const oldDriver = await DriverModel.findById(oldDriverId);
            if (oldDriver) {
              oldDriver.plateNo = oldDriver.plateNo.filter(plate => plate !== oldPlateNo);
              await oldDriver.save();
              console.log(`Removed plate ${oldPlateNo} from old driver ${oldDriver._id}`);
            }
          } catch (error) {
            console.error('Error updating old driver:', error);
          }
        }

        // Add plate to new driver
        if (newDriverId) {
          try {
            const newDriver = await DriverModel.findById(newDriverId);
            if (newDriver && !newDriver.plateNo.includes(newPlateNo)) {
              newDriver.plateNo.push(newPlateNo);
              await newDriver.save();
              console.log(`Added plate ${newPlateNo} to new driver ${newDriver._id}`);
            }
          } catch (error) {
            console.error('Error updating new driver:', error);
          }
        }
      } else if (oldPlateNo !== newPlateNo && newDriverId) {
        // Same driver but plate number changed
        try {
          const driver = await DriverModel.findById(newDriverId);
          if (driver) {
            // Remove old plate and add new plate
            driver.plateNo = driver.plateNo.filter(plate => plate !== oldPlateNo);
            if (!driver.plateNo.includes(newPlateNo)) {
              driver.plateNo.push(newPlateNo);
            }
            await driver.save();
            console.log(`Updated driver ${driver._id}: removed ${oldPlateNo}, added ${newPlateNo}`);
          }
        } catch (error) {
          console.error('Error updating driver plate change:', error);
        }
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

    // Update driver's plateNo array to remove the deleted vehicle's plate number
    if (vehicle.driver) {
      try {
        const driver = await DriverModel.findById(vehicle.driver);
        if (driver) {
          // Remove the plate number from driver's plateNo array
          driver.plateNo = driver.plateNo.filter(plate => plate !== vehicle.plateNo);
          await driver.save();
          console.log(`Removed plate ${vehicle.plateNo} from driver ${driver._id}`);
        }
      } catch (driverUpdateError) {
        console.error('Error updating driver plateNo array:', driverUpdateError);
        // Don't fail the vehicle deletion if driver update fails
      }
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

// Get vehicle by file number
export const getVehicleByFileNumber = async (req, res) => {
  const { fileNo } = req.params;
  
  try {
    const vehicle = await VehicleModel.findOne({ fileNo });
    
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
      status: currentStatus, // Use numeric status ("1" or "0")
      vehicleStatusType: vehicle.vehicleStatusType,
      expirationInfo: expirationInfo // Include expiration details
    };

    res.status(200).json({
      success: true,
      data: vehicleDetails,
    });
  } catch (err) {
    console.error("Get vehicle by file number error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Safe endpoint to fix driver-vehicle relationships
export const fixDriverVehicleRelationships = async (req, res) => {
  try {
    console.log("Starting driver-vehicle relationship fix...");
    
    // Get all vehicles with driverId
    const vehicles = await VehicleModel.find({ driverId: { $exists: true, $ne: null } });
    console.log(`Found ${vehicles.length} vehicles with driver references`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const vehicle of vehicles) {
      try {
        console.log(`Processing vehicle: ${vehicle.plateNo} (${vehicle._id})`);
        
        // Find the driver
        const driver = await DriverModel.findById(vehicle.driverId);
        if (!driver) {
          console.log(`  Driver not found for vehicle ${vehicle.plateNo}`);
          errorCount++;
          continue;
        }

        // Initialize vehicleIds array if it doesn't exist
        if (!driver.vehicleIds) {
          await DriverModel.findByIdAndUpdate(
            driver._id,
            { $set: { vehicleIds: [] } }
          );
          console.log(`  Initialized vehicleIds array for driver ${driver.ownerRepresentativeName}`);
        }

        // Check if vehicle ID is already in the array
        const vehicleIdExists = driver.vehicleIds.some(id => id.toString() === vehicle._id.toString());
        
        if (!vehicleIdExists) {
          // Add vehicle ID to driver's vehicleIds array
          await DriverModel.findByIdAndUpdate(
            driver._id,
            {
              $push: {
                vehicleIds: vehicle._id
              }
            }
          );
          console.log(`  Added vehicle ${vehicle._id} to driver's vehicleIds array`);
          fixedCount++;
        } else {
          console.log(`  Vehicle ${vehicle._id} already in driver's vehicleIds array`);
        }
      } catch (vehicleError) {
        console.error(`Error processing vehicle ${vehicle.plateNo}:`, vehicleError.message);
        errorCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: "Driver-vehicle relationship fix completed",
      fixedCount,
      errorCount,
      totalVehicles: vehicles.length
    });
    
  } catch (error) {
    console.error("Fix failed:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
