import ViolationModel from "../model/ViolationModel.js";
import { logUserActivity, getClientIP, getUserAgent } from "../util/userLogger.js";

// Create a new violation (Only Admin or Superadmin)
export const createViolation = async (req, res) => {
    try {
        const { topNo, firstName, middleInitial, lastName, suffix, violations, violationType, licenseType, plateNo, dateOfApprehension, apprehendingOfficer, chassisNo, engineNo } = req.body;

        // Generate TOP NO. if not provided or empty
        let finalTopNo = topNo;
        if (!finalTopNo || finalTopNo.trim() === "") {
            const timestamp = Date.now();
            finalTopNo = `TOP-${timestamp}`;
        }

        // Create violation with new structure - all fields available for all types
        const violationData = {
            topNo: finalTopNo,
            firstName: firstName,
            middleInitial: middleInitial,
            lastName: lastName,
            suffix: suffix,
            violations: Array.isArray(violations) ? violations : [violations], // Ensure it's an array
            violationType: violationType || "confiscated", // Use string enum values
            licenseType: licenseType,
            plateNo,
            dateOfApprehension,
            apprehendingOfficer,
            chassisNo,
            engineNo
        };
        const violation = new ViolationModel(violationData);
        const savedViolation = await violation.save();

        // Log the activity
        if (req.user) {
            await logUserActivity({
                userId: req.user._id,
                userName: `${req.user.firstName} ${req.user.lastName}`,
                email: req.user.email,
                role: req.user.role,
                logType: 'add_violation',
                ipAddress: getClientIP(req),
                userAgent: getUserAgent(req),
                status: 'success',
                details: `Added violation: ${finalTopNo} (Driver: ${firstName} ${lastName}, Vehicle: ${plateNo})`,
                actorId: req.user._id,
                actorName: `${req.user.firstName} ${req.user.lastName}`,
                actorEmail: req.user.email,
                actorRole: req.user.role
            });
        }
        
        res.status(201).json({
            success: true,
            message: "Violation created successfully",
            data: savedViolation
        });
    } catch (error) {
        console.log("=== BACKEND ERROR ===");
        console.error("Error creating violation:", error);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get all violations (Authenticated Users)
export const getViolations = async (req, res) => {
    try {
        const violations = await ViolationModel.find().sort({ createdAt: -1 });

        // Return violations as-is without transformation
        const transformedViolations = violations.map(violation => violation.toObject());

        res.status(200).json({
            success: true,
            data: transformedViolations
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get a single violation by ID (Authenticated Users)
export const getViolationById = async (req, res) => {
    try {
        const violation = await ViolationModel.findById(req.params.id);

        if (!violation) {
            return res.status(404).json({ success: false, message: "Violation not found" });
        }

        // Return violation as-is without transformation
        const violationObj = violation.toObject();

        res.status(200).json({
            success: true,
            data: violationObj
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update a violation by ID (Only Admin or Superadmin)
export const updateViolation = async (req, res) => {
    try {
        const { violations, violationType } = req.body;
        let updateData = { ...req.body };

        // Ensure violations is an array
        if (violations) {
            updateData.violations = Array.isArray(violations) ? violations : [violations];
        }

        // Set violationType field based on violationType - no field clearing
        if (violationType) {
            updateData.violationType = violationType;
        }

        const violation = await ViolationModel.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!violation) {
            return res.status(404).json({ success: false, message: "Violation not found" });
        }

        // Log the activity
        if (req.user) {
            await logUserActivity({
                userId: req.user._id,
                userName: `${req.user.firstName} ${req.user.lastName}`,
                email: req.user.email,
                role: req.user.role,
                logType: 'update_violation',
                ipAddress: getClientIP(req),
                userAgent: getUserAgent(req),
                status: 'success',
                details: `Updated violation: ${violation.topNo} (Driver: ${violation.firstName} ${violation.lastName}, Vehicle: ${violation.plateNo})`,
                actorId: req.user._id,
                actorName: `${req.user.firstName} ${req.user.lastName}`,
                actorEmail: req.user.email,
                actorRole: req.user.role
            });
        }

        res.status(200).json({
            success: true,
            message: "Violation updated successfully",
            data: violation
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get violation count statistics (Authenticated Users)
export const getViolationCount = async (req, res) => {
    try {
        // Get all violations
        const violations = await ViolationModel.find();
        
        // Count total individual violations across all records
        let totalViolations = 0;
        violations.forEach(violation => {
            if (violation.violations && Array.isArray(violation.violations)) {
                totalViolations += violation.violations.length;
            }
        });

        // Count total violation records
        const totalRecords = violations.length;

        // Count violations by type
        const violationsByType = {
            confiscated: 0,
            alarm: 0,
            impounded: 0
        };

        violations.forEach(violation => {
            if (violation.violationType && violationsByType.hasOwnProperty(violation.violationType)) {
                violationsByType[violation.violationType]++;
            }
        });

        res.status(200).json({
            success: true,
            data: {
                totalViolations, // Total count of individual violations
                totalRecords,    // Total count of violation records
                violationsByType // Count by violation type
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get comprehensive violation analytics
export const getViolationAnalytics = async (req, res) => {
    try {
        const { year } = req.query;
        
        // Build filter for year if provided
        let filter = {};
        if (year && year !== 'All') {
            const startDate = new Date(`${year}-01-01`);
            const endDate = new Date(`${year}-12-31`);
            filter.dateOfApprehension = {
                $gte: startDate,
                $lte: endDate
            };
        }

        // Get all violations with filter
        const violations = await ViolationModel.find(filter);
        
        // Count total individual violations across all records
        let totalViolations = 0;
        violations.forEach(violation => {
            if (violation.violations && Array.isArray(violation.violations)) {
                totalViolations += violation.violations.length;
            }
        });

        // Count unique traffic violators (unique plate numbers)
        const uniquePlates = new Set();
        violations.forEach(violation => {
            if (violation.plateNo) {
                uniquePlates.add(violation.plateNo);
            }
        });
        const totalTrafficViolators = uniquePlates.size;

        // Count recent violations (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentViolations = violations.filter(violation => 
            new Date(violation.dateOfApprehension) >= thirtyDaysAgo
        ).length;

        // Get most common violations
        const violationCounts = {};
        violations.forEach(violation => {
            if (violation.violations && Array.isArray(violation.violations)) {
                violation.violations.forEach(violationItem => {
                    const violationText = violationItem.toString().trim();
                    if (violationText) {
                        violationCounts[violationText] = (violationCounts[violationText] || 0) + 1;
                    }
                });
            }
        });

        const mostCommonViolations = Object.entries(violationCounts)
            .map(([violation, count]) => ({ _id: violation, count }))
            .sort((a, b) => b.count - a.count);

        // Get top officers
        const officerCounts = {};
        violations.forEach(violation => {
            if (violation.apprehendingOfficer) {
                const officer = violation.apprehendingOfficer.trim();
                if (officer) {
                    officerCounts[officer] = (officerCounts[officer] || 0) + 1;
                }
            }
        });

        const topOfficers = Object.entries(officerCounts)
            .map(([officer, count]) => ({ officerName: officer, violationCount: count }))
            .sort((a, b) => b.violationCount - a.violationCount)
            .slice(0, 10);

        // Get violations by type
        const violationsByType = {};
        violations.forEach(violation => {
            if (violation.violationType) {
                violationsByType[violation.violationType] = (violationsByType[violation.violationType] || 0) + 1;
            }
        });

        const violationsByTypeArray = Object.entries(violationsByType)
            .map(([type, count]) => ({ _id: type, count }))
            .sort((a, b) => b.count - a.count);

        // Get yearly trends
        const yearlyTrends = {};
        violations.forEach(violation => {
            if (violation.dateOfApprehension) {
                const year = new Date(violation.dateOfApprehension).getFullYear();
                yearlyTrends[year] = (yearlyTrends[year] || 0) + 1;
            }
        });

        const yearlyTrendsArray = Object.entries(yearlyTrends)
            .map(([year, count]) => ({ _id: { year: parseInt(year) }, count }))
            .sort((a, b) => a._id.year - b._id.year);

        // Get violation combinations (simplified)
        const violationCombinations = [];
        violations.forEach(violation => {
            if (violation.violations && Array.isArray(violation.violations) && violation.violations.length > 1) {
                const combination = violation.violations.map(v => v.toString().trim()).filter(v => v);
                if (combination.length > 1) {
                    const combinationKey = combination.sort().join(' + ');
                    const existing = violationCombinations.find(c => c.combination === combinationKey);
                    if (existing) {
                        existing.count++;
                    } else {
                        violationCombinations.push({
                            combination: combinationKey,
                            violations: combination,
                            count: 1
                        });
                    }
                }
            }
        });

        violationCombinations.sort((a, b) => b.count - a.count);

        // Get violation patterns (simplified)
        const violationPatterns = [
            {
                pattern: "Documentation Issues",
                frequency: mostCommonViolations.filter(v => 
                    v._id.toLowerCase().includes('license') || 
                    v._id.toLowerCase().includes('registration')
                ).length,
                description: "Violations related to missing or invalid documentation"
            },
            {
                pattern: "Safety Violations",
                frequency: mostCommonViolations.filter(v => 
                    v._id.toLowerCase().includes('helmet') || 
                    v._id.toLowerCase().includes('safety')
                ).length,
                description: "Violations related to safety equipment and procedures"
            },
            {
                pattern: "Traffic Violations",
                frequency: mostCommonViolations.filter(v => 
                    v._id.toLowerCase().includes('speeding') || 
                    v._id.toLowerCase().includes('traffic')
                ).length,
                description: "Violations related to traffic rules and regulations"
            }
        ];

        res.status(200).json({
            success: true,
            data: {
                totalViolations,
                totalTrafficViolators,
                recentViolations,
                mostCommonViolations: mostCommonViolations.slice(0, 50), // Top 50
                topOfficers,
                violationsByType: violationsByTypeArray,
                yearlyTrends: yearlyTrendsArray,
                violationCombinations: violationCombinations.slice(0, 20), // Top 20 combinations
                violationPatterns
            }
        });
    } catch (error) {
        console.error('Error fetching violation analytics:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete a violation by ID (Only Admin or Superadmin)
export const deleteViolation = async (req, res) => {
    try {
        const violation = await ViolationModel.findById(req.params.id);
        
        if (!violation) {
            return res.status(404).json({ 
                success: false, 
                message: "Violation not found" 
            });
        }

        // Log the activity before deleting
        if (req.user) {
            await logUserActivity({
                userId: req.user._id,
                userName: `${req.user.firstName} ${req.user.lastName}`,
                email: req.user.email,
                role: req.user.role,
                logType: 'delete_violation',
                ipAddress: getClientIP(req),
                userAgent: getUserAgent(req),
                status: 'success',
                details: `Deleted violation: ${violation.topNo} (Driver: ${violation.firstName} ${violation.lastName}, Vehicle: ${violation.plateNo})`,
                actorId: req.user._id,
                actorName: `${req.user.firstName} ${req.user.lastName}`,
                actorEmail: req.user.email,
                actorRole: req.user.role
            });
        }

        await ViolationModel.findByIdAndDelete(req.params.id);
        
        res.status(200).json({
            success: true,
            message: "Violation deleted successfully"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
