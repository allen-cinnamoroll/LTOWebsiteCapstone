import express from "express";
import { findUser } from "../controller/userController.js";
import authenticate, { authorizeRole } from "../middleware/authMiddleware.js";

const userRouter = express.Router();

userRouter.get("/profile", authenticate, findUser);

export default userRouter;
