import mongoose from "mongoose";

const AccidentSchema = new mongoose.Schema({
  accident_id: {
    type: String,
    required: true,
    unique: true,
  },
  plateNo: {
    type: String,
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
  vehicle_type: {
    type: String,
    required: true,
    enum: ['motorcycle', 'car', 'truck', 'bus', 'van', 'jeepney', 'tricycle', 'other']
  },
  severity: {
    type: String,
    required: true,
    enum: ['minor', 'moderate', 'severe', 'fatal']
  },
  notes: {
    type: String,
    required: false,
  },
  coordinates: {
    lat: {
      type: Number,
      required: false,
    },
    lng: {
      type: Number,
      required: false,
    }
  },
  time_edited: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Accidents", AccidentSchema);
