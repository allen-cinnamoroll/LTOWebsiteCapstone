import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters long",
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
  birthDate: z.date().optional().refine((date) => {
    if (!date) return true; // Optional field, so undefined/null is valid
    const today = new Date();
    const minBirthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    return date <= minBirthDate;
  }, {
    message: "Owner must be at least 18 years old",
  }),
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
  engineNo: z.string().optional(),
  chassisNo: z.string().optional(),
  make: z.string().min(1, {
    message: "Make is required",
  }),
  bodyType: z.string().min(1, {
    message: "Body type is required",
  }),
  color: z.string().optional(),
  classification: z.string().min(1, {
    message: "Classification is required",
  }),
  dateOfRenewal: z.date({
    required_error: "Date of renewal is required",
  }),
  vehicleStatusType: z.enum(["New", "Old"], {
    required_error: "Vehicle status type is required",
  }),
  // Owner/driver must be selected; provide user-friendly error even when value is null
  driver: z
    .string({
      required_error: "Please select an owner",
      invalid_type_error: "Please select an owner",
    })
    .min(1, {
      message: "Please select an owner",
    }),
});

export const EditVehicleSchema = z.object({
  plateNo: z.string().min(1, {
    message: "Plate number is required",
  }),
  fileNo: z.string().min(1, {
    message: "File number is required",
  }),
  engineNo: z.string().optional(),
  chassisNo: z.string().optional(),
  make: z.string().min(1, {
    message: "Make is required",
  }),
  bodyType: z.string().min(1, {
    message: "Body type is required",
  }),
  color: z.string().optional(),
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
  blotterNo: z.string().min(1, { message: "Blotter No. is required" }),
  vehiclePlateNo: z.string().optional(),
  vehicleMCPlateNo: z.string().optional(),
  vehicleChassisNo: z.string().optional(),
  suspect: z.string()
    .min(1, { message: "Suspect is required" })
    .refine((value) => !/[0-9]/.test(value), {
      message: "Suspect name cannot contain numbers",
    }),
  stageOfFelony: z.string().min(1, { message: "Stage of Felony is required" }),
  offense: z.string().min(1, { message: "Offense is required" }),
  offenseType: z.string().min(1, { message: "Offense Type is required" }),
  narrative: z.string().min(1, { message: "Narrative is required" }),
  caseStatus: z.string().min(1, { message: "Case Status is required" }),
  region: z.string().min(1, { message: "Region is required" }),
  province: z.string().min(1, { message: "Province is required" }),
  municipality: z.string().min(1, { message: "Municipality is required" }),
  barangay: z.string().min(1, { message: "Barangay is required" }),
  street: z.string().optional(),
  lat: z.number({ required_error: "Latitude is required" }),
  lng: z.number({ required_error: "Longitude is required" }),
  dateEncoded: z.date({ required_error: "Date encoded is required" }).refine((date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today
    return date <= today;
  }, { message: "Date encoded cannot be in the future" }),
  dateReported: z.date({ required_error: "Date reported is required" }).refine((date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today
    return date <= today;
  }, { message: "Date reported cannot be in the future" }),
  timeReported: z.string().min(1, { message: "Time reported is required" }),
  dateCommited: z.date({ required_error: "Date committed is required" }).refine((date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today
    return date <= today;
  }, { message: "Date committed cannot be in the future" }),
  timeCommited: z.string().min(1, { message: "Time committed is required" }),
  incidentType: z.string().min(1, { message: "Incident Type is required" }),
});

export const ViolationCreateSchema = z.object({
  topNo: z.string({
    required_error: "TOP number is required",
  })
  .min(1, { message: "TOP number is required" })
  .refine((value) => /^\d+$/.test(value), {
    message: "TOP number must contain numbers only",
  }),
  firstName: z.string().optional().nullable(),
  middleInitial: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  suffix: z.string().optional().nullable().refine((value) => {
    // Allow empty, undefined, or null
    if (value === undefined || value === null || value.toString().trim() === "") {
      return true;
    }
    const normalized = value.toString().trim().toUpperCase();
    const allowedSuffixes = ["JR.", "SR.", "II", "III", "IV", "V"];
    return allowedSuffixes.includes(normalized);
  }, {
    message: "Suffix must be a valid generational suffix or left blank if none.",
  }),
  violations: z.array(z.string())
    .optional()
    .nullable()
    .refine((violations) => {
      // If violations is null, undefined, or empty array, it's valid (optional)
      if (!violations || violations.length === 0) {
        return true;
      }
      
      // Import COMMON_VIOLATIONS list (same as in FormComponent)
      const COMMON_VIOLATIONS = [
        "1A - NO DRIVER'S LICENSE/CONDUCTOR PERMIT",
        "1B - DRIVING DURING CRIME",
        "1C - CRIME DURING APPREHENSION",
        "1D - DRIVING UNDER THE INFLUENCE OF ALCOHOL/DRUGS",
        "1E - RECKLESS DRIVING",
        "1F - FAKE DOCUMENTS",
        "1G1 - NO SEATBELT (DRIVER/FRONT SEAT PASSENGER)",
        "1G2 - NO SEATBELT (PASSENGER/S)",
        "1H - NO HELMET",
        "R.A 10054 - WEARING SUBSTANDARD HELMET/NO ICC",
        "1I - FAILURE TO CARRY DRIVER'S LICENSE OR OR/CR",
        "1J1 - ILLEGAL PARKING",
        "1J2 - DISREGARDING TRAFFIC SIGNS",
        "1J3 - PASSENGERS ON ROOF/HOOD",
        "1J4 - NO CANVASS COVER OF CARGOS",
        "1J5 - PASSENGER ON RUNNING BOARD/STEPBOARD/MUDGUARD",
        "1J6 - HEADLIGHTS ARE NOT DIMMED",
        "1J7 - DRIVING PROHIBITED AREA",
        "1J8 - HITCHING PASSENGERS",
        "1J9 - DRIVING AGAINST TRAFFIC",
        "1J10 - ILLEGAL LEFT TURN AT INTERSECTION",
        "1J11 - ILLEGAL OVERTAKING",
        "1J12 - OVERTAKING AT UNSAFE DISTANCE",
        "1J13 - CUTTING AN OVERTAKEN VEHICLE",
        "1J14 - FAILURE TO GIVE WAY TO AN OVERTAKING VEHICLE",
        "1J15 - SPEEDING WHEN OVERTAKEN",
        "1J16 - OVERTAKING WITHOUT CLEAR VIEW",
        "1J17 - OVERTAKING UPON CREST OF A GRADE",
        "1J18 - OVERTAKEN UPON A CURVE",
        "1J19 - OVERTAKING AT ANY RAILWAY GRADE CROSSING",
        "1J20 - OVERTAKING AT AN INTERSECTION",
        "1J21 - OVERTAKING ON MEN WORKING OR CAUTION SIGNS",
        "1J22 - OVERTAKING AT NO OVERTAKING ZONE",
        "1J23 - FAILURE TO YIELD TO VEHICLE ON RIGHT",
        "1J24 - FAILURE TO YIELD IN INTERSECTION",
        "1J25 - FAILURE TO YIELD TO PEDESTRIAN",
        "1J26 - FAILURE TO STOP AT HIGHWAY/RAILROAD",
        "1J27 - FAILURE TO YIELD ENTERING HIGHWAY",
        "1J28 - FAILURE TO YIELD TO EMERGENCY VEHICLE",
        "1J29 - FAILURE TO YIELD AT STOP/THRU",
        "1J30 - IMPROPER SIGNALING",
        "1J31 - ILLEGAL TURN, NOT KEEPING TO RIGHT-HAND LANE",
        "1J32 - ILLEGAL TURN, IMPROPER LANE USE",
        "1J33 - LEAVING VEHICLE WITHOUT BRAKE",
        "1J34 - UNSAFE TOWING",
        "1J35 - OBSTRUCTION",
        "1J36 - EXCESS PASSENGERS/CARGO",
        "1J37 - REFUSAL TO ACCEPT PASSENGER",
        "1J38 - OVERCHARGING/UNDERCHARGING OF FARE",
        "1J39 - NO FRANCHISE/CPC",
        "1J40 - FRAUDULENT DOCS/STICKERS/CPC/OR/CR/PLATES",
        "1J41 - OPERATING WITH DEFECTIVE PARTS",
        "1J42 - FAILURE TO PROVIDE FARE DISCOUNT",
        "1J43 - FAULTY TAXIMETER",
        "1J44 - TAMPERED SEALING WIRE",
        "1J45 - NO SIGNBOARD",
        "1J46 - ILLEGAL PICK/DROP",
        "1J47 - ILLEGAL CARGOES",
        "1J48 - MISSING FIRE EXTINGUISHER/SIGNS",
        "1J49 - TRIP CUTTING",
        "1J50 - FAILURE TO DISPLAY FARE MATRIX",
        "1J51 - BREACH OF FRANCHISE",
        "RA 10913 - VIOLATING ANTI-DISTRACTED DRIVING ACT",
        "RA 10666 - VIOLATING CHILDREN'S SAFETY ON MOTORCYCLES ACT",
        "RA 78749 - SMOKE BELCHING",
        "2A - UNREGISTERED MV",
        "2B - UNAUTHORIZED MV MODIFICATION",
        "2C - RIGHT-HAND DRIVE MV",
        "2D - OPERATING WITH DEFECTIVE PARTS",
        "2E - IMPROPER PLATES/STICKER",
        "2F - SMOKE BELCHING",
        "2G - FRAUD IN REGISTRATION/RENEWAL",
        "2H - ALL OTHER MV VIOLATIONS",
        "3A - OVERWIDTH LOAD",
        "3B - AXLE OVERLOADING",
        "3C - BUS/TRUCK OVERLOADED WITH CARGO",
        "4-8 - UNAUTHORIZED/NO-LICENSE DRIVER",
        "4-7 - RECKLESS/INSOLENT/ARROGANT DRIVER",
        "4-2 - REFUSAL TO ACCEPT PASSENGER",
        "4-3 - OVERCHARGING/UNDERCHARGING OF FARE",
        "4-5 - NO FRANCHISE/CPC",
        "4-6 - FRAUDULENT DOCS,STICKERS,CPC,OR/CR,PLATES",
        "4-9 - OPERATING WITH DEFECTIVE PARTS",
        "4-10 - FAILURE TO PROVIDE FARE DISCOUNT",
        "4-13 - FAULTY TAXIMETER",
        "4-14 - TAMPERED SEALING WIRE",
        "4-18 - NO SIGNBOARD",
        "4-19 - ILLEGAL PICK/DROP",
        "4-20 - ILLEGAL CARGOES",
        "4-21 - MISSING FIRE EXTINGUISHER/SIGNS",
        "4-22 - TRIP CUTTING",
        "4-23 - FAILURE TO DISPLAY FARE MATRIX",
        "4-25 - BREACH OF FRANCHISE",
        "4-1 - COLORUM OPERATION",
        "4-4 - MISSING BODY MARKINGS",
        "4-11 - WRONG OPERATOR INFO",
        "4-12 - MISSING/ALLOWING SMOKING",
        "4-15 - UNAUTHORIZED COLOR/DESIGN",
        "4-16 - UNREGISTERED TRADE NAME",
        "4-17 - NO PANEL ROUTE",
        "N5-1 - MOTORCYCLE DRIVER WEARING FLIPFLOPS/SANDALS/SLIPPERS",
        "4-24 - MISSING PWD/ACCESS SYMBOLS",
        "N1 - NOT WEARING HELMET"
      ];
      
      // Check each violation: it must be either empty string or in COMMON_VIOLATIONS
      return violations.every((violation) => {
        // Allow empty strings
        if (!violation || violation.trim() === "") {
          return true;
        }
        // Check if violation is in the allowed list
        return COMMON_VIOLATIONS.includes(violation.trim());
      });
    }, {
      message: "Each violation must be either empty or a valid option from the dropdown. Invalid violations are not accepted.",
    }),
  violationType: z.enum(["confiscated", "alarm", "impounded"], { required_error: "Violation type is required" }),
  licenseType: z.string().optional().nullable(),
  plateNo: z.string().optional().nullable(),
  dateOfApprehension: z.date({ required_error: "Date of apprehension is required" }),
  apprehendingOfficer: z.string().min(1, { message: "Apprehending officer is required" }),
  chassisNo: z.string().optional().nullable(),
  engineNo: z.string().optional().nullable(),
  fileNo: z.string().optional().nullable(),
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
