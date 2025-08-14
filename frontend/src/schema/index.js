import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters long",
  }),
});

export const CreateDriverSchema = z.object({
  licenseNo: z
    .string()
    .regex(/^[a-zA-Z0-9]{3}-\d{2}-\d{6}$/, "Invalid license number format"),
  firstName: z.string().min(1, {
    message: "Firstname is required",
  }),
  middleName: z.string().optional(),
  lastName: z.string().min(1, {
    message: "Lastname is required",
  }),
  street: z.string().min(1, {
    message: "Street is required",
  }),
  barangay: z.string().min(1, {
    message: "Barangay is required",
  }),
  municipality: z.string().min(1, {
    message: "Municipality is required",
  }),
  province: z.string().min(1, {
    message: "Province is required",
  }),
  nationality: z.string().min(1, {
    message: "Nationality is required",
  }),
  sex: z.enum(["0", "1"], {
    required_error: "Sex is required.",
  }),
  birthDate: z.date({
    required_error: "Date of birth is required.",
  }),
  civilStatus: z.string().min(1, {
    message: "Civil status is required",
  }),
  issueDate: z.date({
    required_error: "Issue date is required.",
  }),
  expiryDate: z.date({
    required_error: "Expiry date is required.",
  }),
  birthPlace: z.string().min(1, {
    message: "Birthplace is required",
  }),
});

export const VehicleSchema = z.object({
  plateNo: z
    .string()
    .min(1, {
      message: "Plate number is required",
    })
    .max(8, { message: "Plate number must not exceed 8 characters" }),
  firstName: z.string().min(1, {
    message: "Firstname is required",
  }),
  middleName: z.string().optional(),
  lastName: z.string().min(1, {
    message: "Lastname is required",
  }),
  street: z.string().min(1, {
    message: "Street is required",
  }),
  barangay: z.string().min(1, {
    message: "Barangay is required",
  }),
  municipality: z.string().min(1, {
    message: "Municipality is required",
  }),
  province: z.string().min(1, {
    message: "Province is required",
  }),
  fileNo: z.string().optional(),
  encumbrance: z.string().optional(),
  vehicleType: z.string().min(1, {
    message: "Vehicle Type is required",
  }),
  classification: z.string().min(1, {
    message: "Classification is required",
  }),
  make: z.string().min(1, {
    message: "Make is required",
  }),
  fuelType: z.string().min(1, {
    message: "Fuel type is required",
  }),
  motorNumber: z.string().min(1, {
    message: "Motor number is required",
  }),
  serialChassisNumber: z.string().min(1, {
    message: "Serial chassis number is required",
  }),
  series: z.string().min(1, {
    message: "Series is required",
  }),
  bodyType: z.string().min(1, {
    message: "Body type is required",
  }),
  color: z.string().min(1, {
    message: "Color is required",
  }),
  yearModel: z.string().min(1, {
    message: "Year model is required",
  }),
  dateRegistered: z.date({
    required_error: "Registered date is required.",
  }),
  expirationDate: z.date({
    required_error: "Expiration date is required.",
  }),
  customVehicleType: z.string().optional(),
  customFuelType: z.string().optional(),
});
