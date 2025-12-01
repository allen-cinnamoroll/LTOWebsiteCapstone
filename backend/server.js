import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import compression from "compression";
import http from "http"; 
import path from "path";
import fs from "fs";
import database from "./database/database.js";
import dotenv from "dotenv"
import { scheduleVehicleExpirationCheck, scheduleWeeklyOTPReset } from "./util/scheduler.js";
import { startReportScheduler } from "./util/reportScheduler.js";

//Load environment variables from .env file
dotenv.config();

//routes
import router from "./routes/index.js";
import performanceLogger from "./middleware/performanceLogger.js";
import ipWhitelist from "./middleware/ipWhitelistMiddleware.js";

const app = express();

// Trust proxy for proper IP address detection
app.set('trust proxy', true);

// IP Whitelist middleware - restrict access to specific network only
// This must be before any other routes to protect the entire API
app.use(ipWhitelist);

// Performance logging middleware - logs execution time for all requests
// Helps identify slow endpoints that need optimization
app.use(performanceLogger);

// Enable compression middleware for all responses
// This significantly reduces payload size for JSON responses and improves load times
app.use(compression({
  filter: (req, res) => {
    // Compress all responses except if client explicitly doesn't want compression
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Compression level (0-9, 6 is a good balance)
  threshold: 1024, // Only compress responses larger than 1KB
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory with custom error handling for avatars
app.use('/uploads', (req, res, next) => {
  // For avatar files, check if they exist before serving
  if (req.path.startsWith('/avatars/')) {
    const filePath = path.join(process.cwd(), 'uploads', req.path);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // Return 404 with JSON response for API consistency
      return res.status(404).json({
        success: false,
        message: 'Avatar file not found',
        error: 'FILE_NOT_FOUND'
      });
    }
  }
  
  // Use express.static for existing files
  express.static(path.join(process.cwd(), 'uploads'))(req, res, next);
});

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
  
  // Start the report generation scheduler
  startReportScheduler();
});
