import mongoose from "mongoose";

const AccidentSchema = new mongoose.Schema({
  accident_id: {
    type: String,
    required: true,
    unique: true,
  },
  driver_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Drivers",
    required: true,
  },
  vehicle_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicles",
    required: true,
  },
  accident_date: {
    type: Date,
    required: true,
  },
  street: {
    type: String,
    required: true,
  },
  barangay: {
    type: String,
    required: true,
  },
  municipality: {
    type: String,
    required: true,
  },
  time_edited: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Accidents", AccidentSchema);
