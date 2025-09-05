import AccidentModel from "../model/AccidentModel.js";
import DriverModel from "../model/DriverModel.js";
import VehicleModel from "../model/VehicleModel.js";
import { logUserActivity, getClientIP, getUserAgent } from "../util/userLogger.js";

export const getAccidents = async (req, res) => {
  try {
    const accidents = await AccidentModel.find()
      .populate("driver_id", "licenseNo firstName lastName middleName")
      .populate("vehicle_id", "plateNo make series");

    res.json({ success: true, data: accidents });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAccident = async (req, res) => {
  try {
    const { driver_id, vehicle_id, accident_id } = req.body;

    // Find driver by licenseNo
    const driver = await DriverModel.findOne({ licenseNo: driver_id });
    if (!driver) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid driver license number: Driver not found" 
      });
    }

    // Find vehicle by plateNo
    const vehicle = await VehicleModel.findOne({ plateNo: vehicle_id });
    if (!vehicle) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid vehicle plate number: Vehicle not found" 
      });
    }

    // Generate accident_id if not provided or empty
    let finalAccidentId = accident_id;
    if (!finalAccidentId || finalAccidentId.trim() === "") {
      const timestamp = Date.now();
      finalAccidentId = `ACC-${timestamp}`;
    }

    // Create accident with actual ObjectIds
    const accidentData = {
      ...req.body,
      accident_id: finalAccidentId,
      driver_id: driver._id,
      vehicle_id: vehicle._id
    };

    const accident = new AccidentModel(accidentData);
    await accident.save();

    // Log the activity
    if (req.user) {
      await logUserActivity({
        userId: req.user._id,
        userName: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email,
        role: req.user.role,
        logType: 'add_accident',
        ipAddress: getClientIP(req),
        userAgent: getUserAgent(req),
        status: 'success',
        details: `Added accident: ${finalAccidentId} (Driver: ${driver_id}, Vehicle: ${vehicle_id})`,
        actorId: req.user._id,
        actorName: `${req.user.firstName} ${req.user.lastName}`,
        actorEmail: req.user.email,
        actorRole: req.user.role
      });
    }

    res
      .status(201)
      .json({ success: true, message: "Accident created", data: accident });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAccidentById = async (req, res) => {
  try {
    const accident = await AccidentModel.findById(req.params.id)
      .populate("driver_id", "licenseNo firstName lastName middleName")
      .populate("vehicle_id", "plateNo make series");
    if (!accident) {
      return res
        .status(404)
        .json({ success: false, message: "Accident not found" });
    }
    res.json({ success: true, data: accident });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAccident = async (req, res) => {
  try {
    const { driver_id, vehicle_id } = req.body;
    let updateData = { ...req.body };

    if (driver_id) {
      const driver = await DriverModel.findOne({ licenseNo: driver_id });
      if (!driver) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid driver license number: Driver not found" 
        });
      }
      updateData.driver_id = driver._id;
    }

    if (vehicle_id) {
      const vehicle = await VehicleModel.findOne({ plateNo: vehicle_id });
      if (!vehicle) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid vehicle plate number: Vehicle not found" 
        });
      }
      updateData.vehicle_id = vehicle._id;
    }

    const accident = await AccidentModel.findByIdAndUpdate(
      req.params.id,
      { ...updateData, time_edited: Date.now() },
      { new: true }
    );
    if (!accident) {
      return res
        .status(404)
        .json({ success: false, message: "Accident not found" });
    }

    // Log the activity
    if (req.user) {
      await logUserActivity({
        userId: req.user._id,
        userName: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email,
        role: req.user.role,
        logType: 'update_accident',
        ipAddress: getClientIP(req),
        userAgent: getUserAgent(req),
        status: 'success',
        details: `Updated accident: ${accident.accident_id} (Driver: ${driver_id || 'unchanged'}, Vehicle: ${vehicle_id || 'unchanged'})`,
        actorId: req.user._id,
        actorName: `${req.user.firstName} ${req.user.lastName}`,
        actorEmail: req.user.email,
        actorRole: req.user.role
      });
    }

    res.json({ success: true, message: "Accident updated", data: accident });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete accident
export const deleteAccident = async (req, res) => {
  try {
    const accident = await AccidentModel.findById(req.params.id);
    
    if (!accident) {
      return res.status(404).json({ 
        success: false, 
        message: "Accident not found" 
      });
    }

    // Log the activity before deleting
    if (req.user) {
      await logUserActivity({
        userId: req.user._id,
        userName: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email,
        role: req.user.role,
        logType: 'delete_accident',
        ipAddress: getClientIP(req),
        userAgent: getUserAgent(req),
        status: 'success',
        details: `Deleted accident: ${accident.accident_id}`,
        actorId: req.user._id,
        actorName: `${req.user.firstName} ${req.user.lastName}`,
        actorEmail: req.user.email,
        actorRole: req.user.role
      });
    }

    await AccidentModel.findByIdAndDelete(req.params.id);
    
    res.json({ 
      success: true, 
      message: "Accident deleted successfully" 
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};
