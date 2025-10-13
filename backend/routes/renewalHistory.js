import express from "express";
import {
  getVehicleRenewalHistory,
  createRenewalHistory,
  getRenewalStatistics,
  updateRenewalHistory,
  deleteRenewalHistory,
  bulkCreateRenewalHistory
} from "../controller/renewalHistoryController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validator.js";

const router = express.Router();

// Validation schemas
const createRenewalHistorySchema = {
  body: {
    vehicleId: {
      type: "string",
      required: true,
      message: "Vehicle ID is required"
    },
    renewalDate: {
      type: "string",
      required: true,
      message: "Renewal date is required"
    },
    notes: {
      type: "string",
      required: false,
      maxLength: 500,
      message: "Notes cannot exceed 500 characters"
    }
  }
};

const updateRenewalHistorySchema = {
  body: {
    notes: {
      type: "string",
      required: false,
      maxLength: 500,
      message: "Notes cannot exceed 500 characters"
    }
  }
};

const bulkCreateSchema = {
  body: {
    vehicleIds: {
      type: "array",
      required: true,
      message: "Vehicle IDs array is required"
    }
  }
};

// Apply authentication middleware to all routes
router.use(authenticateToken);

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
router.post("/", validateRequest(createRenewalHistorySchema), createRenewalHistory);

/**
 * @route PUT /api/renewal-history/:id
 * @desc Update a renewal history record
 * @access Private
 */
router.put("/:id", validateRequest(updateRenewalHistorySchema), updateRenewalHistory);

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
router.post("/bulk-create", validateRequest(bulkCreateSchema), bulkCreateRenewalHistory);

export default router;
