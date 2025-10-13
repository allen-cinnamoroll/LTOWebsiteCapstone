import mongoose from "mongoose";

/**
 * Renewal History Model
 * Tracks all renewal records for vehicles
 * 
 * Status types:
 * - "Early Renewal" - Renewed before the scheduled week
 * - "On-Time Renewal" - Renewed within the scheduled week
 * - "Late Renewal" - Renewed after the due date
 */

const renewalHistorySchema = new mongoose.Schema(
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
      required: [true, "renewalDate is required"]
    },
    status: {
      type: String,
      enum: ["Early Renewal", "On-Time Renewal", "Late Renewal"],
      required: [true, "status is required"]
    },
    scheduledWeek: {
      type: Date,
      required: [true, "scheduledWeek is required"]
    },
    dueDate: {
      type: Date,
      required: [true, "dueDate is required"]
    },
    notes: {
      type: String,
      default: ""
    },
    processedBy: {
      type: String,
      default: "System"
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for efficient queries
renewalHistorySchema.index({ vehicleId: 1, renewalDate: -1 });
renewalHistorySchema.index({ plateNo: 1, renewalDate: -1 });

const RenewalHistoryModel = mongoose.model("RenewalHistory", renewalHistorySchema);

export default RenewalHistoryModel;
