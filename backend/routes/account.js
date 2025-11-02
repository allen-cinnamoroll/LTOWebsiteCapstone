import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { updateProfile, getProfile } from "../controller/accountController.js";

const accountRouter = express.Router();

// Get user profile (Authenticated Users)
accountRouter.get("/profile", authenticate, getProfile);

// Update user profile (name and email only, avatar handled separately)
accountRouter.put("/profile", authenticate, updateProfile);

export default accountRouter;
