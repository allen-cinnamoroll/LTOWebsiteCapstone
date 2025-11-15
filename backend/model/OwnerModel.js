import mongoose, { mongo } from "mongoose";

const addressSchema = new mongoose.Schema({
  purok: { type: String },
  barangay: { type: String },
  municipality: { type: String },
  province: { type: String },
  region: { type: String },
});

// const birthPlaceSchema = new mongoose.Schema({
//   street: { type: String },
//   barangay: { type: String },
//   municipality: { type: String },
//   province: { type: String },
// });

const ownerSchema = new mongoose.Schema(
  {
    ownerRepresentativeName: {
      type: String,
      required: [true, "ownerRepresentativeName is required"],
    },
    address: { type: addressSchema, required: [true, "address is required"] },
    contactNumber: {
      type: String,
      required: false,
    },
    emailAddress: {
      type: String,
      required: false,
      validate: {
        validator: function(v) {
          // Allow null, undefined, or empty string
          if (!v || v === '') return true;
          // Validate email format if value is provided
          return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: "Invalid email format"
      }
    },
    hasDriversLicense: {
      type: Boolean,
      required: [true, "hasDriversLicense is required"],
    },
    driversLicenseNumber: {
      type: String,
      required: function() {
        return this.hasDriversLicense === true;
      },
    },    
    birthDate: {
      type: Date,
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    userAccount :{
      type: mongoose.Schema.Types.ObjectId,
      ref:'Users',
      default: null
    },
    vehicleIds: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicles'
      }],
      default: []
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
    }
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    },
    toJSON: { virtuals: true }, // Enable virtuals in JSON response
    toObject: { virtuals: true }, // Enable virtuals when using .toObject()
  }
);

// Ensure createdBy defaults to superadmin when not provided
ownerSchema.pre("save", async function (next) {
  try {
    if (!this.createdBy) {
      const User = mongoose.model("Users");
      const superadmin = await User.findOne({ role: "0" }).select("_id");
      if (superadmin) {
        this.createdBy = superadmin._id;
      }
    }
    next();
  } catch (err) {
    // Do not block save on lookup failure; proceed without setting createdBy
    next();
  }
});

// Prevent updatedAt from being set on initial creation
ownerSchema.post("save", async function (doc, next) {
  try {
    // If updatedAt exists and equals createdAt (within 1 second margin), it means it was just created
    if (doc.updatedAt && doc.createdAt) {
      const timeDiff = Math.abs(doc.updatedAt.getTime() - doc.createdAt.getTime());
      // If updatedAt equals createdAt (within 1 second), it's a new document - unset updatedAt
      if (timeDiff < 1000 && !doc.updatedBy) {
        await OwnerModel.updateOne({ _id: doc._id }, { $unset: { updatedAt: "" } });
        doc.updatedAt = undefined;
      }
    }
    next();
  } catch (err) {
    next();
  }
});

// Virtual for full name
ownerSchema.virtual("fullname").get(function () {
  return this.ownerRepresentativeName;
});

const OwnerModel = mongoose.model("Owners", ownerSchema);

export default OwnerModel;

