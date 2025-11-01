import AccidentModel from "../model/AccidentModel.js";
import DriverModel from "../model/DriverModel.js";
import VehicleModel from "../model/VehicleModel.js";
import UserModel from "../model/UserModel.js";
import { logUserActivity, getClientIP, getUserAgent } from "../util/userLogger.js";

export const getAccidents = async (req, res) => {
  try {
    const accidents = await AccidentModel.find()
      .populate('createdBy', 'firstName middleName lastName')
      .populate('updatedBy', 'firstName middleName lastName');

    res.json({ success: true, data: accidents });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAccident = async (req, res) => {
  try {
    const { plateNo, accident_id } = req.body;

    // Generate accident_id if not provided or empty
    let finalAccidentId = accident_id;
    if (!finalAccidentId || finalAccidentId.trim() === "") {
      const timestamp = Date.now();
      finalAccidentId = `ACC-${timestamp}`;
    }

    // Create accident with plateNo directly
    const accidentData = {
      ...req.body,
      accident_id: finalAccidentId,
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
          await logUserActivity({
            userId: user._id,
            userName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
            email: user.email,
            role: user.role,
            logType: 'add_accident',
            ipAddress: getClientIP(req),
            userAgent: getUserAgent(req),
            status: 'success',
            details: `Added accident: ${finalAccidentId} (Plate: ${plateNo})`,
            actorId: user._id,
            actorName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
            actorEmail: user.email,
            actorRole: user.role
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
      .json({ success: true, message: "Accident created", data: accident });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAccidentById = async (req, res) => {
  try {
    const accident = await AccidentModel.findById(req.params.id)
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
            userName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
            email: user.email,
            role: user.role,
            logType: 'update_accident',
            ipAddress: getClientIP(req),
            userAgent: getUserAgent(req),
            status: 'success',
            details: `Updated accident: ${accident.accident_id} (Plate: ${updateData.plateNo || 'unchanged'})`,
            actorId: user._id,
            actorName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
            actorEmail: user.email,
            actorRole: user.role
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

    // Log the activity before deleting
    if (req.user && req.user.userId) {
      try {
        // Fetch user details for logging
        const user = await UserModel.findById(req.user.userId);
        if (user) {
          await logUserActivity({
            userId: user._id,
            userName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
            email: user.email,
            role: user.role,
            logType: 'delete_accident',
            ipAddress: getClientIP(req),
            userAgent: getUserAgent(req),
            status: 'success',
            details: `Deleted accident: ${accident.accident_id}`,
            actorId: user._id,
            actorName: `${user.firstName} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName}`.trim(),
            actorEmail: user.email,
            actorRole: user.role
          });
        }
      } catch (logError) {
        console.error('Failed to log user activity:', logError.message);
        // Don't fail the main operation if logging fails
      }
    } else {
      console.warn('User not authenticated or user.userId is missing for accident deletion');
    }

    await AccidentModel.findByIdAndDelete(req.params.id);
    
    res.json({ 
      success: true, 
      message: "Accident deleted successfully" 
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
    
    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
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

    // Get total accidents
    const totalAccidents = await AccidentModel.countDocuments(
      startDate ? { accident_date: { $gte: startDate } } : {}
    );

    // Get previous period for comparison (skip for alltime)
    let previousTotalAccidents = 0;
    if (startDate) {
      const previousStartDate = new Date(startDate);
      const previousEndDate = new Date(startDate);
      const periodLength = now.getTime() - startDate.getTime();
      previousStartDate.setTime(previousStartDate.getTime() - periodLength);
      
      previousTotalAccidents = await AccidentModel.countDocuments({
        accident_date: { $gte: previousStartDate, $lt: previousEndDate }
      });
    }

    // Calculate percentage change
    const accidentChange = previousTotalAccidents > 0 
      ? ((totalAccidents - previousTotalAccidents) / previousTotalAccidents * 100).toFixed(1)
      : 0;

    // Get fatalities count
    const fatalities = await AccidentModel.countDocuments({
      ...(startDate ? { accident_date: { $gte: startDate } } : {}),
      severity: 'fatal'
    });

    let previousFatalities = 0;
    if (startDate) {
      const previousStartDate = new Date(startDate);
      const previousEndDate = new Date(startDate);
      const periodLength = now.getTime() - startDate.getTime();
      previousStartDate.setTime(previousStartDate.getTime() - periodLength);
      
      previousFatalities = await AccidentModel.countDocuments({
        accident_date: { $gte: previousStartDate, $lt: previousEndDate },
        severity: 'fatal'
      });
    }

    const fatalitiesChange = previousFatalities > 0 
      ? (fatalities - previousFatalities)
      : 0;

    // Get severity distribution
    const severityDistribution = await AccidentModel.aggregate([
      {
        $match: {
          ...(startDate ? { accident_date: { $gte: startDate } } : {})
        }
      },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get vehicle type distribution
    const vehicleTypeDistribution = await AccidentModel.aggregate([
      {
        $match: {
          ...(startDate ? { accident_date: { $gte: startDate } } : {})
        }
      },
      {
        $group: {
          _id: '$vehicle_type',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get monthly trends
    const monthlyTrends = await AccidentModel.aggregate([
      {
        $match: {
          ...(startDate ? { accident_date: { $gte: startDate } } : {})
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$accident_date' },
            month: { $month: '$accident_date' }
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
        $match: {
          ...(startDate ? { accident_date: { $gte: startDate } } : {})
        }
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
        $match: startDate ? { accident_date: { $gte: startDate } } : {}
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
          accident_id: 1,
          plateNo: 1,
          severity: 1,
          municipality: "$normalized_municipality",
          barangay: 1,
          street: 1,
          accident_date: 1,
          vehicle_type: 1,
          notes: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalAccidents,
          accidentChange: parseFloat(accidentChange),
          fatalities,
          fatalitiesChange,
          period
        },
        distributions: {
          severity: severityDistribution,
          vehicleType: vehicleTypeDistribution,
          municipality: municipalityDistribution
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
    
    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
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

    // Get all accidents in the period
    const accidents = await AccidentModel.find(
      startDate ? { accident_date: { $gte: startDate } } : {}
    );

    // For now, we'll simulate risk predictions based on severity
    // In a real implementation, you would call the ML prediction service
    const riskPredictions = accidents.map(accident => {
      let riskLevel = 'low';
      let confidence = 0.3;
      
      switch (accident.severity) {
        case 'fatal':
          riskLevel = 'high';
          confidence = 0.9;
          break;
        case 'severe':
          riskLevel = 'high';
          confidence = 0.8;
          break;
        case 'moderate':
          riskLevel = 'medium';
          confidence = 0.6;
          break;
        case 'minor':
          riskLevel = 'low';
          confidence = 0.4;
          break;
      }

      // Normalize municipality name for consistency
      const normalizedMunicipality = (accident.municipality === "Mati City") ? "Mati" : accident.municipality;
      
      return {
        accident_id: accident.accident_id,
        riskLevel,
        confidence,
        severity: accident.severity,
        municipality: normalizedMunicipality,
        vehicle_type: accident.vehicle_type
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
    const ruleBasedFlagged = accidents.filter(accident => 
      accident.severity === 'fatal' || accident.severity === 'severe'
    ).length;

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
