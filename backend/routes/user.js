import express from "express";
import { findUser, getAllUsers, updateUser, deleteUser, getUserLogs } from "../controller/userController.js";
import authenticate, { authorizeRole } from "../middleware/authMiddleware.js";

const userRouter = express.Router();

// Get user profile
userRouter.get("/profile", authenticate, findUser);

// Get all users (admin and superadmin only)
userRouter.get("/all", authenticate, authorizeRole("admin", "superadmin"), getAllUsers);

// Update user (admin and superadmin only)
userRouter.put("/:userId", authenticate, authorizeRole("admin", "superadmin"), updateUser);

// Delete user (admin and superadmin only)
userRouter.delete("/:userId", authenticate, authorizeRole("admin", "superadmin"), deleteUser);

// Get user logs (admin and superadmin only)
userRouter.get("/logs", authenticate, authorizeRole("admin", "superadmin"), getUserLogs);

export default userRouter;
