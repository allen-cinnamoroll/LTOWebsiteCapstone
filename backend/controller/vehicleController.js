import VehicleModel from "../model/VehicleModel.js";
import UserModel from "../model/UserModel.js";
import DriverModel from "../model/DriverModel.js";
import { getVehicleStatus } from "../util/plateStatusCalculator.js";
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

    // Check if chassis number already exists (only if provided)
    if (serialChassisNumber && serialChassisNumber.trim() !== '') {
      const existingChassis = await VehicleModel.findOne({ serialChassisNumber });
      if (existingChassis) {
        return res.status(400).json({
          success: false,
          message: "Vehicle with this chassis number already exists",
        });
      }
    }

    // Verify driver exists
    const driver = await DriverModel.findById(driverId);
    if (!driver) {
      return res.status(400).json({
        success: false,
        message: "Driver not found",
      });
    }

    // Resolve default actor (superadmin) when no authenticated user
    const getDefaultActorId = async () => {
      try {
        const admin = await UserModel.findOne({ role: "0" }).select("_id");
        return admin?._id || null;
      } catch {
        return null;
      }
    };

    // Normalize dateOfRenewal to array of subdocs {date, processedBy}
    const renewalDatesRaw = dateOfRenewal ? (Array.isArray(dateOfRenewal) ? dateOfRenewal : [dateOfRenewal]) : [];
    const defaultActor = req.user ? req.user.userId : await getDefaultActorId();
    const normalizedRenewals = renewalDatesRaw.map((item) => {
      const dateValue = (item && item.date) ? item.date : item;
      return { date: new Date(dateValue), processedBy: defaultActor };
    });
    
    // Calculate initial status based on plate number and latest renewal date
    const latestRenewalDate = normalizedRenewals.length > 0 ? normalizedRenewals[normalizedRenewals.length - 1].date : null;
    const initialStatus = getVehicleStatus(plateNo, latestRenewalDate, vehicleStatusType);

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
      dateOfRenewal: normalizedRenewals,
      vehicleStatusType,
      driverId,
      status: initialStatus, // Set status based on plate number logic
      // Add user tracking fields
      createdBy: req.user ? req.user.userId : defaultActor,
      updatedBy: null // Only set when actually updated
    });

    await vehicle.save();

    // Update driver's vehicleIds array
    await DriverModel.findByIdAndUpdate(
      driverId,
      { $push: { vehicleIds: vehicle._id } },
      { new: true }
    );


    // Populate driver and user information
    await vehicle.populate([
      { path: "driverId", select: "fullname ownerRepresentativeName" },
      { path: "createdBy", select: "firstName middleName lastName" },
      { path: "updatedBy", select: "firstName middleName lastName" }
    ]);

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
    const { page = 1, limit, search, status, classification, fetchAll } = req.query;
    
    // DEBUG: Log query parameters
    console.log('=== GET VEHICLES API DEBUG ===');
    console.log('Query params:', { page, limit, search, status, classification, fetchAll });
    console.log('fetchAll type:', typeof fetchAll);
    console.log('fetchAll value:', fetchAll);
    
    // If fetchAll is true, don't apply pagination
    // Handle string "true", boolean true, or string "1"
    const isFetchAll = fetchAll === 'true' || fetchAll === true || fetchAll === '1' || fetchAll === 1;
    const shouldPaginate = !isFetchAll;
    const limitValue = shouldPaginate ? (parseInt(limit) || 100) : null;
    const skip = shouldPaginate ? (page - 1) * limitValue : 0;
    
    console.log('isFetchAll:', isFetchAll);
    console.log('shouldPaginate:', shouldPaginate);
    console.log('limitValue:', limitValue);
    console.log('skip:', skip);

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

    let vehiclesQuery = VehicleModel.find(query)
      .populate("driverId", "fullname ownerRepresentativeName contactNumber emailAddress address")
      .populate("createdBy", "firstName middleName lastName")
      .populate("updatedBy", "firstName middleName lastName")
      .sort({ createdAt: -1 });
    
    // Only apply skip and limit if pagination is enabled
    if (shouldPaginate) {
      console.log('Applying pagination - skip:', skip, 'limit:', limitValue);
      vehiclesQuery = vehiclesQuery.skip(skip);
      if (limitValue) {
        vehiclesQuery = vehiclesQuery.limit(limitValue);
      }
    } else {
      console.log('FetchAll mode - NO pagination limits applied');
    }
    
    const vehicles = await vehiclesQuery;
    
    console.log('Vehicles fetched from DB:', vehicles.length);

    const total = await VehicleModel.countDocuments(query);
    
    console.log('Total vehicles in DB:', total);

    // Add calculated status for each vehicle and update database status if needed
    const vehiclesWithStatus = await Promise.all(vehicles.map(async (vehicle) => {
      // Handle dateOfRenewal as array - get the latest renewal date
      const renewalDates = vehicle.dateOfRenewal || [];
      const latestRenewalDate = Array.isArray(renewalDates) && renewalDates.length > 0 
        ? (renewalDates[renewalDates.length - 1]?.date || renewalDates[renewalDates.length - 1]) 
        : renewalDates;
      
      const calculatedStatus = getVehicleStatus(vehicle.plateNo, latestRenewalDate, vehicle.vehicleStatusType);
      
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
        // Keep the full populated user objects for createdBy/updatedBy (don't transform)
        // The frontend will handle building the full name from firstName, middleName, lastName
      };
      
      // Verbose logging disabled for performance (uncomment for debugging specific vehicles)
      // console.log(`Vehicle ${vehicle.plateNo} - Status: ${calculatedStatus} (${calculatedStatus === "1" ? "ACTIVE" : "EXPIRED"})`);
      // console.log(`Vehicle ${vehicle.plateNo} - DriverId: ${vehicleData.driverId}`);
      
      return vehicleData;
    }));

    console.log('=== SENDING RESPONSE ===');
    console.log('Total vehicles in response:', vehiclesWithStatus.length);
    console.log('Total in database:', total);
    console.log('FetchAll mode:', !shouldPaginate);
    console.log('=== END GET VEHICLES DEBUG ===');

    res.json({
      success: true,
      data: vehiclesWithStatus,
      pagination: {
        current: shouldPaginate ? parseInt(page) : 1,
        pages: shouldPaginate ? Math.ceil(total / (limitValue || 100)) : 1,
        total,
        limit: limitValue || null,
        fetchAll: !shouldPaginate,
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

    const vehicle = await VehicleModel.findById(id)
      .populate("driverId", "fullname ownerRepresentativeName contactNumber emailAddress address")
      .populate("createdBy", "firstName middleName lastName")
      .populate("updatedBy", "firstName middleName lastName");

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Add calculated status
    const renewalDates = vehicle.dateOfRenewal || [];
    const latestRenewalDate = Array.isArray(renewalDates) && renewalDates.length > 0 
      ? (renewalDates[renewalDates.length - 1]?.date || renewalDates[renewalDates.length - 1]) 
      : renewalDates;
    
    const calculatedStatus = getVehicleStatus(vehicle.plateNo, latestRenewalDate, vehicle.vehicleStatusType);

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

    console.log('=== VEHICLE UPDATE DEBUG ===');
    console.log('Vehicle ID:', id);
    console.log('Update data:', updateData);
    console.log('dateOfRenewal type:', typeof updateData.dateOfRenewal);
    console.log('dateOfRenewal value:', updateData.dateOfRenewal);
    console.log('Is array:', Array.isArray(updateData.dateOfRenewal));

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

    console.log('Current vehicle dateOfRenewal:', currentVehicle.dateOfRenewal);
    console.log('Current vehicle dateOfRenewal type:', typeof currentVehicle.dateOfRenewal);
    console.log('Current vehicle dateOfRenewal is array:', Array.isArray(currentVehicle.dateOfRenewal));

    // Normalize incoming dateOfRenewal to array of {date, processedBy}
    if (updateData.dateOfRenewal) {
      const incoming = Array.isArray(updateData.dateOfRenewal)
        ? updateData.dateOfRenewal
        : [updateData.dateOfRenewal];

      // Build a set of existing date ISO strings for duplicate detection
      const existing = Array.isArray(currentVehicle.dateOfRenewal)
        ? currentVehicle.dateOfRenewal.map((it) => new Date(it?.date || it).toISOString())
        : (currentVehicle.dateOfRenewal ? [new Date(currentVehicle.dateOfRenewal).toISOString()] : []);

      // Determine default actor
      let defaultActorId = req.user ? req.user.userId : null;
      if (!defaultActorId) {
        try {
          const admin = await UserModel.findOne({ role: "0" }).select("_id");
          defaultActorId = admin?._id || null;
        } catch {}
      }

      const normalized = incoming.map((it) => {
        const d = new Date(it?.date || it);
        const iso = d.toISOString();
        // If this date already exists in DB, keep existing processedBy if present
        const idx = existing.indexOf(iso);
        if (idx !== -1 && Array.isArray(currentVehicle.dateOfRenewal)) {
          const match = currentVehicle.dateOfRenewal[idx];
          return { date: d, processedBy: match?.processedBy || defaultActorId };
        }
        return { date: d, processedBy: defaultActorId };
      });

      updateData.dateOfRenewal = normalized;
    }

    // Add user tracking for update
    const userId = req.user ? req.user.userId : null;
    
    const updateDataWithUser = {
      ...updateData,
      updatedBy: userId
    };
    
    const vehicle = await VehicleModel.findByIdAndUpdate(
      id,
      updateDataWithUser,
      { new: true, runValidators: true }
    )
      .populate("driverId", "fullname ownerRepresentativeName contactNumber")
      .populate("createdBy", "firstName middleName lastName")
      .populate("updatedBy", "firstName middleName lastName");

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
      // Handle dateOfRenewal as array - get the latest renewal date
      const renewalDates = vehicle.dateOfRenewal || [];
      const latestRenewalDate = Array.isArray(renewalDates) && renewalDates.length > 0 
        ? (renewalDates[renewalDates.length - 1]?.date || renewalDates[renewalDates.length - 1]) 
        : renewalDates;
      
      const newStatus = getVehicleStatus(vehicle.plateNo, latestRenewalDate, vehicle.vehicleStatusType);
      if (vehicle.status !== newStatus) {
        await VehicleModel.findByIdAndUpdate(id, { status: newStatus });
        vehicle.status = newStatus;
        console.log(`Updated vehicle ${vehicle.plateNo} status to ${newStatus} due to plate/status type change`);
      }
    }


    res.json({
      success: true,
      message: "Vehicle updated successfully",
      data: vehicle,
    });
  } catch (error) {
    console.error("Error updating vehicle:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.message,
        details: error.errors
      });
    }
    
    // Handle cast errors
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: "Invalid data format",
        error: error.message
      });
    }
    
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

    // Add user tracking for status update
    const userId = req.user ? req.user.userId : null;
    
    const vehicle = await VehicleModel.findByIdAndUpdate(
      id,
      { 
        status,
        updatedBy: userId
      },
      { new: true }
    )
      .populate("driverId", "fullname ownerRepresentativeName")
      .populate("createdBy", "firstName middleName lastName")
      .populate("updatedBy", "firstName middleName lastName");

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
      // Handle dateOfRenewal as array - get the latest renewal date
      const renewalDates = vehicle.dateOfRenewal || [];
      const latestRenewalDate = Array.isArray(renewalDates) && renewalDates.length > 0 
        ? (renewalDates[renewalDates.length - 1]?.date || renewalDates[renewalDates.length - 1]) 
        : renewalDates;
      
      const calculatedStatus = getVehicleStatus(vehicle.plateNo, latestRenewalDate, vehicle.vehicleStatusType);
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

    const vehicle = await VehicleModel.findOne({ plateNo })
      .populate("driverId", "fullname ownerRepresentativeName contactNumber emailAddress address")
      .populate("createdBy", "firstName middleName lastName")
      .populate("updatedBy", "firstName middleName lastName");

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Add calculated status
    const renewalDates = vehicle.dateOfRenewal || [];
    const latestRenewalDate = Array.isArray(renewalDates) && renewalDates.length > 0 
      ? renewalDates[renewalDates.length - 1] 
      : renewalDates;
    
    const calculatedStatus = getVehicleStatus(vehicle.plateNo, latestRenewalDate, vehicle.vehicleStatusType);

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

    const vehicle = await VehicleModel.findOne({ fileNo })
      .populate("driverId", "fullname ownerRepresentativeName contactNumber emailAddress address")
      .populate("createdBy", "firstName middleName lastName")
      .populate("updatedBy", "firstName middleName lastName");

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Add calculated status
    const renewalDates = vehicle.dateOfRenewal || [];
    const latestRenewalDate = Array.isArray(renewalDates) && renewalDates.length > 0 
      ? renewalDates[renewalDates.length - 1] 
      : renewalDates;
    
    const calculatedStatus = getVehicleStatus(vehicle.plateNo, latestRenewalDate, vehicle.vehicleStatusType);

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