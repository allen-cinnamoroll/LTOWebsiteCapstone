import OwnerModel from "../model/OwnerModel.js";
import DriverLog from "../model/DriverLog.js";

export const getLogs = async (req, res) => {
 
  try {
    let logs = await DriverLog.find().populate("driver").select("-__v");

    logs = logs.map((log) => {
      return {
        _id: log._id,
        driver: {
            _id: log.driver._id,
            fullname: log.driver.fullname,
        },
        message:log.message,
        type: log.type,
        relatedEntity: log.relatedEntity,
        createdAt: log.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getDriverLogs = async (req, res) => {
  const driverId = req.params.id;
  try {
    const driver = await OwnerModel.findById(driverId);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    const logs = await DriverLog.find({ driver: driverId });
    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
