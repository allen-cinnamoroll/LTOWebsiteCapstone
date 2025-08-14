import mongoose from "mongoose";

/**
 * Identification:
 * Driver:
 * 0 = unregistered
 * 1 = Driver's License (Reference to Driver)
 *
 * Vehicle:
 * 0 = unregistered
 * 1 = Vehicle (Reference to Vehicle)
 * 
 * status:
 * 0 = pending
 * 1 = resolved
 * 2 = dismissed
 */

const ViolationSchema = new mongoose.Schema({
  driverStatus: {
    type: Number,
    enum: [0, 1], // 0: Unregistered, 1: Driver's License (Reference to Driver)
    required: true,
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Drivers",
    required: function () {
      return this.driverStatus === 1; // Required only if driverStatus is 1 (Registered)
    },
  },
  firstName: {
    type: String,
    required: function () {
      return this.driverStatus === 0; // Required only if driver is unregistered
    },
  },
  lastName: {
    type: String,
    required: function () {
      return this.driverStatus === 0; // Required only if driver is unregistered
    },
  },
  middleName: {
    type: String,
    required: function () {
      return this.driverStatus === 0; // Required only if driver is unregistered
    },
  },
  barangay: {
    type: String,
    required: function () {
      return this.driverStatus === 0; // Required only if driver is unregistered
    },
  },
  municipality: {
    type: String,
    required: function () {
      return this.driverStatus === 0; // Required only if driver is unregistered
    },
  },
  province: {
    type: String,
    required: function () {
      return this.driverStatus === 0; // Required only if driver is unregistered
    },
  },
  zipcode: {
    type: String,
    required: function () {
      return this.driverStatus === 0; // Required only if driver is unregistered
    },
  },
  vehicleStatus: {
    type: Number,
    enum: [0, 1], // 0: Unregistered, 1: Vehicle (Reference to Vehicle)
    required: true,
  },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicles",
    required: function () {
      return this.vehicleStatus === 1; // Required only if vehicleStatus is 1 (Registered)
    },
  },
  vehicleChassisNumber: {
    type: String,
    required: function () {
      return this.vehicleStatus === 0; // Required only if vehicle is unregistered
    },
    match: [/^[a-zA-Z0-9-]+$/, "Invalid chassis number format"],
  },
  violationName: {
    type: String,
    required: true,
  },
  violationDescription: {
    type: String,
    required: true,
  },
  penalty: {
    type: Number,
    required: true,
  },
  place: {
    type: String,
    required: true,
  },
  datetime: {
    type: Date,
    required: true,
  },
  expirationDate: {
    type: Date,
    required: true,
  },
  status: {
    type: Number,
    enum: [0, 1, 2], // 0: Pending, 1: Resolved, 2: Dismissed
    default: 0,
  },
},   {
  timestamps: true,
  toJSON: { virtuals: true }, // Enable virtuals in JSON response
  toObject: { virtuals: true }, // Enable virtuals when using .toObject()
}
);


const ViolationModel = mongoose.model("Violations", ViolationSchema);

export default ViolationModel;
