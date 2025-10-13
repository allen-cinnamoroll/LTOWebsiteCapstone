import express from "express";
import {
  createRenewalHistory,
  getVehicleRenewalHistory,
  getRenewalHistoryByPlate,
  getAllRenewalHistory,
  updateRenewalHistory,
  deleteRenewalHistory,
  getRenewalStatistics
} from "../controller/vehicleRenewalHistoryController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Create a new renewal history record
router.post("/", authenticateToken, createRenewalHistory);

// Get renewal history for a specific vehicle
router.get("/vehicle/:vehicleId", authenticateToken, getVehicleRenewalHistory);

// Get renewal history by plate number
router.get("/plate/:plateNo", authenticateToken, getRenewalHistoryByPlate);

// Get all renewal history with filters
router.get("/", authenticateToken, getAllRenewalHistory);

// Get renewal statistics
router.get("/statistics", authenticateToken, getRenewalStatistics);

// Update renewal history record
router.put("/:id", authenticateToken, updateRenewalHistory);

// Delete renewal history record
router.delete("/:id", authenticateToken, deleteRenewalHistory);

export default router;
