import VehicleModel from "../model/VehicleModel.js";
import DriverModel from "../model/DriverModel.js";
import ViolationModel from "../model/ViolationModel.js";
import AccidentModel from "../model/AccidentModel.js";
import { getVehicleStatus } from "../util/plateStatusCalculator.js";

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    // Get vehicle statistics with proper status calculation
    const totalVehicles = await VehicleModel.countDocuments();
    
    // Get all vehicles to calculate proper active/expired status based on plate number and renewal date
    // This ensures accurate status calculation instead of relying on potentially outdated database status
    const allVehicles = await VehicleModel.find({}, 'plateNo dateOfRenewal');
    let activeVehicles = 0;
    let expiredVehicles = 0;
    
    allVehicles.forEach(vehicle => {
      const status = getVehicleStatus(vehicle.plateNo, vehicle.dateOfRenewal);
      if (status === "1") {
        activeVehicles++;
      } else {
        expiredVehicles++;
      }
    });

    // Get driver statistics (no active/expired status for drivers - drivers don't have expiration status)
    const totalDrivers = await DriverModel.countDocuments();

    // Get violation statistics
    const totalViolations = await ViolationModel.countDocuments();

    // Get accident statistics
    const totalAccidents = await AccidentModel.countDocuments();

    // Get recent violations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentViolations = await ViolationModel.countDocuments({
      dateOfApprehension: { $gte: thirtyDaysAgo }
    });

    // Get violations by type
    const violationsByType = await ViolationModel.aggregate([
      {
        $group: {
          _id: "$violationType",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get monthly violation trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyViolations = await ViolationModel.aggregate([
      {
        $match: {
          dateOfApprehension: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$dateOfApprehension" },
            month: { $month: "$dateOfApprehension" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        vehicles: {
          total: totalVehicles,
          active: activeVehicles,
          expired: expiredVehicles
        },
        drivers: {
          total: totalDrivers
        },
        violations: {
          total: totalViolations,
          recent: recentViolations,
          byType: violationsByType
        },
        accidents: {
          total: totalAccidents
        },
        trends: {
          monthlyViolations: monthlyViolations
        }
      }
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get chart data with time period filter
export const getChartData = async (req, res) => {
  try {
    const { period = 'all' } = req.query; // week, 3months, 6months, months, year, years, all
    
    let matchStage = {};
    let groupStage = {};
    let sortStage = {};

    // Calculate date range based on period
    const now = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        matchStage = { dateOfApprehension: { $gte: startDate } };
        groupStage = {
          _id: {
            year: { $year: "$dateOfApprehension" },
            month: { $month: "$dateOfApprehension" },
            day: { $dayOfMonth: "$dateOfApprehension" }
          },
          violations: { $sum: 1 },
          accidents: { $sum: 0 } // We'll add accident data later
        };
        sortStage = { "_id.year": 1, "_id.month": 1, "_id.day": 1 };
        break;
        
      case '3months':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        matchStage = { dateOfApprehension: { $gte: startDate } };
        groupStage = {
          _id: {
            year: { $year: "$dateOfApprehension" },
            month: { $month: "$dateOfApprehension" }
          },
          violations: { $sum: 1 },
          accidents: { $sum: 0 }
        };
        sortStage = { "_id.year": 1, "_id.month": 1 };
        break;
        
      case '6months':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
        matchStage = { dateOfApprehension: { $gte: startDate } };
        groupStage = {
          _id: {
            year: { $year: "$dateOfApprehension" },
            month: { $month: "$dateOfApprehension" }
          },
          violations: { $sum: 1 },
          accidents: { $sum: 0 }
        };
        sortStage = { "_id.year": 1, "_id.month": 1 };
        break;
        
      case 'months':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 12); // Last 12 months
        matchStage = { dateOfApprehension: { $gte: startDate } };
        groupStage = {
          _id: {
            year: { $year: "$dateOfApprehension" },
            month: { $month: "$dateOfApprehension" }
          },
          violations: { $sum: 1 },
          accidents: { $sum: 0 } // We'll add accident data later
        };
        sortStage = { "_id.year": 1, "_id.month": 1 };
        break;
        
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1); // Last 1 year
        matchStage = { dateOfApprehension: { $gte: startDate } };
        groupStage = {
          _id: {
            year: { $year: "$dateOfApprehension" },
            month: { $month: "$dateOfApprehension" }
          },
          violations: { $sum: 1 },
          accidents: { $sum: 0 }
        };
        sortStage = { "_id.year": 1, "_id.month": 1 };
        break;
        
      case 'years':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 5); // Last 5 years
        matchStage = { dateOfApprehension: { $gte: startDate } };
        groupStage = {
          _id: {
            year: { $year: "$dateOfApprehension" }
          },
          violations: { $sum: 1 },
          accidents: { $sum: 0 } // We'll add accident data later
        };
        sortStage = { "_id.year": 1 };
        break;
        
      case 'all':
      default:
        // All time - no date filter
        matchStage = {}; // No date filtering
        groupStage = {
          _id: {
            year: { $year: "$dateOfApprehension" },
            month: { $month: "$dateOfApprehension" }
          },
          violations: { $sum: 1 },
          accidents: { $sum: 0 } // We'll add accident data later
        };
        sortStage = { "_id.year": 1, "_id.month": 1 };
    }

    // Get violation data
    const violationPipeline = [
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      { $group: groupStage },
      { $sort: sortStage }
    ];

    const violationData = await ViolationModel.aggregate(violationPipeline);

    // Get accident data (if AccidentModel exists)
    let accidentData = [];
    try {
      const accidentPipeline = [
        ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
        { $group: { ...groupStage, violations: { $sum: 0 }, accidents: { $sum: 1 } } },
        { $sort: sortStage }
      ];
      accidentData = await AccidentModel.aggregate(accidentPipeline);
    } catch (accidentError) {
      console.log("Accident model not available:", accidentError.message);
    }

    // Merge violation and accident data
    const mergedData = {};
    
    // Add violation data
    violationData.forEach(item => {
      const key = JSON.stringify(item._id);
      mergedData[key] = { ...item._id, violations: item.violations, accidents: 0 };
    });
    
    // Add accident data
    accidentData.forEach(item => {
      const key = JSON.stringify(item._id);
      if (mergedData[key]) {
        mergedData[key].accidents = item.accidents;
      } else {
        mergedData[key] = { ...item._id, violations: 0, accidents: item.accidents };
      }
    });

    // Convert back to array and sort
    const finalData = Object.values(mergedData).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if (a.month && b.month && a.month !== b.month) return a.month - b.month;
      if (a.day && b.day && a.day !== b.day) return a.day - b.day;
      return 0;
    });

    res.status(200).json({
      success: true,
      data: {
        period,
        chartData: finalData
      }
    });
  } catch (error) {
    console.error("Chart data error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get registration analytics data
export const getRegistrationAnalytics = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // Create date filter based on month and year
    let dateFilter = {};
    if (month && year) {
      const startDate = new Date(year, month - 1, 1); // month is 0-indexed
      const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of the month
      dateFilter = {
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };
    }

    // Get vehicle statistics
    const totalVehicles = await VehicleModel.countDocuments(dateFilter);
    
    // Get all vehicles to calculate proper active/expired status
    const allVehicles = await VehicleModel.find(dateFilter, 'plateNo dateOfRenewal');
    let activeVehicles = 0;
    let expiredVehicles = 0;
    
    allVehicles.forEach(vehicle => {
      const status = getVehicleStatus(vehicle.plateNo, vehicle.dateOfRenewal);
      if (status === "1") {
        activeVehicles++;
      } else {
        expiredVehicles++;
      }
    });

    // Get driver statistics
    const totalDrivers = await DriverModel.countDocuments(dateFilter);
    const driversWithLicense = await DriverModel.countDocuments({
      ...dateFilter,
      hasDriversLicense: true
    });
    const driversWithoutLicense = totalDrivers - driversWithLicense;

    // Get plate number classification
    const permanentPlates = await VehicleModel.countDocuments({
      ...dateFilter,
      plateNo: { $regex: /^[A-Z]{2,3}[0-9]{4}$/ } // Pattern for permanent plates (e.g., ABC1234)
    });
    const temporaryPlates = totalVehicles - permanentPlates;

    res.status(200).json({
      success: true,
      data: {
        vehicles: {
          total: totalVehicles,
          active: activeVehicles,
          expired: expiredVehicles
        },
        drivers: {
          total: totalDrivers,
          withLicense: driversWithLicense,
          withoutLicense: driversWithoutLicense
        },
        plateClassification: {
          total: totalVehicles,
          permanent: permanentPlates,
          temporary: temporaryPlates
        },
        period: {
          month: month || null,
          year: year || null
        }
      }
    });
  } catch (error) {
    console.error("Registration analytics error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get driver-specific chart data with time period filter
export const getDriverChartData = async (req, res) => {
  try {
    const { period = 'all', driverId } = req.query; // week, 3months, 6months, months, year, years, all
    
    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: "Driver ID is required"
      });
    }
    
    // First, get the driver's plate number
    const driver = await DriverModel.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }
    
    console.log("Driver found:", driver.ownerRepresentativeName, "Plates:", driver.plateNo);
    
    // Handle multiple plate numbers - use $in operator to match any of the driver's plates
    const driverPlates = Array.isArray(driver.plateNo) ? driver.plateNo : [driver.plateNo];
    let matchStage = { plateNo: { $in: driverPlates } };
    let groupStage = {};
    let sortStage = {};

    // Calculate date range based on period
    const now = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        matchStage = { 
          plateNo: { $in: driverPlates },
          dateOfApprehension: { $gte: startDate } 
        };
        groupStage = {
          _id: {
            year: { $year: "$dateOfApprehension" },
            month: { $month: "$dateOfApprehension" },
            day: { $dayOfMonth: "$dateOfApprehension" }
          },
          violations: { $sum: 1 },
          accidents: { $sum: 0 }
        };
        sortStage = { "_id.year": 1, "_id.month": 1, "_id.day": 1 };
        break;
        
      case '3months':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        matchStage = { 
          plateNo: { $in: driverPlates },
          dateOfApprehension: { $gte: startDate } 
        };
        groupStage = {
          _id: {
            year: { $year: "$dateOfApprehension" },
            month: { $month: "$dateOfApprehension" }
          },
          violations: { $sum: 1 },
          accidents: { $sum: 0 }
        };
        sortStage = { "_id.year": 1, "_id.month": 1 };
        break;
        
      case '6months':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
        matchStage = { 
          plateNo: { $in: driverPlates },
          dateOfApprehension: { $gte: startDate } 
        };
        groupStage = {
          _id: {
            year: { $year: "$dateOfApprehension" },
            month: { $month: "$dateOfApprehension" }
          },
          violations: { $sum: 1 },
          accidents: { $sum: 0 }
        };
        sortStage = { "_id.year": 1, "_id.month": 1 };
        break;
        
      case 'months':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 12);
        matchStage = { 
          plateNo: { $in: driverPlates },
          dateOfApprehension: { $gte: startDate } 
        };
        groupStage = {
          _id: {
            year: { $year: "$dateOfApprehension" },
            month: { $month: "$dateOfApprehension" }
          },
          violations: { $sum: 1 },
          accidents: { $sum: 0 }
        };
        sortStage = { "_id.year": 1, "_id.month": 1 };
        break;
        
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        matchStage = { 
          plateNo: { $in: driverPlates },
          dateOfApprehension: { $gte: startDate } 
        };
        groupStage = {
          _id: {
            year: { $year: "$dateOfApprehension" },
            month: { $month: "$dateOfApprehension" }
          },
          violations: { $sum: 1 },
          accidents: { $sum: 0 }
        };
        sortStage = { "_id.year": 1, "_id.month": 1 };
        break;
        
      case 'years':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 5);
        matchStage = { 
          plateNo: { $in: driverPlates },
          dateOfApprehension: { $gte: startDate } 
        };
        groupStage = {
          _id: {
            year: { $year: "$dateOfApprehension" }
          },
          violations: { $sum: 1 },
          accidents: { $sum: 0 }
        };
        sortStage = { "_id.year": 1 };
        break;
        
      case 'all':
      default:
        // All time - no date filter, only plate filter
        matchStage = { plateNo: { $in: driverPlates } };
        groupStage = {
          _id: {
            year: { $year: "$dateOfApprehension" },
            month: { $month: "$dateOfApprehension" }
          },
          violations: { $sum: 1 },
          accidents: { $sum: 0 }
        };
        sortStage = { "_id.year": 1, "_id.month": 1 };
    }

    // Get violation data for the specific driver
    const violationPipeline = [
      { $match: matchStage },
      { $group: groupStage },
      { $sort: sortStage }
    ];

    const violationData = await ViolationModel.aggregate(violationPipeline);
    console.log("Violation pipeline:", JSON.stringify(violationPipeline, null, 2));
    console.log("Violation data found:", violationData.length, "records");

    // Get accident data for the specific driver (if AccidentModel exists)
    let accidentData = [];
    try {
      const accidentPipeline = [
        { $match: matchStage },
        { $group: { ...groupStage, violations: { $sum: 0 }, accidents: { $sum: 1 } } },
        { $sort: sortStage }
      ];
      accidentData = await AccidentModel.aggregate(accidentPipeline);
    } catch (accidentError) {
      console.log("Accident model not available:", accidentError.message);
    }

    // Merge violation and accident data
    const mergedData = {};
    
    // Add violation data
    violationData.forEach(item => {
      const key = JSON.stringify(item._id);
      mergedData[key] = { ...item._id, violations: item.violations, accidents: 0 };
    });
    
    // Add accident data
    accidentData.forEach(item => {
      const key = JSON.stringify(item._id);
      if (mergedData[key]) {
        mergedData[key].accidents = item.accidents;
      } else {
        mergedData[key] = { ...item._id, violations: 0, accidents: item.accidents };
      }
    });

    // Convert back to array and sort
    const finalData = Object.values(mergedData).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if (a.month && b.month && a.month !== b.month) return a.month - b.month;
      if (a.day && b.day && a.day !== b.day) return a.day - b.day;
      return 0;
    });

    console.log("Final chart data:", finalData.length, "records");
    console.log("Final data:", JSON.stringify(finalData, null, 2));

    // Get detailed violation data for the list
    const detailedViolations = await ViolationModel.find(matchStage)
      .select('topNo firstName lastName violations violationType licenseType plateNo dateOfApprehension apprehendingOfficer')
      .sort({ dateOfApprehension: -1 });

    console.log("Detailed violations found:", detailedViolations.length, "records");

    res.status(200).json({
      success: true,
      data: {
        period,
        driverId,
        chartData: finalData,
        violations: detailedViolations
      }
    });
  } catch (error) {
    console.error("Driver chart data error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
