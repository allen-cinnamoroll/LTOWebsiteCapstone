import { body, validationResult } from "express-validator";
//user registration validation rules
export const registrationValidationRules = () => [
  body("firstName")
    .notEmpty().withMessage("First name is required")
    .trim()
    .isLength({ min: 2 }).withMessage("First name must be at least 2 characters long"),
  body("middleName")
    .optional()
    .trim(),
  body("lastName")
    .notEmpty().withMessage("Last name is required")
    .trim()
    .isLength({ min: 2 }).withMessage("Last name must be at least 2 characters long"),
  body("email")
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email format"),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
];

//driver registration validation rules
export const driverValidationRules = () => [
  body("plateNo").notEmpty().withMessage("plateNo is required"),
  body("ownerRepresentativeName").notEmpty().withMessage("ownerRepresentativeName is required"),
  body("address").notEmpty().withMessage("address is required"),
  body("address.purok").optional(),
  body("address.barangay").notEmpty().withMessage("barangay is required"),
  body("address.municipality").notEmpty().withMessage("municipality is required"),
  body("address.province").notEmpty().withMessage("province is required"),
  body("contactNumber").optional(),
  body("emailAddress").optional().custom((value) => {
    if (value && value.trim() !== '') {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(value)) {
        throw new Error("Invalid email format");
      }
    }
    return true;
  }),
  body("hasDriversLicense").isBoolean().withMessage("hasDriversLicense must be a boolean"),
  body("driversLicenseNumber").optional().custom((value, { req }) => {
    if (req.body.hasDriversLicense === true && !value) {
      throw new Error("driversLicenseNumber is required when hasDriversLicense is true");
    }
    return true;
  }),
  body("birthDate").optional(),
];

//vehicle registration

export const vehicleRegistrationRules = () =>[
  body("plateNo").notEmpty().withMessage("plateNo is required"),
  body("fileNo").notEmpty().withMessage("fileNo is required"),
  body("engineNo").notEmpty().withMessage("engineNo is required"),
  body("chassisNo").notEmpty().withMessage("chassisNo is required"),
  body("make").notEmpty().withMessage("make is required"),
  body("bodyType").notEmpty().withMessage("bodyType is required"),
  body("color").notEmpty().withMessage("color is required"),
  body("classification").notEmpty().withMessage("classification is required"),
  body("dateOfRenewal").optional().custom((value) => {
    if (value && value !== '') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error("dateOfRenewal must be a valid date");
      }
    }
    return true;
  }),
]

// driver violation
export const validateViolation = [
  body("topNo").optional(),
  body("violationType").isIn(["confiscated", "alarm", "impounded"]).withMessage("Violation type must be confiscated, alarm, or impounded"),
  
  // Conditional validation for firstName (required for confiscated and impounded)
  body("firstName").custom((value, { req }) => {
    const violationType = req.body.violationType;
    if ((violationType === 'confiscated' || violationType === 'impounded') && (!value || value.trim() === '')) {
      throw new Error("First name is required for confiscated and impounded types");
    }
    return true;
  }),
  
  body("middleInitial").optional(),
  
  // Conditional validation for lastName (required for confiscated and impounded)
  body("lastName").custom((value, { req }) => {
    const violationType = req.body.violationType;
    if ((violationType === 'confiscated' || violationType === 'impounded') && (!value || value.trim() === '')) {
      throw new Error("Last name is required for confiscated and impounded types");
    }
    return true;
  }),
  
  body("suffix").optional(),
  
  // Conditional validation for violations (required for confiscated and impounded)
  body("violations").custom((value, { req }) => {
    const violationType = req.body.violationType;
    if ((violationType === 'confiscated' || violationType === 'impounded')) {
      if (!Array.isArray(value) || value.length === 0 || value.every(v => !v || v.trim() === '')) {
        throw new Error("At least one violation is required for confiscated and impounded types");
      }
    }
    return true;
  }),
  
  // Conditional validation for licenseType (required for confiscated only)
  body("licenseType").custom((value, { req }) => {
    const violationType = req.body.violationType;
    if (violationType === 'confiscated') {
      if (!value || !["SP", "DL", "CL"].includes(value)) {
        throw new Error("License type is required and must be SP, DL, or CL for confiscated type");
      }
    } else if (violationType === 'alarm') {
      // For alarm type, licenseType should be null or valid enum
      if (value && !["SP", "DL", "CL"].includes(value)) {
        throw new Error("License type must be SP, DL, CL, or null for alarm type");
      }
    }
    return true;
  }),
  
  body("plateNo").notEmpty().withMessage("Plate number is required"),
  body("dateOfApprehension").isISO8601().withMessage("Date of apprehension is required and must be valid"),
  body("apprehendingOfficer").notEmpty().withMessage("Apprehending officer is required"),
  body("remarks").optional().isString().withMessage("Remarks must be a string"),
];

//admin registration validation rules
export const adminRegistrationValidationRules = () => [
  body("password").notEmpty().withMessage("password is required"),
  body("email").notEmpty().withMessage("email is required")
]

// Accident validation
export const validateAccident = [
  body("accident_id").optional(),
  body("plateNo").notEmpty().withMessage("Plate number is required"),
  body("accident_date").isISO8601().withMessage("Accident date is required and must be valid"),
  body("street").notEmpty().withMessage("Street is required"),
  body("barangay").notEmpty().withMessage("Barangay is required"),
  body("municipality").notEmpty().withMessage("Municipality is required"),
  body("vehicle_type").isIn(['motorcycle', 'car', 'truck', 'bus', 'van', 'jeepney', 'tricycle', 'other']).withMessage("Vehicle type must be one of: motorcycle, car, truck, bus, van, jeepney, tricycle, other"),
  body("severity").isIn(['minor', 'moderate', 'severe', 'fatal']).withMessage("Severity must be one of: minor, moderate, severe, fatal"),
  body("notes").optional().isString().withMessage("Notes must be a string"),
];

// Middleware to handle validation errors
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("=== VALIDATION ERRORS ===");
    console.log("Validation errors:", errors.array());
    console.log("Request body:", req.body);
    return res.status(400).json({
      success: false,
      message: errors.array().map((error) => error.msg),
    });
  }
  next();
};
