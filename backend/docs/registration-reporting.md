# Registration Analytics Reporting

This document summarizes the automated reporting capability for the Registration Analytics module.

## Endpoints

- `POST /api/reports/registration/pdf`
  - Generates a formal PDF report that summarizes KPIs, trends, municipality performance, license compliance, and predictive analytics.
- `POST /api/reports/registration/csv`
  - Exports analysis-ready CSV data that mirrors the numbers shown in the dashboard UI.

### Request Payload

```json
{
  "scope": "daily|monthly|yearly",
  "period": "YYYY-MM-DD|YYYY-MM|YYYY",
  "municipalityId": "all|BAGANGA|CITY OF MATI|...",
  "vehicleType": "all|private|for_hire|government",
  "licenseStatus": "all|with_license|without_license"
}
```

### Responses

- PDF endpoint returns `application/pdf` with filename: `registration-report-<scope>-<period>.pdf`
- CSV endpoint returns `text/csv` with filename: `registration-data-<scope>-<period>.csv`

## Service Notes

- Logic lives in `services/registrationReportService.js` and reuses the same aggregations that drive the dashboard.
- Both PDF and CSV share one `RegistrationReportPayload` to guarantee consistency.
- Predictive analytics are pulled from the existing MV prediction API (when available).
- Each function and controller references the research objective: _“Automate the generation of daily and monthly reports to enable fast, consistent, and accurate reporting without the need for complex models.”_

## Testing Checklist

1. **Backend sanity**
   - `curl -X POST http://localhost:PORT/api/reports/registration/pdf -d '{ "scope":"monthly","period":"2025-01" }'`
   - Confirm a PDF downloads without server errors.
   - Repeat for CSV endpoint and verify delimiters/columns.
2. **Frontend smoke**
   - Open the Registration Analytics page.
   - Click `Export`, choose a period, then ensure both PDF & CSV download automatically.
   - Validate counts against the UI KPIs.
3. **Edge cases**
   - Generate yearly reports with municipality filters.
   - Generate daily reports without explicit month selection.
   - Disconnect the prediction API and confirm the PDF still renders (with predictive section hidden).

Automated Jest-style tests are not yet available for this feature because the existing codebase does not include a testing harness for the dashboard models. The service was nevertheless designed so it can be unit-tested later by mocking `VehicleModel.aggregate`.

