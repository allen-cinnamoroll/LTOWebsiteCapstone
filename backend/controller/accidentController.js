import AccidentModel from "../model/AccidentModel.js";
import DriverModel from "../model/DriverModel.js";
import VehicleModel from "../model/VehicleModel.js";
import UserModel from "../model/UserModel.js";
import { logUserActivity, getClientIP, getUserAgent } from "../util/userLogger.js";

export const getAccidents = async (req, res) => {
  try {
    const accidents = await AccidentModel.find();

    res.json({ success: true, data: accidents });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAccident = async (req, res) => {
  try {
    const { plateNo, accident_id } = req.body;

    // Generate accident_id if not provided or empty
    let finalAccidentId = accident_id;
    if (!finalAccidentId || finalAccidentId.trim() === "") {
      const timestamp = Date.now();
      finalAccidentId = `ACC-${timestamp}`;
    }

    // Create accident with plateNo directly
    const accidentData = {
      ...req.body,
      accident_id: finalAccidentId
    };

    const accident = new AccidentModel(accidentData);
    await accident.save();

    // Log the activity
    if (req.user && req.user.userId) {
      try {
        // Fetch user details for logging
        const user = await UserModel.findById(req.user.userId);
        if (user) {
          await logUserActivity({
            userId: user._id,
            userName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
            email: user.email,
            role: user.role,
            logType: 'add_accident',
            ipAddress: getClientIP(req),
            userAgent: getUserAgent(req),
            status: 'success',
            details: `Added accident: ${finalAccidentId} (Plate: ${plateNo})`,
            actorId: user._id,
            actorName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
            actorEmail: user.email,
            actorRole: user.role
          });
        }
      } catch (logError) {
        console.error('Failed to log user activity:', logError.message);
        // Don't fail the main operation if logging fails
      }
    } else {
      console.warn('User not authenticated or user.userId is missing for accident creation');
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
    const accident = await AccidentModel.findById(req.params.id);
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
    const updateData = { ...req.body };

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
    if (req.user && req.user.userId) {
      try {
        // Fetch user details for logging
        const user = await UserModel.findById(req.user.userId);
        if (user) {
          await logUserActivity({
            userId: user._id,
            userName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
            email: user.email,
            role: user.role,
            logType: 'update_accident',
            ipAddress: getClientIP(req),
            userAgent: getUserAgent(req),
            status: 'success',
            details: `Updated accident: ${accident.accident_id} (Plate: ${updateData.plateNo || 'unchanged'})`,
            actorId: user._id,
            actorName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
            actorEmail: user.email,
            actorRole: user.role
          });
        }
      } catch (logError) {
        console.error('Failed to log user activity:', logError.message);
        // Don't fail the main operation if logging fails
      }
    } else {
      console.warn('User not authenticated or user.userId is missing for accident update');
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
    if (req.user && req.user.userId) {
      try {
        // Fetch user details for logging
        const user = await UserModel.findById(req.user.userId);
        if (user) {
          await logUserActivity({
            userId: user._id,
            userName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
            email: user.email,
            role: user.role,
            logType: 'delete_accident',
            ipAddress: getClientIP(req),
            userAgent: getUserAgent(req),
            status: 'success',
            details: `Deleted accident: ${accident.accident_id}`,
            actorId: user._id,
            actorName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
            actorEmail: user.email,
            actorRole: user.role
          });
        }
      } catch (logError) {
        console.error('Failed to log user activity:', logError.message);
        // Don't fail the main operation if logging fails
      }
    } else {
      console.warn('User not authenticated or user.userId is missing for accident deletion');
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
