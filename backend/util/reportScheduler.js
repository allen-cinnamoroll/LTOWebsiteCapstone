import cron from "node-cron";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import VehicleModel from "../model/VehicleModel.js";
import OwnerModel from "../model/OwnerModel.js";
import ViolationModel from "../model/ViolationModel.js";
import AccidentModel from "../model/AccidentModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate comprehensive report data
 */
const generateReportData = async (reportType = 'daily') => {
  try {
    console.log(`[REPORT SCHEDULER] Generating ${reportType} report...`);
    
    // Calculate date range based on report type
    const now = new Date();
    let startDate, endDate;
    
    if (reportType === 'daily') {
      // Today's data
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (reportType === 'monthly') {
      // Current month's data
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    console.log(`[REPORT SCHEDULER] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Fetch all required data in parallel
    const [
      vehicleData,
      ownerData,
      violationData,
      accidentData,
      municipalityStats,
      barangayStats,
      hourlyStats
    ] = await Promise.all([
      // Vehicle data with renewal information
      VehicleModel.aggregate([
        {
          $match: {
            $expr: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: { $ifNull: ["$dateOfRenewal", []] },
                      as: "renewal",
                      cond: {
                        $let: {
                          vars: {
                            renewalDate: {
                              $cond: {
                                if: { $eq: [{ $type: "$$renewal" }, "object"] },
                                then: "$$renewal.date",
                                else: "$$renewal"
                              }
                            }
                          },
                          in: {
                            $and: [
                              { $ne: ["$$renewalDate", null] },
                              { $gte: ["$$renewalDate", startDate] },
                              { $lte: ["$$renewalDate", endDate] }
                            ]
                          }
                        }
                      }
                    }
                  }
                },
                0
              ]
            }
          }
        },
        {
          $lookup: {
            from: 'owners',
            localField: 'ownerId',
            foreignField: '_id',
            as: 'owner'
          }
        },
        {
          $unwind: { path: '$owner', preserveNullAndEmptyArrays: true }
        }
      ]),
      
      // Owner data
      OwnerModel.find().lean(),
      
      // Violation data
      ViolationModel.find({
        dateOfApprehension: { $gte: startDate, $lte: endDate }
      }).lean(),
      
      // Accident data
      AccidentModel.find({
        dateCommited: { $gte: startDate, $lte: endDate }
      }).lean(),
      
      // Municipality accident stats
      AccidentModel.aggregate([
        {
          $match: {
            dateCommited: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$municipality',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]),
      
      // Barangay accident stats
      AccidentModel.aggregate([
        {
          $match: {
            dateCommited: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: { municipality: '$municipality', barangay: '$barangay' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]),
      
      // Hourly accident stats
      AccidentModel.aggregate([
        {
          $match: {
            dateCommited: { $gte: startDate, $lte: endDate },
            timeCommited: { $ne: null, $exists: true }
          }
        },
        {
          $addFields: {
            hour: {
              $cond: {
                if: { $regexMatch: { input: "$timeCommited", regex: /^\d{1,2}:\d{2}/ } },
                then: {
                  $toInt: {
                    $arrayElemAt: [
                      { $split: ["$timeCommited", ":"] },
                      0
                    ]
                  }
                },
                else: null
              }
            }
          }
        },
        {
          $match: {
            hour: { $ne: null }
          }
        },
        {
          $group: {
            _id: '$hour',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ])
    ]);

    console.log(`[REPORT SCHEDULER] Data fetched - Vehicles: ${vehicleData.length}, Violations: ${violationData.length}, Accidents: ${accidentData.length}`);

    return {
      vehicleData,
      ownerData,
      violationData,
      accidentData,
      municipalityStats,
      barangayStats,
      hourlyStats,
      reportType,
      generatedAt: now,
      dateRange: { startDate, endDate }
    };
  } catch (error) {
    console.error('[REPORT SCHEDULER] Error generating report data:', error);
    throw error;
  }
};

/**
 * Create Excel workbook from report data
 */
const createExcelReport = (reportData) => {
  const workbook = XLSX.utils.book_new();

  // === VEHICLE SHEET ===
  const vehicleSheetData = [];
  
  // Header
  vehicleSheetData.push(['VEHICLE REGISTRATION REPORT']);
  vehicleSheetData.push([`Generated: ${reportData.generatedAt.toLocaleString()}`]);
  vehicleSheetData.push([`Report Type: ${reportData.reportType.toUpperCase()}`]);
  vehicleSheetData.push([]);
  
  // Summary statistics
  const totalRegistered = reportData.vehicleData.length;
  const ownersWithLicense = reportData.ownerData.filter(o => o.hasDriversLicense).length;
  const ownersWithoutLicense = reportData.ownerData.filter(o => !o.hasDriversLicense).length;
  
  // Plate classification
  const temporaryPlates = reportData.vehicleData.filter(v => /^[0-9]+$/.test(v.plateNo)).length;
  const permanentPlates = reportData.vehicleData.filter(v => /[A-Za-z]/.test(v.plateNo)).length;
  
  // Municipality breakdown
  const municipalityBreakdown = {};
  reportData.vehicleData.forEach(vehicle => {
    const municipality = vehicle.owner?.address?.municipality || 'Unknown';
    municipalityBreakdown[municipality] = (municipalityBreakdown[municipality] || 0) + 1;
  });
  
  vehicleSheetData.push(['SUMMARY STATISTICS']);
  vehicleSheetData.push(['Total Registered/Renewed Vehicles', totalRegistered]);
  vehicleSheetData.push([]);
  
  vehicleSheetData.push(['REGISTERED OWNERS']);
  vehicleSheetData.push(['Total Owners', reportData.ownerData.length]);
  vehicleSheetData.push(['Owners with Driver License', ownersWithLicense]);
  vehicleSheetData.push(['Owners without Driver License', ownersWithoutLicense]);
  vehicleSheetData.push([]);
  
  vehicleSheetData.push(['PLATE CLASSIFICATION']);
  vehicleSheetData.push(['Temporary Plates', temporaryPlates]);
  vehicleSheetData.push(['Permanent Plates', permanentPlates]);
  vehicleSheetData.push([]);
  
  vehicleSheetData.push(['VEHICLES PER MUNICIPALITY']);
  vehicleSheetData.push(['Municipality', 'Vehicle Count']);
  Object.entries(municipalityBreakdown)
    .sort((a, b) => b[1] - a[1])
    .forEach(([municipality, count]) => {
      vehicleSheetData.push([municipality, count]);
    });
  
  const vehicleSheet = XLSX.utils.aoa_to_sheet(vehicleSheetData);
  XLSX.utils.book_append_sheet(workbook, vehicleSheet, 'Vehicles');

  // === VIOLATION SHEET ===
  const violationSheetData = [];
  
  violationSheetData.push(['VIOLATION REPORT']);
  violationSheetData.push([`Generated: ${reportData.generatedAt.toLocaleString()}`]);
  violationSheetData.push([`Report Type: ${reportData.reportType.toUpperCase()}`]);
  violationSheetData.push([]);
  
  // Count total violations (sum of violations array lengths)
  const totalViolations = reportData.violationData.reduce((sum, v) => sum + (v.violations?.length || 0), 0);
  const totalViolators = reportData.violationData.length;
  
  // Frequent violations
  const violationCounts = {};
  reportData.violationData.forEach(record => {
    if (record.violations && Array.isArray(record.violations)) {
      record.violations.forEach(violation => {
        violationCounts[violation] = (violationCounts[violation] || 0) + 1;
      });
    }
  });
  
  violationSheetData.push(['SUMMARY STATISTICS']);
  violationSheetData.push(['Total Violators', totalViolators]);
  violationSheetData.push(['Total Violations', totalViolations]);
  violationSheetData.push([]);
  
  violationSheetData.push(['FREQUENT VIOLATIONS']);
  violationSheetData.push(['Violation Type', 'Count']);
  Object.entries(violationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20) // Top 20
    .forEach(([violation, count]) => {
      violationSheetData.push([violation, count]);
    });
  
  const violationSheet = XLSX.utils.aoa_to_sheet(violationSheetData);
  XLSX.utils.book_append_sheet(workbook, violationSheet, 'Violations');

  // === ACCIDENT SHEET ===
  const accidentSheetData = [];
  
  accidentSheetData.push(['ACCIDENT REPORT']);
  accidentSheetData.push([`Generated: ${reportData.generatedAt.toLocaleString()}`]);
  accidentSheetData.push([`Report Type: ${reportData.reportType.toUpperCase()}`]);
  accidentSheetData.push([]);
  
  accidentSheetData.push(['SUMMARY STATISTICS']);
  accidentSheetData.push(['Total Accidents', reportData.accidentData.length]);
  accidentSheetData.push([]);
  
  accidentSheetData.push(['MUNICIPALITIES WITH MOST ACCIDENTS']);
  accidentSheetData.push(['Municipality', 'Accident Count']);
  reportData.municipalityStats.slice(0, 10).forEach(stat => {
    accidentSheetData.push([stat._id || 'Unknown', stat.count]);
  });
  accidentSheetData.push([]);
  
  accidentSheetData.push(['BARANGAYS WITH MOST ACCIDENTS']);
  accidentSheetData.push(['Municipality', 'Barangay', 'Accident Count']);
  reportData.barangayStats.slice(0, 15).forEach(stat => {
    accidentSheetData.push([
      stat._id?.municipality || 'Unknown',
      stat._id?.barangay || 'Unknown',
      stat.count
    ]);
  });
  accidentSheetData.push([]);
  
  accidentSheetData.push(['HOURS WITH MOST ACCIDENTS']);
  accidentSheetData.push(['Hour', 'Accident Count']);
  reportData.hourlyStats.forEach(stat => {
    const hour = stat._id;
    const timeLabel = `${hour}:00 - ${hour}:59`;
    accidentSheetData.push([timeLabel, stat.count]);
  });
  
  const accidentSheet = XLSX.utils.aoa_to_sheet(accidentSheetData);
  XLSX.utils.book_append_sheet(workbook, accidentSheet, 'Accidents');

  return workbook;
};

/**
 * Save report to file system
 */
const saveReport = async (workbook, reportType) => {
  try {
    // Create reports directory if it doesn't exist
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `LTO_Report_${reportType}_${timestamp}.xlsx`;
    const filepath = path.join(reportsDir, filename);

    // Write file
    XLSX.writeFile(workbook, filepath);
    
    console.log(`[REPORT SCHEDULER] Report saved: ${filepath}`);
    
    // Clean up old reports (keep last 30 days)
    cleanupOldReports(reportsDir);
    
    return filepath;
  } catch (error) {
    console.error('[REPORT SCHEDULER] Error saving report:', error);
    throw error;
  }
};

/**
 * Clean up reports older than 30 days
 */
const cleanupOldReports = (reportsDir) => {
  try {
    const files = fs.readdirSync(reportsDir);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    files.forEach(file => {
      const filepath = path.join(reportsDir, file);
      const stats = fs.statSync(filepath);
      
      if (stats.mtime < thirtyDaysAgo) {
        fs.unlinkSync(filepath);
        console.log(`[REPORT SCHEDULER] Deleted old report: ${file}`);
      }
    });
  } catch (error) {
    console.error('[REPORT SCHEDULER] Error cleaning up old reports:', error);
  }
};

/**
 * Generate and save daily report
 */
const generateDailyReport = async () => {
  try {
    console.log('[REPORT SCHEDULER] Starting daily report generation...');
    const reportData = await generateReportData('daily');
    const workbook = createExcelReport(reportData);
    await saveReport(workbook, 'daily');
    console.log('[REPORT SCHEDULER] Daily report generated successfully');
  } catch (error) {
    console.error('[REPORT SCHEDULER] Error generating daily report:', error);
  }
};

/**
 * Generate and save monthly report
 */
const generateMonthlyReport = async () => {
  try {
    console.log('[REPORT SCHEDULER] Starting monthly report generation...');
    const reportData = await generateReportData('monthly');
    const workbook = createExcelReport(reportData);
    await saveReport(workbook, 'monthly');
    console.log('[REPORT SCHEDULER] Monthly report generated successfully');
  } catch (error) {
    console.error('[REPORT SCHEDULER] Error generating monthly report:', error);
  }
};

/**
 * Start scheduled report generation
 */
export const startReportScheduler = () => {
  console.log('[REPORT SCHEDULER] Initializing scheduled report generation...');
  
  // Schedule daily report - runs every day at 11:59 PM
  cron.schedule('59 23 * * *', generateDailyReport, {
    timezone: "Asia/Manila"
  });
  console.log('[REPORT SCHEDULER] Daily report scheduled: 11:59 PM daily');
  
  // Schedule monthly report - runs on the last day of each month at 11:59 PM
  cron.schedule('59 23 28-31 * *', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Only run if tomorrow is the 1st (meaning today is the last day of the month)
    if (tomorrow.getDate() === 1) {
      await generateMonthlyReport();
    }
  }, {
    timezone: "Asia/Manila"
  });
  console.log('[REPORT SCHEDULER] Monthly report scheduled: Last day of each month at 11:59 PM');
};

// Export functions for manual report generation (used by API endpoint)
export { generateReportData, createExcelReport };

