import mongoose from "mongoose";

const ViolationSchema = new mongoose.Schema(
  {
    violation_id: {
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
    violation_type: {
      type: String,
      required: true,
    },
    violation_date: {
      type: Date,
      required: true,
    },
    penalty: {
      type: Number,
      required: true,
    },
    remarks: {
      type: String,
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
