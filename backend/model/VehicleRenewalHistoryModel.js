import mongoose from "mongoose";

/**
 * Vehicle Renewal History Model
 * Stores historical records of vehicle renewals with status classification
 * 
 * Status types:
 * - "Early Renewal": Renewed before the scheduled week
 * - "On-Time Renewal": Renewed within the scheduled week
 * - "Late Renewal": Renewed after the due date
 */

const vehicleRenewalHistorySchema = new mongoose.Schema(
  {
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicles',
      required: [true, "vehicleId is required"],
      index: true
    },
    plateNo: {
      type: String,
      required: [true, "plateNo is required"],
      index: true
    },
    renewalDate: {
      type: Date,
      required: [true, "renewalDate is required"],
      index: true
    },
    status: {
      type: String,
      enum: ["Early Renewal", "On-Time Renewal", "Late Renewal"],
      required: [true, "status is required"]
    },
    dueDate: {
      type: Date,
      required: [true, "dueDate is required"]
    },
    scheduledWeekStart: {
      type: Date,
      required: [true, "scheduledWeekStart is required"]
    },
    scheduledWeekEnd: {
      type: Date,
      required: [true, "scheduledWeekEnd is required"]
    },
    renewalType: {
      type: String,
      enum: ["New", "Old"],
      required: [true, "renewalType is required"]
    },
    notes: {
      type: String,
      maxlength: 500
    },
    processedBy: {
      type: String,
      required: false // Could be user ID or name of who processed the renewal
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for efficient queries
vehicleRenewalHistorySchema.index({ vehicleId: 1, renewalDate: -1 });
vehicleRenewalHistorySchema.index({ plateNo: 1, renewalDate: -1 });
vehicleRenewalHistorySchema.index({ status: 1, renewalDate: -1 });

// Virtual for formatted renewal date
vehicleRenewalHistorySchema.virtual('formattedRenewalDate').get(function() {
  return this.renewalDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
});

// Virtual for formatted due date
vehicleRenewalHistorySchema.virtual('formattedDueDate').get(function() {
  return this.dueDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
});

// Static method to create renewal history record
vehicleRenewalHistorySchema.statics.createRenewalRecord = async function(vehicleId, plateNo, renewalDate, renewalType, processedBy = null, notes = null) {
  try {
    // Calculate due date and scheduled week based on plate number
    const { dueDate, scheduledWeekStart, scheduledWeekEnd } = calculateRenewalSchedule(plateNo, renewalType, renewalDate);
    
    // Determine status based on renewal date
    let status;
    if (renewalDate < scheduledWeekStart) {
      status = "Early Renewal";
    } else if (renewalDate >= scheduledWeekStart && renewalDate <= scheduledWeekEnd) {
      status = "On-Time Renewal";
    } else {
      status = "Late Renewal";
    }

    const renewalRecord = new this({
      vehicleId,
      plateNo,
      renewalDate,
      status,
      dueDate,
      scheduledWeekStart,
      scheduledWeekEnd,
      renewalType,
      processedBy,
      notes
    });

    await renewalRecord.save();
    return renewalRecord;
  } catch (error) {
    throw new Error(`Failed to create renewal record: ${error.message}`);
  }
};

// Helper function to calculate renewal schedule based on plate number
function calculateRenewalSchedule(plateNo, renewalType, renewalDate) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  // Extract last digit of plate number for scheduling
  const lastDigit = parseInt(plateNo.slice(-1));
  
  // Calculate the scheduled week based on plate number
  // Each digit (0-9) gets assigned to a specific week of the year
  const weekNumber = (lastDigit * 5) + 1; // Spread across 50 weeks (weeks 1-50)
  const scheduledWeekStart = new Date(currentYear, 0, 1);
  scheduledWeekStart.setDate(scheduledWeekStart.getDate() + (weekNumber - 1) * 7);
  
  const scheduledWeekEnd = new Date(scheduledWeekStart);
  scheduledWeekEnd.setDate(scheduledWeekEnd.getDate() + 6);
  
  // Calculate due date based on renewal type
  let dueDate;
  if (renewalType === "New") {
    // New vehicles: 3 years from renewal date
    dueDate = new Date(renewalDate);
    dueDate.setFullYear(dueDate.getFullYear() + 3);
  } else {
    // Old vehicles: 1 year from renewal date
    dueDate = new Date(renewalDate);
    dueDate.setFullYear(dueDate.getFullYear() + 1);
  }
  
  return {
    dueDate,
    scheduledWeekStart,
    scheduledWeekEnd
  };
}

const VehicleRenewalHistoryModel = mongoose.model('VehicleRenewalHistory', vehicleRenewalHistorySchema);

export default VehicleRenewalHistoryModel;
