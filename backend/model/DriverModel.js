import mongoose, { mongo } from "mongoose";

const addressSchema = new mongoose.Schema({
  street: { type: String },
  barangay: { type: String },
  municipality: { type: String },
  province: { type: String },
});

// const birthPlaceSchema = new mongoose.Schema({
//   street: { type: String },
//   barangay: { type: String },
//   municipality: { type: String },
//   province: { type: String },
// });

const driverSchema = new mongoose.Schema(
  {
    licenseNo: {
      type: String,
      required: [true, "licenseNo is required"],
      unique: true,
      match: [/^[a-zA-Z0-9]{3}-\d{2}-\d{6}$/, "Invalid license number format"],
    },    
    firstName: {
      type: String,
      required: [true, "firstName is required"],
    },
    lastName: {
      type: String,
      required: [true, "lastName is required"],
    },
    middleName: {
      type: String,
    },
    address: { type: addressSchema, required: [true, "address is required"] },
    nationality: {
      type: String,
      required: [true, "nationality is required"],
    },
    sex: {
      type: String,
      enum: ["0", "1"],
      default: "0",
    },
    birthDate: {
      type: Date,
      required: [true, "birthDate is required"],
    },
    civilStatus: {
      type: String,
      enum: ["0", "1","2"],
      default: "0",
    },
    birthPlace: {
      type: String,
      required: [true, "birthPlace is required"],
    },
    issueDate: {
      type: Date,
      required: [true, "issueDate is required"],
    },
    expiryDate: {
      type: Date,
      required: [true, "expiryDate is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    userAccount :{
      type: mongoose.Schema.Types.ObjectId,
      ref:'Users',
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // Enable virtuals in JSON response
    toObject: { virtuals: true }, // Enable virtuals when using .toObject()
  }
);

// Virtual for full name
driverSchema.virtual("fullname").get(function () {
  const middleInitial = this.middleName ? `${this.middleName.charAt(0)}. ` : "";
  return `${this.firstName} ${middleInitial}${this.lastName}`.trim();
});

const DriverModel = mongoose.model("Drivers", driverSchema);

export default DriverModel;
