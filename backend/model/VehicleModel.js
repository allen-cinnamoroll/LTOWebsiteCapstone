  import mongoose from "mongoose";

  /**
   * vehicle type:
   * 
   *
   * fuel type:
   * 0 = gas
   * 1 = diesel
   * 2 = lpg
   * 3 = CNG
   * 4 = electric
   * 5 = others
   *
   * status:
   * 0 = expired
   * 1 = active
   * 
   * classification:
   * 0 = private
   * 1 = for hire
   * 2 = government
   */

  const ownerSchema = new mongoose.Schema({
    firstName: { type: String },
    lastName: { type: String },
    middleName: { type: String },
    street: { type: String },
    barangay: { type: String },
    municipality: { type: String },
    province: { type: String },
  });

  const vehicleSchema = new mongoose.Schema(
    {
      plateNo: {
        type: String,
        required: [true, "plateNo is required"],
      },
      fileNo: {
        type: String,
        required: [true, "fileNo is required"],
      },
      engineNo: {
        type: String,
        required: [true, "engineNo is required"],
      },
      serialChassisNumber: {
        type: String,
        required: [true, "serialChassisNumber is required"],
        unique: true,
      },
      make: {
        type: String,
      },
      bodyType: {
        type: String,
      },
      color: {
        type: String,
      },
      classification: {
        type: String,
      },
      dateOfRenewal: {
        type: Date,
        required: false,
      },
      status:{
        type: String,
        enum:["0","1"],
        default:"1"
      },
      driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Drivers',
        required: false
      }
    },
    {
      timestamps: true,
      toJSON: { virtuals: true }, // Enable virtuals in JSON response
      toObject: { virtuals: true }, // Enable virtuals when using .toObject()
    }
  );

  const VehicleModel = mongoose.model("Vehicles", vehicleSchema);

  export default VehicleModel;
