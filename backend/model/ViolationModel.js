import mongoose from "mongoose";
import UserModel from "./UserModel.js";

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
    fileNo: {
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

// Cache superadmin id to avoid repeated lookups
let cachedSuperadminId = null;

async function getSuperadminId() {
  if (cachedSuperadminId) return cachedSuperadminId;
  const superadmin = await UserModel.findOne({ role: "0" }).select("_id");
  cachedSuperadminId = superadmin ? superadmin._id : null;
  return cachedSuperadminId;
}

// Ensure createdBy defaults to superadmin if missing on create
ViolationSchema.pre("save", async function (next) {
  try {
    if (!this.createdBy) {
      const superadminId = await getSuperadminId();
      if (superadminId) this.createdBy = superadminId;
    }
    next();
  } catch (err) {
    // Do not block save on lookup failure; proceed without setting createdBy
    next();
  }
});

// Prevent updatedAt and updatedBy from being set on initial creation
ViolationSchema.post("save", async function (doc, next) {
  try {
    // If updatedAt exists and equals createdAt (within 1 second margin), it means it was just created
    if (doc.updatedAt && doc.createdAt) {
      const timeDiff = Math.abs(doc.updatedAt.getTime() - doc.createdAt.getTime());
      // If updatedAt equals createdAt (within 1 second), it's a new document - unset updatedAt and updatedBy
      if (timeDiff < 1000 && !doc.updatedBy) {
        const Violation = mongoose.model("Violations");
        await Violation.updateOne({ _id: doc._id }, { $unset: { updatedAt: "", updatedBy: "" } });
        doc.updatedAt = undefined;
        doc.updatedBy = undefined;
      }
    }
    next();
  } catch (err) {
    next();
  }
});

const ViolationModel = mongoose.model("Violations", ViolationSchema);

export default ViolationModel;
