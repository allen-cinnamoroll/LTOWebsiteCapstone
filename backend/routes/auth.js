import express from "express";
import { registrationValidationRules, validate } from "../middleware/validator.js";
import { login, register, verifyOTP } from "../controller/auth/authController.js";

const authRouter = express.Router();

authRouter.post("/login", express.json(), login);
authRouter.post("/verify-otp", express.json(), verifyOTP);
authRouter.post("/register", express.json(), registrationValidationRules(), validate, register);

export default authRouter;