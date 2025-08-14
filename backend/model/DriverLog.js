import mongoose from "mongoose";
/**
 * 0 - registered a vehicle
 * 1 - violation
 * 2 - accident
 */
const driverLogSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drivers",
      required: true,
    },
    type: {
      type: String,
      enum: ["0", "1", "2"],
      required: true,
    },
    message:{
      type:String,
      required:true,
    },
    relatedEntity: {
      entityId: mongoose.Schema.Types.ObjectId, // Reference to vehicle, violation, or accident
      entityType: {
        type: String,
        enum: ["Vehicle", "Violation", "Accident"],
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("DriverLog", driverLogSchema);
