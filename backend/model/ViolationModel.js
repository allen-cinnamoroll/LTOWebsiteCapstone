import mongoose from "mongoose";

const ViolationSchema = new mongoose.Schema(
  {
    // TOP NO. (without the -[0-9] part)
    topNo: {
      type: String,
      required: true,
      unique: true,
    },
    // Apprehension Details (Available for all violation types)
    firstName: {
      type: String,
      trim: true,
    },
    middleInitial: {
      type: String,
      trim: true,
      maxlength: 1,
    },
    lastName: {
      type: String,
      trim: true,
    },
    suffix: {
      type: String,
      trim: true,
    },
    violations: {
      type: [String],
    },
    violationType: {
      type: String,
      required: true,
      enum: ["confiscated", "alarm", "impounded"],
      default: "confiscated",
    },
    // License Type Details (Available for all violation types)
    licenseType: {
      type: String,
      enum: ["SP", "DL", "CL", "PLATE", "SP RECEIPT", "DL RECEIPT", "REFUSE TO SUR.", "DL TEMPORARY", "-", ""],
    },
    plateNo: {
      type: String,
      required: true, // Always required for all types
      trim: true,
    },
    dateOfApprehension: {
      type: Date,
      required: true, // Always required for all types
    },
    apprehendingOfficer: {
      type: String,
      required: true, // Always required for all types
      trim: true,
    },
    chassisNo: {
      type: String,
      trim: true,
    },
    engineNo: {
      type: String,
      trim: true,
    },
    // User tracking fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      default: null
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const ViolationModel = mongoose.model("Violations", ViolationSchema);

export default ViolationModel;
