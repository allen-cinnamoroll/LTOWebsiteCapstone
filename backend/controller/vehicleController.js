import VehicleModel from "../model/VehicleModel.js";
import UserModel from "../model/UserModel.js";
import DriverModel from "../model/DriverModel.js";
import { logAction } from "../util/logger.js";
import { 
  checkVehicleExpirationStatus, 
  updateVehicleStatusByExpiration,
  checkAllVehiclesExpiration 
} from "../util/vehicleStatusChecker.js";

export const createVehicle = async (req, res) => {
  const plateNo = req.body.plateNo;
  try {
    const plateNoTaken = await VehicleModel.findOne({ plateNo });

    if (plateNoTaken) {
      return res.status(400).json({
        success: false,
        message: "Vehicle already registered",
      });
    }

    const dateRegistered = req.body.dateRegistered;
    const expirationDate = req.body.expirationDate;

    if(dateRegistered > expirationDate){
      return res.status(400).json({
        success: false,
        message: "Date registered cannot be greater than expiration date"
      })
    }

    // Automatically set status based on expiration date
    const status = checkVehicleExpirationStatus(expirationDate);
    const vehicleData = { ...req.body, status };

    const vehicle = await VehicleModel.create(vehicleData);

    res.status(201).json({
      success: true,
      message: "Vehicle registered",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getVehicle = async (req, res) => {
  try {
    // First, check and update all vehicles' expiration status
    await checkAllVehiclesExpiration();
    
    const vehicles = await VehicleModel.find().sort({ createdAt: -1 });

    const vehicleDetails = vehicles.map((data) => {
      return {
        _id: data._id,
        owner: data.owner,
        type: data.vehicleType,
        classification: data.classification,
        make: data.make,
        fuelType: data.fuelType,
        series: data.series,
        bodyType: data.bodyType,
        series: data.series,
        color: data.color,
        yearModel: data.yearModel,
        dateRegistered: data.dateRegistered,
        expirationDate: data.expirationDate,
        plateNo: data.plateNo,
        status: data.status
      };
    });

    res.status(200).json({
      success: true,
      data: vehicleDetails,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const findVehicle = async (req, res) => {
  const vehicleId = req.params.id;
  try {
    const vehicle = await VehicleModel.findById(vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    const vehicleDetails = {
      _id: vehicle._id,
      plateNo: vehicle.plateNo,
      fileNo: vehicle.fileNo,
      owner: vehicle.owner,
      encumbrance: vehicle.encumbrance,
      vehicleType: vehicle.vehicleType,
      classification: vehicle.classification,
      make: vehicle.make,
      fuelType: vehicle.fuelType,
      motorNumber: vehicle.motorNumber,
      serialChassisNumber: vehicle.serialChassisNumber,
      series: vehicle.series,
      bodyType: vehicle.bodyType,
      color: vehicle.color,
      yearModel: vehicle.yearModel,
      dateRegistered: vehicle.dateRegistered,
      expirationDate: vehicle.expirationDate,
      status: vehicle.status
    };

    res.status(200).json({
      success: true,
      data: vehicleDetails,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const updateVehicle = async (req, res) => {
  const vehicleId = req.params.id;

  try {
    let updateData = { ...req.body };
    
    // Remove status from updateData to prevent manual status changes
    delete updateData.status;
    
    // If expiration date is being updated, automatically update status
    if (req.body.expirationDate) {
      const updatedVehicle = await updateVehicleStatusByExpiration(
        vehicleId, 
        req.body.expirationDate
      );
      
      if (!updatedVehicle) {
        return res.status(404).json({
          success: false,
          message: "Vehicle not found",
        });
      }
      
      res.status(200).json({
        success: true,
        message: "Vehicle updated with automatic status adjustment",
        data: {
          status: updatedVehicle.status,
          expirationDate: updatedVehicle.expirationDate
        }
      });
    } else {
      // Regular update without expiration date change
      const vehicle = await VehicleModel.findByIdAndUpdate(vehicleId, updateData);

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: "Vehicle not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Vehicle updated",
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Manual endpoint to check and update all vehicles' expiration status
export const checkVehiclesExpiration = async (req, res) => {
  try {
    const result = await checkAllVehiclesExpiration();
    
    res.status(200).json({
      success: true,
      message: result.message,
      updatedCount: result.updatedCount
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Block manual status updates - status can only be changed automatically
export const updateVehicleStatus = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: "Vehicle status cannot be manually updated. Status is automatically managed based on expiration date.",
  });
};
