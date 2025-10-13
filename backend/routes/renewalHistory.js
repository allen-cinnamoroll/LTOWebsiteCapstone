import express from "express";
import {
  getVehicleRenewalHistory,
  createRenewalHistory,
  getRenewalStatistics,
  updateRenewalHistory,
  deleteRenewalHistory,
  bulkCreateRenewalHistory
} from "../controller/renewalHistoryController.js";
import { authenticate } from "../middleware/authMiddleware.js";
const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route GET /api/renewal-history/vehicle/:vehicleId
 * @desc Get renewal history for a specific vehicle
 * @access Private
 */
router.get("/vehicle/:vehicleId", getVehicleRenewalHistory);

/**
 * @route GET /api/renewal-history/vehicle/:vehicleId/statistics
 * @desc Get renewal statistics for a specific vehicle
 * @access Private
 */
router.get("/vehicle/:vehicleId/statistics", getRenewalStatistics);

/**
 * @route POST /api/renewal-history
 * @desc Create a new renewal history record
 * @access Private
 */
router.post("/", express.json(), createRenewalHistory);

/**
 * @route PUT /api/renewal-history/:id
 * @desc Update a renewal history record
 * @access Private
 */
router.put("/:id", express.json(), updateRenewalHistory);

/**
 * @route DELETE /api/renewal-history/:id
 * @desc Delete a renewal history record
 * @access Private
 */
router.delete("/:id", deleteRenewalHistory);

/**
 * @route POST /api/renewal-history/bulk-create
 * @desc Bulk create renewal history records (for migration)
 * @access Private
 */
router.post("/bulk-create", express.json(), bulkCreateRenewalHistory);

export default router;
