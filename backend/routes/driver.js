import express from "express";
import { driverValidationRules, validate } from "../middleware/validator.js";
import {
  createDriver,
  updateDriverStatus,
  findDriver,
  getDrivers,
  updateDriver,
} from "../controller/driversController.js";
import authenticate, { authorizeRole } from "../middleware/authMiddleware.js";
const driverRouter = express.Router();

driverRouter.post(
  "/",
  authenticate,
  express.json(),
  driverValidationRules(),
  validate,
  createDriver
);

driverRouter.get("/", authenticate, getDrivers);

driverRouter.get("/:id", authenticate, findDriver);

driverRouter.patch("/:id", authenticate, express.json(), updateDriver);

driverRouter.patch(
  "/:id/updateStatus",
  authenticate,
  express.json(),
  updateDriverStatus
);
export default driverRouter;
