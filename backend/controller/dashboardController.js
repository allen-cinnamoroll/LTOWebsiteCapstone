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
      const status = getVehicleStatus(vehicle.plateNo, vehicle.dateOfRenewal, vehicle.vehicleStatusType);
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
      // Both month and year provided - filter by specific month/year
      const startDate = new Date(year, month - 1, 1); // month is 0-indexed
      const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of the month
      dateFilter = {
        dateOfRenewal: {
          $gte: startDate,
          $lte: endDate,
          $ne: null // Exclude vehicles with null dateOfRenewal
        }
      };
      console.log(`Filtering by month ${month}, year ${year}`);
      console.log(`Date range: ${startDate} to ${endDate}`);
    } else if (year && !month) {
      // Only year provided - filter by entire year
      const startDate = new Date(year, 0, 1); // January 1st
      const endDate = new Date(year, 11, 31, 23, 59, 59); // December 31st
      dateFilter = {
        dateOfRenewal: {
          $gte: startDate,
          $lte: endDate,
          $ne: null // Exclude vehicles with null dateOfRenewal
        }
      };
      console.log(`Filtering by year ${year}`);
      console.log(`Date range: ${startDate} to ${endDate}`);
    } else if (month && !year) {
      // Only month provided - filter by that month across all years using aggregation
      dateFilter = {
        $expr: {
          $and: [
            { $eq: [{ $month: "$dateOfRenewal" }, month] },
            { $ne: ["$dateOfRenewal", null] }
          ]
        }
      };
      console.log(`Filtering by month ${month} across all years`);
    } else {
      console.log('No date filter applied - showing all data');
    }
    // If neither month nor year provided, dateFilter remains empty (shows all data)

    // Get vehicle statistics
    const totalVehicles = await VehicleModel.countDocuments(dateFilter);
    console.log(`Total vehicles found: ${totalVehicles}`);
    console.log(`Date filter applied:`, JSON.stringify(dateFilter, null, 2));
    
    // Get all vehicles to calculate proper active/expired status
    const allVehicles = await VehicleModel.find(dateFilter, 'plateNo dateOfRenewal');
    let activeVehicles = 0;
    let expiredVehicles = 0;
    
    allVehicles.forEach(vehicle => {
      const status = getVehicleStatus(vehicle.plateNo, vehicle.dateOfRenewal, vehicle.vehicleStatusType);
      if (status === "1") {
        activeVehicles++;
      } else {
        expiredVehicles++;
      }
    });

    // Get driver statistics based on vehicle renewal dates
    let totalDrivers = 0;
    let driversWithLicense = 0;
    let driversWithoutLicense = 0;
    
    if (Object.keys(dateFilter).length > 0) {
      // If we have a date filter, find drivers whose vehicles match the date criteria
      const vehiclesInDateRange = await VehicleModel.find(dateFilter, 'driver').distinct('driver');
      const validDriverIds = vehiclesInDateRange.filter(id => id !== null);
      
      if (validDriverIds.length > 0) {
        totalDrivers = await DriverModel.countDocuments({ _id: { $in: validDriverIds } });
        driversWithLicense = await DriverModel.countDocuments({ 
          _id: { $in: validDriverIds },
          hasDriversLicense: true 
        });
        driversWithoutLicense = totalDrivers - driversWithLicense;
      }
    } else {
      // No date filter - get all drivers
      totalDrivers = await DriverModel.countDocuments();
      driversWithLicense = await DriverModel.countDocuments({ hasDriversLicense: true });
      driversWithoutLicense = totalDrivers - driversWithLicense;
    }

    // Get plate number classification
    // Temporary plates: no letters (only numbers)
    // Permanent plates: contains letters
    const temporaryPlates = await VehicleModel.countDocuments({
      ...dateFilter,
      plateNo: { $regex: /^[0-9]+$/ } // Only numbers (temporary)
    });
    const permanentPlates = totalVehicles - temporaryPlates;

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


// Get  registration analytics data
export const getMunicipalityAnalytics = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // Create date filter based on month and year
    let dateFilter = {};
    if (month && year) {
      // Both month and year provided - filter by specific month/year
      const startDate = new Date(year, month - 1, 1); // month is 0-indexed
      const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of the month
      dateFilter = {
        dateOfRenewal: {
          $gte: startDate,
          $lte: endDate,
          $ne: null // Exclude vehicles with null dateOfRenewal
        }
      };
    } else if (year && !month) {
      // Only year provided - filter by entire year
      const startDate = new Date(year, 0, 1); // January 1st
      const endDate = new Date(year, 11, 31, 23, 59, 59); // December 31st
      dateFilter = {
        dateOfRenewal: {
          $gte: startDate,
          $lte: endDate,
          $ne: null // Exclude vehicles with null dateOfRenewal
        }
      };
    } else if (month && !year) {
      // Only month provided - filter by that month across all years using aggregation
      dateFilter = {
        $expr: {
          $and: [
            { $eq: [{ $month: "$dateOfRenewal" }, month] },
            { $ne: ["$dateOfRenewal", null] }
          ]
        }
      };
    }
    // If neither month nor year provided, dateFilter remains empty (shows all data)

    // Define the municipalities of Davao Oriental
    const davaoOrientalMunicipalities = [
      'BAGANGA', 'BANAYBANAY', 'BOSTON', 'CARAGA', 'CATEEL', 
      'GOVERNOR GENEROSO', 'LUPON', 'MANAY', 'SAN ISIDRO', 
      'TARRAGONA', 'CITY OF MATI'
    ];

    // Get vehicle data grouped by municipality (case-insensitive)
    const vehicleAggregation = [
      ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
      {
        $lookup: {
          from: 'drivers',
          localField: 'driverId',
          foreignField: '_id',
          as: 'driverInfo'
        }
      },
      {
        $unwind: {
          path: '$driverInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          municipality: {
            $cond: {
              if: { $ne: ['$driverInfo.address.municipality', null] },
              then: '$driverInfo.address.municipality',
              else: null
            }
          }
        }
      },
      {
        $match: {
          municipality: { $ne: null }
        }
      },
      {
        $group: {
          _id: {
            $toLower: '$municipality'
          },
          vehicleCount: { $sum: 1 },
          activeVehicles: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    {
                      $function: {
                        body: function(plateNo, dateOfRenewal) {
                          // Import the getVehicleStatus function logic here
                          if (!plateNo || !dateOfRenewal) return "0";
                          
                          const currentDate = new Date();
                          const renewalDate = new Date(dateOfRenewal);
                          const timeDiff = currentDate.getTime() - renewalDate.getTime();
                          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                          
                          // Check if plate number contains letters (permanent) or only numbers (temporary)
                          const hasLetters = /[A-Za-z]/.test(plateNo);
                          
                          if (hasLetters) {
                            // Permanent plates: valid for 3 years
                            return daysDiff <= 1095 ? "1" : "0";
                          } else {
                            // Temporary plates: valid for 1 year
                            return daysDiff <= 365 ? "1" : "0";
                          }
                        },
                        args: ['$plateNo', '$dateOfRenewal'],
                        lang: 'js'
                      }
                    },
                    "1"
                  ]
                },
                1,
                0
              ]
            }
          },
          expiredVehicles: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    {
                      $function: {
                        body: function(plateNo, dateOfRenewal) {
                          if (!plateNo || !dateOfRenewal) return "0";
                          
                          const currentDate = new Date();
                          const renewalDate = new Date(dateOfRenewal);
                          const timeDiff = currentDate.getTime() - renewalDate.getTime();
                          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                          
                          const hasLetters = /[A-Za-z]/.test(plateNo);
                          
                          if (hasLetters) {
                            return daysDiff <= 1095 ? "1" : "0";
                          } else {
                            return daysDiff <= 365 ? "1" : "0";
                          }
                        },
                        args: ['$plateNo', '$dateOfRenewal'],
                        lang: 'js'
                      }
                    },
                    "0"
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ];

    const vehicleData = await VehicleModel.aggregate(vehicleAggregation);

    // Get driver data grouped by municipality (case-insensitive)
    const driverAggregation = [
      {
        $addFields: {
          municipality: '$address.municipality'
        }
      },
      {
        $match: {
          municipality: { $ne: null }
        }
      },
      {
        $group: {
          _id: {
            $toLower: '$municipality'
          },
          driverCount: { $sum: 1 },
          driversWithLicense: {
            $sum: {
              $cond: ['$hasDriversLicense', 1, 0]
            }
          },
          driversWithoutLicense: {
            $sum: {
              $cond: ['$hasDriversLicense', 0, 1]
            }
          }
        }
      }
    ];

    const driverData = await DriverModel.aggregate(driverAggregation);

    // Combine and normalize the data
    const municipalityData = {};
    
    // Initialize all municipalities with zero counts
    davaoOrientalMunicipalities.forEach(municipality => {
      const key = municipality.toLowerCase();
      municipalityData[key] = {
        municipality: municipality,
        vehicles: {
          total: 0,
          active: 0,
          expired: 0
        },
        drivers: {
          total: 0,
          withLicense: 0,
          withoutLicense: 0
        }
      };
    });

    // Add vehicle data
    vehicleData.forEach(item => {
      const municipalityKey = item._id;
      if (municipalityData[municipalityKey]) {
        municipalityData[municipalityKey].vehicles = {
          total: item.vehicleCount,
          active: item.activeVehicles,
          expired: item.expiredVehicles
        };
      }
    });

    // Add driver data
    driverData.forEach(item => {
      const municipalityKey = item._id;
      if (municipalityData[municipalityKey]) {
        municipalityData[municipalityKey].drivers = {
          total: item.driverCount,
          withLicense: item.driversWithLicense,
          withoutLicense: item.driversWithoutLicense
        };
      }
    });

    // Convert to array and sort by municipality name
    const finalData = Object.values(municipalityData).sort((a, b) => 
      a.municipality.localeCompare(b.municipality)
    );

    res.status(200).json({
      success: true,
      data: {
        municipalities: finalData,
        period: {
          month: month || null,
          year: year || null
        }
      }
    });
  } catch (error) {
    console.error("Municipality analytics error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get municipality registration totals for bar chart (vehicles and drivers per municipality)
export const getMunicipalityRegistrationTotals = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // Create date filter based on month and year
    let dateFilter = {};
    if (month && year) {
      // Both month and year provided - filter by specific month/year
      const startDate = new Date(year, month - 1, 1); // month is 0-indexed
      const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of the month
      dateFilter = {
        dateOfRenewal: {
          $gte: startDate,
          $lte: endDate,
          $ne: null // Exclude vehicles with null dateOfRenewal
        }
      };
    } else if (year && !month) {
      // Only year provided - filter by entire year
      const startDate = new Date(year, 0, 1); // January 1st
      const endDate = new Date(year, 11, 31, 23, 59, 59); // December 31st
      dateFilter = {
        dateOfRenewal: {
          $gte: startDate,
          $lte: endDate,
          $ne: null // Exclude vehicles with null dateOfRenewal
        }
      };
    } else if (month && !year) {
      // Only month provided - filter by that month across all years using aggregation
      dateFilter = {
        $expr: {
          $and: [
            { $eq: [{ $month: "$dateOfRenewal" }, month] },
            { $ne: ["$dateOfRenewal", null] }
          ]
        }
      };
    }
    // If neither month nor year provided, dateFilter remains empty (shows all data)

    // Define the municipalities of Davao Oriental
    const davaoOrientalMunicipalities = [
      'BAGANGA', 'BANAYBANAY', 'BOSTON', 'CARAGA', 'CATEEL', 
      'GOVERNOR GENEROSO', 'LUPON', 'MANAY', 'SAN ISIDRO', 
      'TARRAGONA', 'CITY OF MATI'
    ];

    // Get vehicle data grouped by municipality (case-insensitive)
    const vehicleAggregation = [
      {
        $lookup: {
          from: 'drivers',
          localField: 'driverId',
          foreignField: '_id',
          as: 'driverInfo'
        }
      },
      {
        $unwind: {
          path: '$driverInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          municipality: {
            $cond: {
              if: { $ne: ['$driverInfo.address.municipality', null] },
              then: { $toUpper: { $trim: { input: '$driverInfo.address.municipality' } } },
              else: null
            }
          }
        }
      },
      {
        $match: Object.keys(dateFilter).length > 0 
          ? { municipality: { $ne: null }, ...dateFilter }
          : { municipality: { $ne: null } }
      },
      {
        $group: {
          _id: '$municipality',
          vehicleCount: { $sum: 1 }
        }
      }
    ];

    const vehicleData = await VehicleModel.aggregate(vehicleAggregation);
    console.log(`Municipality endpoint - Vehicle data found: ${vehicleData.length} municipalities`);
    console.log(`Date filter applied:`, JSON.stringify(dateFilter, null, 2));
    console.log(`Vehicle aggregation pipeline:`, JSON.stringify(vehicleAggregation, null, 2));
    console.log(`Sample vehicle data:`, vehicleData.slice(0, 3));

    // Get driver data grouped by municipality (case-insensitive)
    // Use the same approach as the main analytics endpoint: find drivers whose vehicles match the date criteria
    let driverData = [];
    
    if (Object.keys(dateFilter).length > 0) {
      // If we have a date filter, find drivers whose vehicles match the date criteria
      const vehiclesInDateRange = await VehicleModel.find(dateFilter, 'driver').distinct('driver');
      const validDriverIds = vehiclesInDateRange.filter(id => id !== null);
      
      if (validDriverIds.length > 0) {
        const driverAggregation = [
          {
            $match: { _id: { $in: validDriverIds } }
          },
          {
            $addFields: {
              municipality: {
                $cond: {
                  if: { $ne: ['$address.municipality', null] },
                  then: { $toUpper: { $trim: { input: '$address.municipality' } } },
                  else: null
                }
              }
            }
          },
          {
            $match: {
              municipality: { $ne: null }
            }
          },
          {
            $group: {
              _id: '$municipality',
              driverCount: { $sum: 1 }
            }
          }
        ];
        
        driverData = await DriverModel.aggregate(driverAggregation);
      }
    } else {
      // No date filter - get all drivers
      const driverAggregation = [
        {
          $addFields: {
            municipality: {
              $cond: {
                if: { $ne: ['$address.municipality', null] },
                then: { $toUpper: { $trim: { input: '$address.municipality' } } },
                else: null
              }
            }
          }
        },
        {
          $match: {
            municipality: { $ne: null }
          }
        },
        {
          $group: {
            _id: '$municipality',
            driverCount: { $sum: 1 }
          }
        }
      ];
      
      driverData = await DriverModel.aggregate(driverAggregation);
    }
    
    console.log(`Municipality endpoint - Driver data found: ${driverData.length} municipalities`);
    console.log(`Sample driver data:`, driverData.slice(0, 3));

    // Combine vehicle and driver data by municipality
    const municipalityData = {};
    
    // Initialize all Davao Oriental municipalities with zero counts
    davaoOrientalMunicipalities.forEach(municipality => {
      municipalityData[municipality] = {
        municipality: municipality,
        vehicles: 0,
        drivers: 0
      };
    });

    // Add vehicle counts
    vehicleData.forEach(item => {
      const municipalityKey = item._id;
      if (municipalityData[municipalityKey]) {
        municipalityData[municipalityKey].vehicles = item.vehicleCount;
      }
    });

    // Add driver counts
    driverData.forEach(item => {
      const municipalityKey = item._id;
      if (municipalityData[municipalityKey]) {
        municipalityData[municipalityKey].drivers = item.driverCount;
      }
    });

    // Convert to array and sort by total registrations (vehicles + drivers) in descending order
    const finalData = Object.values(municipalityData)
      .map(item => ({
        municipality: item.municipality,
        vehicles: item.vehicles,
        drivers: item.drivers
      }))
      .sort((a, b) => (b.vehicles + b.drivers) - (a.vehicles + a.drivers));

    console.log(`Municipality endpoint - Final data: ${finalData.length} municipalities with data`);
    console.log('Sample data:', finalData.slice(0, 3));

    res.status(200).json({
      success: true,
      data: finalData
    });
  } catch (error) {
    console.error("Municipality registration totals error:", error);
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

// Get owner data by municipality with license status breakdown
export const getOwnerMunicipalityData = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // Create date filter based on month and year
    let dateFilter = {};
    if (month && year) {
      // Both month and year provided - filter by specific month/year
      const startDate = new Date(year, month - 1, 1); // month is 0-indexed
      const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of the month
      dateFilter = {
        dateOfRenewal: {
          $gte: startDate,
          $lte: endDate,
          $ne: null // Exclude vehicles with null dateOfRenewal
        }
      };
    } else if (year && !month) {
      // Only year provided - filter by entire year
      const startDate = new Date(year, 0, 1); // January 1st
      const endDate = new Date(year, 11, 31, 23, 59, 59); // December 31st
      dateFilter = {
        dateOfRenewal: {
          $gte: startDate,
          $lte: endDate,
          $ne: null // Exclude vehicles with null dateOfRenewal
        }
      };
    } else if (month && !year) {
      // Only month provided - filter by that month across all years using aggregation
      dateFilter = {
        $expr: {
          $and: [
            { $eq: [{ $month: "$dateOfRenewal" }, month] },
            { $ne: ["$dateOfRenewal", null] }
          ]
        }
      };
    }
    // If neither month nor year provided, dateFilter remains empty (shows all data)

    // Define the municipalities of Davao Oriental
    const davaoOrientalMunicipalities = [
      'BAGANGA', 'BANAYBANAY', 'BOSTON', 'CARAGA', 'CATEEL', 
      'GOVERNOR GENEROSO', 'LUPON', 'MANAY', 'SAN ISIDRO', 
      'TARRAGONA', 'CITY OF MATI'
    ];

    // Get owner data grouped by municipality with license status breakdown
    const ownerAggregation = [
      {
        $lookup: {
          from: 'drivers',
          localField: 'driverId',
          foreignField: '_id',
          as: 'driverInfo'
        }
      },
      {
        $unwind: {
          path: '$driverInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          municipality: {
            $cond: {
              if: { $ne: ['$driverInfo.address.municipality', null] },
              then: { $toUpper: { $trim: { input: '$driverInfo.address.municipality' } } },
              else: null
            }
          }
        }
      },
      {
        $match: Object.keys(dateFilter).length > 0 
          ? { municipality: { $ne: null }, ...dateFilter }
          : { municipality: { $ne: null } }
      },
      {
        $group: {
          _id: '$municipality',
          totalOwners: { $sum: 1 },
          withLicense: {
            $sum: {
              $cond: ['$driverInfo.hasDriversLicense', 1, 0]
            }
          },
          withoutLicense: {
            $sum: {
              $cond: ['$driverInfo.hasDriversLicense', 0, 1]
            }
          }
        }
      }
    ];

    const ownerData = await VehicleModel.aggregate(ownerAggregation);
    console.log(`Owner municipality endpoint - Owner data found: ${ownerData.length} municipalities`);
    console.log(`Sample owner data:`, ownerData.slice(0, 3));

    // Initialize all municipalities with zero counts
    const municipalityData = {};
    davaoOrientalMunicipalities.forEach(municipality => {
      municipalityData[municipality] = {
        municipality: municipality,
        totalOwners: 0,
        withLicense: 0,
        withoutLicense: 0
      };
    });

    // Add owner data
    ownerData.forEach(item => {
      const municipalityKey = item._id;
      if (municipalityData[municipalityKey]) {
        municipalityData[municipalityKey] = {
          municipality: municipalityKey,
          totalOwners: item.totalOwners,
          withLicense: item.withLicense,
          withoutLicense: item.withoutLicense
        };
      }
    });

    // Convert to array and sort by total owners in descending order
    const finalData = Object.values(municipalityData)
      .sort((a, b) => b.totalOwners - a.totalOwners);

    console.log(`Owner municipality endpoint - Final data: ${finalData.length} municipalities with data`);
    console.log('Sample final data:', finalData.slice(0, 3));

    res.status(200).json({
      success: true,
      data: finalData
    });
  } catch (error) {
    console.error("Owner municipality data error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get barangay registration totals for a specific municipality
export const getBarangayRegistrationTotals = async (req, res) => {
  try {
    const { municipality, month, year } = req.query;
    
    if (!municipality) {
      return res.status(400).json({
        success: false,
        message: 'Municipality parameter is required'
      });
    }
    
    // List of Davao Oriental municipalities (matching your Python code)
    const davaoOrientalMunicipalities = [
      "BAGANGA", "BANAYBANAY", "BOSTON", "CARAGA", "CATEEL",
      "GOVERNOR GENEROSO", "LUPON", "MANAY", "SAN ISIDRO",
      "TARRAGONA", "CITY OF MATI"
    ];
    
    // Define all barangays for each municipality in Davao Oriental
    const davaoOrientalBarangays = {
      'BANAYBANAY': ['CABANGCALAN', 'CAGANGANAN', 'CALUBIHAN', 'CAUSWAGAN', 'MAHAYAG', 'MAPUTI', 'MOGBONGCOGON', 'PANIKIAN', 'PINTATAGAN', 'PISO PROPER', 'POBLACION', 'PUNTA LINAO', 'RANG-AY', 'SAN VICENTE'],

      'BOSTON': ['CAATIHAN', 'CABASAGAN', 'CARMEN', 'CAWAYANAN', 'POBLACION', 'SAN JOSE', 'SIBAJAY', 'SIMULAO'],

      'BAGANGA': ['BACULIN', 'BANAO', 'BATAWAN', 'BATIANO', 'BINONDO', 'BOBONAO', 'CAMPAWAN', 'CENTRAL', 'DAPNAN', 'KINABLANGAN', 'LAMBAJON', 'LUCOD', 'MAHANUB', 'MIKIT', 'SALINGCOMOT', 'SAN ISIDRO', 'SAN VICTOR', 'SAOQUEGUE'],

      'CARAGA': ['ALVAR', 'CANINGAG', 'DON LEON BALANTE', 'LAMIAWAN', 'MANORIGAO', 'MERCEDES', 'PALMA GIL', 'PICHON', 'POBLACION', 'SAN ANTONIO', 'SAN JOSE', 'SAN LUIS', 'SAN MIGUEL', 'SAN PEDRO', 'SANTA FE', 'SANTIAGO', 'SOBRECAREY'],

      'CATEEL': ['ABIJOD', 'ALEGRIA', 'ALIWAGWAG', 'ARAGON', 'BAYBAY', 'MAGLAHUS', 'MAINIT', 'MALIBAGO', 'SAN ALFONSO', 'SAN ANTONIO', 'SAN MIGUEL', 'SAN RAFAEL', 'SAN VICENTE', 'SANTA FILOMENA', 'TAYTAYAN', 'POBLACION'],

      'GOVERNOR GENEROSO': ['ANITAP', 'CRISPIN DELA CRUZ', 'DON AURELIO CHICOTE', 'LAVIGAN', 'LUZON', 'MAGDUG', 'MANUEL ROXAS', 'MONTSERRAT', 'NANGAN', 'OREGON', 'POBLACION', 'PUNDAGUITAN', 'SERGIO OSMEÑA', 'SUROP', 'TAGABEBE', 'TAMBAN', 'TANDANG SORA', 'TIBANBAN', 'TIBLAWAN', 'UPPER TIBANBAN'],

      'LUPON': ['BAGUMBAYAN', 'CABADIANGAN', 'CALAPAGAN', 'COCORNON', 'CORPORACION', 'DON MARIANO MARCOS', 'ILANGAY', 'LANGKA', 'LANTAWAN', 'LIMBAHAN', 'MACANGAO', 'MAGSAYSAY', 'MAHAYAHAY', 'MARAGATAS', 'MARAYAG', 'NEW VISAYAS', 'POBLACION', 'SAN ISIDRO', 'SAN JOSE', 'TAGBOA', 'TAGUGPO'],

      'MANAY': ['CAPASNAN', 'CAYAWAN', 'CENTRAL', 'CONCEPCION', 'DEL PILAR', 'GUZA', 'HOLY CROSS', 'LAMBOG', 'MABINI', 'MANREZA', 'NEW TAOKANGA', 'OLD MACOPA', 'RIZAL', 'SAN FERMIN', 'SAN IGNACIO', 'SAN ISIDRO', 'ZARAGOSA'],

      'CITY OF MATI': ['BADAS', 'BOBON', 'BUSO', 'CABUAYA', 'CENTRAL', 'CULIAN', 'DAHICAN', 'DANAO', 'DAWAN', 'DON ENRIQUE LOPEZ', 'DON MARTIN MARUNDAN', 'DON SALVADOR LOPEZ, SR.', 'LANGKA', 'LAWIGAN', 'LIBUDON', 'LUBAN', 'MACAMBOL', 'MAMALI', 'MATIAO', 'MAYO', 'SAINZ', 'SANGHAY', 'TAGABAKID', 'TAGBINONGA', 'TAGUIBO', 'TAMISAN'],

      'SAN ISIDRO': ['BAON', 'BATOBATO', 'BITAOGAN', 'CAMBALEON', 'DUGMANON', 'IBA', 'LA UNION', 'LAPU-LAPU', 'MAAG', 'MANIKLING', 'MAPUTI', 'SAN MIGUEL', 'SAN ROQUE', 'SANTO ROSARIO', 'SUDLON', 'TALISAY'],
      
      'TARRAGONA': ['CABAGAYAN', 'CENTRAL', 'DADONG', 'JOVELLAR', 'LIMOT', 'LUCATAN', 'MAGANDA', 'OMPAO', 'TOMOAONG', 'TUBAON']
    };
    
    // Normalize municipality name to match the list
    const municipalityKey = municipality.toUpperCase().trim();
    
    // Check if municipality is in the valid list
    if (!davaoOrientalMunicipalities.includes(municipalityKey)) {
      return res.status(404).json({
        success: false,
        message: `Municipality '${municipality}' not found in Davao Oriental`
      });
    }
    
    // Get all barangays for the specified municipality
    const allBarangays = davaoOrientalBarangays[municipalityKey] || [];
    
    // Create date filter based on month and year
    let dateFilter = {};
    if (month && year) {
      // Both month and year provided - filter by specific month/year
      const startDate = new Date(year, month - 1, 1); // month is 0-indexed
      const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of the month
      dateFilter = {
        dateOfRenewal: {
          $gte: startDate,
          $lte: endDate,
          $ne: null // Exclude vehicles with null dateOfRenewal
        }
      };
    } else if (year && !month) {
      // Only year provided - filter by entire year
      const startDate = new Date(year, 0, 1); // January 1st
      const endDate = new Date(year, 11, 31, 23, 59, 59); // December 31st
      dateFilter = {
        dateOfRenewal: {
          $gte: startDate,
          $lte: endDate,
          $ne: null // Exclude vehicles with null dateOfRenewal
        }
      };
    } else if (month && !year) {
      // Only month provided - filter by that month across all years using aggregation
      dateFilter = {
        $expr: {
          $and: [
            { $eq: [{ $month: "$dateOfRenewal" }, month] },
            { $ne: ["$dateOfRenewal", null] }
          ]
        }
      };
    }
    // If neither month nor year provided, dateFilter remains empty (shows all data)

    // Get vehicle data grouped by barangay for the specified municipality
    const vehicleAggregation = [
      ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
      {
        $lookup: {
          from: 'drivers',
          localField: 'driverId',
          foreignField: '_id',
          as: 'driverInfo'
        }
      },
      {
        $unwind: {
          path: '$driverInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          municipality: {
            $cond: {
              if: { $ne: ['$driverInfo.address.municipality', null] },
              then: { $toUpper: { $trim: { input: '$driverInfo.address.municipality' } } },
              else: null
            }
          },
          barangay: {
            $cond: {
              if: { $ne: ['$driverInfo.address.barangay', null] },
              then: { $toUpper: { $trim: { input: '$driverInfo.address.barangay' } } },
              else: null
            }
          }
        }
      },
      {
        $match: {
          municipality: { $eq: municipalityKey } // Exact match with normalized name
        }
      },
      {
        $match: {
          barangay: { $ne: null }
        }
      },
      {
        $group: {
          _id: {
            barangay: '$barangay'
          },
          vehicleCount: { $sum: 1 }
        }
      }
    ];

    const barangayData = await VehicleModel.aggregate(vehicleAggregation);

    // Create a map of actual registration data
    const registrationMap = {};
    
    barangayData.forEach(item => {
      registrationMap[item._id.barangay] = item.vehicleCount;
    });

    // Initialize all barangays with zero counts, then merge with actual data
    const formattedData = allBarangays.map(barangay => ({
      barangay: barangay,
      vehicles: registrationMap[barangay] || 0
    })).sort((a, b) => b.vehicles - a.vehicles); // Sort by vehicle count descending

    res.status(200).json({
      success: true,
      data: formattedData,
      municipality: municipality,
      totalBarangays: formattedData.length,
      totalVehicles: formattedData.reduce((sum, item) => sum + item.vehicles, 0)
    });

  } catch (error) {
    console.error('Error in getBarangayRegistrationTotals:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching barangay registration totals',
      error: error.message
    });
  }
};

// Get yearly vehicle registration trends
export const getYearlyVehicleTrends = async (req, res) => {
  try {
    const { startYear, endYear, municipality } = req.query;
    
    // Set default year range if not provided
    const currentYear = new Date().getFullYear();
    const defaultStartYear = startYear ? parseInt(startYear) : currentYear - 5;
    const defaultEndYear = endYear ? parseInt(endYear) : currentYear;
    
    console.log(`Fetching yearly trends from ${defaultStartYear} to ${defaultEndYear}, municipality: ${municipality || 'All'}`);
    
    // Build aggregation pipeline to get vehicles with municipality data
    const aggregationPipeline = [
      {
        $match: {
          dateOfRenewal: {
            $ne: null,
            $gte: new Date(defaultStartYear, 0, 1),
            $lte: new Date(defaultEndYear, 11, 31, 23, 59, 59)
          }
        }
      },
      {
        $lookup: {
          from: 'drivers',
          localField: 'driverId',
          foreignField: '_id',
          as: 'driverInfo'
        }
      },
      {
        $unwind: {
          path: '$driverInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          municipality: {
            $cond: {
              if: { $ne: ['$driverInfo.address.municipality', null] },
              then: { $toUpper: { $trim: { input: '$driverInfo.address.municipality' } } },
              else: null
            }
          }
        }
      },
      {
        $match: {
          municipality: { $ne: null }
        }
      }
    ];
    
    // Add municipality filter if specified and not 'All'
    if (municipality && municipality !== 'All') {
      aggregationPipeline.push({
        $match: {
          municipality: municipality.toUpperCase()
        }
      });
    }
    
    // Get all vehicles that were renewed in the specified year range
    console.log('Aggregation pipeline:', JSON.stringify(aggregationPipeline, null, 2));
    const vehicles = await VehicleModel.aggregate(aggregationPipeline);
    
    console.log(`Found ${vehicles.length} vehicles in date range`);
    if (vehicles.length > 0) {
      console.log('Sample vehicle data:', JSON.stringify(vehicles[0], null, 2));
      // Log unique municipalities found
      const uniqueMunicipalities = [...new Set(vehicles.map(v => v.municipality))];
      console.log('Unique municipalities found:', uniqueMunicipalities);
    }
    
    // Group vehicles by renewal year and calculate status using the same logic as main analytics
    const yearlyData = {};
    
    vehicles.forEach(vehicle => {
      const renewalYear = new Date(vehicle.dateOfRenewal).getFullYear();
      
      if (!yearlyData[renewalYear]) {
        yearlyData[renewalYear] = {
          total: 0,
          active: 0,
          expired: 0
        };
      }
      
      yearlyData[renewalYear].total++;
      
      // Use the same getVehicleStatus function as the main analytics
      const status = getVehicleStatus(vehicle.plateNo, vehicle.dateOfRenewal, vehicle.vehicleStatusType);
      if (status === "1") {
        yearlyData[renewalYear].active++;
      } else {
        yearlyData[renewalYear].expired++;
      }
    });
    
    // Fill in missing years with zero values
    const result = [];
    for (let year = defaultStartYear; year <= defaultEndYear; year++) {
      result.push({
        year: year,
        total: yearlyData[year] ? yearlyData[year].total : 0,
        active: yearlyData[year] ? yearlyData[year].active : 0,
        expired: yearlyData[year] ? yearlyData[year].expired : 0
      });
    }
    
    console.log(`Yearly trends data:`, result);
    
    res.status(200).json({
      success: true,
      data: result,
      period: {
        startYear: defaultStartYear,
        endYear: defaultEndYear
      }
    });
    
  } catch (error) {
    console.error('Error in getYearlyVehicleTrends:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching yearly vehicle trends',
      error: error.message
    });
  }
};

// Get monthly vehicle registration trends for a specific year
export const getMonthlyVehicleTrends = async (req, res) => {
  try {
    const { year, municipality } = req.query;
    
    if (!year) {
      return res.status(400).json({
        success: false,
        message: 'Year parameter is required'
      });
    }
    
    const yearValue = parseInt(year);
    const currentYear = new Date().getFullYear();
    
    if (yearValue < 2000 || yearValue > currentYear) {
      return res.status(400).json({
        success: false,
        message: `Year must be between 2000 and ${currentYear}`
      });
    }
    
    console.log(`Fetching monthly trends for year ${yearValue}, municipality: ${municipality || 'All'}`);
    
    // Build aggregation pipeline to get vehicles with municipality data
    const aggregationPipeline = [
      {
        $match: {
          dateOfRenewal: {
            $ne: null,
            $gte: new Date(yearValue, 0, 1),
            $lte: new Date(yearValue, 11, 31, 23, 59, 59)
          }
        }
      },
      {
        $lookup: {
          from: 'drivers',
          localField: 'driverId',
          foreignField: '_id',
          as: 'driverInfo'
        }
      },
      {
        $unwind: {
          path: '$driverInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          municipality: {
            $cond: {
              if: { $ne: ['$driverInfo.address.municipality', null] },
              then: { $toUpper: { $trim: { input: '$driverInfo.address.municipality' } } },
              else: null
            }
          }
        }
      },
      {
        $match: {
          municipality: { $ne: null }
        }
      }
    ];
    
    // Add municipality filter if specified and not 'All'
    if (municipality && municipality !== 'All') {
      aggregationPipeline.push({
        $match: {
          municipality: municipality.toUpperCase()
        }
      });
    }
    
    // Get all vehicles that were renewed in the specified year
    console.log('Aggregation pipeline:', JSON.stringify(aggregationPipeline, null, 2));
    const vehicles = await VehicleModel.aggregate(aggregationPipeline);
    
    console.log(`Found ${vehicles.length} vehicles in year ${yearValue}`);
    if (vehicles.length > 0) {
      console.log('Sample vehicle data:', JSON.stringify(vehicles[0], null, 2));
      // Log unique municipalities found
      const uniqueMunicipalities = [...new Set(vehicles.map(v => v.municipality))];
      console.log('Unique municipalities found:', uniqueMunicipalities);
    }
    
    // Group vehicles by renewal month and calculate status using the same logic as main analytics
    const monthlyData = {};
    
    vehicles.forEach(vehicle => {
      const renewalMonth = new Date(vehicle.dateOfRenewal).getMonth(); // 0-11
      
      if (!monthlyData[renewalMonth]) {
        monthlyData[renewalMonth] = {
          total: 0,
          active: 0,
          expired: 0
        };
      }
      
      monthlyData[renewalMonth].total++;
      
      // Use the same getVehicleStatus function as the main analytics
      const status = getVehicleStatus(vehicle.plateNo, vehicle.dateOfRenewal, vehicle.vehicleStatusType);
      if (status === "1") {
        monthlyData[renewalMonth].active++;
      } else {
        monthlyData[renewalMonth].expired++;
      }
    });
    
    // Fill in missing months with zero values
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = [];
    
    for (let month = 0; month < 12; month++) {
      const monthData = monthlyData[month];
      result.push({
        month: monthNames[month],
        total: monthData ? monthData.total : 0,
        active: monthData ? monthData.active : 0,
        expired: monthData ? monthData.expired : 0,
        noRegistration: monthData && monthData.total === 0 ? 0 : null
      });
    }
    
    console.log(`Monthly trends data for ${yearValue}:`, result);
    
    res.status(200).json({
      success: true,
      data: result,
      year: yearValue
    });
    
  } catch (error) {
    console.error('Error in getMonthlyVehicleTrends:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly vehicle trends',
      error: error.message
    });
  }
};

// Get vehicle classification data
export const getVehicleClassificationData = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    // Build date filter
    let dateFilter = {};
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      dateFilter.dateOfRenewal = { $gte: startDate, $lte: endDate, $ne: null };
    } else if (year && !month) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      dateFilter.dateOfRenewal = { $gte: startDate, $lte: endDate, $ne: null };
    } else if (month && !year) {
      dateFilter = {
        $expr: {
          $and: [
            { $eq: [{ $month: "$dateOfRenewal" }, month] },
            { $ne: ["$dateOfRenewal", null] }
          ]
        }
      };
    }
    // If no month and no year provided, show all data (no date filter)
    
    console.log('Vehicle classification endpoint - Date filter:', JSON.stringify(dateFilter, null, 2));
    
    // Get vehicle classification counts with data normalization
    const classificationData = await VehicleModel.aggregate([
      ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
      {
        $addFields: {
          normalizedClassification: {
            $switch: {
              branches: [
                { case: { $eq: ["$classification", "FOR HIRE"] }, then: "FOR HIRE" },
                { case: { $eq: ["$classification", "PRIVATE"] }, then: "PRIVATE" },
                { case: { $eq: ["$classification", "GOVERNMENT"] }, then: "GOVERNMENT" }
              ],
              default: "$classification"
            }
          }
        }
      },
      {
        $group: {
          _id: "$normalizedClassification",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          classification: "$_id",
          count: 1,
          _id: 0
        }
      },
      // Remove strict classification matching to show all data
    ]);
    
    console.log('Vehicle classification endpoint - Raw data found:', classificationData.length);
    console.log('Sample classification data:', classificationData.slice(0, 3));
    
    // Get total count for percentage calculation
    const totalCount = classificationData.reduce((sum, item) => sum + item.count, 0);
    
    // Format data - classification is already stored as strings in database
    const formattedData = classificationData.map(item => ({
      classification: item.classification || "Unknown",
      count: item.count,
      percentage: totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0
    }));
    
    console.log('Vehicle classification endpoint - Formatted data:', formattedData);
    
    res.json({
      success: true,
      data: formattedData
    });
    
  } catch (error) {
    console.error('Error fetching vehicle classification data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vehicle classification data',
      error: error.message
    });
  }
};
