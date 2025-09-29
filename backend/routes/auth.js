import express from "express";
import { registrationValidationRules, validate } from "../middleware/validator.js";
import { login, register, verifyOTP, logout, resetOTPStatus } from "../controller/auth/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const authRouter = express.Router();

authRouter.post("/login", express.json(), login);
authRouter.post("/verify-otp", express.json(), verifyOTP);
authRouter.post("/register", express.json(), registrationValidationRules(), validate, register);
authRouter.get("/validate-token", authenticate, (req, res) => {
  // If we reach here, the token is valid (authenticate middleware passed)
  res.json({ 
    success: true, 
    message: "Token is valid",
    user: {
      userId: req.user.userId,
      role: req.user.role,
      email: req.user.email
    }
  });
});
authRouter.post("/logout", authenticate, logout);
authRouter.post("/reset-otp-status", authenticate, resetOTPStatus);

export default authRouter;