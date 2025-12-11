import express from "express";
import { findUser, getAllUsers, updateUser, deleteUser, getUserLogs, exportUserLogs, getUserById, getOnlineUsers, updateHeartbeat, logAutomaticRetrain, retrainAccidentModel } from "../controller/userController.js";
import authenticate, { authorizeRole } from "../middleware/authMiddleware.js";

const userRouter = express.Router();

// Get user profile
userRouter.get("/profile", authenticate, findUser);

// Get online users (role-based)
userRouter.get("/online-users", authenticate, getOnlineUsers);

// Heartbeat endpoint
userRouter.post("/me/heartbeat", authenticate, updateHeartbeat);

// Get all users (admin and superadmin only)
userRouter.get("/all", authenticate, authorizeRole("admin", "superadmin"), getAllUsers);

// Get user logs (admin and superadmin only) - MUST come before /:userId route
userRouter.get("/logs", authenticate, authorizeRole("admin", "superadmin"), getUserLogs);

// Export user logs to Excel (admin and superadmin only)
userRouter.get("/logs/export", authenticate, authorizeRole("admin", "superadmin"), exportUserLogs);

// Get user by id (basic info) - MUST come after /logs to avoid route conflicts
userRouter.get("/:userId", authenticate, getUserById);

// Update user (admin and superadmin only)
userRouter.put("/:userId", authenticate, authorizeRole("admin", "superadmin"), updateUser);

// Delete user (admin and superadmin only)
userRouter.delete("/:userId", authenticate, authorizeRole("admin", "superadmin"), deleteUser);

// Log automatic retrain activity (internal endpoint for Python scripts)
// No authentication required - this is for automated scripts running on the server
userRouter.post("/logs/automatic-retrain", logAutomaticRetrain);

// Manual retrain accident model endpoint (with logging)
userRouter.post("/retrain-accident-model", authenticate, authorizeRole("admin", "superadmin"), retrainAccidentModel);

export default userRouter;
