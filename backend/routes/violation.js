import express from "express";
import {
  createViolation,
  getViolations,
  getViolationById,
  updateViolation,
  // deleteViolation,
} from "../controller/violationController.js";
import { validateViolation, validate } from "../middleware/validator.js";
import authenticate, { authorizeRole } from "../middleware/authMiddleware.js";

const violationRouter = express.Router();

// Create a violation (Only Admin or Superadmin)
violationRouter.post("/", authenticate, express.json(), validateViolation, validate, createViolation);

// Get all violations (Authenticated Users)
violationRouter.get("/", authenticate, getViolations);

// Get a single violation by ID (Authenticated Users)
violationRouter.get("/:id", authenticate, getViolationById);

// Update a violation (Only Admin or Superadmin)
violationRouter.patch("/:id", authenticate, express.json(), validateViolation, validate, updateViolation);

// // Delete a violation (Only Admin or Superadmin)
// violationRouter.delete("/:id", authenticate, deleteViolation);

export default violationRouter;
