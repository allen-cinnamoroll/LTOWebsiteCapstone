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

// Ensure createdBy/updatedBy default to superadmin if missing on create
ViolationSchema.pre("save", async function (next) {
  try {
    if (!this.createdBy) {
      const superadminId = await getSuperadminId();
      if (superadminId) this.createdBy = superadminId;
    }
    // On create, set updatedBy to the same actor as createdBy when available
    if (!this.updatedBy) {
      if (this.createdBy) {
        this.updatedBy = this.createdBy;
      } else {
        const superadminId = await getSuperadminId();
        if (superadminId) this.updatedBy = superadminId;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Ensure updatedBy defaults to superadmin on update operations if not provided
ViolationSchema.pre("findOneAndUpdate", async function (next) {
  try {
    const update = this.getUpdate() || {};
    // If updatedBy is not being explicitly set, default it to superadmin
    if (update.updatedBy == null) {
      const superadminId = await getSuperadminId();
      if (superadminId) {
        // Use $set to avoid overwriting entire document
        this.setUpdate({
          ...update,
          $set: { ...(update.$set || {}), updatedBy: superadminId }
        });
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

const ViolationModel = mongoose.model("Violations", ViolationSchema);

export default ViolationModel;
