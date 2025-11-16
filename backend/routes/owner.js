import express from "express";
import { driverValidationRules, validate } from "../middleware/validator.js";
import {
  createDriver,
  findDriver,
  getDrivers,
  updateDriver,
  searchDrivers,
} from "../controller/ownersController.js";
import authenticate, { authorizeRole } from "../middleware/authMiddleware.js";
const ownerRouter = express.Router();

ownerRouter.post(
  "/",
  authenticate,
  express.json(),
  driverValidationRules(),
  validate,
  createDriver
);

ownerRouter.get("/", authenticate, getDrivers);
ownerRouter.get("/search", authenticate, searchDrivers);
ownerRouter.get("/:id", authenticate, findDriver);

ownerRouter.patch("/:id", authenticate, express.json(), updateDriver);
export default ownerRouter;

