import express from "express";
import {
  createViolation,
  getViolations,
  getViolationById,
  updateViolation,
  getViolationCount,
  getViolationAnalytics,
  deleteViolation,
  getDeletedViolations,
  restoreViolation,
  permanentDeleteViolation,
  exportViolations,
  getApprehendingOfficers,
} from "../controller/violationController.js";
import { validateViolation, validate } from "../middleware/validator.js";
import authenticate, { authorizeRole } from "../middleware/authMiddleware.js";

const violationRouter = express.Router();

// Create a violation (Only Admin or Superadmin)
violationRouter.post("/", authenticate, express.json(), validateViolation, validate, createViolation);

// Get all violations (Authenticated Users)
violationRouter.get("/", authenticate, getViolations);

// Export violations (Authenticated Users)
violationRouter.get("/export", authenticate, exportViolations);

// Get deleted violations (bin)
violationRouter.get("/bin", authenticate, getDeletedViolations);

// Restore violation from bin (Only Admin or Superadmin)
violationRouter.patch("/bin/:id/restore", authenticate, restoreViolation);

// Permanently delete violation from bin (Only Admin or Superadmin)
violationRouter.delete("/bin/:id", authenticate, permanentDeleteViolation);

// Get violation count statistics (Authenticated Users)
violationRouter.get("/count", authenticate, getViolationCount);

// Get comprehensive violation analytics (Authenticated Users)
violationRouter.get("/analytics", authenticate, getViolationAnalytics);

// Get unique apprehending officers (Authenticated Users)
violationRouter.get("/officers", authenticate, getApprehendingOfficers);

// Delete a violation (Only Admin or Superadmin)
violationRouter.delete("/:id", authenticate, deleteViolation);

// Get a single violation by ID (Authenticated Users)
violationRouter.get("/:id", authenticate, getViolationById);

// Update a violation (Only Admin or Superadmin)
violationRouter.patch("/:id", authenticate, express.json(), validateViolation, validate, updateViolation);

export default violationRouter;
