import DriverModel from "../model/DriverModel.js";
import UserModel from "../model/UserModel.js";

export const createDriver = async (req, res) => {
  const licenseNo = req.body.licenseNo;
  try {
    const driver = await DriverModel.findOne({ licenseNo });

    if (driver) {
      return res.status(400).json({
        success: false,
        message: "Driver already exists",
      });
    }

    // const accCreated = await generateUserAcc(birthDate, lastName, firstName);
    
    // // Attach the generated user account ID to the request body
    // req.body.userAccount = accCreated._id;
    await DriverModel.create(req.body);

    res.status(201).json({
      success: true,
      message: "Driver registered successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getDrivers = async (req, res) => {
  try {
    const drivers = await DriverModel.find().select("fullname licenseNo firstName lastName middleName sex birthDate civilStatus issueDate expiryDate isActive").sort({createdAt:-1})

    res.status(200).json({
      success: true,
      data: drivers,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const findDriver = async (req, res) => {
  const driverId = req.params.id;
  try {
    const driver = await DriverModel.findById(driverId).select("fullname licenseNo firstName lastName middleName sex birthDate nationality civilStatus issueDate expiryDate address isActive birthPlace");

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    res.status(200).json({
      success: true,
      data: driver,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const updateDriver = async (req, res) => {
  const driverId = req.params.id;
  try {
    const driver = await DriverModel.findByIdAndUpdate(driverId, req.body);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Driver updated",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const updateDriverStatus = async (req, res) => {
  const driverId = req.params.id;
  console.log(req.body)
  try {
    const driver = await DriverModel.findByIdAndUpdate(
      driverId,
      req.body,
      { new: true }
    );
   
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Driver deactivated",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

