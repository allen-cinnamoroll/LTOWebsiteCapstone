import RenewalHistoryModel from "../model/RenewalHistoryModel.js";
import VehicleModel from "../model/VehicleModel.js";
import { calculateRenewalStatus } from "../util/renewalStatusCalculator.js";

/**
 * Create a new renewal record
 */
export const createRenewalRecord = async (req, res) => {
  try {
    const { vehicleId, plateNo, renewalDate, notes, processedBy } = req.body;

    // Validate required fields
    if (!vehicleId || !plateNo || !renewalDate) {
      return res.status(400).json({
        success: false,
        message: "vehicleId, plateNo, and renewalDate are required"
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

    // Calculate renewal status
    const renewalInfo = calculateRenewalStatus(plateNo, new Date(renewalDate));

    // Create renewal record
    const renewalRecord = new RenewalHistoryModel({
      vehicleId,
      plateNo,
      renewalDate: new Date(renewalDate),
      status: renewalInfo.status,
      scheduledWeek: renewalInfo.scheduledWeek,
      dueDate: renewalInfo.dueDate,
      notes: notes || "",
      processedBy: processedBy || "System"
    });

    await renewalRecord.save();

    // Update vehicle's renewal history
    await VehicleModel.findByIdAndUpdate(
      vehicleId,
      { 
        $push: { renewalHistory: renewalRecord._id },
        $set: { dateOfRenewal: new Date(renewalDate) }
      },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: "Renewal record created successfully",
      data: renewalRecord
    });

  } catch (error) {
    console.error("Error creating renewal record:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get renewal history for a specific vehicle
 */
export const getVehicleRenewalHistory = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Validate vehicle exists
    const vehicle = await VehicleModel.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found"
      });
    }

    // Get renewal history with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const renewalHistory = await RenewalHistoryModel
      .find({ vehicleId })
      .sort({ renewalDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await RenewalHistoryModel.countDocuments({ vehicleId });

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

/**
 * Get renewal history by plate number
 */
export const getRenewalHistoryByPlate = async (req, res) => {
  try {
    const { plateNo } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const renewalHistory = await RenewalHistoryModel
      .find({ plateNo })
      .sort({ renewalDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await RenewalHistoryModel.countDocuments({ plateNo });

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

/**
 * Update a renewal record
 */
export const updateRenewalRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { renewalDate, notes, processedBy } = req.body;

    const renewalRecord = await RenewalHistoryModel.findById(id);
    if (!renewalRecord) {
      return res.status(404).json({
        success: false,
        message: "Renewal record not found"
      });
    }

    // If renewal date is being updated, recalculate status
    let updateData = { notes, processedBy };
    if (renewalDate) {
      const renewalInfo = calculateRenewalStatus(renewalRecord.plateNo, new Date(renewalDate));
      updateData = {
        ...updateData,
        renewalDate: new Date(renewalDate),
        status: renewalInfo.status,
        scheduledWeek: renewalInfo.scheduledWeek,
        dueDate: renewalInfo.dueDate
      };
    }

    const updatedRecord = await RenewalHistoryModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Renewal record updated successfully",
      data: updatedRecord
    });

  } catch (error) {
    console.error("Error updating renewal record:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Delete a renewal record
 */
export const deleteRenewalRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const renewalRecord = await RenewalHistoryModel.findById(id);
    if (!renewalRecord) {
      return res.status(404).json({
        success: false,
        message: "Renewal record not found"
      });
    }

    // Remove from vehicle's renewal history
    await VehicleModel.findByIdAndUpdate(
      renewalRecord.vehicleId,
      { $pull: { renewalHistory: id } }
    );

    // Delete the renewal record
    await RenewalHistoryModel.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Renewal record deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting renewal record:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get renewal statistics for a vehicle
 */
export const getRenewalStatistics = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const stats = await RenewalHistoryModel.aggregate([
      { $match: { vehicleId: vehicleId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const totalRenewals = await RenewalHistoryModel.countDocuments({ vehicleId });
    const latestRenewal = await RenewalHistoryModel
      .findOne({ vehicleId })
      .sort({ renewalDate: -1 });

    res.json({
      success: true,
      data: {
        statistics: stats,
        totalRenewals,
        latestRenewal
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
