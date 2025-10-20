import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters long",
  }),
});

export const CreateDriverSchema = z.object({
  plateNo: z
    .union([
      z.string().min(1, {
        message: "Plate number is required",
      }),
      z.array(z.string().min(1, {
        message: "Each plate number must not be empty",
      })).min(1, {
        message: "At least one plate number is required",
      })
    ])
    .transform((val) => {
      // Convert string to array if needed
      if (typeof val === 'string') {
        return val.split(',').map(plate => plate.trim()).filter(plate => plate.length > 0);
      }
      return val;
    }),
  fileNo: z.string().optional(),
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
  plateNo: z.string().min(1, {
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
  dateOfRenewal: z.date({
    required_error: "Date of renewal is required",
  }),
  vehicleStatusType: z.enum(["New", "Old"], {
    required_error: "Vehicle status type is required",
  }),
  driver: z.string().min(1, {
    message: "Driver selection is required",
  }),
});

export const EditVehicleSchema = z.object({
  plateNo: z.string().min(1, {
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
  dateOfRenewal: z.date({
    required_error: "Date of renewal is required",
  }),
  vehicleStatusType: z.enum(["New", "Old"], {
    required_error: "Vehicle status type is required",
  }),
  driver: z.string().optional().or(z.null()), // Make driver optional for edit mode and allow null
});

export const AccidentSchema = z.object({
  accident_id: z.string().optional(),
  plateNo: z.string().min(1, { message: "Plate number is required" }),
  accident_date: z.date({ required_error: "Accident date is required" }),
  street: z.string().min(1, { message: "Street is required" }),
  barangay: z.string().min(1, { message: "Barangay is required" }),
  municipality: z.string().min(1, { message: "Municipality is required" }),
  vehicle_type: z.string().min(1, { message: "Vehicle type is required" }),
  severity: z.string().min(1, { message: "Severity is required" }),
  notes: z.string().optional(),
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
  chassisNo: z.string().optional().nullable(),
  engineNo: z.string().optional().nullable(),
}).refine((data) => {
  // Validate middleInitial length only if it has a value, is not null, and is not "null" string
  if (data.middleInitial && data.middleInitial !== null && data.middleInitial !== "null" && data.middleInitial.trim() !== '') {
    if (data.middleInitial.length > 1) {
      return false;
    }
  }
  return true;
}, {
  message: "Middle initial must be 1 character",
  path: ["middleInitial"]
}).refine((data) => {
  // Validate licenseType enum only if it has a value, is not null, and is not "null" string
  if (data.licenseType && data.licenseType !== null && data.licenseType !== "null" && data.licenseType.trim() !== '') {
    if (!["SP", "DL", "CL", "PLATE", "SP RECEIPT", "DL RECEIPT", "REFUSE TO SUR.", "DL TEMPORARY", "-", "null"].includes(data.licenseType)) {
      return false;
    }
  }
  return true;
}, {
  message: "License type must be a valid option",
  path: ["licenseType"]
});
