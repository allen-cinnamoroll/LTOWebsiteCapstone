import express from "express";
import { driverValidationRules, validate } from "../middleware/validator.js";
import {
  createDriver,
  findDriver,
  getDrivers,
  updateDriver,
  searchDrivers,
  deleteDriver,
  getDeletedDrivers,
  restoreDriver,
  permanentDeleteDriver,
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
ownerRouter.get("/bin", authenticate, getDeletedDrivers);
ownerRouter.patch("/bin/:id/restore", authenticate, restoreDriver);
ownerRouter.delete("/bin/:id", authenticate, permanentDeleteDriver);
ownerRouter.get("/search", authenticate, searchDrivers);
ownerRouter.delete("/:id", authenticate, deleteDriver);
ownerRouter.get("/:id", authenticate, findDriver);

ownerRouter.patch("/:id", authenticate, express.json(), updateDriver);
export default ownerRouter;

