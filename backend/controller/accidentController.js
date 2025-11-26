import AccidentModel from "../model/AccidentModel.js";
import OwnerModel from "../model/OwnerModel.js";
import VehicleModel from "../model/VehicleModel.js";
import UserModel from "../model/UserModel.js";
import { logUserActivity, getClientIP, getUserAgent } from "../util/userLogger.js";

export const getAccidents = async (req, res) => {
  try {
    const { page = 1, limit, search, municipality, fetchAll } = req.query;
    
    // If fetchAll is true, don't apply pagination
    const isFetchAll = fetchAll === 'true' || fetchAll === true || fetchAll === '1' || fetchAll === 1;
    const shouldPaginate = !isFetchAll;
    const limitValue = shouldPaginate ? (parseInt(limit) || 100) : null;
    const skip = shouldPaginate ? (page - 1) * limitValue : 0;

    let query = { deletedAt: null };

    // Add search functionality
    if (search) {
      query.$or = [
        { blotterNo: { $regex: search, $options: "i" } },
        { vehiclePlateNo: { $regex: search, $options: "i" } },
        { vehicleMCPlateNo: { $regex: search, $options: "i" } },
        { suspect: { $regex: search, $options: "i" } },
        { offense: { $regex: search, $options: "i" } },
      ];
    }

    // Add municipality filter
    if (municipality) {
      query.municipality = municipality;
    }

    // OPTIMIZATION: Select only fields needed for listing page
    // Reduces payload size and improves query performance
    // Indexes used: createdAt (for sorting), deletedAt (for filtering), municipality
    let accidentsQuery = AccidentModel.find(query)
      .select("blotterNo vehiclePlateNo vehicleMCPlateNo vehicleChassisNo suspect stageOfFelony offense offenseType narrative caseStatus region province municipality barangay street lat lng dateEncoded dateReported timeReported dateCommited timeCommited incidentType createdBy updatedBy createdAt updatedAt")
      .populate('createdBy', 'firstName middleName lastName')
      .populate('updatedBy', 'firstName middleName lastName')
      .sort({ createdAt: -1 });

    // Only apply skip and limit if pagination is enabled
    if (shouldPaginate) {
      accidentsQuery = accidentsQuery.skip(skip);
      if (limitValue) {
        accidentsQuery = accidentsQuery.limit(limitValue);
      }
    }

    const accidents = await accidentsQuery;
    const total = await AccidentModel.countDocuments(query);

    res.json({ 
      success: true, 
      data: accidents,
      pagination: {
        current: shouldPaginate ? parseInt(page) : 1,
        pages: shouldPaginate ? Math.ceil(total / (limitValue || 100)) : 1,
        total,
        limit: limitValue || null,
        fetchAll: !shouldPaginate,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAccident = async (req, res) => {
  try {
    const { vehiclePlateNo, vehicleMCPlateNo, blotterNo } = req.body;

    // Generate blotterNo if not provided or empty
    let finalBlotterNo = blotterNo;
    if (!finalBlotterNo || finalBlotterNo.trim() === "") {
      const timestamp = Date.now();
      finalBlotterNo = `BLT-${timestamp}`;
    }

    // Create accident data
    const accidentData = {
      ...req.body,
      blotterNo: finalBlotterNo,
      createdBy: req.user ? req.user.userId : null,
      updatedBy: null // Only set when actually updated
    };

    const accident = new AccidentModel(accidentData);
    await accident.save();
    
    // Populate createdBy and updatedBy fields
    await accident.populate([
      { path: "createdBy", select: "firstName middleName lastName" },
      { path: "updatedBy", select: "firstName middleName lastName" }
    ]);

    // Log the activity
    if (req.user && req.user.userId) {
      try {
        // Fetch user details for logging
        const user = await UserModel.findById(req.user.userId);
        if (user) {
          const vehicleInfo = vehiclePlateNo || vehicleMCPlateNo || 'N/A';
          await logUserActivity({
            userId: user._id,
            logType: 'add_accident',
            ipAddress: getClientIP(req),
            status: 'success',
            details: `Accident Added Successfully (Blotter No: ${finalBlotterNo})`
          });
        }
      } catch (logError) {
        console.error('Failed to log user activity:', logError.message);
        // Don't fail the main operation if logging fails
      }
    } else {
      console.warn('User not authenticated or user.userId is missing for accident creation');
    }

    res
      .status(201)
      .json({ success: true, message: "Accident created successfully", data: accident });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAccidentById = async (req, res) => {
  try {
    const accident = await AccidentModel.findOne({ _id: req.params.id, deletedAt: null })
      .populate('createdBy', 'firstName middleName lastName')
      .populate('updatedBy', 'firstName middleName lastName');
    if (!accident) {
      return res
        .status(404)
        .json({ success: false, message: "Accident not found" });
    }
    res.json({ success: true, data: accident });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAccident = async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Set updatedBy if user is authenticated
    if (req.user && req.user.userId) {
      updateData.updatedBy = req.user.userId;
    }

    const accident = await AccidentModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
      .populate('createdBy', 'firstName middleName lastName')
      .populate('updatedBy', 'firstName middleName lastName');
    if (!accident) {
      return res
        .status(404)
        .json({ success: false, message: "Accident not found" });
    }

    // Log the activity
    if (req.user && req.user.userId) {
      try {
        // Fetch user details for logging
        const user = await UserModel.findById(req.user.userId);
        if (user) {
          await logUserActivity({
            userId: user._id,
            logType: 'update_accident',
            ipAddress: getClientIP(req),
            status: 'success',
            details: `Accident Updated Successfully (Blotter No: ${accident.blotterNo})`
          });
        }
      } catch (logError) {
        console.error('Failed to log user activity:', logError.message);
        // Don't fail the main operation if logging fails
      }
    } else {
      console.warn('User not authenticated or user.userId is missing for accident update');
    }

    res.json({ success: true, message: "Accident updated", data: accident });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete accident
export const deleteAccident = async (req, res) => {
  try {
    const accident = await AccidentModel.findById(req.params.id);
    
    if (!accident) {
      return res.status(404).json({ 
        success: false, 
        message: "Accident not found" 
      });
    }

    if (accident.deletedAt) {
      return res.status(400).json({
        success: false,
        message: "Accident is already deleted",
      });
    }

    // Soft delete by setting deletedAt
    accident.deletedAt = new Date();
    accident.updatedBy = req.user ? req.user.userId : null;
    await accident.save();

    // Log the activity before deleting
    if (req.user && req.user.userId) {
      try {
        // Fetch user details for logging
        const user = await UserModel.findById(req.user.userId);
        if (user) {
          await logUserActivity({
            userId: user._id,
            logType: 'delete_accident',
            ipAddress: getClientIP(req),
            status: 'success',
            details: `Accident moved to bin (Blotter No: ${accident.blotterNo})`
          });
        }
      } catch (logError) {
        console.error('Failed to log user activity:', logError.message);
        // Don't fail the main operation if logging fails
      }
    } else {
      console.warn('User not authenticated or user.userId is missing for accident deletion');
    }
    
    res.json({ 
      success: true, 
      message: "Accident moved to bin successfully" 
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Get deleted accidents (bin)
export const getDeletedAccidents = async (req, res) => {
  try {
    const { page = 1, limit, search, fetchAll } = req.query;
    
    // If fetchAll is true, don't apply pagination
    const isFetchAll = fetchAll === 'true' || fetchAll === true || fetchAll === '1' || fetchAll === 1;
    const shouldPaginate = !isFetchAll;
    const limitValue = shouldPaginate ? (parseInt(limit) || 100) : null;
    const skip = shouldPaginate ? (page - 1) * limitValue : 0;

    let query = { deletedAt: { $ne: null } }; // Only deleted items

    // Add search functionality
    if (search) {
      query.$or = [
        { blotterNo: { $regex: search, $options: "i" } },
        { vehiclePlateNo: { $regex: search, $options: "i" } },
        { vehicleMCPlateNo: { $regex: search, $options: "i" } },
        { suspect: { $regex: search, $options: "i" } },
        { municipality: { $regex: search, $options: "i" } },
      ];
    }

    // OPTIMIZATION: Select only fields needed for listing page
    let accidentsQuery = AccidentModel.find(query)
      .select("blotterNo vehiclePlateNo vehicleMCPlateNo vehicleChassisNo suspect stageOfFelony offense offenseType narrative caseStatus region province municipality barangay street lat lng dateEncoded dateReported timeReported dateCommited timeCommited incidentType createdBy updatedBy createdAt updatedAt deletedAt")
      .populate('createdBy', 'firstName middleName lastName')
      .populate('updatedBy', 'firstName middleName lastName')
      .sort({ deletedAt: -1 });

    // Only apply skip and limit if pagination is enabled
    if (shouldPaginate) {
      accidentsQuery = accidentsQuery.skip(skip);
      if (limitValue) {
        accidentsQuery = accidentsQuery.limit(limitValue);
      }
    }

    const accidents = await accidentsQuery;
    const total = await AccidentModel.countDocuments(query);

    res.json({
      success: true,
      data: accidents,
      pagination: {
        current: shouldPaginate ? parseInt(page) : 1,
        pages: shouldPaginate ? Math.ceil(total / (limitValue || 100)) : 1,
        total,
        limit: limitValue || null,
        fetchAll: !shouldPaginate,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Restore accident from bin
export const restoreAccident = async (req, res) => {
  try {
    const accident = await AccidentModel.findById(req.params.id);
    
    if (!accident) {
      return res.status(404).json({ 
        success: false, 
        message: "Accident not found" 
      });
    }

    if (!accident.deletedAt) {
      return res.status(400).json({
        success: false,
        message: "Accident is not deleted",
      });
    }

    // Restore by clearing deletedAt
    accident.deletedAt = null;
    accident.updatedBy = req.user ? req.user.userId : null;
    await accident.save();

    // Log the activity
    if (req.user && req.user.userId) {
      try {
        const user = await UserModel.findById(req.user.userId);
        if (user) {
          await logUserActivity({
            userId: user._id,
            logType: 'restore_accident',
            ipAddress: getClientIP(req),
            status: 'success',
            details: `Accident restored from bin (Blotter No: ${accident.blotterNo})`
          });
        }
      } catch (logError) {
        console.error('Failed to log user activity:', logError.message);
      }
    }
    
    res.json({ 
      success: true, 
      message: "Accident restored successfully",
      data: accident
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Permanently delete accident
export const permanentDeleteAccident = async (req, res) => {
  try {
    const accident = await AccidentModel.findById(req.params.id);
    
    if (!accident) {
      return res.status(404).json({ 
        success: false, 
        message: "Accident not found" 
      });
    }

    if (!accident.deletedAt) {
      return res.status(400).json({
        success: false,
        message: "Accident must be in bin before permanent deletion",
      });
    }

    const blotterNo = accident.blotterNo;

    // Permanently delete from database
    await AccidentModel.findByIdAndDelete(req.params.id);

    // Log the activity
    if (req.user && req.user.userId) {
      try {
        const user = await UserModel.findById(req.user.userId);
        if (user) {
          await logUserActivity({
            userId: user._id,
            logType: 'permanent_delete_accident',
            ipAddress: getClientIP(req),
            status: 'success',
            details: `Accident permanently deleted (Blotter No: ${blotterNo})`
          });
        }
      } catch (logError) {
        console.error('Failed to log user activity:', logError.message);
      }
    }
    
    res.json({ 
      success: true, 
      message: "Accident permanently deleted successfully" 
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Analytics endpoints for accident data
export const getAccidentAnalytics = async (req, res) => {
  try {
    const { period = '6months' } = req.query;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    let endDate = null;
    
    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'currentMonth':
        // Current month only - from start of current month to end of current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case '3months':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'alltime':
        startDate = null; // No date filter for all time
        break;
      default:
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
    }

    // Build date filter for queries
    let dateFilter = {};
    if (startDate && endDate) {
      // Current month: both start and end dates
      dateFilter = { dateCommited: { $gte: startDate, $lte: endDate } };
    } else if (startDate) {
      // Other periods: only start date
      dateFilter = { dateCommited: { $gte: startDate } };
    }

    // Get total accidents
    const totalAccidents = await AccidentModel.countDocuments(dateFilter);

    // Get previous period for comparison (skip for alltime)
    let previousTotalAccidents = 0;
    if (startDate) {
      const previousStartDate = new Date(startDate);
      const previousEndDate = new Date(startDate);
      const periodLength = now.getTime() - startDate.getTime();
      previousStartDate.setTime(previousStartDate.getTime() - periodLength);
      
      previousTotalAccidents = await AccidentModel.countDocuments({
        dateCommited: { $gte: previousStartDate, $lt: previousEndDate }
      });
    }

    // Calculate percentage change
    const accidentChange = previousTotalAccidents > 0 
      ? ((totalAccidents - previousTotalAccidents) / previousTotalAccidents * 100).toFixed(1)
      : 0;

    // Get incident type distribution
    const incidentTypeDistribution = await AccidentModel.aggregate([
      {
        $match: dateFilter
      },
      {
        $group: {
          _id: '$incidentType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get offense type distribution (ML target variable)
    const offenseTypeDistribution = await AccidentModel.aggregate([
      {
        $match: {
          ...dateFilter,
          offenseType: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$offenseType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get case status distribution
    const caseStatusDistribution = await AccidentModel.aggregate([
      {
        $match: {
          ...dateFilter,
          caseStatus: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$caseStatus',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get temporal patterns - hourly distribution
    // Use timeCommited if available (more accurate), otherwise fallback to dateCommited hour
    const hourlyDistribution = await AccidentModel.aggregate([
      {
        $match: {
          ...dateFilter,
          dateCommited: { $exists: true }
        }
      },
      {
        $addFields: {
          // Extract hour from timeCommited string (format: "HH:MM" or "HH:MM:SS")
          // If timeCommited exists and is valid, parse it; otherwise use hour from dateCommited
          hourFromTime: {
            $cond: {
              if: { 
                $and: [
                  { $ne: ['$timeCommited', null] }, 
                  { $ne: ['$timeCommited', ''] },
                  { $ne: [{ $size: { $split: ['$timeCommited', ':'] } }, 0] }
                ] 
              },
              then: {
                $let: {
                  vars: {
                    hourStr: { $arrayElemAt: [{ $split: ['$timeCommited', ':'] }, 0] }
                  },
                  in: {
                    $cond: {
                      if: { 
                        $and: [
                          { $ne: ['$$hourStr', ''] },
                          { $gte: [{ $toInt: '$$hourStr' }, 0] },
                          { $lte: [{ $toInt: '$$hourStr' }, 23] }
                        ]
                      },
                      then: { $toInt: '$$hourStr' },
                      else: { $hour: '$dateCommited' }
                    }
                  }
                }
              },
              else: { $hour: '$dateCommited' }
            }
          }
        }
      },
      {
        $match: {
          hourFromTime: { $exists: true, $ne: null, $gte: 0, $lte: 23 }
        }
      },
      {
        $group: {
          _id: '$hourFromTime',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Get day of week distribution
    const dayOfWeekDistribution = await AccidentModel.aggregate([
      {
        $match: dateFilter
      },
      {
        $group: {
          _id: { $dayOfWeek: '$dateCommited' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Get monthly trends
    const monthlyTrends = await AccidentModel.aggregate([
      {
        $match: dateFilter
      },
      {
        $group: {
          _id: {
            year: { $year: '$dateCommited' },
            month: { $month: '$dateCommited' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Get municipality distribution with normalization
    const municipalityDistribution = await AccidentModel.aggregate([
      {
        $match: dateFilter
      },
      {
        $addFields: {
          normalized_municipality: {
            $cond: {
              if: { $or: [
                { $eq: ["$municipality", "Mati"] },
                { $eq: ["$municipality", "Mati City"] }
              ]},
              then: "Mati",
              else: "$municipality"
            }
          }
        }
      },
      {
        $group: {
          _id: '$normalized_municipality',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get all accidents for map (using geocoding based on location) with normalized municipality
    const accidentsWithCoordinates = await AccidentModel.aggregate([
      {
        $match: dateFilter
      },
      {
        $addFields: {
          normalized_municipality: {
            $cond: {
              if: { $eq: ["$municipality", "Mati City"] },
              then: "Mati",
              else: "$municipality"
            }
          }
        }
      },
      {
        $project: {
          blotterNo: 1,
          vehiclePlateNo: 1,
          vehicleMCPlateNo: 1,
          vehicleChassisNo: 1,
          incidentType: 1,
          municipality: "$normalized_municipality",
          barangay: 1,
          street: 1,
          dateCommited: 1,
          narrative: 1,
          lat: 1,
          lng: 1
        }
      }
    ]);

    // Calculate crimes against persons count
    const crimesAgainstPersons = offenseTypeDistribution.find(
      item => item._id === 'Crimes Against Persons'
    )?.count || 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalAccidents,
          accidentChange: parseFloat(accidentChange),
          crimesAgainstPersons,
          period
        },
        distributions: {
          incidentType: incidentTypeDistribution,
          offenseType: offenseTypeDistribution,
          caseStatus: caseStatusDistribution,
          municipality: municipalityDistribution,
          hourly: hourlyDistribution,
          dayOfWeek: dayOfWeekDistribution
        },
        trends: {
          monthly: monthlyTrends
        },
        mapData: accidentsWithCoordinates
      }
    });
  } catch (error) {
    console.error('Accident analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get accident risk predictions analytics
export const getAccidentRiskAnalytics = async (req, res) => {
  try {
    const { period = '6months' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    let endDate = null;
    
    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'currentMonth':
        // Current month only - from start of current month to end of current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case '3months':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'alltime':
        startDate = null; // No date filter for all time
        break;
      default:
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
    }

    // Build date filter for queries
    let dateFilter = {};
    if (startDate && endDate) {
      // Current month: both start and end dates
      dateFilter = { dateCommited: { $gte: startDate, $lte: endDate } };
    } else if (startDate) {
      // Other periods: only start date
      dateFilter = { dateCommited: { $gte: startDate } };
    }

    // Get all accidents in the period
    const accidents = await AccidentModel.find(dateFilter);

    // Risk predictions based on offenseType (ML model target) and case status
    // "Crimes Against Persons" = High Risk, "Crimes Against Property" = Medium/Low Risk
    const riskPredictions = accidents.map(accident => {
      let riskLevel = 'low';
      let confidence = 0.3;
      
      // Use offenseType (ML model target) as primary indicator
      const offenseType = accident.offenseType?.toLowerCase() || '';
      const caseStatus = accident.caseStatus?.toLowerCase() || '';
      
      // "Crimes Against Persons" = High Risk (requires immediate response)
      if (offenseType.includes('persons') || offenseType.includes('person')) {
        riskLevel = 'high';
        confidence = 0.85;
      } 
      // "Crimes Against Property" = Medium Risk
      else if (offenseType.includes('property')) {
        riskLevel = 'medium';
        confidence = 0.6;
      }
      // Check case status for additional risk indicators
      else if (caseStatus === 'pending' || caseStatus === 'ongoing') {
        riskLevel = 'medium';
        confidence = 0.5;
      } 
      // Default to low risk
      else {
        riskLevel = 'low';
        confidence = 0.4;
      }

      // Normalize municipality name for consistency
      const normalizedMunicipality = (accident.municipality === "Mati City") ? "Mati" : accident.municipality;
      
      return {
        blotterNo: accident.blotterNo,
        riskLevel,
        confidence,
        offenseType: accident.offenseType,
        incidentType: accident.incidentType,
        municipality: normalizedMunicipality,
        caseStatus: accident.caseStatus
      };
    });

    // Group by risk level
    const riskDistribution = riskPredictions.reduce((acc, prediction) => {
      acc[prediction.riskLevel] = (acc[prediction.riskLevel] || 0) + 1;
      return acc;
    }, {});

    // Calculate high-risk percentage
    const highRiskCount = riskDistribution.high || 0;
    const highRiskPercentage = accidents.length > 0 
      ? ((highRiskCount / accidents.length) * 100).toFixed(1)
      : 0;

    // Rule-based detection (simplified)
    const ruleBasedFlagged = accidents.filter(accident => {
      const incidentType = accident.incidentType?.toLowerCase() || '';
      return incidentType.includes('fatal') || incidentType.includes('serious');
    }).length;

    const ruleBasedPercentage = accidents.length > 0 
      ? ((ruleBasedFlagged / accidents.length) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        riskPredictions: {
          total: accidents.length,
          highRisk: highRiskCount,
          highRiskPercentage: parseFloat(highRiskPercentage),
          mediumRisk: riskDistribution.medium || 0,
          lowRisk: riskDistribution.low || 0,
          distribution: riskDistribution
        },
        ruleBasedDetection: {
          flagged: ruleBasedFlagged,
          flaggedPercentage: parseFloat(ruleBasedPercentage),
          safe: accidents.length - ruleBasedFlagged,
          safePercentage: parseFloat((100 - ruleBasedPercentage).toFixed(1))
        },
        predictions: riskPredictions
      }
    });
  } catch (error) {
    console.error('Risk analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
