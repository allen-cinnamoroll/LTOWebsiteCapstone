import VehicleModel from "../model/VehicleModel.js";
import UserModel from "../model/UserModel.js";
import DriverModel from "../model/DriverModel.js";
import { logAction } from "../util/logger.js";

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

    const vehicle = await VehicleModel.create(req.body);

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
    const vehicle = await VehicleModel.findByIdAndUpdate(vehicleId, req.body);

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
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
