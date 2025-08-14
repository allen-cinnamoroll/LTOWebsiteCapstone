import ViolationModel from "../model/ViolationModel.js";
import DriverModel from "../model/DriverModel.js";
import VehicleModel from "../model/VehicleModel.js";

// Create a new violation (Only Admin or Superadmin)
export const createViolation = async (req, res) => {
    try {
        const { driverStatus, driverId, vehicleStatus, vehicleId } = req.body;

        // Validate driverId if driverStatus is 1
        if (driverStatus === 1) {
            const driverExists = await DriverModel.findById(driverId);
            if (!driverExists) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Invalid driver ID: Driver not found" 
                });
            }
        }

        // Validate vehicleId if vehicleStatus is 1
        if (vehicleStatus === 1) {
            const vehicleExists = await VehicleModel.findById(vehicleId);
            if (!vehicleExists) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Invalid vehicle ID: Vehicle not found" 
                });
            }
        }

        const violation = new ViolationModel(req.body);
        await violation.save();
        
        res.status(201).json({
            success: true,
            message: "Violation created successfully",
            data: violation
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get all violations (Authenticated Users)
export const getViolations = async (req, res) => {
    try {
        const violations = await ViolationModel.find()
            .populate("driverId", "firstName lastName licenseNo") 
            .populate("vehicleId", "plateNo make model");

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
            .populate("driverId", "firstName lastName licenseNo") 
            .populate("vehicleId", "plateNo make model");

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
        const { driverStatus, driverId, vehicleStatus, vehicleId } = req.body;

        // Validate driverId if driverStatus is 1
        if (driverStatus === 1) {
            const driverExists = await DriverModel.findById(driverId);
            if (!driverExists) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Invalid driver ID: Driver not found" 
                });
            }
        }

        // Validate vehicleId if vehicleStatus is 1
        if (vehicleStatus === 1) {
            const vehicleExists = await VehicleModel.findById(vehicleId);
            if (!vehicleExists) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Invalid vehicle ID: Vehicle not found" 
                });
            }
        }

        const violation = await ViolationModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        
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
