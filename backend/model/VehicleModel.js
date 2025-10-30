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
      
      fileNo: {
        type: String,
        required: [true, "fileNo is required"],
      },
      plateNo: {
        type: String,
        required: [true, "plateNo is required"],
        index: true, // Create regular index, not unique
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
      // Each renewal entry stores the date and (optionally) who processed it
      dateOfRenewal: {
        type: [new mongoose.Schema({
          date: { type: Date, required: true },
          processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', default: null }
        }, { _id: false })],
        required: false,
        default: [],
      },
      vehicleStatusType: {
        type: String,
        enum: ["New", "Old"],
        required: [true, "vehicleStatusType is required"],
        default:"Old"
      },
      status:{
        type: String,
        enum:["0","1"],
        default:"1"
      },
      driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Drivers',
        required: [true, "driverId is required"]
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
      timestamps: true,
      toJSON: { virtuals: true }, // Enable virtuals in JSON response
      toObject: { virtuals: true }, // Enable virtuals when using .toObject()
    }
  );

  // Ensure createdBy defaults to superadmin when not provided
  vehicleSchema.pre("save", async function (next) {
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

  const VehicleModel = mongoose.model("Vehicles", vehicleSchema);

  export default VehicleModel;
