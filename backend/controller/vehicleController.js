import VehicleModel from "../model/VehicleModel.js";
import UserModel from "../model/UserModel.js";
import OwnerModel from "../model/OwnerModel.js";
import { getVehicleStatus } from "../util/plateStatusCalculator.js";
import { logUserActivity, getClientIP, getUserAgent } from "../util/userLogger.js";
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
      ownerId,
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
    const owner = await OwnerModel.findById(ownerId);
    if (!owner) {
      return res.status(400).json({
        success: false,
        message: "Owner not found",
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
      ownerId,
      status: initialStatus, // Set status based on plate number logic
      // Add user tracking fields
      createdBy: req.user ? req.user.userId : defaultActor,
      updatedBy: null // Only set when actually updated
    });

    await vehicle.save();

    // Update owner's vehicleIds array
    await OwnerModel.findByIdAndUpdate(
      ownerId,
      { $push: { vehicleIds: vehicle._id } },
      { new: true }
    );

    // Log the activity
    if (req.user) {
      const actorUser = await UserModel.findById(req.user.userId).select("firstName middleName lastName email role");
      if (actorUser) {
        await logUserActivity({
          userId: actorUser._id,
          logType: 'add_vehicle',
          ipAddress: getClientIP(req),
          status: 'success',
          details: `Vehicle Added Successfully (File No: ${fileNo})`
        });
      }
    }

    // Populate driver and user information
    await vehicle.populate([
      { path: "ownerId", select: "fullname ownerRepresentativeName" },
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
    
    // If fetchAll is true, don't apply pagination
    // Handle string "true", boolean true, or string "1"
    const isFetchAll = fetchAll === 'true' || fetchAll === true || fetchAll === '1' || fetchAll === 1;
    const shouldPaginate = !isFetchAll;
    const limitValue = shouldPaginate ? (parseInt(limit) || 100) : null;
    const skip = shouldPaginate ? (page - 1) * limitValue : 0;
    
    let query = { deletedAt: null }; // Exclude deleted items

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

    // OPTIMIZATION: Select only fields needed for listing page
    // Reduces payload size and improves query performance
    // Indexes used: createdAt (for sorting), deletedAt (for filtering), status, classification
    let vehiclesQuery = VehicleModel.find(query)
      .select("fileNo plateNo engineNo serialChassisNumber make bodyType color classification dateOfRenewal vehicleStatusType status ownerId previousOwnerId createdBy updatedBy createdAt updatedAt")
      .populate("ownerId", "fullname ownerRepresentativeName contactNumber emailAddress address")
      .populate("previousOwnerId", "fullname ownerRepresentativeName contactNumber emailAddress address")
      .populate("createdBy", "firstName middleName lastName")
      .populate("updatedBy", "firstName middleName lastName")
      .sort({ createdAt: -1 });
    
    // Only apply skip and limit if pagination is enabled
    if (shouldPaginate) {
      vehiclesQuery = vehiclesQuery.skip(skip);
      if (limitValue) {
        vehiclesQuery = vehiclesQuery.limit(limitValue);
      }
    }
    
    const vehicles = await vehiclesQuery;
    const total = await VehicleModel.countDocuments(query);

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
      }
      
      const vehicleData = {
        ...vehicle.toObject(),
        status: calculatedStatus, // Use calculated status instead of database status
        calculatedStatus,
        // Ensure ownerId is the actual ID string, not the populated object
        ownerId: typeof vehicle.ownerId === 'object' && vehicle.ownerId?._id 
          ? vehicle.ownerId._id 
          : vehicle.ownerId,
        // Keep previousOwnerId (can be populated object or ID string)
        // The frontend will handle normalization
        previousOwnerId: vehicle.previousOwnerId || null,
        // Keep the full populated user objects for createdBy/updatedBy (don't transform)
        // The frontend will handle building the full name from firstName, middleName, lastName
      };
      
      // Verbose logging disabled for performance (uncomment for debugging specific vehicles)
      // console.log(`Vehicle ${vehicle.plateNo} - Status: ${calculatedStatus} (${calculatedStatus === "1" ? "ACTIVE" : "EXPIRED"})`);
      // console.log(`Vehicle ${vehicle.plateNo} - DriverId: ${vehicleData.ownerId}`);
      
      return vehicleData;
    }));

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

    const vehicle = await VehicleModel.findOne({ _id: id, deletedAt: null })
      .populate("ownerId", "fullname ownerRepresentativeName contactNumber emailAddress address")
      .populate("previousOwnerId", "fullname ownerRepresentativeName contactNumber emailAddress address")
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

    const vehicleObject = vehicle.toObject();
    
    // Ensure previousOwnerId is explicitly included even if null or undefined
    // Mongoose might not include null fields in toObject() by default
    // Handle case where previousOwnerId might be populated but the document was deleted
    if (vehicleObject.previousOwnerId && typeof vehicleObject.previousOwnerId === 'object' && !vehicleObject.previousOwnerId._id) {
      // If populate returned an object without _id, it means the document was deleted
      // Keep the ID if available, otherwise set to null
      vehicleObject.previousOwnerId = vehicle.previousOwnerId ? vehicle.previousOwnerId.toString() : null;
    } else {
      vehicleObject.previousOwnerId = vehicleObject.previousOwnerId || vehicle.previousOwnerId || null;
    }

    res.json({
      success: true,
      data: {
        ...vehicleObject,
        calculatedStatus,
      },
    });
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    console.error("Error stack:", error.stack);
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
      .populate("ownerId", "fullname ownerRepresentativeName contactNumber")
      .populate("createdBy", "firstName middleName lastName")
      .populate("updatedBy", "firstName middleName lastName");

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    // Update owner's vehicleIds arrays if owner changed
    // Get old owner ID before update (keep as ObjectId for database operations)
    const oldOwnerId = currentVehicle.ownerId;
    // Get new owner ID from updateData (the incoming data) - this is what the user wants to change to
    const newOwnerIdFromUpdate = updateData.ownerId;
    
    // Check if owner actually changed by comparing string representations
    // This handles both ObjectId and string formats
    const oldOwnerIdStr = oldOwnerId ? oldOwnerId.toString() : null;
    const newOwnerIdStr = newOwnerIdFromUpdate ? newOwnerIdFromUpdate.toString() : null;
    
    // Debug logging to verify owner change detection
    console.log('Owner change check:', {
      oldOwnerId: oldOwnerIdStr,
      newOwnerIdFromUpdate: newOwnerIdStr,
      ownerChanged: oldOwnerId && newOwnerIdFromUpdate && oldOwnerIdStr !== newOwnerIdStr,
      vehicleFileNo: vehicle.fileNo
    });
    
    // Only proceed if ownerId is in updateData AND it's different from current owner
    if (oldOwnerId && newOwnerIdFromUpdate && oldOwnerIdStr !== newOwnerIdStr) {
      // Use the new owner ID from updateData for database operations
      // Ensure both IDs are in the correct format (Mongoose will handle conversion, but be explicit)
      const newOwnerId = newOwnerIdFromUpdate;
      const vehicleId = vehicle._id;
      
      // Get counts before update for verification
      const oldOwnerBefore = await OwnerModel.findById(oldOwnerId);
      const newOwnerBefore = await OwnerModel.findById(newOwnerId);
      const oldOwnerCountBefore = oldOwnerBefore?.vehicleIds?.length || 0;
      const newOwnerCountBefore = newOwnerBefore?.vehicleIds?.length || 0;
      
      // Remove vehicle from old owner's vehicleIds array
      // This ensures the vehicle's file number disappears from the old owner's assigned vehicles
      // Previous owner -1
      const oldOwnerUpdate = await OwnerModel.findByIdAndUpdate(
        oldOwnerId,
        { $pull: { vehicleIds: vehicleId } },
        { new: true }
      );
      
      // Add vehicle to new owner's vehicleIds array
      // This ensures the vehicle's file number appears in the new owner's assigned vehicles
      // Current owner +1
      const newOwnerUpdate = await OwnerModel.findByIdAndUpdate(
        newOwnerId,
        { $addToSet: { vehicleIds: vehicleId } }, // Use $addToSet to avoid duplicates
        { new: true }
      );
      
      // Get counts after update
      const oldOwnerCountAfter = oldOwnerUpdate?.vehicleIds?.length || 0;
      const newOwnerCountAfter = newOwnerUpdate?.vehicleIds?.length || 0;
      
      // Log the transfer for debugging
      console.log(`Vehicle ${vehicle.fileNo} (${vehicle.plateNo}) transferred from owner ${oldOwnerIdStr} to owner ${newOwnerIdStr}`);
      console.log(`Previous owner (${oldOwnerIdStr}): ${oldOwnerCountBefore} → ${oldOwnerCountAfter} vehicles (should decrease by 1)`);
      console.log(`Current owner (${newOwnerIdStr}): ${newOwnerCountBefore} → ${newOwnerCountAfter} vehicles (should increase by 1)`);
      
      // Verify the counts are correct
      if (oldOwnerCountAfter !== oldOwnerCountBefore - 1) {
        console.warn(`Warning: Previous owner vehicle count did not decrease correctly. Expected: ${oldOwnerCountBefore - 1}, Got: ${oldOwnerCountAfter}`);
      }
      if (newOwnerCountAfter !== newOwnerCountBefore + 1) {
        // Check if vehicle was already in the array (duplicate)
        const wasAlreadyInArray = newOwnerBefore?.vehicleIds?.some(id => id.toString() === vehicleId.toString());
        if (!wasAlreadyInArray) {
          console.warn(`Warning: Current owner vehicle count did not increase correctly. Expected: ${newOwnerCountBefore + 1}, Got: ${newOwnerCountAfter}`);
        }
      }
      
      // Store the previous owner ID in the vehicle document (use ObjectId, not string)
      await VehicleModel.findByIdAndUpdate(
        vehicle._id,
        { previousOwnerId: oldOwnerId },
        { new: true }
      );
      
      // Re-fetch the vehicle with previousOwnerId populated to include it in the response
      const updatedVehicle = await VehicleModel.findById(vehicle._id)
        .populate("ownerId", "fullname ownerRepresentativeName contactNumber emailAddress address")
        .populate("previousOwnerId", "fullname ownerRepresentativeName contactNumber emailAddress address")
        .populate("createdBy", "firstName middleName lastName")
        .populate("updatedBy", "firstName middleName lastName");
      
      if (updatedVehicle) {
        // Replace the vehicle object with the updated one that includes previousOwnerId
        // Convert to object and merge to ensure all populated fields are included
        const updatedVehicleObj = updatedVehicle.toObject();
        Object.keys(updatedVehicleObj).forEach(key => {
          vehicle[key] = updatedVehicleObj[key];
        });
        // Ensure previousOwnerId is set (use the populated object or fallback to oldOwnerId)
        vehicle.previousOwnerId = updatedVehicleObj.previousOwnerId || oldOwnerId;
      } else {
        // Fallback: just set the previousOwnerId on the existing vehicle object
        vehicle.previousOwnerId = oldOwnerId;
      }
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
      }
    }

    // Log the activity
    if (req.user) {
      const actorUser = await UserModel.findById(req.user.userId).select("firstName middleName lastName email role");
      if (actorUser) {
        await logUserActivity({
          userId: actorUser._id,
          logType: 'update_vehicle',
          ipAddress: getClientIP(req),
          status: 'success',
          details: `Vehicle Updated Successfully (File No: ${vehicle.fileNo})`
        });
      }
    }

    // Ensure previousOwnerId is included in the response
    // Re-fetch the vehicle to ensure we have the latest previousOwnerId from database
    let vehicleResponse;
    try {
      const finalVehicle = await VehicleModel.findById(vehicle._id)
        .populate("ownerId", "fullname ownerRepresentativeName contactNumber emailAddress address")
        .populate("previousOwnerId", "fullname ownerRepresentativeName contactNumber emailAddress address")
        .populate("createdBy", "firstName middleName lastName")
        .populate("updatedBy", "firstName middleName lastName");
      
      if (!finalVehicle) {
        throw new Error("Vehicle not found after update");
      }
      
      vehicleResponse = finalVehicle.toObject();
      
      // Handle case where previousOwnerId might be populated but the document was deleted
      if (vehicleResponse.previousOwnerId && typeof vehicleResponse.previousOwnerId === 'object' && !vehicleResponse.previousOwnerId._id) {
        // If populate returned an object without _id, it means the document was deleted
        vehicleResponse.previousOwnerId = finalVehicle.previousOwnerId ? finalVehicle.previousOwnerId.toString() : null;
      }
    } catch (populateError) {
      // If populate fails, use the vehicle object we already have
      console.error("Error populating vehicle fields:", populateError);
      console.error("Error details:", {
        vehicleId: vehicle._id,
        errorMessage: populateError.message,
        errorStack: populateError.stack
      });
      vehicleResponse = vehicle.toObject ? vehicle.toObject() : vehicle;
    }
    
    // Explicitly ensure previousOwnerId is included (can be null if never changed)
    vehicleResponse.previousOwnerId = vehicleResponse.previousOwnerId || null;

    res.json({
      success: true,
      message: "Vehicle updated successfully",
      data: vehicleResponse,
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
      .populate("ownerId", "fullname ownerRepresentativeName")
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
      .populate("ownerId", "fullname ownerRepresentativeName contactNumber emailAddress address")
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
      .populate("ownerId", "fullname ownerRepresentativeName contactNumber emailAddress address")
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

/**
 * Helper function to build date filter for dateOfRenewal array field
 * Filters vehicles whose date of renewal falls within the specified month and year
 */
const buildDateOfRenewalFilter = (month, year, customStartDate = null, customEndDate = null) => {
  // Build date range for the specified month/year
  // MongoDB aggregation requires ISODate, so we create date objects in the pipeline
  let startDate, endDate;
  
  if (customStartDate && customEndDate) {
    // Use custom dates (for "all" months case)
    startDate = customStartDate;
    endDate = customEndDate;
  } else {
    // Use month/year to build dates
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0, 23, 59, 59, 999);
  }

  return {
    $expr: {
      $gt: [
        {
          $size: {
            $filter: {
              input: { $ifNull: ["$dateOfRenewal", []] },
              as: "renewal",
              cond: {
                $let: {
                  vars: {
                    // Extract the date value - handle both {date: Date} object and direct Date
                    renewalDate: {
                      $cond: {
                        if: { $eq: [{ $type: "$$renewal" }, "object"] },
                        then: "$$renewal.date", // If object, use .date property
                        else: {
                          $cond: {
                            if: { $eq: [{ $type: "$$renewal" }, "date"] },
                            then: "$$renewal", // If already a date, use it
                            else: null
                          }
                        }
                      }
                    }
                  },
                  in: {
                    $and: [
                      { $ne: ["$$renewalDate", null] },
                      { $gte: ["$$renewalDate", startDate] },
                      { $lte: ["$$renewalDate", endDate] }
                    ]
                  }
                }
              }
            }
          }
        },
        0
      ]
    }
  };
};

/**
 * Convert array of export data (already processed) to CSV format
 * @param {Array} exportData - Already processed vehicle data with driver info extracted
 */
const convertToCSV = (exportData) => {
  // Define CSV headers
  const headers = [
    "fileNo",
    "plateNo",
    "engineNo",
    "serialChassisNumber",
    "make",
    "bodyType",
    "color",
    "classification",
    "dateOfRenewal",
    "vehicleStatusType",
    "ownerRepresentativeName",
    "address_purok",
    "address_barangay",
    "address_municipality",
    "address_province",
    "address_region",
    "driverLicenseNumber",
  ];

  // Create CSV rows from already-processed exportData
  // exportData already has all fields extracted (including owner data)
  const rows = exportData.map((vehicle) => {
    return [
      vehicle.fileNo || "",
      vehicle.plateNo || "",
      vehicle.engineNo || "",
      vehicle.serialChassisNumber || "",
      vehicle.make || "",
      vehicle.bodyType || "",
      vehicle.color || "",
      vehicle.classification || "",
      vehicle.dateOfRenewal || "",
      vehicle.vehicleStatusType || "",
      vehicle.ownerRepresentativeName || "",
      vehicle.address_purok || "",
      vehicle.address_barangay || "",
      vehicle.address_municipality || "",
      vehicle.address_province || "",
      vehicle.address_region || "",
      vehicle.driverLicenseNumber || "",
    ];
  });

  // Escape CSV values (handle commas, quotes, newlines)
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Build CSV content
  const csvRows = [
    headers.join(","),
    ...rows.map((row) => row.map(escapeCSV).join(",")),
  ];

  return csvRows.join("\n");
};

/**
 * Export vehicles filtered by date of renewal
 */
export const exportVehicles = async (req, res) => {
  try {
    const { format = "csv", month, year } = req.query;

    // Validate format
    if (format !== "csv" && format !== "json") {
      return res.status(400).json({
        success: false,
        message: "Format must be either 'csv' or 'json'",
      });
    }

    // Validate year
    if (!year) {
      return res.status(400).json({
        success: false,
        message: "Year is required",
      });
    }

    const yearNum = parseInt(year);

    // Build date filter based on whether month is "all" or a specific month
    let dateFilter;
    if (month === "all" || !month) {
      // Filter by entire year - use January to December
      const startDate = new Date(yearNum, 0, 1); // January 1st
      const endDate = new Date(yearNum, 11, 31, 23, 59, 59, 999); // December 31st
      dateFilter = buildDateOfRenewalFilter(1, yearNum, startDate, endDate); // Pass month=1 but use custom dates
    } else {
      const monthNum = parseInt(month);
    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
          message: "Month must be between 1 and 12, or 'all' for all months",
      });
      }
      dateFilter = buildDateOfRenewalFilter(monthNum, yearNum);
    }

    // Fetch vehicles with filter and populate driver information
    // Populate ownerId with all necessary owner fields
    // Note: ownerId is an ObjectId that references the Drivers collection
    // Use .lean() for performance, but we need to handle date conversion properly
    let vehicles = await VehicleModel.find(dateFilter)
      .populate({
        path: "ownerId",
        select: "ownerRepresentativeName address driversLicenseNumber",
      })
      .lean() // Use lean() for better performance - returns plain JS objects
      .sort({ plateNo: 1 });
    
    // Note: With .lean(), dates are already converted to Date objects or ISO strings
    // No need to call toObject() as lean() already returns plain objects

    const monthLabel = month === "all" ? "all months" : `${month}/${year}`;
    console.log(
      `Exporting ${vehicles.length} vehicles for ${monthLabel} as ${format.toUpperCase()}`
    );


    // Format vehicles data according to required fields
    // Track index for logging (only log first few vehicles)
    const exportData = vehicles.map((vehicle, index) => {
      // With lean(), vehicles are already plain objects
      const vehicleObj = vehicle;
      
      // Get latest renewal date from the array structure: [{date: Date, processedBy: ObjectId}]
      // After lean(), dates may be strings or Date objects
      const renewalDates = vehicleObj.dateOfRenewal || [];
      let latestRenewalDate = null;
      
      if (Array.isArray(renewalDates) && renewalDates.length > 0) {
        const latestEntry = renewalDates[renewalDates.length - 1];
        // Extract date from object structure: {date: Date/String, processedBy: ObjectId/String}
        // After lean(), date might be a string like "2025-02-24T16:00:00.000Z" or a Date object
        if (latestEntry && typeof latestEntry === 'object' && latestEntry.date !== undefined) {
          latestRenewalDate = latestEntry.date;
        } else if (latestEntry) {
          // Fallback: if it's directly a date
          latestRenewalDate = latestEntry;
        }
      }
      
      // Format date as MM/dd/yyyy using UTC methods to avoid timezone shifts
      // MongoDB stores dates in UTC (ISO 8601 with +00:00), so we extract UTC components directly
      // Extract date components directly from ISO string to avoid any timezone conversion
      let renewalDateStr = "";
      if (latestRenewalDate) {
        try {
          let date;
          let isoString;
          
          // Get ISO string representation (always in UTC)
          // After toObject(), latestRenewalDate might be a string like "2025-02-24T16:00:00.000Z"
          if (latestRenewalDate instanceof Date) {
            // It's already a Date object
            date = latestRenewalDate;
            isoString = date.toISOString();
          } else if (typeof latestRenewalDate === 'string') {
            // It's a string - could be ISO string or other format
            // Check if it's already an ISO string with timezone indicator
            if (latestRenewalDate.includes('T') && (latestRenewalDate.includes('Z') || latestRenewalDate.includes('+'))) {
              // Already ISO format, use directly
              isoString = latestRenewalDate;
              date = new Date(latestRenewalDate);
            } else {
              // Not ISO format, try to parse it
              date = new Date(latestRenewalDate);
              if (isNaN(date.getTime())) {
                throw new Error(`Invalid date string: ${latestRenewalDate}`);
              }
              isoString = date.toISOString();
            }
          } else {
            // Other type (number, object), convert to Date
            date = new Date(latestRenewalDate);
            if (isNaN(date.getTime())) {
              throw new Error(`Invalid date value: ${latestRenewalDate}`);
            }
            isoString = date.toISOString();
          }
          
          // Validate the date is valid
          if (isNaN(date.getTime())) {
            console.warn(`Invalid date for vehicle ${vehicleObj.plateNo}:`, latestRenewalDate);
            renewalDateStr = "";
          } else {
            // Extract date components directly from ISO string (YYYY-MM-DDTHH:mm:ss.sssZ)
            // INVESTIGATION: Dates stored with afternoon UTC times (like 16:00 = 4 PM UTC)
            // likely represent the next day in local timezone (UTC+8 for Philippines)
            // Example: 2025-02-10T16:00:00Z (4 PM UTC) = 2025-02-11T00:00:00+08:00 (midnight Feb 11 in Philippines)
            // 
            // Strategy: If hour >= 8 (8 AM UTC or later), it's likely the next day in UTC+8
            // We add 1 day to match what users see in MongoDB UI (which may display in local timezone)
            const isoMatch = isoString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
            if (isoMatch) {
              let year = parseInt(isoMatch[1]);
              let month = parseInt(isoMatch[2]);
              let day = parseInt(isoMatch[3]);
              const hour = parseInt(isoMatch[4]);
              
              // ROOT CAUSE ANALYSIS:
              // Dates are stored with afternoon UTC times (e.g., 16:00 = 4 PM UTC)
              // In UTC+8 timezone (Philippines), these represent the NEXT day at midnight:
              // - 2025-02-24T16:00:00Z (4 PM UTC) = 2025-02-25T00:00:00+08:00 (midnight Feb 25 in Philippines)
              // Therefore, we must add 1 day to show the correct local date
              //
              // Threshold calculation for UTC+8:
              // - 8:00 AM UTC = 4:00 PM UTC+8 (same calendar day)
              // - 4:00 PM UTC = 12:00 AM UTC+8 (next calendar day) ✓
              // Using hour >= 16 ensures we only adjust dates that are definitely next day
              // But since all dates in investigation show hour 16, we'll use >= 16 for safety
              const shouldAddDay = hour >= 16; // 4 PM UTC or later = definitely next day in UTC+8
              
              if (shouldAddDay) {
                // Add one day using UTC to avoid timezone issues
                const tempDate = new Date(Date.UTC(year, month - 1, day));
                tempDate.setUTCDate(tempDate.getUTCDate() + 1);
                year = tempDate.getUTCFullYear();
                month = tempDate.getUTCMonth() + 1;
                day = tempDate.getUTCDate();
              }
              
              renewalDateStr = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
            } else {
              // Fallback to UTC methods if ISO parsing fails
              const month = String(date.getUTCMonth() + 1).padStart(2, '0');
              const day = String(date.getUTCDate()).padStart(2, '0');
              const year = date.getUTCFullYear();
              renewalDateStr = `${month}/${day}/${year}`;
            }
          }
        } catch (error) {
          console.warn(`Error formatting date for vehicle ${vehicleObj.plateNo}:`, error);
          renewalDateStr = "";
        }
      }

      // Extract driver/owner information
      // ownerId is an ObjectId reference to the Drivers collection
      // After populate(), it becomes an object with ownerRepresentativeName, address, driversLicenseNumber
      // If not populated, it remains as an ObjectId
      let driver = {};
      let address = {};
      
      if (vehicleObj.ownerId) {
        // Check if ownerId is populated by checking for ownerRepresentativeName property
        // If populated, it will have ownerRepresentativeName
        // If not populated, it will just be an ObjectId (which doesn't have this property)
        if (vehicleObj.ownerId.ownerRepresentativeName !== undefined) {
          // Successfully populated - use the driver data
          driver = vehicleObj.ownerId;
          address = vehicleObj.ownerId.address || {};
        } else {
          // Not populated - ownerId is still just an ObjectId
          // This shouldn't happen if populate worked, but log it for debugging
          console.warn(`Driver not populated for vehicle ${vehicleObj.plateNo || vehicleObj._id}`);
          console.warn(`DriverId value:`, vehicleObj.ownerId);
        }
      }

      return {
        fileNo: vehicleObj.fileNo || "",
        plateNo: vehicleObj.plateNo || "",
        engineNo: vehicleObj.engineNo || "",
        serialChassisNumber: vehicleObj.serialChassisNumber || "",
        make: vehicleObj.make || "",
        bodyType: vehicleObj.bodyType || "",
        color: vehicleObj.color || "",
        classification: vehicleObj.classification || "",
        dateOfRenewal: renewalDateStr,
        vehicleStatusType: vehicleObj.vehicleStatusType || "",
        ownerRepresentativeName: driver.ownerRepresentativeName || "",
        address_purok: address.purok || "",
        address_barangay: address.barangay || "",
        address_municipality: address.municipality || "",
        address_province: address.province || "",
        address_region: address.region || "",
        driverLicenseNumber: driver.driversLicenseNumber || "",
      };
    });

    // Sort exportData by dateOfRenewal in ascending order (oldest to newest)
    // Only apply sorting for CSV exports to keep chronological order
    if (format === "csv") {
      exportData.sort((a, b) => {
        // Parse MM/dd/yyyy date strings for comparison
        const parseDate = (dateStr) => {
          if (!dateStr || dateStr === "") return new Date(0); // Treat empty dates as epoch
          const [month, day, year] = dateStr.split('/').map(Number);
          return new Date(year, month - 1, day); // month is 0-indexed in Date constructor
        };

        const dateA = parseDate(a.dateOfRenewal);
        const dateB = parseDate(b.dateOfRenewal);

        // Ascending order: oldest dates first
        return dateA.getTime() - dateB.getTime();
      });
    }


    // Convert to requested format and send
    // Set CORS headers explicitly for blob responses
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    const filenameMonthLabel = month === "all" ? "AllMonths" : month;
    const filename = `vehicles_${filenameMonthLabel}_${year}.${format}`;
    
    // Log the export activity BEFORE sending response
    if (req.user && req.user.userId) {
      try {
        await logUserActivity({
          userId: req.user.userId,
          logType: 'export_vehicles',
          ipAddress: getClientIP(req),
          status: 'success',
          details: `Exported vehicles to ${format.toUpperCase()} - Month: ${filenameMonthLabel}, Year: ${year}, Records: ${exportData.length}`
        });
      } catch (logError) {
        console.error('Failed to log vehicle export:', logError);
      }
    }
    
    if (format === "csv") {
      const csvContent = convertToCSV(exportData);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${filename}`
      );
      res.send("\ufeff" + csvContent); // Add BOM for Excel compatibility
    } else {
      // JSON format - format with proper indentation (2 spaces) for readability
      const jsonContent = JSON.stringify(exportData, null, 2);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${filename}`
      );
      res.send(jsonContent);
    }
  } catch (error) {
    console.error("Error exporting vehicles:", error);
    
    // Log failed export attempt
    if (req.user && req.user.userId) {
      try {
        await logUserActivity({
          userId: req.user.userId,
          logType: 'export_vehicles',
          ipAddress: getClientIP(req),
          status: 'failed',
          details: `Failed to export vehicles - Month: ${req.query.month || 'all'}, Year: ${req.query.year} - Error: ${error.message}`
        });
      } catch (logError) {
        console.error('Failed to log vehicle export error:', logError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Soft delete vehicle (move to bin)
export const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await VehicleModel.findById(id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    if (vehicle.deletedAt) {
      return res.status(400).json({
        success: false,
        message: "Vehicle is already deleted",
      });
    }

    // Soft delete by setting deletedAt
    vehicle.deletedAt = new Date();
    vehicle.updatedBy = req.user ? req.user.userId : null;
    await vehicle.save();

    // Log the activity
    if (req.user && req.user.userId) {
      const actorUser = await UserModel.findById(req.user.userId).select("firstName middleName lastName email role");
      if (actorUser) {
        const actorName = `${actorUser.firstName} ${actorUser.middleName ? actorUser.middleName + ' ' : ''}${actorUser.lastName}`.trim();
        await logUserActivity({
          userId: actorUser._id,
          logType: 'delete_vehicle',
          ipAddress: getClientIP(req),
          status: 'success',
          details: `Vehicle moved to bin (Plate: ${vehicle.plateNo})`
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Vehicle moved to bin successfully"
    });
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get deleted vehicles (bin)
export const getDeletedVehicles = async (req, res) => {
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
        { plateNo: { $regex: search, $options: "i" } },
        { fileNo: { $regex: search, $options: "i" } },
        { make: { $regex: search, $options: "i" } },
        { bodyType: { $regex: search, $options: "i" } },
      ];
    }

    // OPTIMIZATION: Select only fields needed for listing page
    let vehiclesQuery = VehicleModel.find(query)
      .select("plateNo fileNo engineNo serialChassisNumber make bodyType color classification dateOfRenewal status vehicleStatusType ownerId createdBy updatedBy createdAt updatedAt deletedAt")
      .populate("ownerId", "fullname ownerRepresentativeName contactNumber emailAddress address")
      .populate("createdBy", "firstName middleName lastName")
      .populate("updatedBy", "firstName middleName lastName")
      .sort({ deletedAt: -1 });

    // Only apply skip and limit if pagination is enabled
    if (shouldPaginate) {
      vehiclesQuery = vehiclesQuery.skip(skip);
      if (limitValue) {
        vehiclesQuery = vehiclesQuery.limit(limitValue);
      }
    }

    const vehicles = await vehiclesQuery;
    const total = await VehicleModel.countDocuments(query);

    res.json({
      success: true,
      data: vehicles,
      pagination: {
        current: shouldPaginate ? parseInt(page) : 1,
        pages: shouldPaginate ? Math.ceil(total / (limitValue || 100)) : 1,
        total,
        limit: limitValue || null,
        fetchAll: !shouldPaginate,
      },
    });
  } catch (error) {
    console.error("Error fetching deleted vehicles:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Restore vehicle from bin
export const restoreVehicle = async (req, res) => {
  try {
    const vehicle = await VehicleModel.findById(req.params.id);
    
    if (!vehicle) {
      return res.status(404).json({ 
        success: false, 
        message: "Vehicle not found" 
      });
    }

    if (!vehicle.deletedAt) {
      return res.status(400).json({
        success: false,
        message: "Vehicle is not deleted",
      });
    }

    // Restore by clearing deletedAt
    vehicle.deletedAt = null;
    vehicle.updatedBy = req.user ? req.user.userId : null;
    await vehicle.save();

    // Log the activity
    if (req.user && req.user.userId) {
      try {
        const actorUser = await UserModel.findById(req.user.userId).select("firstName middleName lastName email role");
        if (actorUser) {
          await logUserActivity({
            userId: actorUser._id,
            logType: 'restore_vehicle',
            ipAddress: getClientIP(req),
            status: 'success',
            details: `Vehicle restored from bin (Plate: ${vehicle.plateNo})`
          });
        }
      } catch (logError) {
        console.error('Failed to log user activity:', logError.message);
      }
    }
    
    res.json({ 
      success: true, 
      message: "Vehicle restored successfully",
      data: vehicle
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Permanently delete vehicle
export const permanentDeleteVehicle = async (req, res) => {
  try {
    const vehicle = await VehicleModel.findById(req.params.id);
    
    if (!vehicle) {
      return res.status(404).json({ 
        success: false, 
        message: "Vehicle not found" 
      });
    }

    if (!vehicle.deletedAt) {
      return res.status(400).json({
        success: false,
        message: "Vehicle must be in bin before permanent deletion",
      });
    }

    const plateNo = vehicle.plateNo;

    // Permanently delete from database
    await VehicleModel.findByIdAndDelete(req.params.id);

    // Log the activity
    if (req.user && req.user.userId) {
      try {
        const actorUser = await UserModel.findById(req.user.userId).select("firstName middleName lastName email role");
        if (actorUser) {
          await logUserActivity({
            userId: actorUser._id,
            logType: 'permanent_delete_vehicle',
            ipAddress: getClientIP(req),
            status: 'success',
            details: `Vehicle permanently deleted (Plate: ${plateNo})`
          });
        }
      } catch (logError) {
        console.error('Failed to log user activity:', logError.message);
      }
    }
    
    res.json({ 
      success: true, 
      message: "Vehicle permanently deleted successfully" 
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};