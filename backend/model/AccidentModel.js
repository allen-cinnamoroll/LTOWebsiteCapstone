import mongoose from "mongoose";

const AccidentSchema = new mongoose.Schema({
  blotterNo: {
    type: String,
    required: true,
    unique: true,
  },
  vehiclePlateNo: {
    type: String,
    required: false,
  },
  vehicleMCPlateNo: {
    type: String,
    required: false,
  },
  vehicleChassisNo: {
    type: String,
    required: false,
  },
  suspect: {
    type: String,
    required: false,
  },
  stageOfFelony: {
    type: String,
    required: false,
  },
  offense: {
    type: String,
    required: false,
  },
  offenseType: {
    type: String,
    required: false,
  },
  narrative: {
    type: String,
    required: false,
  },
  caseStatus: {
    type: String,
    required: false,
  },
  region: {
    type: String,
    required: false,
  },
  province: {
    type: String,
    required: false,
  },
  municipality: {
    type: String,
    required: true,
  },
  barangay: {
    type: String,
    required: true,
  },
  street: {
    type: String,
    required: false,
  },
  lat: {
    type: Number,
    required: false,
  },
  lng: {
    type: Number,
    required: false,
  },
  dateEncoded: {
    type: Date,
    required: false,
  },
  dateReported: {
    type: Date,
    required: false,
  },
  timeReported: {
    type: String,
    required: false,
  },
  dateCommited: {
    type: Date,
    required: true,
  },
  timeCommited: {
    type: String,
    required: false,
  },
  incidentType: {
    type: String,
    required: false,
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
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
});

// Ensure createdBy defaults to superadmin when not provided
AccidentSchema.pre("save", async function (next) {
  try {
    if (!this.createdBy && this.isNew) {
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

// Prevent updatedAt from being set on initial creation
AccidentSchema.post("save", async function (doc, next) {
  try {
    // If updatedAt exists and equals createdAt (within 1 second margin), it means it was just created
    if (doc.updatedAt && doc.createdAt) {
      const timeDiff = Math.abs(doc.updatedAt.getTime() - doc.createdAt.getTime());
      // If updatedAt equals createdAt (within 1 second), it's a new document - unset updatedAt
      if (timeDiff < 1000 && !doc.updatedBy) {
        const Accident = mongoose.model("Accidents");
        await Accident.updateOne({ _id: doc._id }, { $unset: { updatedAt: "" } });
        doc.updatedAt = undefined;
      }
    }
    next();
  } catch (err) {
    next();
  }
});

const AccidentModel = mongoose.model("Accidents", AccidentSchema);

export default AccidentModel;
