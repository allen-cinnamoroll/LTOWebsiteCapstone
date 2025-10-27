import mongoose from "mongoose";

/**
 * Renewal History Model
 * Tracks vehicle renewal records with status determination
 * 
 * Status Types:
 * - "Early Renewal": Renewed more than 7 days before scheduled week
 * - "On-Time Renewal": Renewed within the scheduled week
 * - "Late Renewal": Renewed after the scheduled week has passed
 */

const renewalHistorySchema = new mongoose.Schema(
  {
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicles',
      required: [true, "Vehicle ID is required"],
      index: true
    },
    renewalDate: {
      type: Date,
      required: [true, "Renewal date is required"],
      index: true
    },
    status: {
      type: String,
      enum: ["Early Renewal", "On-Time Renewal", "Late Renewal"],
      required: [true, "Status is required"],
      index: true
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: false // Optional for system-generated renewals
    },
    // Array to store all renewal dates for this vehicle
    dateOfRenewalHistory: [{
      date: {
        type: Date,
        required: true
      },
      updatedAt: {
        type: Date,
        default: Date.now
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: false
      }
    }],
    // Additional metadata for debugging and tracking
    plateNumber: {
      type: String,
      required: false,
      index: true
    },
    scheduledWeekStart: {
      type: Date,
      required: false
    },
    scheduledWeekEnd: {
      type: Date,
      required: false
    },
    daysDifference: {
      type: Number,
      required: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
renewalHistorySchema.index({ vehicleId: 1, renewalDate: -1 });
renewalHistorySchema.index({ status: 1, renewalDate: -1 });
renewalHistorySchema.index({ plateNumber: 1, renewalDate: -1 });

// Virtual for formatted renewal date
renewalHistorySchema.virtual('formattedRenewalDate').get(function() {
  return this.renewalDate ? this.renewalDate.toLocaleDateString() : null;
});

// Virtual for status badge color
renewalHistorySchema.virtual('statusColor').get(function() {
  switch (this.status) {
    case 'Early Renewal':
      return 'blue';
    case 'On-Time Renewal':
      return 'green';
    case 'Late Renewal':
      return 'red';
    default:
      return 'gray';
  }
});

// Pre-save middleware for validation
renewalHistorySchema.pre('save', function(next) {
  try {
    // Validate renewal date is not in the future
    if (this.renewalDate && this.renewalDate > new Date()) {
      const error = new Error("Renewal date cannot be in the future");
      error.name = 'ValidationError';
      return next(error);
    }


    next();
  } catch (error) {
    next(error);
  }
});

// Static method to create renewal history with error handling
renewalHistorySchema.statics.createRenewalRecord = async function(vehicleData, renewalDate, processedBy = null) {
  try {
    // Validate input parameters
    if (!vehicleData || !vehicleData._id) {
      throw new Error("Vehicle data is required");
    }

    if (!renewalDate) {
      throw new Error("Renewal date is required");
    }

    // Check if renewal record already exists for this date
    const existingRecord = await this.findOne({
      vehicleId: vehicleData._id,
      renewalDate: new Date(renewalDate)
    });

    if (existingRecord) {
      console.log(`Renewal record already exists for vehicle ${vehicleData._id} on ${renewalDate}`);
      return existingRecord;
    }

    // Create new renewal record
    const renewalRecord = new this({
      vehicleId: vehicleData._id,
      renewalDate: new Date(renewalDate),
      plateNumber: vehicleData.plateNo,
      processedBy: processedBy
    });

    await renewalRecord.save();
    return renewalRecord;
  } catch (error) {
    console.error("Error creating renewal record:", error);
    throw error;
  }
};

// Static method to get renewal history for a vehicle
renewalHistorySchema.statics.getVehicleRenewalHistory = async function(vehicleId, limit = 50) {
  try {
    if (!vehicleId) {
      throw new Error("Vehicle ID is required");
    }

    const history = await this.find({ vehicleId })
      .sort({ renewalDate: -1 })
      .limit(limit)
      .populate('processedBy', 'fullname email')
      .lean();

    return history;
  } catch (error) {
    console.error("Error fetching renewal history:", error);
    throw error;
  }
};

// Static method to get renewal statistics
renewalHistorySchema.statics.getRenewalStatistics = async function(vehicleId) {
  try {
    if (!vehicleId) {
      throw new Error("Vehicle ID is required");
    }

    const stats = await this.aggregate([
      { $match: { vehicleId: mongoose.Types.ObjectId(vehicleId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          latestDate: { $max: '$renewalDate' }
        }
      }
    ]);

    return stats;
  } catch (error) {
    console.error("Error fetching renewal statistics:", error);
    throw error;
  }
};

// Static method to add renewal date to history
renewalHistorySchema.statics.addRenewalDateToHistory = async function(vehicleId, renewalDate, updatedBy = null) {
  try {
    if (!vehicleId || !renewalDate) {
      throw new Error("Vehicle ID and renewal date are required");
    }

    // Find or create renewal history record for this vehicle
    let renewalHistory = await this.findOne({ vehicleId });
    
    if (!renewalHistory) {
      // Create new renewal history record
      renewalHistory = new this({
        vehicleId,
        renewalDate: new Date(renewalDate),
        status: "On-Time Renewal", // Default status, can be calculated later
        plateNumber: "", // Will be populated from vehicle data
        dateOfRenewalHistory: []
      });
    }

    // Check if this renewal date already exists in history
    const existingDate = renewalHistory.dateOfRenewalHistory.find(
      entry => entry.date.getTime() === new Date(renewalDate).getTime()
    );

    if (!existingDate) {
      // Add new renewal date to history
      renewalHistory.dateOfRenewalHistory.push({
        date: new Date(renewalDate),
        updatedAt: new Date(),
        updatedBy: updatedBy
      });

      // Update the main renewal date to the latest one
      renewalHistory.renewalDate = new Date(renewalDate);
      
      await renewalHistory.save();
      console.log(`Added renewal date ${renewalDate} to history for vehicle ${vehicleId}`);
    } else {
      console.log(`Renewal date ${renewalDate} already exists in history for vehicle ${vehicleId}`);
    }

    return renewalHistory;
  } catch (error) {
    console.error("Error adding renewal date to history:", error);
    throw error;
  }
};

// Static method to get renewal history with dateOfRenewalHistory
renewalHistorySchema.statics.getVehicleRenewalHistoryWithDates = async function(vehicleId) {
  try {
    if (!vehicleId) {
      throw new Error("Vehicle ID is required");
    }

    const history = await this.findOne({ vehicleId })
      .populate('processedBy', 'fullname email')
      .lean();

    return history;
  } catch (error) {
    console.error("Error fetching renewal history with dates:", error);
    throw error;
  }
};

const RenewalHistoryModel = mongoose.model("RenewalHistory", renewalHistorySchema);

export default RenewalHistoryModel;
