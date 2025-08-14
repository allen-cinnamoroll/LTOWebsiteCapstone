import cron from "node-cron";
import Vehicle from "../model/VehicleModel.js"; // Adjust path as needed

const checkExpiredVehicles = async () => {
  console.log("Checking for expired vehicles...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const expiredVehicles = await Vehicle.updateMany(
      { expirationDate: { $lte: today }, status: "1" }, // Find active but expired vehicles
      { $set: { status: "0" } }
    );
 
    if (expiredVehicles.modifiedCount > 0) {
      console.log(`Updated ${expiredVehicles.modifiedCount} expired vehicles.`);
    } else {
      console.log("No vehicles expired today.");
    }
  } catch (error) {
    console.error("Error updating expired vehicles:", error);
  }
};

export const startVehicleExpirationWatcher = () => {
  // Run immediately on server start
  checkExpiredVehicles();

  // Schedule cron job to run daily at midnight
  cron.schedule("0 0 * * *", checkExpiredVehicles);
};
