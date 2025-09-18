import express from "express";
import authenticate, { authorizeRole } from "../middleware/authMiddleware.js";
import { validateAccident, validate } from "../middleware/validator.js";
import {
	createAccident,
	getAccidents,
	getAccidentById,
	updateAccident,
	deleteAccident,
	getAccidentAnalytics,
	getAccidentRiskAnalytics,
} from "../controller/accidentController.js";

const accidentRouter = express.Router();

// Create an accident (Only Admin or Superadmin)
accidentRouter.post(
	"/",
	authenticate,
	express.json(),
	validateAccident,
	validate,
	createAccident
);

// Get all accidents (Authenticated Users)
accidentRouter.get("/", authenticate, getAccidents);

// Get a single accident by ID (Authenticated Users)
accidentRouter.get("/:id", authenticate, getAccidentById);

// Update an accident (Only Admin or Superadmin)
accidentRouter.patch(
	"/:id",
	authenticate,
	express.json(),
	validateAccident,
	validate,
	updateAccident
);

// Delete an accident (Only Admin or Superadmin)
accidentRouter.delete("/:id", authenticate, deleteAccident);

// Analytics endpoints
accidentRouter.get("/analytics/summary", authenticate, getAccidentAnalytics);
accidentRouter.get("/analytics/risk", authenticate, getAccidentRiskAnalytics);

export default accidentRouter;
