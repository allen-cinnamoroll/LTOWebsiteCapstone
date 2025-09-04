import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import http from "http"; 
import database from "./database/database.js";
import dotenv from "dotenv"
import { scheduleVehicleExpirationCheck, scheduleWeeklyOTPReset } from "./util/scheduler.js";

//Load environment variables from .env file
dotenv.config();

//routes
import router from "./routes/index.js";

const app = express();

// Trust proxy for proper IP address detection
app.set('trust proxy', true);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//import routes
app.use("/api", router);


database.on("error", console.error.bind(console, "MongoDB connection error:"));

const server = http.createServer(app); 
//server port
const PORT = process.env.PORT;

server.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
  
  // Start the vehicle expiration scheduler
  scheduleVehicleExpirationCheck();
  
  // Start the weekly OTP reset scheduler
  scheduleWeeklyOTPReset();
});
