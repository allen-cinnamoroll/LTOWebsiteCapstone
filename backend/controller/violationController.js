import ViolationModel from "../model/ViolationModel.js";
import { logUserActivity, getClientIP, getUserAgent } from "../util/userLogger.js";

// Create a new violation (Only Admin or Superadmin)
export const createViolation = async (req, res) => {
    try {
        console.log("=== BACKEND CREATE VIOLATION ===");
        console.log("Received violation data:", req.body);
        console.log("Violation type:", req.body.violationType);
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
        console.log("Violation data to save:", violationData);
        const violation = new ViolationModel(violationData);
        const savedViolation = await violation.save();
        console.log("Saved violation:", savedViolation);

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
