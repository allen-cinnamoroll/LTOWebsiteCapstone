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

// Helper function to determine renewal status based on plate number
const getRenewalStatus = (plateNumber, renewalDate) => {
  try {
    // Extract the last digit from plate number
    const lastDigit = plateNumber.slice(-1);
    const digit = parseInt(lastDigit);
    
    // If last digit is 0, renewal month is October (month 9, 0-indexed)
    // If last digit is 1-9, renewal month is that digit (0-indexed)
    const dueMonth = digit === 0 ? 9 : digit - 1; // Convert to 0-indexed months
    
    const renewalDateObj = new Date(renewalDate);
    const renewalYear = renewalDateObj.getFullYear();
    const renewalMonth = renewalDateObj.getMonth(); // 0-indexed
    
    console.log('=== RENEWAL STATUS CALCULATION ===');
    console.log('Plate number:', plateNumber);
    console.log('Last digit:', lastDigit);
    console.log('Due month (0-indexed):', dueMonth);
    console.log('Due month name:', ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dueMonth]);
    console.log('Renewal date:', renewalDate);
    console.log('Renewal year:', renewalYear);
    console.log('Renewal month (0-indexed):', renewalMonth);
    console.log('Renewal month name:', ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][renewalMonth]);
    
    // Determine status
    let status;
    if (renewalMonth < dueMonth) {
      status = "Early Renewal";
    } else if (renewalMonth === dueMonth) {
      status = "On-Time Renewal";
    } else {
      status = "Late Renewal";
    }
    
    console.log('Calculated status:', status);
    console.log('=== END RENEWAL STATUS CALCULATION ===');
    
    return status;
  } catch (error) {
    console.error('Error calculating renewal status:', error);
    return "On-Time Renewal"; // Default fallback
  }
};

// Static method to add renewal date to history
renewalHistorySchema.statics.addRenewalDateToHistory = async function(vehicleId, renewalDate, updatedBy = null) {
  try {
    console.log('=== addRenewalDateToHistory DEBUG ===');
    console.log('Input parameters:', { vehicleId, renewalDate, updatedBy });
    
    if (!vehicleId || !renewalDate) {
      throw new Error("Vehicle ID and renewal date are required");
    }

    // Import VehicleModel to get plate number
    const VehicleModel = mongoose.model('Vehicle');
    
    // Get vehicle data to extract plate number
    const vehicle = await VehicleModel.findById(vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }
    
    console.log('Vehicle found:', { plateNo: vehicle.plateNo, _id: vehicle._id });
    
    // Calculate renewal status based on plate number
    const calculatedStatus = getRenewalStatus(vehicle.plateNo, renewalDate);

    // Find or create renewal history record for this vehicle
    let renewalHistory = await this.findOne({ vehicleId });
    console.log('Existing renewal history found:', renewalHistory ? 'Yes' : 'No');
    
    if (!renewalHistory) {
      console.log('Creating new renewal history record...');
      // Create new renewal history record
      renewalHistory = new this({
        vehicleId,
        renewalDate: new Date(renewalDate),
        status: calculatedStatus, // Use calculated status instead of hardcoded
        dateOfRenewalHistory: []
      });
    }

    // Check if this renewal date already exists in history
    const existingDate = renewalHistory.dateOfRenewalHistory.find(
      entry => entry.date.getTime() === new Date(renewalDate).getTime()
    );
    
    console.log('Existing date in history:', existingDate ? 'Yes' : 'No');
    console.log('Current dateOfRenewalHistory length:', renewalHistory.dateOfRenewalHistory.length);

    if (!existingDate) {
      console.log('Adding new renewal date to history...');
      // Add new renewal date to history
      renewalHistory.dateOfRenewalHistory.push({
        date: new Date(renewalDate),
        updatedAt: new Date(),
        updatedBy: updatedBy
      });

      // Update the main renewal date to the latest one
      renewalHistory.renewalDate = new Date(renewalDate);
      
      // Update the status based on the new renewal date
      renewalHistory.status = calculatedStatus;
      
      await renewalHistory.save();
      console.log('Renewal history saved successfully');
      console.log('New dateOfRenewalHistory length:', renewalHistory.dateOfRenewalHistory.length);
      console.log(`Added renewal date ${renewalDate} to history for vehicle ${vehicleId} with status: ${calculatedStatus}`);
    } else {
      console.log(`Renewal date ${renewalDate} already exists in history for vehicle ${vehicleId}`);
    }

    console.log('=== END addRenewalDateToHistory DEBUG ===');
    return renewalHistory;
  } catch (error) {
    console.error("Error adding renewal date to history:", error);
    console.error("Error stack:", error.stack);
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
