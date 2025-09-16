import express from "express";
import { validate, vehicleRegistrationRules } from "../middleware/validator.js";
import authenticate, { authorizeRole } from "../middleware/authMiddleware.js";
import { createVehicle, findVehicle, getVehicle, updateVehicle, checkVehiclesExpiration, updateVehicleStatus, getVehicleOwnerByPlate } from "../controller/vehicleController.js";

const vehicleRouter = express.Router();

vehicleRouter.post(
  "/",
  authenticate,
  authorizeRole("admin", "superadmin", "employee"),
  express.json(),
  vehicleRegistrationRules(),
  validate,
  createVehicle
);

vehicleRouter.patch("/:id", authenticate, express.json(), updateVehicle);

// Block manual status updates
vehicleRouter.patch("/:id/status", authenticate, express.json(), updateVehicleStatus);

vehicleRouter.get("/", authenticate, getVehicle);
vehicleRouter.get("/check-expiration", authenticate, checkVehiclesExpiration);
vehicleRouter.get("/owner/:plateNo", authenticate, getVehicleOwnerByPlate);
vehicleRouter.get("/:id", authenticate, findVehicle);

export default vehicleRouter;
