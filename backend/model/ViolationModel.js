import mongoose from "mongoose";

const ViolationSchema = new mongoose.Schema(
  {
    // TOP NO. (without the -[0-9] part)
    topNo: {
      type: String,
      required: true,
      unique: true,
    },
    // Apprehension Details (Required for violation and impound)
    firstName: {
      type: String,
      required: function() {
        return this.violationType === 'confiscated' || this.violationType === 'impounded';
      },
      trim: true,
    },
    middleInitial: {
      type: String,
      trim: true,
      maxlength: 1,
    },
    lastName: {
      type: String,
      required: function() {
        return this.violationType === 'confiscated' || this.violationType === 'impounded';
      },
      trim: true,
    },
    suffix: {
      type: String,
      trim: true,
    },
    violations: {
      type: [String],
      required: function() {
        return this.violationType === 'confiscated' || this.violationType === 'impounded';
      },
    },
    violationType: {
      type: String,
      required: true,
      enum: ["confiscated", "alarm", "impounded"],
      default: "confiscated",
    },
    // Confiscated Item Details (Required for violation only)
    licenseType: {
      type: String,
      required: function() {
        return this.violationType === 'confiscated';
      },
      enum: ["SP", "DL", "CL", "PLATE", "SP RECEIPT", "DL RECEIPT", "REFUSE TO SUR.", "DL TEMPORARY"],
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const ViolationModel = mongoose.model("Violations", ViolationSchema);

export default ViolationModel;
