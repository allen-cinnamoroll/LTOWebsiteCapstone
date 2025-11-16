import RegistrationReportService from "../services/registrationReportService.js";

/**
 * This module implements automated daily/monthly/yearly registration reports in PDF and CSV formats,
 * supporting the research objective: “Automate the generation of daily and monthly reports to enable fast,
 * consistent, and accurate reporting without the need for complex models.”
 */
const registrationReportService = new RegistrationReportService();

export const generateRegistrationPdfReport = async (req, res) => {
  try {
    const { buffer, filename } = await registrationReportService.generatePdf(
      req.body || {},
      { user: req.user || null },
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error("Registration PDF report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate PDF report",
      error: error.message,
    });
  }
};

export const generateRegistrationCsvReport = async (req, res) => {
  try {
    const { csv, filename } = await registrationReportService.generateCsv(
      req.body || {},
      { user: req.user || null },
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error("Registration CSV report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate CSV report",
      error: error.message,
    });
  }
};


