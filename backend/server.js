import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import http from "http"; 
import database from "./database/database.js";
import dotenv from "dotenv"
import { scheduleVehicleExpirationCheck } from "./util/scheduler.js";

//Load environment variables from .env file
dotenv.config();

//routes
import router from "./routes/index.js";

const app = express();

app.use(cors());

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
});
