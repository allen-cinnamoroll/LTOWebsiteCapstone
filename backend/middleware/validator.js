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
  body("licenseNo").notEmpty().withMessage("licenseNo is required"),
  body("firstName").notEmpty().withMessage("firstname is required"),
  body("lastName").notEmpty().withMessage("lastname is required"),
  body("address").notEmpty().withMessage("address is required"),
  // body("zipCode").notEmpty().withMessage("zipCode is required"),
  body("nationality").notEmpty().withMessage("nationality is required"),
  body("sex").notEmpty().withMessage("sex is required"),
  body("birthDate").notEmpty().withMessage("birthDate is required"),
  body("civilStatus").notEmpty().withMessage("civilStatus is required"),
  body("birthPlace").notEmpty().withMessage("birthPlace is required"),
  body("issueDate").notEmpty().withMessage("issueDate is required"),
  body("expiryDate").notEmpty().withMessage("expiryDate is required"),
];

//vehicle registration

export const vehicleRegistrationRules = () =>[
  body("plateNo").notEmpty().withMessage("plateNo is required"),
  body("owner").notEmpty().withMessage("owner is required"),
  body("vehicleType").notEmpty().withMessage("vehicleType is required"),
  body("classification").notEmpty().withMessage("classification is required"),
  body("make").notEmpty().withMessage("make is required"),
  body("fuelType").notEmpty().withMessage("fuelType is required"),
  body("motorNumber").notEmpty().withMessage("motorNumber is required"),
  body("serialChassisNumber").notEmpty().withMessage("serialChassisNumber is required"),
  body("series").notEmpty().withMessage("series is required"),
  body("bodyType").notEmpty().withMessage("bodyType is required"),
  body("color").notEmpty().withMessage("color is required"),
  body("yearModel").notEmpty().withMessage("yearModel is required"),
  body("dateRegistered").notEmpty().withMessage("dateRegistered is required"),
]

// driver violation
export const validateViolation = [
  body("violation_id").optional(),
  body("driver_id").notEmpty().withMessage("Driver ID is required"),
  body("vehicle_id").notEmpty().withMessage("Vehicle ID is required"),
  body("violation_type").notEmpty().withMessage("Violation type is required"),
  body("violation_date").isISO8601().withMessage("Violation date is required and must be valid"),
  body("penalty").isNumeric().withMessage("Penalty must be a number"),
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
  body("driver_id").notEmpty().withMessage("Driver ID is required"),
  body("vehicle_id").notEmpty().withMessage("Vehicle ID is required"),
  body("accident_date").isISO8601().withMessage("Accident date is required and must be valid"),
  body("street").notEmpty().withMessage("Street is required"),
  body("barangay").notEmpty().withMessage("Barangay is required"),
  body("municipality").notEmpty().withMessage("Municipality is required"),
];

// Middleware to handle validation errors
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map((error) => error.msg),
    });
  }
  next();
};
