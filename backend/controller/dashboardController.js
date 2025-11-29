import VehicleModel from "../model/VehicleModel.js";
import OwnerModel from "../model/OwnerModel.js";
import ViolationModel from "../model/ViolationModel.js";
import AccidentModel from "../model/AccidentModel.js";
import UserModel from "../model/UserModel.js";
import { getVehicleStatus, calculateExpirationDate } from "../util/plateStatusCalculator.js";
import { getLatestRenewalDate } from "../util/vehicleHelpers.js";
import { logUserActivity, getClientIP, getUserAgent } from "../util/userLogger.js";
import dayjs from "dayjs";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper function to build date filter for dateOfRenewal array field
 * Since dateOfRenewal is an array of {date: Date, processedBy: ObjectId},
 * we need to check if any date in the array falls within the specified range
 */
const buildDateOfRenewalFilter = (month, year) => {
  if (!month && !year) {
    return {}; // No filter
  }

  if (month && year) {
    // Both month and year provided - filter by specific month/year
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    return {
      $expr: {
        $gt: [
          {
            $size: {
              $filter: {
                input: { $ifNull: ["$dateOfRenewal", []] },
                as: "renewal",
                cond: {
                  $and: [
                    {
                      $gte: [
                        {
                          $cond: {
                            if: { $ne: ["$$renewal.date", null] },
                            then: "$$renewal.date",
                            else: "$$renewal"
                          }
                        },
                        startDate
                      ]
                    },
                    {
                      $lte: [
                        {
                          $cond: {
                            if: { $ne: ["$$renewal.date", null] },
                            then: "$$renewal.date",
                            else: "$$renewal"
                          }
                        },
                        endDate
                      ]
                    }
                  ]
                }
              }
            }
          },
          0
        ]
      }
    };
  } else if (year && !month) {
    // Only year provided - filter by entire year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);
    
    return {
      $expr: {
        $gt: [
          {
            $size: {
              $filter: {
                input: { $ifNull: ["$dateOfRenewal", []] },
                as: "renewal",
                cond: {
                  $and: [
                    {
                      $gte: [
                        {
                          $cond: {
                            if: { $ne: ["$$renewal.date", null] },
                            then: "$$renewal.date",
                            else: "$$renewal"
                          }
                        },
                        startDate
                      ]
                    },
                    {
                      $lte: [
                        {
                          $cond: {
                            if: { $ne: ["$$renewal.date", null] },
                            then: "$$renewal.date",
                            else: "$$renewal"
                          }
                        },
                        endDate
                      ]
                    }
                  ]
                }
              }
            }
          },
          0
        ]
      }
    };
  } else if (month && !year) {
    // Only month provided - filter by that month across all years
    return {
      $expr: {
        $gt: [
          {
            $size: {
              $filter: {
                input: { $ifNull: ["$dateOfRenewal", []] },
                as: "renewal",
                cond: {
                  $eq: [
                    {
                      $month: {
                        $cond: {
                          if: { $ne: ["$$renewal.date", null] },
                          then: "$$renewal.date",
                          else: "$$renewal"
                        }
                      }
                    },
                    month
                  ]
                }
              }
            }
          },
          0
        ]
      }
    };
  }
  
  return {};
};

const buildNotDeletedFilter = () => ({
  $or: [
    { deletedAt: null },
    { deletedAt: { $exists: false } }
  ]
});

const normalizeLabel = (value, fallback = "UNSPECIFIED") => {
  if (value === null || value === undefined) {
    return fallback;
  }
  const normalized = value.toString().trim();
  return normalized ? normalized.toUpperCase() : fallback;
};

const parseHourFromTime = (timeString) => {
  if (!timeString) return null;
  const raw = timeString.toString().trim();
  if (!raw) return null;

  const sanitized = raw
    .replace(/[^\dAPMapm:\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const numericMatch = sanitized.match(/^(\d{3,4})$/);
  if (numericMatch) {
    const padded = numericMatch[1].padStart(4, "0");
    const hour = parseInt(padded.slice(0, 2), 10);
    return Number.isNaN(hour) ? null : hour % 24;
  }

  const match = sanitized.match(/(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  if (Number.isNaN(hour)) return null;

  const meridiem = match[4]?.toUpperCase() || null;
  if (meridiem === "PM" && hour < 12) {
    hour += 12;
  } else if (meridiem === "AM" && hour === 12) {
    hour = 0;
  }
  return hour % 24;
};

const sanitizeForFilename = (value) => {
  if (!value) return "report";
  return value
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "") || "report";
};

const getReportRangeDetails = ({ period = "daily", targetDate, targetMonth, targetYear }) => {
  const now = dayjs();

  if (period === "monthly") {
    const monthNumber = targetMonth ? parseInt(targetMonth, 10) : now.month() + 1;
    const yearNumber = targetYear ? parseInt(targetYear, 10) : now.year();

    if (Number.isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
      throw new Error("Invalid targetMonth value");
    }

    const target = dayjs(`${yearNumber}-${String(monthNumber).padStart(2, "0")}-01`);
    if (!target.isValid()) {
      throw new Error("Invalid month/year provided");
    }

    return {
      start: target.startOf("month").toDate(),
      end: target.endOf("month").toDate(),
      label: target.format("MMMM YYYY"),
      fileSuffix: target.format("YYYY-MM")
    };
  }

  const targetDay = targetDate ? dayjs(targetDate) : now;
  if (!targetDay.isValid()) {
    throw new Error("Invalid targetDate provided");
  }

  return {
    start: targetDay.startOf("day").toDate(),
    end: targetDay.endOf("day").toDate(),
    label: targetDay.format("MMMM DD, YYYY"),
    fileSuffix: targetDay.format("YYYY-MM-DD")
  };
};

// Get dashboard statistics
/**
 * OPTIMIZED: getDashboardStats - Parallel query execution
 * 
 * IMPROVEMENTS:
 * - Runs independent database queries in parallel using Promise.all
 * - Reduces total execution time from ~3-5s to ~1-2s
 * - External API calls run in parallel with database queries (non-blocking)
 * - Critical for first paint: Returns quickly with aggregated stats
 */
export const getDashboardStats = async (req, res) => {
  console.log('=== getDashboardStats called ===');
  try {
    // Calculate date ranges once
    const now = new Date();
    console.log(`[DASHBOARD] Current date: ${now.toISOString()}`);
    const currentMonth = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // PARALLEL EXECUTION: Run all independent database queries simultaneously
    // This reduces total time from sum of all queries to max of all queries
    const [
      totalVehicles,
      activeVehicles,
      expiredVehicles,
      totalDrivers,
      totalAccidents,
      totalUsers,
      employeeCount,
      adminCount,
      totalViolationsResult,
      recentViolationsResult,
      violationsByType,
      monthlyViolations,
      renewalCountThisMonth,
      vehiclesRegisteredThisMonth
    ] = await Promise.all([
      // Vehicle counts
      VehicleModel.countDocuments(),
      VehicleModel.countDocuments({ status: "1" }),
      VehicleModel.countDocuments({ status: "0" }),
      // Driver counts
      OwnerModel.countDocuments(),
      // Accident counts
      AccidentModel.countDocuments(),
      // User counts
      UserModel.countDocuments(),
      UserModel.countDocuments({ role: "2" }),
      UserModel.countDocuments({ role: "1" }),
      // Violation aggregations
      ViolationModel.aggregate([
        {
          $project: {
            violationsCount: {
              $size: {
                $ifNull: ["$violations", []]
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$violationsCount" }
          }
        }
      ]),
      ViolationModel.aggregate([
        {
          $match: {
            dateOfApprehension: { $gte: thirtyDaysAgo }
          }
        },
        {
          $project: {
            violationsCount: {
              $size: {
                $ifNull: ["$violations", []]
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$violationsCount" }
          }
        }
      ]),
      ViolationModel.aggregate([
        {
          $group: {
            _id: "$violationType",
            count: { $sum: 1 }
          }
        }
      ]),
      ViolationModel.aggregate([
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
      ]),
      // Vehicle renewal count (complex query)
      VehicleModel.countDocuments({
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
                            else: {
                              $cond: {
                                if: { $eq: [{ $type: "$$renewal" }, "date"] },
                                then: "$$renewal",
                                else: null
                              }
                            }
                          }
                        }
                      },
                      in: {
                        $and: [
                          { $ne: ["$$renewalDate", null] },
                          { $gte: ["$$renewalDate", monthStart] },
                          { $lte: ["$$renewalDate", monthEnd] }
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
      }),
      // Vehicles registered this month
      VehicleModel.countDocuments({
        createdAt: {
          $gte: monthStart,
          $lte: monthEnd
        }
      })
    ]);

    const totalViolations = totalViolationsResult[0]?.total || 0;
    const recentViolations = recentViolationsResult[0]?.total || 0;

    // External API calls - run in parallel (non-blocking)
    // These are optional and shouldn't block the main response
    // Helper function to extract current month prediction from API response
    const extractCurrentMonthPrediction = (data) => {
      console.log('[EXTRACT] === Starting extraction function ===');
      console.log('[EXTRACT] Input data:', {
        hasData: !!data,
        success: data?.success,
        hasDataField: !!(data?.data),
        dataKeys: data ? Object.keys(data) : []
      });
      
      if (!data || !data.success || !data.data) {
        console.log('[EXTRACT] Prediction API response missing or unsuccessful:', {
          hasData: !!data,
          success: data?.success,
          hasDataField: !!(data?.data)
        });
        return 0;
      }

      const predictionData = data.data;
      console.log('[EXTRACT] Prediction data structure:', {
        hasWeeklyPredictions: !!(predictionData.weekly_predictions),
        weeklyCount: predictionData.weekly_predictions?.length || 0,
        hasMonthlyAggregation: !!(predictionData.monthly_aggregation),
        monthlyValue: predictionData.monthly_aggregation?.total_predicted || 0,
        predictionStartDate: predictionData.prediction_start_date,
        currentMonth: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString()
      });
      
      // Log first week sample if available
      if (predictionData.weekly_predictions && predictionData.weekly_predictions.length > 0) {
        console.log('[EXTRACT] First week sample:', JSON.stringify(predictionData.weekly_predictions[0], null, 2));
      }
      
      // The API returns weekly_predictions and monthly_aggregation
      // We need to sum up weekly predictions that fall within the current month
      // IMPORTANT: Match the frontend logic exactly (WeeklyPredictionsChart.jsx)
      // 1. Filter out training month (July, month index 6)
      // 2. Group by month and sum predicted_count (or predicted, or total_predicted)
      // 3. Round the final value
      
      // Determine training month from last_data_date or default to July (6)
      let trainingMonth = 6; // Default to July (0-indexed: 6)
      if (predictionData.last_data_date) {
        try {
          const [ldYear, ldMonth, ldDay] = predictionData.last_data_date.split('-').map(Number);
          const lastDataDate = new Date(ldYear, ldMonth - 1, ldDay);
          if (!isNaN(lastDataDate.getTime())) {
            trainingMonth = lastDataDate.getMonth();
            console.log(`[EXTRACT] Training month detected: ${trainingMonth} (${lastDataDate.toLocaleString('default', { month: 'long' })})`);
          }
        } catch (e) {
          console.log(`[EXTRACT] Could not parse last_data_date: ${predictionData.last_data_date}`);
        }
      }
      
      if (predictionData.weekly_predictions && Array.isArray(predictionData.weekly_predictions)) {
        let currentMonthTotal = 0;
        let matchedWeeks = 0;
        
        predictionData.weekly_predictions.forEach((week, index) => {
          // Get the week start date (could be 'date' or 'week_start')
          const weekDateStr = week.date || week.week_start;
          if (!weekDateStr) {
            console.log(`[EXTRACT] Week ${index} missing date field`);
            return;
          }
          
          // Parse date string (format: YYYY-MM-DD) - parse as local date to avoid timezone issues
          const [year, month, day] = weekDateStr.split('-').map(Number);
          const weekDate = new Date(year, month - 1, day); // month is 0-indexed in Date constructor
          
          if (isNaN(weekDate.getTime())) {
            console.log(`[EXTRACT] Week ${index} has invalid date: ${weekDateStr}`);
            return;
          }
          
          // EXCLUDE training month (same as frontend)
          const predictionMonth = weekDate.getMonth();
          if (predictionMonth === trainingMonth) {
            console.log(`[EXTRACT] Week ${index} (${weekDateStr}) is in training month, excluding`);
            return;
          }
          
          // Check if this week falls within the current month
          // Use same logic as frontend: check if week's month matches current month
          const weekYear = weekDate.getFullYear();
          const weekMonth = weekDate.getMonth();
          
          // Check if week is in current month
          if (weekMonth === currentMonth && weekYear === currentYear) {
            // Get the predicted count for this week - use same priority as frontend:
            // predicted_count || predicted || total_predicted
            const weekValue = week.predicted_count || week.predicted || week.total_predicted || 0;
            const numericValue = typeof weekValue === 'number' ? weekValue : parseFloat(weekValue) || 0;
            currentMonthTotal += numericValue;
            matchedWeeks++;
            console.log(`[EXTRACT] Week ${index} (${weekDateStr}) in current month, value: ${numericValue}`);
          }
        });
        
        // If we found weekly predictions for the current month, return the rounded sum (same as frontend)
        if (currentMonthTotal > 0) {
          const roundedTotal = Math.round(currentMonthTotal);
          console.log(`[EXTRACT] Extracted ${currentMonthTotal} from ${matchedWeeks} weekly predictions for current month, rounded: ${roundedTotal}`);
          return roundedTotal;
        } else {
          console.log(`[EXTRACT] No weekly predictions overlap with current month. Checked ${predictionData.weekly_predictions.length} weeks.`);
          // Log first few weeks for debugging
          if (predictionData.weekly_predictions.length > 0) {
            const firstWeek = predictionData.weekly_predictions[0];
            console.log('[EXTRACT] First week sample:', {
              date: firstWeek.date || firstWeek.week_start,
              predicted_count: firstWeek.predicted_count,
              total_predicted: firstWeek.total_predicted,
              predicted: firstWeek.predicted
            });
          }
        }
      }
      
      // Fallback: Calculate first month of predictions from weekly data
      // This handles the case where predictions start in the future
      // IMPORTANT: Also exclude training month in fallback
      if (predictionData.weekly_predictions && predictionData.weekly_predictions.length > 0) {
        // Find the first week's date (excluding training month)
        let firstWeek = null;
        for (const week of predictionData.weekly_predictions) {
          const weekDateStr = week.date || week.week_start;
          if (!weekDateStr) continue;
          
          const [wYear, wMonth, wDay] = weekDateStr.split('-').map(Number);
          const weekDate = new Date(wYear, wMonth - 1, wDay);
          if (isNaN(weekDate.getTime())) continue;
          
          // Skip training month
          if (weekDate.getMonth() === trainingMonth) continue;
          
          firstWeek = week;
          break;
        }
        
        if (firstWeek) {
          const firstWeekDateStr = firstWeek.date || firstWeek.week_start;
          
          if (firstWeekDateStr) {
            // Parse date string (format: YYYY-MM-DD) - parse as local date to avoid timezone issues
            const [year, month, day] = firstWeekDateStr.split('-').map(Number);
            const firstWeekDate = new Date(year, month - 1, day);
            
            if (!isNaN(firstWeekDate.getTime())) {
              const firstMonth = firstWeekDate.getMonth();
              const firstYear = firstWeekDate.getFullYear();
              const firstMonthStart = new Date(firstYear, firstMonth, 1);
              const firstMonthEnd = new Date(firstYear, firstMonth + 1, 0, 23, 59, 59, 999);
              
              // If the first month of predictions matches the current month, calculate its total
              if (firstMonth === currentMonth && firstYear === currentYear) {
                let firstMonthTotal = 0;
                let matchedWeeks = 0;
                
                predictionData.weekly_predictions.forEach(week => {
                  const weekDateStr = week.date || week.week_start;
                  if (!weekDateStr) return;
                  
                  // Parse date string properly
                  const [wYear, wMonth, wDay] = weekDateStr.split('-').map(Number);
                  const weekDate = new Date(wYear, wMonth - 1, wDay);
                  if (isNaN(weekDate.getTime())) return;
                  
                  // EXCLUDE training month
                  if (weekDate.getMonth() === trainingMonth) return;
                  
                  // Normalize to start of day for comparison
                  const weekDateNormalized = new Date(weekDate.getFullYear(), weekDate.getMonth(), weekDate.getDate());
                  
                  // Check if week is in the first month
                  if (weekDateNormalized >= firstMonthStart && weekDateNormalized <= firstMonthEnd) {
                    // Use same field priority as frontend: predicted_count || predicted || total_predicted
                    const weekValue = week.predicted_count || week.predicted || week.total_predicted || 0;
                    const numericValue = typeof weekValue === 'number' ? weekValue : parseFloat(weekValue) || 0;
                    firstMonthTotal += numericValue;
                    matchedWeeks++;
                  }
                });
                
                if (firstMonthTotal > 0) {
                  const roundedTotal = Math.round(firstMonthTotal);
                  console.log(`[EXTRACT] Using first month of predictions (${matchedWeeks} weeks): ${firstMonthTotal}, rounded: ${roundedTotal}`);
                  return roundedTotal;
                }
              }
            }
          }
        }
      }
      
      // Fallback: If monthly_aggregation exists, check if we can use it
      // Note: monthly_aggregation might be for ALL weeks (52 weeks), not just first month
      if (predictionData.monthly_aggregation) {
        const monthlyValue = predictionData.monthly_aggregation.total_predicted || 0;
        
        // If prediction starts from current month, use the monthly aggregation
        if (predictionData.prediction_start_date && monthlyValue > 0) {
          // Parse date string properly (format: YYYY-MM-DD or ISO string)
          let predictionStartDate;
          if (predictionData.prediction_start_date.includes('-') && predictionData.prediction_start_date.split('-').length === 3) {
            const [pYear, pMonth, pDay] = predictionData.prediction_start_date.split('-').map(Number);
            predictionStartDate = new Date(pYear, pMonth - 1, pDay);
          } else {
            predictionStartDate = new Date(predictionData.prediction_start_date);
          }
          
          if (!isNaN(predictionStartDate.getTime())) {
            const predictionMonth = predictionStartDate.getMonth();
            const predictionYear = predictionStartDate.getFullYear();
            
            // If predictions start from current month, use monthly aggregation
            // BUT: monthly_aggregation might be for all 52 weeks, so we need to calculate first month from weeks
            // Only use it if we can't calculate from weeks
            if (predictionMonth === currentMonth && predictionYear === currentYear) {
              // Try to calculate first month from weeks first
              if (predictionData.weekly_predictions && predictionData.weekly_predictions.length > 0) {
                // Already handled above, but if we reach here, use monthly as last resort
                // Divide by approximate number of months if it's for 52 weeks
                const weeksRequested = predictionData.prediction_weeks || 52;
                const approximateMonths = Math.ceil(weeksRequested / 4.33); // ~4.33 weeks per month
                const firstMonthEstimate = Math.round(monthlyValue / approximateMonths);
                
                console.log(`[EXTRACT] Using estimated first month from monthly aggregation: ${firstMonthEstimate} (total: ${monthlyValue} for ${approximateMonths} months)`);
                return firstMonthEstimate;
              } else {
                console.log(`[EXTRACT] Using monthly aggregation: ${monthlyValue} (prediction starts from current month, no weekly data)`);
                return monthlyValue;
              }
            }
          }
        }
      }
      
      console.log('[EXTRACT] No prediction found for current month after all checks');
      return 0;
    };

    console.log('=== STARTING PREDICTION API CALLS ===');
    console.log(`Current month: ${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`);
    console.log(`Month range: ${monthStart.toISOString()} to ${monthEnd.toISOString()}`);
    
    const [predictedRenewalsThisMonth, predictedVehiclesThisMonth] = await Promise.all([
      // Prediction API call for renewals (with timeout)
      (async () => {
        console.log('[RENEWAL PREDICTION] Starting API call...');
        try {
          const predictionApiUrl = process.env.MV_PREDICTION_API_URL || 'http://localhost:5002';
          console.log(`[RENEWAL PREDICTION] API URL: ${predictionApiUrl}`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased to 30s timeout
          
          try {
            // First, try a health check to see if API is running (quick check)
            try {
              const healthController = new AbortController();
              const healthTimeout = setTimeout(() => healthController.abort(), 3000);
              const healthResponse = await fetch(`${predictionApiUrl}/api/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: healthController.signal
              });
              clearTimeout(healthTimeout);
              console.log(`[RENEWAL PREDICTION] Health check status: ${healthResponse?.status}`);
            } catch (healthError) {
              console.warn(`[RENEWAL PREDICTION] Health check failed (API may be slow or down):`, healthError.message);
            }
            
            // Request 52 weeks to get full year of predictions
            console.log(`[RENEWAL PREDICTION] Fetching: ${predictionApiUrl}/api/predict/registrations?weeks=52`);
            const response = await fetch(
              `${predictionApiUrl}/api/predict/registrations?weeks=52`,
              {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
              }
            );
            clearTimeout(timeoutId);
            
            console.log(`[RENEWAL PREDICTION] Response status: ${response?.status}, ok: ${response?.ok}`);
            
            if (response && response.ok) {
              const data = await response.json();
              console.log(`[RENEWAL PREDICTION] Response received, success: ${data?.success}`);
              console.log(`[RENEWAL PREDICTION] Response keys:`, Object.keys(data || {}));
              
              const prediction = extractCurrentMonthPrediction(data);
              console.log(`[RENEWAL PREDICTION] Final predicted renewals for current month: ${prediction}`);
              return prediction;
            } else {
              const errorText = await response?.text().catch(() => 'Unable to read error');
              console.error(`[RENEWAL PREDICTION] API returned error status ${response?.status}:`, errorText);
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name !== 'AbortError') {
              console.error('[RENEWAL PREDICTION] Fetch error:', fetchError.message);
              console.error('[RENEWAL PREDICTION] Error stack:', fetchError.stack);
            } else {
              console.warn('[RENEWAL PREDICTION] Request aborted (timeout)');
            }
          }
        } catch (error) {
          console.error('[RENEWAL PREDICTION] Outer error:', error.message);
          console.error('[RENEWAL PREDICTION] Error stack:', error.stack);
        }
        console.log('[RENEWAL PREDICTION] Returning 0 (fallback)');
        return 0;
      })(),
      // Prediction API call for vehicle registrations (with timeout)
      // Use the same API call and same logic to ensure consistency
      (async () => {
        console.log('[VEHICLE PREDICTION] Starting API call...');
        try {
          const predictionApiUrl = process.env.MV_PREDICTION_API_URL || 'http://localhost:5002';
          console.log(`[VEHICLE PREDICTION] API URL: ${predictionApiUrl}`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased to 30s timeout
          
          try {
            // First, try a health check to see if API is running (quick check)
            try {
              const healthController = new AbortController();
              const healthTimeout = setTimeout(() => healthController.abort(), 3000);
              const healthResponse = await fetch(`${predictionApiUrl}/api/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: healthController.signal
              });
              clearTimeout(healthTimeout);
              console.log(`[VEHICLE PREDICTION] Health check status: ${healthResponse?.status}`);
            } catch (healthError) {
              console.warn(`[VEHICLE PREDICTION] Health check failed (API may be slow or down):`, healthError.message);
            }
            
            // Request 52 weeks to get full year of predictions
            console.log(`[VEHICLE PREDICTION] Fetching: ${predictionApiUrl}/api/predict/registrations?weeks=52`);
            const response = await fetch(
              `${predictionApiUrl}/api/predict/registrations?weeks=52`,
              {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
              }
            );
            clearTimeout(timeoutId);
            
            console.log(`[VEHICLE PREDICTION] Response status: ${response?.status}, ok: ${response?.ok}`);
            
            if (response && response.ok) {
              const data = await response.json();
              console.log(`[VEHICLE PREDICTION] Response received, success: ${data?.success}`);
              console.log(`[VEHICLE PREDICTION] Response keys:`, Object.keys(data || {}));
              
              const prediction = extractCurrentMonthPrediction(data);
              console.log(`[VEHICLE PREDICTION] Final predicted vehicles for current month: ${prediction}`);
              return prediction;
            } else {
              const errorText = await response?.text().catch(() => 'Unable to read error');
              console.error(`[VEHICLE PREDICTION] API returned error status ${response?.status}:`, errorText);
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name !== 'AbortError') {
              console.error('[VEHICLE PREDICTION] Fetch error:', fetchError.message);
              console.error('[VEHICLE PREDICTION] Error stack:', fetchError.stack);
            } else {
              console.warn('[VEHICLE PREDICTION] Request aborted (timeout)');
            }
          }
        } catch (error) {
          console.error('[VEHICLE PREDICTION] Outer error:', error.message);
          console.error('[VEHICLE PREDICTION] Error stack:', error.stack);
        }
        console.log('[VEHICLE PREDICTION] Returning 0 (fallback)');
        return 0;
      })()
    ]);
    
    console.log('=== PREDICTION API CALLS COMPLETED ===');
    console.log(`Predicted renewals: ${predictedRenewalsThisMonth}`);
    console.log(`Predicted vehicles: ${predictedVehiclesThisMonth}`);

    const vehiclesNeedingRenewalThisMonth = Math.round(predictedRenewalsThisMonth);
    const predictedVehiclesThisMonthRounded = Math.round(predictedVehiclesThisMonth);

    // Additional queries that depend on month calculations - run in parallel
    const [violationsThisMonthResult, accidentsThisMonth, monthlyAccidentsForPrediction] = await Promise.all([
      // Violations this month
      ViolationModel.aggregate([
      {
        $match: {
          dateOfApprehension: {
            $gte: monthStart,
            $lte: monthEnd
          }
        }
      },
      {
        $project: {
          violationsCount: {
            $size: {
              $ifNull: ["$violations", []]
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$violationsCount" }
        }
      }
    ]),
      // Accidents this month
      AccidentModel.countDocuments({
        dateCommited: {
          $gte: monthStart,
          $lte: monthEnd
        }
      }),
      // Monthly accidents for prediction (last 12 months)
      AccidentModel.aggregate([
        {
          $match: {
            dateCommited: {
              $gte: new Date(currentYear, currentMonth - 12, 1),
              $lt: monthStart
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: "$dateCommited" },
              month: { $month: "$dateCommited" }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1 }
        }
      ])
    ]);

    const violationsThisMonth = violationsThisMonthResult[0]?.total || 0;
    
    // Calculate predicted accidents using linear regression
    let predictedAccidentsThisMonth = 0;
    try {
      const monthlyAccidents = monthlyAccidentsForPrediction;
      console.log(`Found ${monthlyAccidents.length} months of accident data for prediction`);

      if (monthlyAccidents.length >= 2) {
        // Calculate linear regression: y = mx + b
        // Use 0-based indexing like the frontend (x: index)
        const n = monthlyAccidents.length;
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumX2 = 0;

        monthlyAccidents.forEach((item, index) => {
          const x = index; // 0-based like frontend
          const y = item.count || 0;
          sumX += x;
          sumY += y;
          sumXY += x * y;
          sumX2 += x * x;
        });

        const denominator = n * sumX2 - sumX * sumX;
        const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
        const intercept = n !== 0 ? (sumY - slope * sumX) / n : 0;

        console.log(`Linear regression: slope=${slope}, intercept=${intercept}, n=${n}`);

        // Predict for the current month (next month in the sequence)
        // After n data points (0 to n-1), the next point is at x = n
        const x = n;
        const predicted = slope * x + intercept;
        predictedAccidentsThisMonth = Math.max(0, Math.round(predicted));
        
        console.log(`Predicted accidents for current month (x=${x}): ${predictedAccidentsThisMonth}`);
      } else if (monthlyAccidents.length > 0) {
        // If not enough data for regression, use average of available months
        const totalAccidents = monthlyAccidents.reduce((sum, item) => sum + (item.count || 0), 0);
        predictedAccidentsThisMonth = Math.round(totalAccidents / monthlyAccidents.length);
        console.log(`Using average (not enough data for regression): ${predictedAccidentsThisMonth}`);
      } else {
        console.log('No historical accident data available for prediction');
      }
    } catch (error) {
      console.error('Error calculating predicted accidents:', error.message);
      console.error(error.stack);
      // predictedAccidentsThisMonth remains 0
    }

    // Accidents count (total accidents) - keep for backward compatibility
    const accidentsCount = totalAccidents;

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
        },
        userStats: {
          total: totalUsers,
          employees: employeeCount,
          admins: adminCount
        },
        kpi: {
          renewal: {
            current: renewalCountThisMonth,
            target: vehiclesNeedingRenewalThisMonth
          },
          vehicle: {
            current: vehiclesRegisteredThisMonth,
            target: predictedVehiclesThisMonthRounded
          },
          accidents: {
            current: accidentsThisMonth,
            target: predictedAccidentsThisMonth
          },
          violations: {
            current: violationsThisMonth
          },
          systemUsers: {
            total: totalUsers
          }
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
        matchStage = { 
          dateOfApprehension: { $gte: startDate },
          $expr: { $eq: [ { $type: "$dateOfApprehension" }, "date" ] }
        };
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
        matchStage = { 
          dateOfApprehension: { $gte: startDate },
          $expr: { $eq: [ { $type: "$dateOfApprehension" }, "date" ] }
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
          dateOfApprehension: { $gte: startDate },
          $expr: { $eq: [ { $type: "$dateOfApprehension" }, "date" ] }
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
        startDate.setMonth(now.getMonth() - 12); // Last 12 months
        matchStage = { 
          dateOfApprehension: { $gte: startDate },
          $expr: { $eq: [ { $type: "$dateOfApprehension" }, "date" ] }
        };
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
        matchStage = { 
          dateOfApprehension: { $gte: startDate },
          $expr: { $eq: [ { $type: "$dateOfApprehension" }, "date" ] }
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
        startDate.setFullYear(now.getFullYear() - 5); // Last 5 years
        matchStage = { 
          dateOfApprehension: { $gte: startDate },
          $expr: { $eq: [ { $type: "$dateOfApprehension" }, "date" ] }
        };
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
        matchStage = { $expr: { $eq: [ { $type: "$dateOfApprehension" }, "date" ] } }; // Ensure valid date
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
      // Build accident match stage - use accident_date instead of dateOfApprehension
      let accidentMatchStage = { $expr: { $eq: [ { $type: "$accident_date" }, "date" ] } };
      if (Object.keys(matchStage).length > 0 && matchStage.dateOfApprehension) {
        accidentMatchStage = { 
          $and: [
            { $expr: { $eq: [ { $type: "$accident_date" }, "date" ] } },
            { accident_date: matchStage.dateOfApprehension }
          ]
        };
      }
      
      // Build accident group stage - use accident_date instead of dateOfApprehension
      let accidentGroupStage = { ...groupStage };
      if (accidentGroupStage._id.year) {
        accidentGroupStage._id.year = { $year: "$accident_date" };
      }
      if (accidentGroupStage._id.month) {
        accidentGroupStage._id.month = { $month: "$accident_date" };
      }
      if (accidentGroupStage._id.day) {
        accidentGroupStage._id.day = { $dayOfMonth: "$accident_date" };
      }
      accidentGroupStage.violations = { $sum: 0 };
      accidentGroupStage.accidents = { $sum: 1 };
      
      const accidentPipeline = [
        ...(Object.keys(accidentMatchStage).length > 0 ? [{ $match: accidentMatchStage }] : []),
        { $group: accidentGroupStage },
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
    const monthNum = month ? parseInt(month) : null;
    const yearNum = year ? parseInt(year) : null;
    
    // Build date filter using helper function
    const dateFilter = buildDateOfRenewalFilter(monthNum, yearNum);
    
    console.log(`Filtering by month ${monthNum}, year ${yearNum}`);
    console.log(`Date filter applied:`, JSON.stringify(dateFilter, null, 2));

    // Use aggregation to count vehicles with date filter
    const vehicleCountPipeline = [
      ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ["$status", "1"] }, 1, 0] }
          },
          expired: {
            $sum: { $cond: [{ $eq: ["$status", "0"] }, 1, 0] }
          }
        }
      }
    ];
    
    const vehicleCounts = await VehicleModel.aggregate(vehicleCountPipeline);
    const counts = vehicleCounts[0] || { total: 0, active: 0, expired: 0 };
    
    const totalVehicles = counts.total;
    const activeVehicles = counts.active;
    const expiredVehicles = counts.expired;
    
    console.log(`Total vehicles found: ${totalVehicles}`);
    console.log(`Active vehicles: ${activeVehicles}, Expired vehicles: ${expiredVehicles}`);

    // Get driver statistics based on vehicle renewal dates
    const driverStatsPipeline = [
      ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
      {
        $lookup: {
          from: 'owners',
          localField: 'ownerId',
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
        $match: {
          driverInfo: { $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          totalDrivers: { $addToSet: '$driverInfo._id' },
          driversWithLicense: {
            $addToSet: {
              $cond: [
                { $eq: ['$driverInfo.hasDriversLicense', true] },
                '$driverInfo._id',
                null
              ]
            }
          }
        }
      },
      {
        $project: {
          totalDrivers: { $size: { $filter: { input: '$totalDrivers', cond: { $ne: ['$$this', null] } } } },
          driversWithLicense: {
            $size: {
              $filter: {
                input: '$driversWithLicense',
                cond: { $ne: ['$$this', null] }
              }
            }
          }
        }
      }
    ];
    
    const driverStats = await VehicleModel.aggregate(driverStatsPipeline);
    const driverCounts = driverStats[0] || { totalDrivers: 0, driversWithLicense: 0 };
    
    const totalDrivers = driverCounts.totalDrivers;
    const driversWithLicense = driverCounts.driversWithLicense;
    const driversWithoutLicense = totalDrivers - driversWithLicense;

    // Get plate number classification
    // Temporary plates: no letters (only numbers)
    // Permanent plates: contains letters
    const plateClassificationPipeline = [
      ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
      {
        $group: {
          _id: null,
          temporary: {
            $sum: {
              $cond: [
                { $regexMatch: { input: '$plateNo', regex: /^[0-9]+$/ } },
                1,
                0
              ]
            }
          },
          total: { $sum: 1 }
        }
      }
    ];
    
    const plateStats = await VehicleModel.aggregate(plateClassificationPipeline);
    const plateCounts = plateStats[0] || { temporary: 0, total: 0 };
    
    const temporaryPlates = plateCounts.temporary;
    const permanentPlates = plateCounts.total - temporaryPlates;

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
    const monthNum = month ? parseInt(month) : null;
    const yearNum = year ? parseInt(year) : null;
    
    // Build date filter using helper function
    const dateFilter = buildDateOfRenewalFilter(monthNum, yearNum);

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
          from: 'owners',
          localField: 'ownerId',
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
                { $eq: ["$status", "1"] },
                1,
                0
              ]
            }
          },
          expiredVehicles: {
            $sum: {
              $cond: [
                { $eq: ["$status", "0"] },
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

    const driverData = await OwnerModel.aggregate(driverAggregation);

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
    const monthNum = month ? parseInt(month) : null;
    const yearNum = year ? parseInt(year) : null;
    
    // Build date filter using helper function
    const dateFilter = buildDateOfRenewalFilter(monthNum, yearNum);

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
          from: 'owners',
          localField: 'ownerId',
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
      const vehiclesInDateRange = await VehicleModel.find(dateFilter, 'ownerId').distinct('ownerId');
      const validOwnerIds = vehiclesInDateRange.filter(id => id !== null);
      
      if (validOwnerIds.length > 0) {
        const driverAggregation = [
          {
            $match: { _id: { $in: validOwnerIds } }
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
        
        driverData = await OwnerModel.aggregate(driverAggregation);
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
      
      driverData = await OwnerModel.aggregate(driverAggregation);
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
    const { period = 'all', ownerId } = req.query; // week, 3months, 6months, months, year, years, all
    
    if (!ownerId) {
      return res.status(400).json({
        success: false,
        message: "Owner ID is required"
      });
    }
    
    // First, get the owner and their vehicles
    const owner = await OwnerModel.findById(ownerId);
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: "Owner not found"
      });
    }
    
    // Get all vehicles associated with this owner
    const ownerVehicles = await VehicleModel.find({ ownerId: ownerId }).select('plateNo');
    const ownerPlates = ownerVehicles.map(v => v.plateNo).filter(plate => plate); // Get plate numbers and filter out null/undefined
    
    if (ownerPlates.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No vehicles found for this owner"
      });
    }
    
    console.log("Owner found:", owner.ownerRepresentativeName, "Plates:", ownerPlates);
    
    // Handle multiple plate numbers - use $in operator to match any of the owner's plates
    const driverPlates = ownerPlates;
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
      // Build accident match stage - use accident_date instead of dateOfApprehension
      let accidentMatchStage = { plateNo: { $in: driverPlates } };
      if (matchStage.dateOfApprehension) {
        accidentMatchStage.accident_date = matchStage.dateOfApprehension;
      }
      
      // Build accident group stage - use accident_date instead of dateOfApprehension
      let accidentGroupStage = { ...groupStage };
      if (accidentGroupStage._id.year) {
        accidentGroupStage._id.year = { $year: "$accident_date" };
      }
      if (accidentGroupStage._id.month) {
        accidentGroupStage._id.month = { $month: "$accident_date" };
      }
      if (accidentGroupStage._id.day) {
        accidentGroupStage._id.day = { $dayOfMonth: "$accident_date" };
      }
      accidentGroupStage.violations = { $sum: 0 };
      accidentGroupStage.accidents = { $sum: 1 };
      
      const accidentPipeline = [
        { $match: accidentMatchStage },
        { $group: accidentGroupStage },
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
        ownerId,
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
    const monthNum = month ? parseInt(month) : null;
    const yearNum = year ? parseInt(year) : null;
    
    // Build date filter using helper function
    const dateFilter = buildDateOfRenewalFilter(monthNum, yearNum);

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
          from: 'owners',
          localField: 'ownerId',
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
    
    // Build date filter using helper function
    const monthNum = month ? parseInt(month) : null;
    const yearNum = year ? parseInt(year) : null;
    const dateFilter = buildDateOfRenewalFilter(monthNum, yearNum);

    // Get vehicle data grouped by barangay for the specified municipality
    const vehicleAggregation = [
      ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
      {
        $lookup: {
          from: 'owners',
          localField: 'ownerId',
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
    // Get all vehicles with dateOfRenewal set (don't restrict by year here, we'll filter later)
    const aggregationPipeline = [
      {
        $match: {
          dateOfRenewal: {
            $exists: true,
            $ne: null,
            $not: { $size: 0 } // Ensure array is not empty
          }
        }
      },
      {
        $lookup: {
          from: 'owners',
          localField: 'ownerId',
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
      // Extract the latest renewal date from the array
      const renewalDate = getLatestRenewalDate(vehicle.dateOfRenewal);
      
      if (!renewalDate) return; // Skip vehicles without valid renewal date
      
      const renewalYear = new Date(renewalDate).getFullYear();
      
      // Only include vehicles whose renewal year is within the requested range
      if (renewalYear >= defaultStartYear && renewalYear <= defaultEndYear) {
        if (!yearlyData[renewalYear]) {
          yearlyData[renewalYear] = {
            total: 0,
            active: 0,
            expired: 0
          };
        }
        
        yearlyData[renewalYear].total++;
        
        // Use the same getVehicleStatus function as the main analytics
        // Extract latest renewal date for status calculation
        const latestDate = getLatestRenewalDate(vehicle.dateOfRenewal);
        const status = getVehicleStatus(vehicle.plateNo, latestDate, vehicle.vehicleStatusType || "Old");
        if (status === "1") {
          yearlyData[renewalYear].active++;
        } else {
          yearlyData[renewalYear].expired++;
        }
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
            $exists: true,
            $ne: null,
            $not: { $size: 0 } // Ensure array is not empty
          }
        }
      },
      {
        $lookup: {
          from: 'owners',
          localField: 'ownerId',
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
      // Extract the latest renewal date from the array
      const latestRenewalDate = getLatestRenewalDate(vehicle.dateOfRenewal);
      
      if (!latestRenewalDate) return; // Skip vehicles without valid renewal date
      
      const renewalMonth = new Date(latestRenewalDate).getMonth(); // 0-11
      const renewalYear = new Date(latestRenewalDate).getFullYear();
      
      // Only include vehicles from the specified year
      if (renewalYear !== yearValue) return;
      
      if (!monthlyData[renewalMonth]) {
        monthlyData[renewalMonth] = {
          total: 0,
          active: 0,
          expired: 0
        };
      }
      
      monthlyData[renewalMonth].total++;
      
      // Use the same getVehicleStatus function as the main analytics
      const status = getVehicleStatus(vehicle.plateNo, latestRenewalDate, vehicle.vehicleStatusType || "Old");
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
// NOTE: Classification is a permanent property of vehicles, so we show ALL vehicles
// regardless of date filter to show the overall distribution
export const getVehicleClassificationData = async (req, res) => {
  try {
    // Ignore month/year filter for classification - show all vehicles
    // Classification is a permanent property, not tied to renewal dates
    
    console.log('Vehicle classification endpoint - Showing all vehicles (no date filter)');
    
    // Get vehicle classification counts with data normalization
    // No date filter applied - we want the overall distribution
    const classificationData = await VehicleModel.aggregate([
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


export const exportDashboardReport = async (req, res) => {
  try {
    const { period = "daily", targetDate, targetMonth, targetYear } = req.query;
    if (!["daily", "monthly"].includes(period)) {
      return res.status(400).json({
        success: false,
        message: "Invalid period. Allowed values are daily or monthly."
      });
    }

    let rangeDetails;
    try {
      rangeDetails = getReportRangeDetails({
        period,
        targetDate,
        targetMonth,
        targetYear
      });
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.message
      });
    }

    const { start, end, label: rangeLabel, fileSuffix } = rangeDetails;

    const registeredVehiclesPromise = VehicleModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: start,
            $lte: end
          },
          ...buildNotDeletedFilter()
        }
      },
      {
        $lookup: {
          from: "owners",
          localField: "ownerId",
          foreignField: "_id",
          as: "owner"
        }
      },
      {
        $unwind: {
          path: "$owner",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          ownerId: "$owner._id",
          hasLicense: "$owner.hasDriversLicense",
          municipality: "$owner.address.municipality",
          plateNo: { $ifNull: ["$plateNo", ""] }
        }
      }
    ]);

    const renewedVehiclesPromise = VehicleModel.aggregate([
      {
        $match: {
          ...buildNotDeletedFilter()
        }
      },
      {
        $addFields: {
          renewalsInRange: {
            $filter: {
              input: { $ifNull: ["$dateOfRenewal", []] },
              as: "renewal",
              cond: {
                $let: {
                  vars: {
                    renewalDate: {
                      $cond: [
                        { $eq: [{ $type: "$$renewal" }, "object"] },
                        "$$renewal.date",
                        {
                          $cond: [
                            { $eq: [{ $type: "$$renewal" }, "date"] },
                            "$$renewal",
                            null
                          ]
                        }
                      ]
                    }
                  },
                  in: {
                    $and: [
                      { $ne: ["$$renewalDate", null] },
                      { $gte: ["$$renewalDate", start] },
                      { $lte: ["$$renewalDate", end] }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      {
        $match: {
          $expr: {
            $gt: [
              { $size: "$renewalsInRange" },
              0
            ]
          }
        }
      },
      {
        $project: {
          plateNo: { $ifNull: ["$plateNo", ""] }
        }
      }
    ]);

    const violationMatch = {
      dateOfApprehension: {
        $gte: start,
        $lte: end
      },
      ...buildNotDeletedFilter()
    };

    const accidentsMatch = {
      dateCommited: {
        $gte: start,
        $lte: end
      },
      ...buildNotDeletedFilter()
    };

    const [
      registeredVehicles,
      renewedVehicles,
      totalViolators,
      frequentViolations,
      accidents
    ] = await Promise.all([
      registeredVehiclesPromise,
      renewedVehiclesPromise,
      ViolationModel.countDocuments(violationMatch),
      ViolationModel.aggregate([
        { $match: violationMatch },
        {
          $unwind: {
            path: "$violations",
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $match: {
            violations: { $nin: [null, ""] }
          }
        },
        {
          $group: {
            _id: "$violations",
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      AccidentModel.find(accidentsMatch)
        .select("municipality barangay timeCommited")
        .lean()
    ]);

    const totalRegisteredVehicles = registeredVehicles.length;
    const municipalityRegistrationCounts = {};
    const ownerLicenseMap = new Map();

    registeredVehicles.forEach((vehicle) => {
      const municipalityLabel = normalizeLabel(vehicle.municipality);
      municipalityRegistrationCounts[municipalityLabel] = (municipalityRegistrationCounts[municipalityLabel] || 0) + 1;

      if (vehicle.ownerId) {
        const ownerKey = vehicle.ownerId.toString();
        if (!ownerLicenseMap.has(ownerKey)) {
          ownerLicenseMap.set(ownerKey, vehicle.hasLicense === true);
        }
      }
    });

    const totalOwners = ownerLicenseMap.size;
    const ownersWithLicense = [...ownerLicenseMap.values()].filter(Boolean).length;
    const ownersWithoutLicense = Math.max(totalOwners - ownersWithLicense, 0);

    const totalRenewedVehicles = renewedVehicles.length;
    let temporaryPlates = 0;
    renewedVehicles.forEach((vehicle) => {
      const plate = vehicle.plateNo ? vehicle.plateNo.toString().trim().toUpperCase() : "";
      if (/^[0-9]+$/.test(plate)) {
        temporaryPlates += 1;
      }
    });
    const permanentPlates = Math.max(totalRenewedVehicles - temporaryPlates, 0);

    const accidentCount = accidents.length;
    const accidentMunicipalityCounts = {};
    const accidentBarangayCounts = {};
    const accidentHourCounts = {};

    accidents.forEach((accident) => {
      const municipalityLabel = normalizeLabel(accident.municipality);
      accidentMunicipalityCounts[municipalityLabel] = (accidentMunicipalityCounts[municipalityLabel] || 0) + 1;

      const barangayLabel = normalizeLabel(accident.barangay);
      accidentBarangayCounts[barangayLabel] = (accidentBarangayCounts[barangayLabel] || 0) + 1;

      const parsedHour = parseHourFromTime(accident.timeCommited);
      if (parsedHour !== null) {
        const hourLabel = `${String(parsedHour).padStart(2, "0")}:00`;
        accidentHourCounts[hourLabel] = (accidentHourCounts[hourLabel] || 0) + 1;
      }
    });

    const sortEntries = (counts) => Object.entries(counts).sort((a, b) => b[1] - a[1]);

    const municipalityRows = sortEntries(municipalityRegistrationCounts);
    if (!municipalityRows.length) {
      municipalityRows.push(["NO REGISTRATIONS FOR PERIOD", 0]);
    }

    const frequentViolationRows = frequentViolations.map((item) => [item._id || "UNSPECIFIED", item.count]);
    if (!frequentViolationRows.length) {
      frequentViolationRows.push(["NO VIOLATIONS FOR PERIOD", 0]);
    }

    const accidentMunicipalityRows = sortEntries(accidentMunicipalityCounts);
    if (!accidentMunicipalityRows.length) {
      accidentMunicipalityRows.push(["NO DATA", 0]);
    }

    const accidentBarangayRows = sortEntries(accidentBarangayCounts);
    if (!accidentBarangayRows.length) {
      accidentBarangayRows.push(["NO DATA", 0]);
    }

    const accidentHourRows = sortEntries(accidentHourCounts).slice(0, 10);
    if (!accidentHourRows.length) {
      accidentHourRows.push(["NO DATA", 0]);
    }

    const workbook = XLSX.utils.book_new();

    const vehicleSheetData = [
      ["Vehicle Summary", `Period: ${rangeLabel}`],
      ["Metric", "Value"],
      ["Registered Vehicles", totalRegisteredVehicles],
      ["Renewed Vehicles", totalRenewedVehicles],
      [],
      ["Registered Owners (Unique)"],
      ["Category", "Count"],
      ["Total Owners", totalOwners],
      ["With Driver's License", ownersWithLicense],
      ["Without Driver's License", ownersWithoutLicense],
      [],
      ["Plate Classification (Renewals)"],
      ["Category", "Count"],
      ["Temporary Plates", temporaryPlates],
      ["Permanent Plates", permanentPlates],
      [],
      ["Registered Vehicles by Municipality"],
      ["Municipality", "Count"],
      ...municipalityRows
    ];
    const vehicleSheet = XLSX.utils.aoa_to_sheet(vehicleSheetData);
    vehicleSheet["!cols"] = [{ wch: 40 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, vehicleSheet, "Vehicles");

    const violationSheetData = [
      ["Violation Overview", `Period: ${rangeLabel}`],
      ["Metric", "Value"],
      ["Total Violators", totalViolators],
      [],
      ["Frequent Violations"],
      ["Violation", "Count"],
      ...frequentViolationRows
    ];
    const violationSheet = XLSX.utils.aoa_to_sheet(violationSheetData);
    violationSheet["!cols"] = [{ wch: 45 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, violationSheet, "Violations");

    const accidentsSheetData = [
      ["Accident Overview", `Period: ${rangeLabel}`],
      ["Metric", "Value"],
      ["Total Accidents", accidentCount],
      [],
      ["Municipality with Many Accidents"],
      ["Municipality", "Count"],
      ...accidentMunicipalityRows,
      [],
      ["Barangay with Many Accidents"],
      ["Barangay", "Count"],
      ...accidentBarangayRows,
      [],
      ["Hours with Many Accidents"],
      ["Hour", "Count"],
      ...accidentHourRows
    ];
    const accidentsSheet = XLSX.utils.aoa_to_sheet(accidentsSheetData);
    accidentsSheet["!cols"] = [{ wch: 45 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, accidentsSheet, "Accidents");

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    const filename = `lto-dashboard-${period}-report-${sanitizeForFilename(fileSuffix)}.xlsx`;

    // Log the export activity BEFORE sending response
    if (req.user && req.user.userId) {
      try {
        await logUserActivity({
          userId: req.user.userId,
          logType: 'export_dashboard_report',
          ipAddress: getClientIP(req),
          status: 'success',
          details: `Exported dashboard report (${period}) - Period: ${rangeLabel}, Vehicles: ${totalRegisteredVehicles}, Violations: ${totalViolators}, Accidents: ${accidentCount}`
        });
      } catch (logError) {
        console.error('Failed to log dashboard report export:', logError);
      }
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    return res.status(200).send(buffer);
  } catch (error) {
    console.error("Dashboard report export error:", error);
    
    // Log failed export attempt
    if (req.user && req.user.userId) {
      try {
        await logUserActivity({
          userId: req.user.userId,
          logType: 'export_dashboard_report',
          ipAddress: getClientIP(req),
          status: 'failed',
          details: `Failed to export dashboard report (${period}) - Error: ${error.message}`
        });
      } catch (logError) {
        console.error('Failed to log dashboard report export error:', logError);
      }
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to generate dashboard report."
    });
  }
};

// List automatically generated reports
export const listAutomatedReports = async (req, res) => {
  try {
    const reportsDir = path.join(__dirname, '..', 'reports');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    // Read all files in reports directory
    const files = fs.readdirSync(reportsDir);
    
    // Filter and parse report files
    const reports = files
      .filter(file => file.endsWith('.xlsx') && file.startsWith('LTO_Report_'))
      .map(file => {
        const filepath = path.join(reportsDir, file);
        const stats = fs.statSync(filepath);
        
        // Parse filename: LTO_Report_{type}_{date}.xlsx
        const match = file.match(/LTO_Report_(daily|monthly)_(.+)\.xlsx/);
        if (!match) return null;
        
        const [, type, date] = match;
        
        return {
          filename: file,
          type: type,
          date: date,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        };
      })
      .filter(report => report !== null)
      .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt)); // Sort by newest first

    return res.status(200).json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error("Error listing automated reports:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list automated reports."
    });
  }
};

// Download an automatically generated report
export const downloadAutomatedReport = async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security: Only allow files that match the expected pattern
    if (!filename.match(/^LTO_Report_(daily|monthly)_[\d-]+\.xlsx$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid filename format."
      });
    }

    const reportsDir = path.join(__dirname, '..', 'reports');
    const filepath = path.join(reportsDir, filename);

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        success: false,
        message: "Report file not found."
      });
    }

    // Log the download activity BEFORE sending response
    if (req.user && req.user.userId) {
      try {
        const fileStats = fs.statSync(filepath);
        const fileSizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
        await logUserActivity({
          userId: req.user.userId,
          logType: 'download_automated_report',
          ipAddress: getClientIP(req),
          status: 'success',
          details: `Downloaded automated report: ${filename} (${fileSizeMB} MB)`
        });
      } catch (logError) {
        console.error('Failed to log automated report download:', logError);
      }
    }

    // Set headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error downloading automated report:", error);
    
    // Log failed download attempt
    if (req.user && req.user.userId) {
      try {
        await logUserActivity({
          userId: req.user.userId,
          logType: 'download_automated_report',
          ipAddress: getClientIP(req),
          status: 'failed',
          details: `Failed to download automated report: ${req.params.filename} - Error: ${error.message}`
        });
      } catch (logError) {
        console.error('Failed to log automated report download error:', logError);
      }
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to download automated report."
    });
  }
};
