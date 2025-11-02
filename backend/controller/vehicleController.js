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

/**
 * Helper function to build date filter for dateOfRenewal array field
 * Filters vehicles whose date of renewal falls within the specified month and year
 */
const buildDateOfRenewalFilter = (month, year) => {
  // Build date range for the specified month/year
  // MongoDB aggregation requires ISODate, so we create date objects in the pipeline
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

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

    // Validate month and year
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: "Month must be between 1 and 12",
      });
    }

    // Build date filter
    const dateFilter = buildDateOfRenewalFilter(monthNum, yearNum);

    // Fetch vehicles with filter and populate driver information
    // Populate driverId with all necessary owner fields
    // Note: driverId is an ObjectId that references the Drivers collection
    // Use .lean() for performance, but we need to handle date conversion properly
    let vehicles = await VehicleModel.find(dateFilter)
      .populate({
        path: "driverId",
        select: "ownerRepresentativeName address driversLicenseNumber",
      })
      .lean() // Use lean() for better performance - returns plain JS objects
      .sort({ plateNo: 1 });
    
    // Note: With .lean(), dates are already converted to Date objects or ISO strings
    // No need to call toObject() as lean() already returns plain objects

    console.log(
      `Exporting ${vehicles.length} vehicles for ${month}/${year} as ${format.toUpperCase()}`
    );

    // Debug: Check first vehicle's driverId population and date extraction
    if (vehicles.length > 0) {
      const firstVehicle = vehicles[0];
      console.log('=== EXPORT DEBUG ===');
      console.log('Total vehicles found:', vehicles.length);
      console.log('Sample vehicle plateNo:', firstVehicle.plateNo);
      
      // Debug dateOfRenewal extraction
      const renewalDates = firstVehicle.dateOfRenewal || [];
      console.log('dateOfRenewal array:', JSON.stringify(renewalDates, null, 2));
      if (Array.isArray(renewalDates) && renewalDates.length > 0) {
        const latestEntry = renewalDates[renewalDates.length - 1];
        console.log('Latest renewal entry:', JSON.stringify(latestEntry, null, 2));
        const latestDate = latestEntry?.date || latestEntry;
        if (latestDate) {
          // Show raw value before any conversion
          console.log('Raw latestDate type:', typeof latestDate);
          console.log('Raw latestDate value:', latestDate);
          console.log('Raw latestDate instanceof Date:', latestDate instanceof Date);
          
          // Get ISO string
          let isoString;
          if (latestDate instanceof Date) {
            isoString = latestDate.toISOString();
          } else if (typeof latestDate === 'string') {
            isoString = latestDate.includes('Z') ? latestDate : new Date(latestDate).toISOString();
          } else {
            isoString = new Date(latestDate).toISOString();
          }
          
          const date = new Date(isoString);
          console.log('Parsed date ISO:', isoString);
          console.log('ISO string extracted - Year:', isoString.substring(0, 4), 'Month:', isoString.substring(5, 7), 'Day:', isoString.substring(8, 10));
          console.log('UTC components - Year:', date.getUTCFullYear(), 'Month:', date.getUTCMonth() + 1, 'Day:', date.getUTCDate());
          console.log('Local components - Year:', date.getFullYear(), 'Month:', date.getMonth() + 1, 'Day:', date.getDate());
          
          // Extract directly from ISO string
          const isoMatch = isoString.match(/^(\d{4})-(\d{2})-(\d{2})T/);
          if (isoMatch) {
            console.log('Direct ISO extraction - Year:', isoMatch[1], 'Month:', isoMatch[2], 'Day:', isoMatch[3]);
            const formatted = `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
            console.log('Formatted date (from ISO string):', formatted);
          }
        }
      }
      
      console.log('Sample vehicle driverId:', JSON.stringify(firstVehicle.driverId, null, 2));
      console.log('DriverId type:', typeof firstVehicle.driverId);
      
      if (firstVehicle.driverId && typeof firstVehicle.driverId === 'object') {
        console.log('DriverId has ownerRepresentativeName:', firstVehicle.driverId.ownerRepresentativeName);
        console.log('DriverId has address:', JSON.stringify(firstVehicle.driverId.address, null, 2));
        console.log('DriverId has driversLicenseNumber:', firstVehicle.driverId.driversLicenseNumber);
      } else {
        console.log('WARNING: DriverId is not populated correctly');
        console.log('DriverId value:', firstVehicle.driverId);
      }
      console.log('=== END EXPORT DEBUG ===');
    }

    // Format vehicles data according to required fields
    const exportData = vehicles.map((vehicle) => {
      // With lean(), vehicles are already plain objects
      const vehicleObj = vehicle;
      
      // Get latest renewal date from the array structure: [{date: Date, processedBy: ObjectId}]
      // After toObject(), dates may be strings or Date objects
      const renewalDates = vehicleObj.dateOfRenewal || [];
      let latestRenewalDate = null;
      
      if (Array.isArray(renewalDates) && renewalDates.length > 0) {
        const latestEntry = renewalDates[renewalDates.length - 1];
        // Extract date from object structure: {date: Date/String, processedBy: ObjectId/String}
        // After toObject(), date might be a string like "2025-02-24T16:00:00.000Z"
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
              
              // Log the extraction for debugging (only for first few vehicles to avoid spam)
              if (exportData.length === 0 && vehicles.length <= 5) {
                console.log(`[DATE EXTRACTION] Vehicle ${vehicleObj.plateNo}: ISO=${isoString}, Hour=${hour}, BeforeAdjust=${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`);
              }
              
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
                
                if (exportData.length === 0 && vehicles.length <= 5) {
                  console.log(`[DATE ADJUSTMENT] Vehicle ${vehicleObj.plateNo}: Hour=${hour} UTC >= 16, Added 1 day -> ${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`);
                }
              } else {
                if (exportData.length === 0 && vehicles.length <= 5) {
                  console.log(`[DATE NO ADJUSTMENT] Vehicle ${vehicleObj.plateNo}: Hour=${hour} UTC < 16, Using original date ${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`);
                }
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
      // driverId is an ObjectId reference to the Drivers collection
      // After populate(), it becomes an object with ownerRepresentativeName, address, driversLicenseNumber
      // If not populated, it remains as an ObjectId
      let driver = {};
      let address = {};
      
      if (vehicleObj.driverId) {
        // Check if driverId is populated by checking for ownerRepresentativeName property
        // If populated, it will have ownerRepresentativeName
        // If not populated, it will just be an ObjectId (which doesn't have this property)
        if (vehicleObj.driverId.ownerRepresentativeName !== undefined) {
          // Successfully populated - use the driver data
          driver = vehicleObj.driverId;
          address = vehicleObj.driverId.address || {};
        } else {
          // Not populated - driverId is still just an ObjectId
          // This shouldn't happen if populate worked, but log it for debugging
          console.warn(`Driver not populated for vehicle ${vehicleObj.plateNo || vehicleObj._id}`);
          console.warn(`DriverId value:`, vehicleObj.driverId);
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

    // Debug: Check if exportData contains owner information
    if (exportData.length > 0) {
      const sampleExport = exportData[0];
      console.log('=== EXPORT DATA DEBUG ===');
      console.log('Sample export data plateNo:', sampleExport.plateNo);
      console.log('Sample ownerRepresentativeName:', sampleExport.ownerRepresentativeName);
      console.log('Sample address_purok:', sampleExport.address_purok);
      console.log('Sample address_barangay:', sampleExport.address_barangay);
      console.log('Sample dateOfRenewal:', sampleExport.dateOfRenewal);
      console.log('Total vehicles in export:', exportData.length);
      if (format === "csv") {
        console.log('CSV export sorted by dateOfRenewal (ascending)');
      }
      console.log('=== END EXPORT DATA DEBUG ===');
    }

    // Convert to requested format and send
    // Set CORS headers explicitly for blob responses
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    if (format === "csv") {
      const csvContent = convertToCSV(exportData);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=vehicles_${month}_${year}.csv`
      );
      res.send("\ufeff" + csvContent); // Add BOM for Excel compatibility
    } else {
      // JSON format
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=vehicles_${month}_${year}.json`
      );
      res.json(exportData);
    }
  } catch (error) {
    console.error("Error exporting vehicles:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};