import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { updateProfile, getProfile, upload } from "../controller/accountController.js";

const accountRouter = express.Router();

// Get user profile (Authenticated Users)
accountRouter.get("/profile", authenticate, getProfile);

// Update user profile with avatar upload (Authenticated Users)
accountRouter.put("/profile", authenticate, upload.single('avatar'), updateProfile);

export default accountRouter;
