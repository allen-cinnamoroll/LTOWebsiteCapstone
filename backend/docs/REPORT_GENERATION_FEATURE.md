# Report Generation Feature

## Overview

This feature adds automated daily and monthly report generation to the LTO Dashboard, providing comprehensive Excel reports with vehicle, violation, and accident data.

## Features

### 1. **Manual Report Generation**
- **Location**: Top right corner of the dashboard (next to the theme toggle)
- **Report Types**:
  - **Daily Report**: Generates a report for the current day
  - **Monthly Report**: Generates a report for the current month

### 2. **Automated Report Scheduling**
- **Daily Reports**: Automatically generated every day at 11:59 PM (Asia/Manila timezone)
- **Monthly Reports**: Automatically generated on the last day of each month at 11:59 PM (Asia/Manila timezone)
- **Storage**: Reports are saved in `backend/reports/` directory
- **Retention**: Old reports are automatically cleaned up after 30 days

## Report Contents

### Vehicle Sheet
1. **Summary Statistics**
   - Total Registered/Renewed Vehicles
   
2. **Registered Owners**
   - Total Owners
   - Owners with Driver's License
   - Owners without Driver's License
   
3. **Plate Classification**
   - Temporary Plates (numeric only)
   - Permanent Plates (contains letters)
   
4. **Vehicles Per Municipality**
   - Breakdown of registered vehicles by municipality

### Violation Sheet
1. **Summary Statistics**
   - Total Violators
   - Total Violations
   
2. **Frequent Violations**
   - Top 20 most common violations with counts

### Accident Sheet
1. **Summary Statistics**
   - Total Accidents
   
2. **Municipalities with Most Accidents**
   - Top 10 municipalities ranked by accident count
   
3. **Barangays with Most Accidents**
   - Top 15 barangays ranked by accident count
   
4. **Hours with Most Accidents**
   - Hourly breakdown showing peak accident times

## Technical Implementation

### Backend

#### Files Modified/Created:
1. **`backend/controller/dashboardController.js`**
   - Uses existing `exportDashboardReport` function
   - Generates Excel reports with three sheets (Vehicles, Violations, Accidents)

2. **`backend/routes/dashboard.js`**
   - Added route: `GET /api/dashboard/report-export`
   - Parameters:
     - `period`: "daily" or "monthly"
     - `targetDate`: Date string (YYYY-MM-DD) for daily reports
     - `targetMonth`: Month number (1-12) for monthly reports
     - `targetYear`: Year number for monthly reports

3. **`backend/util/reportScheduler.js`** (NEW)
   - Scheduled task manager using `node-cron`
   - Handles automated report generation
   - Manages report file storage and cleanup

4. **`backend/server.js`**
   - Integrated report scheduler on server startup

### Frontend

#### Files Created:
1. **`frontend/src/components/dashboard/ReportButton.jsx`** (NEW)
   - Dropdown button component with daily/monthly options
   - Handles report download with proper filename generation
   - Shows loading states and toast notifications

#### Files Modified:
2. **`frontend/src/layout/DashboardLayout.jsx`**
   - Added ReportButton component to header
   - Positioned next to the theme toggle in top right corner

## Usage

### For Users

1. **Generate a Report Manually**:
   - Navigate to the dashboard
   - Click the "Report" button in the top right corner
   - Select either "Daily Report" or "Monthly Report"
   - The report will automatically download as an Excel file

2. **Access Automated Reports**:
   - Automated reports are saved in `backend/reports/` directory
   - File naming format: `LTO_Report_{type}_{date}.xlsx`
   - Example: `LTO_Report_daily_2025-11-23.xlsx`

### For Developers

#### Testing the Feature:

```bash
# Start the backend server
cd backend
npm run dev

# Start the frontend
cd frontend
npm run dev
```

#### Manual API Testing:

```bash
# Generate daily report
curl -H "Authorization: YOUR_TOKEN" \
  "http://localhost:5000/api/dashboard/report-export?period=daily&targetDate=2025-11-23" \
  --output daily_report.xlsx

# Generate monthly report
curl -H "Authorization: YOUR_TOKEN" \
  "http://localhost:5000/api/dashboard/report-export?period=monthly&targetMonth=11&targetYear=2025" \
  --output monthly_report.xlsx
```

## Dependencies

### Backend:
- `xlsx` (^0.18.5) - Excel file generation
- `node-cron` (^3.0.3) - Task scheduling
- `dayjs` (^1.11.19) - Date manipulation

### Frontend:
- `xlsx` (^0.18.5) - Already installed
- `dayjs` (^1.11.19) - Already installed
- `sonner` - Toast notifications
- `lucide-react` - Icons

## Configuration

### Timezone
The scheduler uses `Asia/Manila` timezone by default. To change:

Edit `backend/util/reportScheduler.js`:
```javascript
cron.schedule('59 23 * * *', generateDailyReport, {
  timezone: "Your/Timezone" // Change this
});
```

### Report Retention Period
Default: 30 days. To change:

Edit `backend/util/reportScheduler.js`:
```javascript
const cleanupOldReports = (reportsDir) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); // Change this number
  // ...
};
```

### Schedule Times
To change when reports are generated:

Edit `backend/util/reportScheduler.js`:
```javascript
// Daily report - change '59 23 * * *' (11:59 PM)
cron.schedule('0 0 * * *', generateDailyReport); // Midnight

// Monthly report - change '59 23 28-31 * *'
cron.schedule('0 0 1 * *', generateMonthlyReport); // 1st of month
```

## Troubleshooting

### Reports Not Generating
1. Check server logs for errors
2. Verify `backend/reports/` directory exists and is writable
3. Ensure database connection is active
4. Check timezone configuration

### Download Issues
1. Verify authentication token is valid
2. Check browser console for errors
3. Ensure popup blockers aren't interfering
4. Try a different browser

### Missing Data in Reports
1. Verify date range parameters
2. Check database for data in the specified period
3. Review query filters in `exportDashboardReport` function

## Future Enhancements

Potential improvements:
1. Email delivery of automated reports
2. Custom date range selection
3. Report templates/customization
4. PDF export option
5. Report history viewer in UI
6. Scheduled report configuration in admin panel
7. Multiple timezone support
8. Report sharing/permissions

## Support

For issues or questions:
1. Check server logs: `backend/logs/application.log`
2. Review this documentation
3. Contact the development team

