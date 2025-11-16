import express from "express";
import {
  generateRegistrationCsvReport,
  generateRegistrationPdfReport,
} from "../controller/reportController.js";

const router = express.Router();

router.post("/registration/pdf", generateRegistrationPdfReport);
router.post("/registration/csv", generateRegistrationCsvReport);

export default router;

