import express from "express";
import { registrationValidationRules, validate } from "../middleware/validator.js";
import { login, register } from "../controller/auth/authController.js";

const authRouter = express.Router();

authRouter.post("/login", express.json(), login);

authRouter.post("/register", express.json(), registrationValidationRules(), validate,register);

export default authRouter;