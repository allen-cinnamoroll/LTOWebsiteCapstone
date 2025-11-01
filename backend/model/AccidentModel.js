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
