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
        unique: true,
      },
      fileNo: {
        type: String,
      },
      owner: {
        type: ownerSchema,
      },
      encumbrance: { type: String },
      vehicleType: {
        type: String,
        required: true,
      },
      classification: {
        type: String,
        required: [true, "classification is required"],
      },
      make: {
        type: String,
        required: [true, "make is required"],
      },
      fuelType: {
        type: String, 
      },
      motorNumber: {
        type: String,
        required: true,
      },
      serialChassisNumber: {
        type: String,
        required: true,
        unique: true,
      },
      series: { type: String, required: true, trim: true },
      bodyType: { type: String, required: true, trim: true },
      color: {
        type: String,
        required: [true, "color is required"],
      },
      yearModel: {
        type: Number,
        required: [true, "yearModel is required"],
        min: 1900, // Ensures valid year
      },
      dateRegistered: {
        type: Date,
        required: [true, "dateRegistered is required"],
      },
      expirationDate: {
        type: Date,
        required: [true, "dateRegistered is required"],
      },
      status:{
        type: String,
        enum:["0","1"],
        default:"1"
      }
    },
    {
      timestamps: true,
      toJSON: { virtuals: true }, // Enable virtuals in JSON response
      toObject: { virtuals: true }, // Enable virtuals when using .toObject()
    }
  );

  vehicleSchema.index({ owner: 1 });


  const VehicleModel = mongoose.model("Vehicles", vehicleSchema);

  export default VehicleModel;
