import express from "express";
import {
  createRenewalRecord,
  getVehicleRenewalHistory,
  getRenewalHistoryByPlate,
  updateRenewalRecord,
  deleteRenewalRecord,
  getRenewalStatistics
} from "../controller/renewalHistoryController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create a new renewal record
router.post("/", createRenewalRecord);

// Get renewal history for a specific vehicle
router.get("/vehicle/:vehicleId", getVehicleRenewalHistory);

// Get renewal history by plate number
router.get("/plate/:plateNo", getRenewalHistoryByPlate);

// Get renewal statistics for a vehicle
router.get("/vehicle/:vehicleId/statistics", getRenewalStatistics);

// Update a renewal record
router.put("/:id", updateRenewalRecord);

// Delete a renewal record
router.delete("/:id", deleteRenewalRecord);

export default router;
