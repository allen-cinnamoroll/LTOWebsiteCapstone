import DriverLog from "../model/DriverLog.js";

export const logAction = async (driver, type,message, relatedEntity) => {
  try {
    await DriverLog.create({
      driver,
      type,
      message,
      relatedEntity,
    });
    console.log(`Logged action: ${type} by driver ${driver}`);
  } catch (error) {
    console.error("Error logging action:", error);
  }
}