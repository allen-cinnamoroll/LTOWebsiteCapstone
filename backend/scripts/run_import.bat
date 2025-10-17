@echo off
REM Set environment variables for database connection
set NODE_ENV=production
set DATABASE=mongodb://lto_user:${DB_PASSWORD}@72.60.198.244:27017/lto_website?authSource=lto_website
set DB_PASSWORD=jessa_allen_kent

echo 🚀 Starting LTO Data Import...
echo 📊 Database: lto_website
echo 🔗 Host: 72.60.198.244:27017
echo 👤 User: lto_user
echo.

REM Navigate to the backend directory
cd /d "%~dp0.."

REM Run the import script
node scripts/import_restructured_data.js

echo.
echo ✅ Import process completed!
pause

