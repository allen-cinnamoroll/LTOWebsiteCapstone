import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { updateProfile, getProfile, changePassword, upload } from "../controller/accountController.js";

const accountRouter = express.Router();

// Get user profile (Authenticated Users)
accountRouter.get("/profile", authenticate, getProfile);

// Update user profile with avatar upload (Authenticated Users)
accountRouter.put("/profile", authenticate, upload.single('avatar'), updateProfile);

// Change password (Authenticated Users)
accountRouter.post("/change-password", authenticate, express.json(), changePassword);

export default accountRouter;
