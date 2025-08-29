import ViolationModel from "../model/ViolationModel.js";
import DriverModel from "../model/DriverModel.js";
import VehicleModel from "../model/VehicleModel.js";

// Create a new violation (Only Admin or Superadmin)
export const createViolation = async (req, res) => {
    try {
        console.log("Received violation data:", req.body);
        const { driver_id, vehicle_id, violation_id } = req.body;

        // Find driver by licenseNo
        const driver = await DriverModel.findOne({ licenseNo: driver_id });
        if (!driver) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid driver license number: Driver not found" 
            });
        }
        console.log("Found driver:", driver._id);

        // Find vehicle by plateNo
        const vehicle = await VehicleModel.findOne({ plateNo: vehicle_id });
        if (!vehicle) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid vehicle plate number: Vehicle not found" 
            });
        }
        console.log("Found vehicle:", vehicle._id);

        // Generate violation_id if not provided or empty
        let finalViolationId = violation_id;
        if (!finalViolationId || finalViolationId.trim() === "") {
            const timestamp = Date.now();
            finalViolationId = `VIO-${timestamp}`;
        }

        // Create violation with actual ObjectIds
        const violationData = {
            ...req.body,
            violation_id: finalViolationId,
            driver_id: driver._id,
            vehicle_id: vehicle._id
        };
        console.log("Violation data to save:", violationData);

        const violation = new ViolationModel(violationData);
        const savedViolation = await violation.save();
        console.log("Saved violation:", savedViolation);
        
        res.status(201).json({
            success: true,
            message: "Violation created successfully",
            data: savedViolation
        });
    } catch (error) {
        console.error("Error creating violation:", error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get all violations (Authenticated Users)
export const getViolations = async (req, res) => {
    try {
        const violations = await ViolationModel.find()
            .populate("driver_id", "licenseNo firstName lastName middleName")
            .populate("vehicle_id", "plateNo make series");


        res.status(200).json({
            success: true,
            data: violations
        });
    } catch (error) {

        res.status(500).json({ success: false, message: error.message });
    }
};

// Get a single violation by ID (Authenticated Users)
export const getViolationById = async (req, res) => {
    try {
        const violation = await ViolationModel.findById(req.params.id)
            .populate("driver_id", "licenseNo firstName lastName middleName")
            .populate("vehicle_id", "plateNo make series");

        if (!violation) {
            return res.status(404).json({ success: false, message: "Violation not found" });
    }

        res.status(200).json({
            success: true,
            data: violation
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update a violation by ID (Only Admin or Superadmin)
export const updateViolation = async (req, res) => {
    try {
        const { driver_id, vehicle_id } = req.body;
        let updateData = { ...req.body };

        if (driver_id) {
            const driver = await DriverModel.findOne({ licenseNo: driver_id });
            if (!driver) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Invalid driver license number: Driver not found" 
                });
            }
            updateData.driver_id = driver._id;
        }

        if (vehicle_id) {
            const vehicle = await VehicleModel.findOne({ plateNo: vehicle_id });
            if (!vehicle) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Invalid vehicle plate number: Vehicle not found" 
                });
            }
            updateData.vehicle_id = vehicle._id;
        }

        const violation = await ViolationModel.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        )
        .populate("driver_id", "licenseNo firstName lastName middleName")
        .populate("vehicle_id", "plateNo make series");

        if (!violation) {
            return res.status(404).json({ success: false, message: "Violation not found" });
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

// // Delete a violation by ID (Only Admin or Superadmin)
// export const deleteViolation = async (req, res) => {
//     try {
//         const violation = await ViolationModel.findByIdAndDelete(req.params.id);
//         if (!violation) {
//             return res.status(404).json({ success: false, message: "Violation not found" });
//         }

//         res.status(200).json({
//             success: true,
//             message: "Violation deleted successfully"
//         });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// };
