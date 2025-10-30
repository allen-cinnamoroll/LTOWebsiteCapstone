import express from "express";
import { findUser, getAllUsers, updateUser, deleteUser, getUserLogs, exportUserLogs, getUserById } from "../controller/userController.js";
import authenticate, { authorizeRole } from "../middleware/authMiddleware.js";

const userRouter = express.Router();

// Get user profile
userRouter.get("/profile", authenticate, findUser);

// Get all users (admin and superadmin only)
userRouter.get("/all", authenticate, authorizeRole("admin", "superadmin"), getAllUsers);

// Get user by id (basic info)
userRouter.get("/:userId", authenticate, getUserById);

// Update user (admin and superadmin only)
userRouter.put("/:userId", authenticate, authorizeRole("admin", "superadmin"), updateUser);

// Delete user (admin and superadmin only)
userRouter.delete("/:userId", authenticate, authorizeRole("admin", "superadmin"), deleteUser);

// Get user logs (admin and superadmin only)
userRouter.get("/logs", authenticate, authorizeRole("admin", "superadmin"), getUserLogs);

// Export user logs to Excel (admin and superadmin only)
userRouter.get("/logs/export", authenticate, authorizeRole("admin", "superadmin"), exportUserLogs);

export default userRouter;
