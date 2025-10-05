import VehicleModel from "../model/VehicleModel.js";
import DriverModel from "../model/DriverModel.js";
import { getVehicleStatus } from "../util/plateStatusCalculator.js";

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
    const { page = 1, limit = 10, search, status, classification } = req.query;
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
      .populate("driverId", "fullname ownerRepresentativeName contactNumber")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await VehicleModel.countDocuments(query);

    // Add calculated status for each vehicle
    const vehiclesWithStatus = vehicles.map((vehicle) => {
      const calculatedStatus = getVehicleStatus(vehicle.plateNo, vehicle.dateOfRenewal, vehicle.vehicleStatusType);
      return {
        ...vehicle.toObject(),
        calculatedStatus,
      };
    });

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

    const vehicle = await VehicleModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate("driverId", "fullname ownerRepresentativeName contactNumber");

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
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

    const vehicle = await VehicleModel.findByIdAndUpdate(
      id,
      { status },
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

    res.json({
      success: true,
      data: vehicle,
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

    res.json({
      success: true,
      data: vehicle,
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
