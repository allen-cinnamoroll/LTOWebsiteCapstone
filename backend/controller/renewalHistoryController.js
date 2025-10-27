import RenewalHistoryModel from "../model/RenewalHistoryModel.js";
import VehicleModel from "../model/VehicleModel.js";
import { createRenewalStatusRecord, validateRenewalData } from "../util/renewalStatusCalculator.js";
// import { logger } from "../util/logger.js";

/**
 * Get renewal history with dateOfRenewalHistory for a specific vehicle
 */
export const getVehicleRenewalHistoryWithDates = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    // Validate vehicle ID
    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: "Vehicle ID is required"
      });
    }

    // Check if vehicle exists
    const vehicle = await VehicleModel.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found"
      });
    }

    // Get renewal history with dateOfRenewalHistory
    const renewalHistory = await RenewalHistoryModel.getVehicleRenewalHistoryWithDates(vehicleId);

    if (!renewalHistory) {
      return res.json({
        success: true,
        data: {
          vehicleId,
          plateNumber: vehicle.plateNo,
          fileNumber: vehicle.fileNo,
          currentRenewalDate: vehicle.dateOfRenewal,
          renewalHistory: null,
          dateOfRenewalHistory: [],
          message: "No renewal history found for this vehicle"
        }
      });
    }

    // Populate updatedBy information for each date in history
    const populatedHistory = await RenewalHistoryModel.findById(renewalHistory._id)
      .populate('dateOfRenewalHistory.updatedBy', 'fullname email')
      .populate('processedBy', 'fullname email')
      .lean();

    console.log(`Retrieved renewal history with dates for vehicle ${vehicleId}`);

    res.json({
      success: true,
      data: {
        vehicleId,
        plateNumber: vehicle.plateNo,
        fileNumber: vehicle.fileNo,
        currentRenewalDate: vehicle.dateOfRenewal,
        renewalHistory: populatedHistory,
        dateOfRenewalHistory: populatedHistory?.dateOfRenewalHistory || [],
        totalRenewalDates: populatedHistory?.dateOfRenewalHistory?.length || 0
      }
    });

  } catch (error) {
    console.error("Error fetching vehicle renewal history with dates:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching renewal history with dates",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get renewal history for a specific vehicle
 */
export const getVehicleRenewalHistory = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    // Validate vehicle ID
    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: "Vehicle ID is required"
      });
    }

    // Validate pagination parameters
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid limit parameter (must be between 1 and 100)"
      });
    }

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid page parameter (must be greater than 0)"
      });
    }

    // Check if vehicle exists
    const vehicle = await VehicleModel.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found"
      });
    }

    // Calculate skip value for pagination
    const skip = (pageNum - 1) * limitNum;

    // Get renewal history with pagination
    const [history, totalCount] = await Promise.all([
      RenewalHistoryModel.find({ vehicleId })
        .sort({ renewalDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('processedBy', 'fullname email')
        .lean(),
      RenewalHistoryModel.countDocuments({ vehicleId })
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    console.log(`Retrieved renewal history for vehicle ${vehicleId}: ${history.length} records`);

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit: limitNum
        }
      }
    });

  } catch (error) {
    console.error("Error fetching vehicle renewal history:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching renewal history",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create a new renewal history record
 */
export const createRenewalHistory = async (req, res) => {
  try {
    const { vehicleId, renewalDate } = req.body;
    const processedBy = req.user?.id; // From auth middleware

    // Validate required fields
    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: "Vehicle ID is required"
      });
    }

    if (!renewalDate) {
      return res.status(400).json({
        success: false,
        message: "Renewal date is required"
      });
    }

    // Get vehicle data
    const vehicle = await VehicleModel.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found"
      });
    }

    // Create renewal status record
    const renewalStatusData = createRenewalStatusRecord(vehicle, renewalDate, processedBy);

    // Validate the renewal data
    const validation = validateRenewalData(renewalStatusData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid renewal data",
        errors: validation.errors
      });
    }

    // Check if renewal record already exists for this date
    const existingRecord = await RenewalHistoryModel.findOne({
      vehicleId,
      renewalDate: new Date(renewalDate)
    });

    if (existingRecord) {
      return res.status(409).json({
        success: false,
        message: "Renewal record already exists for this date",
        data: existingRecord
      });
    }

    // Create new renewal history record
    const renewalRecord = new RenewalHistoryModel({
      ...renewalStatusData
    });

    await renewalRecord.save();

    // Populate the record for response
    await renewalRecord.populate('processedBy', 'fullname email');

    console.log(`Created renewal history record for vehicle ${vehicleId}: ${renewalStatusData.status}`);

    res.status(201).json({
      success: true,
      message: "Renewal history record created successfully",
      data: renewalRecord
    });

  } catch (error) {
    console.error("Error creating renewal history:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while creating renewal history",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get renewal statistics for a vehicle
 */
export const getRenewalStatistics = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: "Vehicle ID is required"
      });
    }

    // Check if vehicle exists
    const vehicle = await VehicleModel.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found"
      });
    }

    // Get renewal statistics
    const statistics = await RenewalHistoryModel.getRenewalStatistics(vehicleId);

    // Get total renewal count
    const totalRenewals = await RenewalHistoryModel.countDocuments({ vehicleId });

    // Get latest renewal
    const latestRenewal = await RenewalHistoryModel.findOne({ vehicleId })
      .sort({ renewalDate: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        statistics,
        totalRenewals,
        latestRenewal
      }
    });

  } catch (error) {
    console.error("Error fetching renewal statistics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching renewal statistics",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a renewal history record
 */
export const updateRenewalHistory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Renewal history ID is required"
      });
    }

    // Find the renewal record
    const renewalRecord = await RenewalHistoryModel.findById(id);
    if (!renewalRecord) {
      return res.status(404).json({
        success: false,
        message: "Renewal history record not found"
      });
    }

    // No fields to update for renewal history records
    // This endpoint is kept for API consistency but doesn't modify anything
    const updatedRecord = await RenewalHistoryModel.findById(id)
      .populate('processedBy', 'fullname email');

    console.log(`Updated renewal history record ${id}`);

    res.json({
      success: true,
      message: "Renewal history record updated successfully",
      data: updatedRecord
    });

  } catch (error) {
    console.error("Error updating renewal history:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating renewal history",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a renewal history record
 */
export const deleteRenewalHistory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Renewal history ID is required"
      });
    }

    // Find the renewal record
    const renewalRecord = await RenewalHistoryModel.findById(id);
    if (!renewalRecord) {
      return res.status(404).json({
        success: false,
        message: "Renewal history record not found"
      });
    }

    await RenewalHistoryModel.findByIdAndDelete(id);

    console.log(`Deleted renewal history record ${id}`);

    res.json({
      success: true,
      message: "Renewal history record deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting renewal history:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while deleting renewal history",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Bulk create renewal history records (for migration purposes)
 */
export const bulkCreateRenewalHistory = async (req, res) => {
  try {
    const { vehicleIds } = req.body;

    if (!vehicleIds || !Array.isArray(vehicleIds)) {
      return res.status(400).json({
        success: false,
        message: "Vehicle IDs array is required"
      });
    }

    if (vehicleIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Cannot process more than 100 vehicles at once"
      });
    }

    const results = [];
    const errors = [];

    for (const vehicleId of vehicleIds) {
      try {
        const vehicle = await VehicleModel.findById(vehicleId);
        if (!vehicle) {
          errors.push(`Vehicle ${vehicleId} not found`);
          continue;
        }

        if (!vehicle.dateOfRenewal) {
          errors.push(`Vehicle ${vehicleId} has no renewal date`);
          continue;
        }

        // Check if renewal record already exists
        const existingRecord = await RenewalHistoryModel.findOne({
          vehicleId,
          renewalDate: vehicle.dateOfRenewal
        });

        if (existingRecord) {
          results.push({
            vehicleId,
            status: 'skipped',
            message: 'Renewal record already exists'
          });
          continue;
        }

        // Create renewal status record
        const renewalStatusData = createRenewalStatusRecord(vehicle, vehicle.dateOfRenewal);

        // Create renewal history record
        const renewalRecord = new RenewalHistoryModel(renewalStatusData);
        await renewalRecord.save();

        results.push({
          vehicleId,
          status: 'created',
          renewalId: renewalRecord._id
        });

      } catch (error) {
        errors.push(`Error processing vehicle ${vehicleId}: ${error.message}`);
      }
    }

    console.log(`Bulk renewal history creation completed: ${results.length} processed, ${errors.length} errors`);

    res.json({
      success: true,
      message: "Bulk renewal history creation completed",
      data: {
        processed: results.length,
        errors: errors.length,
        results,
        errors
      }
    });

  } catch (error) {
    console.error("Error in bulk renewal history creation:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during bulk renewal history creation",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
