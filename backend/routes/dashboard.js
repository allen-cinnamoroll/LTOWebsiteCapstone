import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { getDashboardStats, getChartData, getDriverChartData, getRegistrationAnalytics, getMunicipalityAnalytics, getMunicipalityRegistrationTotals, getBarangayRegistrationTotals } from "../controller/dashboardController.js";

const dashboardRouter = express.Router();

// Get dashboard statistics (Authenticated Users)
dashboardRouter.get("/stats", authenticate, getDashboardStats);

// Get chart data with time period filter (Authenticated Users)
dashboardRouter.get("/chart", authenticate, getChartData);

// Get driver-specific chart data with time period filter (Authenticated Users)
dashboardRouter.get("/driver-chart", authenticate, getDriverChartData);

// Get registration analytics data (Authenticated Users)
dashboardRouter.get("/registration-analytics", authenticate, getRegistrationAnalytics);

// Get municipality analytics data (Authenticated Users)
dashboardRouter.get("/municipality-analytics", authenticate, getMunicipalityAnalytics);

// Get municipality registration totals for bar chart (Authenticated Users)
dashboardRouter.get("/municipality-registration-totals", authenticate, getMunicipalityRegistrationTotals);

// Get barangay registration totals for a specific municipality (Authenticated Users)
dashboardRouter.get("/barangay-registration-totals", authenticate, getBarangayRegistrationTotals);

export default dashboardRouter;
