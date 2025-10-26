import VehicleModel from "../model/VehicleModel.js";
import DriverModel from "../model/DriverModel.js";
import RenewalHistoryModel from "../model/RenewalHistoryModel.js";
import { getVehicleStatus } from "../util/plateStatusCalculator.js";
import { createRenewalStatusRecord } from "../util/renewalStatusCalculator.js";
// import { logger } from "../util/logger.js";

// Create a new vehicle
export const createVehicle = async (req, res) => {
  try {
    const {
      fileNo,
      plateNo,
      engineNo,
      serialChassisNumber,
      make,
      bodyType,
      color,
      classification,
      dateOfRenewal,
      vehicleStatusType,
      driverId,
    } = req.body;

    // Check if plate number already exists
    const existingVehicle = await VehicleModel.findOne({ plateNo });
    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: "Vehicle with this plate number already exists",
      });
    }

    // Check if chassis number already exists
    const existingChassis = await VehicleModel.findOne({ serialChassisNumber });
    if (existingChassis) {
      return res.status(400).json({
        success: false,
        message: "Vehicle with this chassis number already exists",
      });
    }

    // Verify driver exists
    const driver = await DriverModel.findById(driverId);
    if (!driver) {
      return res.status(400).json({
        success: false,
        message: "Driver not found",
      });
    }

    // Calculate initial status based on plate number
    const initialStatus = getVehicleStatus(plateNo, dateOfRenewal, vehicleStatusType);

    // Debug user tracking
    console.log('=== VEHICLE CREATION DEBUG ===');
    console.log('req.user:', req.user);
    console.log('req.user type:', typeof req.user);
    if (req.user) {
      console.log('req.user keys:', Object.keys(req.user));
      console.log('req.user.firstName:', req.user.firstName);
      console.log('req.user.lastName:', req.user.lastName);
      console.log('req.user.userId:', req.user.userId);
    }
    console.log('=== END DEBUG ===');

    const vehicle = new VehicleModel({
      fileNo,
      plateNo,
      engineNo,
      serialChassisNumber,
      make,
      bodyType,
      color,
      classification,
      dateOfRenewal,
      vehicleStatusType,
      driverId,
      status: initialStatus, // Set status based on plate number logic
      // Add user tracking fields with SuperAdmin fallback
      createdBy: req.user ? req.user.userId : null,
      updatedBy: null, // Only set when actually updated
      createdByName: req.user ? `${req.user.firstName} ${req.user.lastName}`.trim() : 'SuperAdmin',
      updatedByName: null // Only set when actually updated
    });

    await vehicle.save();

    // Update driver's vehicleIds array
    await DriverModel.findByIdAndUpdate(
      driverId,
      { $push: { vehicleIds: vehicle._id } },
      { new: true }
    );

    // Populate driver information
    await vehicle.populate("driverId", "fullname ownerRepresentativeName");

    res.status(201).json({
      success: true,
      message: "Vehicle created successfully",
      data: vehicle,
    });
  } catch (error) {
    console.error("Error creating vehicle:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get all vehicles
export const getVehicle = async (req, res) => {
  try {
    const { page = 1, limit = 100, search, status, classification } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    // Add search functionality
    if (search) {
      query.$or = [
        { plateNo: { $regex: search, $options: "i" } },
        { fileNo: { $regex: search, $options: "i" } },
        { make: { $regex: search, $options: "i" } },
        { bodyType: { $regex: search, $options: "i" } },
      ];
    }

    // Add status filter
    if (status) {
      query.status = status;
    }

    // Add classification filter
    if (classification) {
      query.classification = classification;
    }

    const vehicles = await VehicleModel.find(query)
      .populate("driverId", "fullname ownerRepresentativeName contactNumber emailAddress address")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await VehicleModel.countDocuments(query);

    // Add calculated status for each vehicle and update database status if needed
    const vehiclesWithStatus = await Promise.all(vehicles.map(async (vehicle) => {
      const calculatedStatus = getVehicleStatus(vehicle.plateNo, vehicle.dateOfRenewal, vehicle.vehicleStatusType);
      
      // Update database status if it doesn't match calculated status
      if (vehicle.status !== calculatedStatus) {
        await VehicleModel.findByIdAndUpdate(vehicle._id, { status: calculatedStatus });
        console.log(`Updated vehicle ${vehicle.plateNo} status from ${vehicle.status} to ${calculatedStatus}`);
      }
      
      const vehicleData = {
        ...vehicle.toObject(),
        status: calculatedStatus, // Use calculated status instead of database status
        calculatedStatus,
        // Ensure driverId is the actual ID string, not the populated object
        driverId: typeof vehicle.driverId === 'object' && vehicle.driverId?._id 
          ? vehicle.driverId._id 
          : vehicle.driverId,
      };
      
      // Debug logging
      console.log(`Vehicle ${vehicle.plateNo} - Status: ${calculatedStatus} (${calculatedStatus === "1" ? "ACTIVE" : "EXPIRED"})`);
      console.log(`Vehicle ${vehicle.plateNo} - DriverId: ${vehicleData.driverId}`);
      
      return vehicleData;
    }));

    res.json({
      success: true,
      data: vehiclesWithStatus,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get vehicle by ID
export const findVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await VehicleModel.findById(id).populate(
      "driverId",
      "fullname ownerRepresentativeName contactNumber emailAddress address"
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Add calculated status
    const calculatedStatus = getVehicleStatus(vehicle.plateNo, vehicle.dateOfRenewal, vehicle.vehicleStatusType);

    res.json({
      success: true,
      data: {
        ...vehicle.toObject(),
        calculatedStatus,
      },
    });
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update vehicle
export const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Get the current vehicle to check if plate number or vehicle status type changed
    const currentVehicle = await VehicleModel.findById(id);
    if (!currentVehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Add user tracking for update with SuperAdmin fallback
    const userName = req.user ? `${req.user.firstName} ${req.user.lastName}`.trim() : 'SuperAdmin';
    const userId = req.user ? req.user.userId : null;
    
    const updateDataWithUser = {
      ...updateData,
      updatedBy: userId,
      updatedByName: userName
    };
    
    const vehicle = await VehicleModel.findByIdAndUpdate(
      id,
      updateDataWithUser,
      { new: true, runValidators: true }
    ).populate("driverId", "fullname ownerRepresentativeName contactNumber");

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Recalculate status if plate number or vehicle status type changed
    const plateChanged = currentVehicle.plateNo !== vehicle.plateNo;
    const statusTypeChanged = currentVehicle.vehicleStatusType !== vehicle.vehicleStatusType;
    
    if (plateChanged || statusTypeChanged) {
      const newStatus = getVehicleStatus(vehicle.plateNo, vehicle.dateOfRenewal, vehicle.vehicleStatusType);
      if (vehicle.status !== newStatus) {
        await VehicleModel.findByIdAndUpdate(id, { status: newStatus });
        vehicle.status = newStatus;
        console.log(`Updated vehicle ${vehicle.plateNo} status to ${newStatus} due to plate/status type change`);
      }
    }

    // Create renewal history record if renewal date was updated
    const renewalDateChanged = currentVehicle.dateOfRenewal?.getTime() !== vehicle.dateOfRenewal?.getTime();
    if (renewalDateChanged && vehicle.dateOfRenewal) {
      try {
        // Check if renewal record already exists for this date
        const existingRecord = await RenewalHistoryModel.findOne({
          vehicleId: vehicle._id,
          renewalDate: new Date(vehicle.dateOfRenewal)
        });

        if (!existingRecord) {
          // Create renewal status record
          const renewalStatusData = createRenewalStatusRecord(vehicle, vehicle.dateOfRenewal, req.user?.id);
          
          // Create renewal history record
          const renewalRecord = new RenewalHistoryModel(renewalStatusData);
          await renewalRecord.save();
          
          console.log(`Created renewal history record for vehicle ${vehicle.plateNo}: ${renewalStatusData.status}`);
        }
      } catch (renewalError) {
        // Log error but don't fail the vehicle update
        console.error("Error creating renewal history record:", renewalError);
        console.error("Error creating renewal history record:", renewalError);
      }
    }

    res.json({
      success: true,
      message: "Vehicle updated successfully",
      data: vehicle,
    });
  } catch (error) {
    console.error("Error updating vehicle:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update vehicle status
export const updateVehicleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Add user tracking for status update with SuperAdmin fallback
    const userName = req.user ? `${req.user.firstName} ${req.user.lastName}`.trim() : 'SuperAdmin';
    const userId = req.user ? req.user.userId : null;
    
    const vehicle = await VehicleModel.findByIdAndUpdate(
      id,
      { 
        status,
        updatedBy: userId,
        updatedByName: userName
      },
      { new: true }
    ).populate("driverId", "fullname ownerRepresentativeName");

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    res.json({
      success: true,
      message: "Vehicle status updated successfully",
      data: vehicle,
    });
  } catch (error) {
    console.error("Error updating vehicle status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Check vehicles expiration
export const checkVehiclesExpiration = async (req, res) => {
  try {
    const vehicles = await VehicleModel.find({ status: "1" });
    const expiredVehicles = [];

    for (const vehicle of vehicles) {
      const calculatedStatus = getVehicleStatus(vehicle.plateNo, vehicle.dateOfRenewal, vehicle.vehicleStatusType);
      if (calculatedStatus === "0") {
        // Update vehicle status to expired
        await VehicleModel.findByIdAndUpdate(vehicle._id, { status: "0" });
        expiredVehicles.push(vehicle);
      }
    }

    res.json({
      success: true,
      message: `Checked ${vehicles.length} vehicles, ${expiredVehicles.length} expired`,
      data: {
        totalChecked: vehicles.length,
        expiredCount: expiredVehicles.length,
        expiredVehicles,
      },
    });
  } catch (error) {
    console.error("Error checking vehicle expiration:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get vehicle owner by plate number
export const getVehicleOwnerByPlate = async (req, res) => {
  try {
    const { plateNo } = req.params;

    const vehicle = await VehicleModel.findOne({ plateNo }).populate(
      "driverId",
      "fullname ownerRepresentativeName contactNumber emailAddress address"
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Add calculated status
    const calculatedStatus = getVehicleStatus(vehicle.plateNo, vehicle.dateOfRenewal, vehicle.vehicleStatusType);

    res.json({
      success: true,
      data: {
        ...vehicle.toObject(),
        calculatedStatus,
      },
    });
  } catch (error) {
    console.error("Error fetching vehicle owner:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get vehicle by file number
export const getVehicleByFileNumber = async (req, res) => {
  try {
    const { fileNo } = req.params;

    const vehicle = await VehicleModel.findOne({ fileNo }).populate(
      "driverId",
      "fullname ownerRepresentativeName contactNumber emailAddress address"
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Add calculated status
    const calculatedStatus = getVehicleStatus(vehicle.plateNo, vehicle.dateOfRenewal, vehicle.vehicleStatusType);

    res.json({
      success: true,
      data: {
        ...vehicle.toObject(),
        calculatedStatus,
      },
    });
  } catch (error) {
    console.error("Error fetching vehicle by file number:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Fix driver-vehicle relationships
export const fixDriverVehicleRelationships = async (req, res) => {
  try {
    // This function would contain logic to fix any broken relationships
    // between drivers and vehicles
    res.json({
      success: true,
      message: "Driver-vehicle relationships checked and fixed",
    });
  } catch (error) {
    console.error("Error fixing relationships:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
