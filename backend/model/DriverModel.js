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

const driverSchema = new mongoose.Schema(
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
    vehicleIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicles'
    }]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // Enable virtuals in JSON response
    toObject: { virtuals: true }, // Enable virtuals when using .toObject()
  }
);

// Virtual for full name
driverSchema.virtual("fullname").get(function () {
  return this.ownerRepresentativeName;
});

const DriverModel = mongoose.model("Drivers", driverSchema);

export default DriverModel;
