import VehicleRenewalHistoryModel from "../model/VehicleRenewalHistoryModel.js";
import VehicleModel from "../model/VehicleModel.js";

// Create a new renewal history record
export const createRenewalHistory = async (req, res) => {
  try {
    const { vehicleId, plateNo, renewalDate, renewalType, processedBy, notes } = req.body;

    // Validate required fields
    if (!vehicleId || !plateNo || !renewalDate || !renewalType) {
      return res.status(400).json({
        success: false,
        message: "vehicleId, plateNo, renewalDate, and renewalType are required"
      });
    }

    // Verify vehicle exists
    const vehicle = await VehicleModel.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found"
      });
    }

    // Create renewal history record using the static method
    const renewalRecord = await VehicleRenewalHistoryModel.createRenewalRecord(
      vehicleId,
      plateNo,
      new Date(renewalDate),
      renewalType,
      processedBy,
      notes
    );

    res.status(201).json({
      success: true,
      message: "Renewal history record created successfully",
      data: renewalRecord
    });
  } catch (error) {
    console.error("Error creating renewal history:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get renewal history for a specific vehicle
export const getVehicleRenewalHistory = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Build query
    const query = { vehicleId };
    if (status) {
      query.status = status;
    }

    // Get renewal history with pagination
    const renewalHistory = await VehicleRenewalHistoryModel
      .find(query)
      .sort({ renewalDate: -1 }) // Most recent first
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('vehicleId', 'plateNo fileNo make bodyType color');

    const total = await VehicleRenewalHistoryModel.countDocuments(query);

    res.json({
      success: true,
      data: renewalHistory,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error("Error fetching renewal history:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get renewal history by plate number
export const getRenewalHistoryByPlate = async (req, res) => {
  try {
    const { plateNo } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Build query
    const query = { plateNo };
    if (status) {
      query.status = status;
    }

    // Get renewal history with pagination
    const renewalHistory = await VehicleRenewalHistoryModel
      .find(query)
      .sort({ renewalDate: -1 }) // Most recent first
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('vehicleId', 'plateNo fileNo make bodyType color');

    const total = await VehicleRenewalHistoryModel.countDocuments(query);

    res.json({
      success: true,
      data: renewalHistory,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error("Error fetching renewal history by plate:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get all renewal history with filters
export const getAllRenewalHistory = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      startDate, 
      endDate, 
      plateNo,
      renewalType 
    } = req.query;

    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (plateNo) {
      query.plateNo = { $regex: plateNo, $options: 'i' };
    }
    
    if (renewalType) {
      query.renewalType = renewalType;
    }
    
    if (startDate || endDate) {
      query.renewalDate = {};
      if (startDate) {
        query.renewalDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.renewalDate.$lte = new Date(endDate);
      }
    }

    // Get renewal history with pagination
    const renewalHistory = await VehicleRenewalHistoryModel
      .find(query)
      .sort({ renewalDate: -1 }) // Most recent first
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('vehicleId', 'plateNo fileNo make bodyType color');

    const total = await VehicleRenewalHistoryModel.countDocuments(query);

    res.json({
      success: true,
      data: renewalHistory,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error("Error fetching all renewal history:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Update renewal history record
export const updateRenewalHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.vehicleId;
    delete updateData.plateNo;

    const renewalRecord = await VehicleRenewalHistoryModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('vehicleId', 'plateNo fileNo make bodyType color');

    if (!renewalRecord) {
      return res.status(404).json({
        success: false,
        message: "Renewal history record not found"
      });
    }

    res.json({
      success: true,
      message: "Renewal history record updated successfully",
      data: renewalRecord
    });
  } catch (error) {
    console.error("Error updating renewal history:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Delete renewal history record
export const deleteRenewalHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const renewalRecord = await VehicleRenewalHistoryModel.findByIdAndDelete(id);

    if (!renewalRecord) {
      return res.status(404).json({
        success: false,
        message: "Renewal history record not found"
      });
    }

    res.json({
      success: true,
      message: "Renewal history record deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting renewal history:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get renewal statistics
export const getRenewalStatistics = async (req, res) => {
  try {
    const { startDate, endDate, plateNo } = req.query;

    // Build query
    const query = {};
    
    if (plateNo) {
      query.plateNo = { $regex: plateNo, $options: 'i' };
    }
    
    if (startDate || endDate) {
      query.renewalDate = {};
      if (startDate) {
        query.renewalDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.renewalDate.$lte = new Date(endDate);
      }
    }

    // Get statistics using aggregation
    const statistics = await VehicleRenewalHistoryModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRenewals: { $sum: 1 },
          earlyRenewals: {
            $sum: { $cond: [{ $eq: ["$status", "Early Renewal"] }, 1, 0] }
          },
          onTimeRenewals: {
            $sum: { $cond: [{ $eq: ["$status", "On-Time Renewal"] }, 1, 0] }
          },
          lateRenewals: {
            $sum: { $cond: [{ $eq: ["$status", "Late Renewal"] }, 1, 0] }
          }
        }
      }
    ]);

    const stats = statistics[0] || {
      totalRenewals: 0,
      earlyRenewals: 0,
      onTimeRenewals: 0,
      lateRenewals: 0
    };

    // Calculate percentages
    const total = stats.totalRenewals;
    const percentages = {
      early: total > 0 ? ((stats.earlyRenewals / total) * 100).toFixed(1) : 0,
      onTime: total > 0 ? ((stats.onTimeRenewals / total) * 100).toFixed(1) : 0,
      late: total > 0 ? ((stats.lateRenewals / total) * 100).toFixed(1) : 0
    };

    res.json({
      success: true,
      data: {
        ...stats,
        percentages
      }
    });
  } catch (error) {
    console.error("Error fetching renewal statistics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};
