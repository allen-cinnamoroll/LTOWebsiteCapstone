import express from "express";
import { driverValidationRules, validate } from "../middleware/validator.js";
import {
  createDriver,
  updateDriverStatus,
  findDriver,
  getDrivers,
  updateDriver,
  checkDriversExpiration,
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
driverRouter.get("/check-expiration", authenticate, checkDriversExpiration);

driverRouter.get("/:id", authenticate, findDriver);

driverRouter.patch("/:id", authenticate, express.json(), updateDriver);

driverRouter.patch(
  "/:id/updateStatus",
  authenticate,
  express.json(),
  updateDriverStatus
);
export default driverRouter;
