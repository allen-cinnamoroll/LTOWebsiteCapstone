import express from "express";
import { validate, vehicleRegistrationRules } from "../middleware/validator.js";
import authenticate, { authorizeRole } from "../middleware/authMiddleware.js";
import { createVehicle, findVehicle, getVehicle, updateVehicle } from "../controller/vehicleController.js";

const vehicleRouter = express.Router();

vehicleRouter.post(
  "/",
  authenticate,
  authorizeRole("admin", "superadmin"),
  express.json(),
  vehicleRegistrationRules(),
  validate,
  createVehicle
);

vehicleRouter.patch("/:id", authenticate, express.json(), updateVehicle);

vehicleRouter.get("/", authenticate, getVehicle);
vehicleRouter.get("/:id", authenticate, findVehicle);

export default vehicleRouter;
