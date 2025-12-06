import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import compression from "compression";
import http from "http"; 
import path from "path";
import fs from "fs";
import database from "./database/database.js";
import dotenv from "dotenv"
import { scheduleVehicleExpirationCheck, scheduleDailyOTPReset } from "./util/scheduler.js";
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

// Configure CORS with explicit settings
// Allow frontend origin (localhost:5173 in development, production domain in production)
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin requests)
    if (!origin) return callback(null, true);
    
    // In development, allow localhost origins
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
    ];
    
    // In production, add production domain
    if (process.env.NODE_ENV === 'production') {
      allowedOrigins.push('https://ltodatamanager.com');
      // Add any other production domains if needed
    }
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
  
  // Start the daily OTP reset scheduler (weekdays at 6:00 AM)
  scheduleDailyOTPReset();
  
  // Start the report generation scheduler
  startReportScheduler();
});
