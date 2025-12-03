import express from "express";
import multer from "multer";
import { authenticate } from "../middleware/authMiddleware.js";
import { updateProfile, getProfile, changePassword, upload } from "../controller/accountController.js";

const accountRouter = express.Router();

// Get user profile (Authenticated Users)
accountRouter.get("/profile", authenticate, getProfile);

// Update user profile with avatar upload (Authenticated Users)
accountRouter.put("/profile", authenticate, (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size too large. Maximum size is 5MB.'
          });
        }
        return res.status(400).json({
          success: false,
          message: `File upload error: ${err.message}`
        });
      }
      // Handle file filter errors
      if (err.message.includes('Only image files')) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      return res.status(500).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    }
    next();
  });
}, updateProfile);

// Change password (Authenticated Users)
accountRouter.post("/change-password", authenticate, express.json(), changePassword);

export default accountRouter;
