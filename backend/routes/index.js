import express from "express";
import userRoutes from "./user.js";
import driverRoutes from "./driver.js";
import vehicleRoutes from "./vehicle.js";
import violationRoutes from "./violation.js";
import accidentRoutes from "./accident.js";
import authRoutes from "./auth.js";
import logRoutes from "./logs.js";
import dashboardRoutes from "./dashboard.js";
import renewalHistoryRoutes from "./renewalHistory.js";

const router = express.Router();

router.use("/driver", driverRoutes);
router.use("/user", userRoutes);
router.use("/vehicle", vehicleRoutes);
router.use("/violations", violationRoutes);
router.use("/accident", accidentRoutes);
router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/renewal-history", renewalHistoryRoutes);
//log routes for admin and driver
router.use("/logs", logRoutes);

// Handle 404 errors for undefined routes
router.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Page not found",
  });
});

export default router;