import { body, validationResult } from "express-validator";
//dirver registration validation rules
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
  body("driverStatus").isIn([0, 1]).withMessage("Invalid driver status"),
  body("vehicleStatus").isIn([0, 1]).withMessage("Invalid vehicle status"),
  body("violationName").notEmpty().withMessage("Violation name is required"),
  body("violationDescription").notEmpty().withMessage("Violation description is required"),
  body("penalty").isNumeric().withMessage("Penalty must be a number"),
  body("place").notEmpty().withMessage("Place is required"),
  body("datetime").isISO8601().withMessage("Invalid date format"),
  body("expirationDate").isISO8601().withMessage("Invalid expiration date format"),
];

//admin registration validation rules
export const registrationValidationRules = () => [
  body("username").notEmpty().withMessage("username is required"),
  body("password").notEmpty().withMessage("password is required"),
  body("email").notEmpty().withMessage("email is required")
]

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
