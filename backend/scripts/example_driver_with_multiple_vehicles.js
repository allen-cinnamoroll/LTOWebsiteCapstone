// Example of a driver with multiple vehicles using the new data structure

const exampleDriverWithMultipleVehicles = {
  // Driver Document
  driver: {
    _id: "507f1f77bcf86cd799439011",
    ownerRepresentativeName: "JUAN DELA CRUZ",
    address: {
      purok: "PUROK 3",
      barangay: "CENTRO",
      municipality: "CITY OF MATI",
      province: "DAVAO ORIENTAL",
      region: "REGION XI"
    },
    contactNumber: "09123456789",
    emailAddress: "juan.delacruz@email.com",
    hasDriversLicense: true,
    driversLicenseNumber: "L07-23-001234",
    birthDate: "1985-03-15T00:00:00.000Z",
    isActive: true,
    vehicles: [
      {
        vehicleId: "507f1f77bcf86cd799439012",
        plateNumber: "ABC123",
        fileNumber: "1101-123456"
      },
      {
        vehicleId: "507f1f77bcf86cd799439013", 
        plateNumber: "XYZ789",
        fileNumber: "1101-789012"
      },
      {
        vehicleId: "507f1f77bcf86cd799439014",
        plateNumber: "DEF456", 
        fileNumber: "1101-456789"
      }
    ],
    createdAt: "2024-01-15T08:30:00.000Z",
    updatedAt: "2024-10-02T10:45:00.000Z"
  },

  // Vehicle Documents
  vehicles: [
    {
      _id: "507f1f77bcf86cd799439012",
      plateNo: "ABC123",
      fileNo: "1101-123456",
      engineNo: "ENG123456",
      serialChassisNumber: "CHS123456",
      make: "TOYOTA",
      bodyType: "SEDAN",
      color: "WHITE",
      classification: "PRIVATE",
      dateOfRenewal: "2024-12-15T00:00:00.000Z",
      vehicleStatusType: "Old",
      status: "1",
      driverId: "507f1f77bcf86cd799439011", // References the driver
      createdAt: "2024-01-15T08:30:00.000Z",
      updatedAt: "2024-10-02T10:45:00.000Z"
    },
    {
      _id: "507f1f77bcf86cd799439013",
      plateNo: "XYZ789", 
      fileNo: "1101-789012",
      engineNo: "ENG789012",
      serialChassisNumber: "CHS789012",
      make: "HONDA",
      bodyType: "MOTORCYCLE",
      color: "RED",
      classification: "PRIVATE",
      dateOfRenewal: "2025-03-20T00:00:00.000Z",
      vehicleStatusType: "New",
      status: "1",
      driverId: "507f1f77bcf86cd799439011", // References the same driver
      createdAt: "2024-06-10T14:20:00.000Z",
      updatedAt: "2024-10-02T10:45:00.000Z"
    },
    {
      _id: "507f1f77bcf86cd799439014",
      plateNo: "DEF456",
      fileNo: "1101-456789", 
      engineNo: "ENG456789",
      serialChassisNumber: "CHS456789",
      make: "MITSUBISHI",
      bodyType: "PICKUP",
      color: "BLUE",
      classification: "FOR HIRE",
      dateOfRenewal: "2024-08-30T00:00:00.000Z",
      vehicleStatusType: "Old",
      status: "0", // This one is expired
      driverId: "507f1f77bcf86cd799439011", // References the same driver
      createdAt: "2024-03-22T11:15:00.000Z",
      updatedAt: "2024-10-02T10:45:00.000Z"
    }
  ]
};

// Example API responses

// GET /driver/507f1f77bcf86cd799439011
const getDriverResponse = {
  success: true,
  data: {
    _id: "507f1f77bcf86cd799439011",
    ownerRepresentativeName: "JUAN DELA CRUZ",
    fullname: "JUAN DELA CRUZ", // Virtual field
    address: {
      purok: "PUROK 3",
      barangay: "CENTRO", 
      municipality: "CITY OF MATI",
      province: "DAVAO ORIENTAL",
      region: "REGION XI"
    },
    contactNumber: "09123456789",
    emailAddress: "juan.delacruz@email.com",
    hasDriversLicense: true,
    driversLicenseNumber: "L07-23-001234",
    birthDate: "1985-03-15T00:00:00.000Z",
    isActive: true,
    vehicles: [
      {
        vehicleId: "507f1f77bcf86cd799439012",
        plateNumber: "ABC123",
        fileNumber: "1101-123456"
      },
      {
        vehicleId: "507f1f77bcf86cd799439013",
        plateNumber: "XYZ789", 
        fileNumber: "1101-789012"
      },
      {
        vehicleId: "507f1f77bcf86cd799439014",
        plateNumber: "DEF456",
        fileNumber: "1101-456789"
      }
    ]
  }
};

// GET /vehicle/file/1101-123456
const getVehicleByFileResponse = {
  success: true,
  data: {
    _id: "507f1f77bcf86cd799439012",
    plateNo: "ABC123",
    fileNo: "1101-123456",
    engineNo: "ENG123456",
    chassisNo: "CHS123456", // Mapped from serialChassisNumber
    make: "TOYOTA",
    bodyType: "SEDAN", 
    color: "WHITE",
    classification: "PRIVATE",
    dateOfRenewal: "2024-12-15T00:00:00.000Z",
    status: "Active", // Human-readable status
    vehicleStatusType: "Old",
    expirationInfo: {
      lastTwoDigits: "23",
      week: "third",
      month: "March",
      expirationDate: "2025-03-21T00:00:00.000Z",
      isExpired: false,
      status: "1"
    }
  }
};

// Example of how to query driver's vehicles
const getDriverVehiclesQuery = `
// MongoDB query to get all vehicles for a driver
db.vehicles.find({ driverId: ObjectId("507f1f77bcf86cd799439011") })

// Or using aggregation to get driver with populated vehicles
db.drivers.aggregate([
  { $match: { _id: ObjectId("507f1f77bcf86cd799439011") } },
  {
    $lookup: {
      from: "vehicles",
      localField: "vehicles.vehicleId", 
      foreignField: "_id",
      as: "vehicleDetails"
    }
  }
])
`;

export default exampleDriverWithMultipleVehicles;
