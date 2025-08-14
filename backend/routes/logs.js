import express from "express";
import authenticate, { authorizeRole } from "../middleware/authMiddleware.js";
import { getDriverLogs, getLogs } from "../controller/driverLogsController.js";

const logsRouter = express.Router();
//get all logs for admin
logsRouter.get("/", authenticate, getLogs);   
//get logs for driver
logsRouter.get("/:id", authenticate, getDriverLogs);

export default logsRouter;