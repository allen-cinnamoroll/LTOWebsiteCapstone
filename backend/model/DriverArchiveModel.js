import mongoose from "mongoose";

const driverArchiveSchema = new mongoose.Schema(
  {
    licenseNo: String,
    firstName: String,
    lastName: String,
    middleName: String,
    street: String,
    barangay: String,
    municipality: String,
    province: String,
    zipCode: String,
    nationality: String,
    sex: String,
    birthDate: Date,
    civilStatus: String,
    birthPlace: String,
    issueDate: Date,
    expiryDate: Date,
    archivedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const DriverArchiveModel = mongoose.model("DriverArchive", driverArchiveSchema);
export default DriverArchiveModel;
