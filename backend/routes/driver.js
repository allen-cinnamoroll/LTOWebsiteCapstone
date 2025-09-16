import express from "express";
import { driverValidationRules, validate } from "../middleware/validator.js";
import {
  createDriver,
  findDriver,
  getDrivers,
  updateDriver,
  searchDrivers,
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
driverRouter.get("/search", authenticate, searchDrivers);
driverRouter.get("/:id", authenticate, findDriver);

driverRouter.patch("/:id", authenticate, express.json(), updateDriver);
export default driverRouter;
