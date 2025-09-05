import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters long",
  }),
});

export const CreateDriverSchema = z.object({
  plateNo: z.string().min(1, {
    message: "Plate number is required",
  }),
  ownerRepresentativeName: z.string().min(1, {
    message: "Owner/Representative name is required",
  }),
  purok: z.string().optional(),
  barangay: z.string().min(1, {
    message: "Barangay is required",
  }),
  municipality: z.string().min(1, {
    message: "Municipality is required",
  }),
  province: z.string().min(1, {
    message: "Province is required",
  }),
  region: z.string().min(1, {
    message: "Region is required",
  }),
  contactNumber: z.string().optional(),
  emailAddress: z.string().email({
    message: "Invalid email format",
  }).optional().or(z.literal("")),
  hasDriversLicense: z.boolean({
    required_error: "Please specify if you have a driver's license",
  }),
  driversLicenseNumber: z.string().optional(),
  birthDate: z.date().optional(),
}).refine((data) => {
  if (data.hasDriversLicense && !data.driversLicenseNumber) {
    return false;
  }
  return true;
}, {
  message: "Driver's license number is required when you have a driver's license",
  path: ["driversLicenseNumber"],
});

export const VehicleSchema = z.object({
  plateNo: z
    .string()
    .min(1, {
      message: "Plate number is required",
    }),
  fileNo: z.string().min(1, {
    message: "File number is required",
  }),
  engineNo: z.string().min(1, {
    message: "Engine number is required",
  }),
  chassisNo: z.string().min(1, {
    message: "Chassis number is required",
  }),
  make: z.string().min(1, {
    message: "Make is required",
  }),
  bodyType: z.string().min(1, {
    message: "Body type is required",
  }),
  color: z.string().min(1, {
    message: "Color is required",
  }),
  classification: z.string().min(1, {
    message: "Classification is required",
  }),
  dateOfRenewal: z.date().optional(),
});

export const AccidentSchema = z.object({
  accident_id: z.string().optional(),
  driver_id: z.string().min(1, { message: "Driver's license number is required" }),
  vehicle_id: z.string().min(1, { message: "Vehicle plate number is required" }),
  accident_date: z.date({ required_error: "Accident date is required" }),
  street: z.string().min(1, { message: "Street is required" }),
  barangay: z.string().min(1, { message: "Barangay is required" }),
  municipality: z.string().min(1, { message: "Municipality is required" }),
});

export const ViolationCreateSchema = z.object({
  topNo: z.string().optional(),
  firstName: z.string().optional().nullable(),
  middleInitial: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  suffix: z.string().optional().nullable(),
  violations: z.array(z.string()).optional().nullable(),
  violationType: z.enum(["confiscated", "alarm", "impounded"], { required_error: "Violation type is required" }),
  licenseType: z.string().optional().nullable(),
  plateNo: z.string().min(1, { message: "Plate number is required" }),
  dateOfApprehension: z.date({ required_error: "Date of apprehension is required" }),
  apprehendingOfficer: z.string().min(1, { message: "Apprehending officer is required" }),
}).refine((data) => {
  // For confiscated and impounded types, firstName and lastName are required
  if ((data.violationType === 'confiscated' || data.violationType === 'impounded')) {
    if (!data.firstName || data.firstName === null || data.firstName.trim() === '') {
      return false;
    }
    if (!data.lastName || data.lastName === null || data.lastName.trim() === '') {
      return false;
    }
    if (!data.violations || data.violations === null || data.violations.length === 0 || data.violations.every(v => !v || v.trim() === '')) {
      return false;
    }
  }
  return true;
}, {
  message: "First name, last name, and violations are required for confiscated and impounded types",
  path: ["firstName"]
}).refine((data) => {
  // For confiscated type only, licenseType is required
  if (data.violationType === 'confiscated') {
    if (!data.licenseType || data.licenseType === null) {
      return false;
    }
  }
  return true;
}, {
  message: "License type is required for confiscated type",
  path: ["licenseType"]
}).refine((data) => {
  // Validate middleInitial length only if it has a value and is not null
  if (data.middleInitial && data.middleInitial !== null && data.middleInitial.trim() !== '') {
    if (data.middleInitial.length > 1) {
      return false;
    }
  }
  return true;
}, {
  message: "Middle initial must be 1 character",
  path: ["middleInitial"]
}).refine((data) => {
  // Validate licenseType enum only if it has a value and is not null
  if (data.licenseType && data.licenseType !== null && data.licenseType.trim() !== '') {
    if (!["SP", "DL", "CL", "plate", "sp receipt", "dl receipt", "refuse to sur.", "dl tempor"].includes(data.licenseType)) {
      return false;
    }
  }
  return true;
}, {
  message: "License type must be SP, DL, CL, plate, sp receipt, dl receipt, refuse to sur., or dl tempor",
  path: ["licenseType"]
});
