import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { updateAvatar, deleteAvatar, uploadAvatar } from "../controller/avatarController.js";

const avatarRouter = express.Router();

// Upload/Update avatar (Authenticated Users)
avatarRouter.post("/upload", authenticate, uploadAvatar.single('avatar'), updateAvatar);

// Delete avatar (Authenticated Users)
avatarRouter.delete("/delete", authenticate, deleteAvatar);

export default avatarRouter;

