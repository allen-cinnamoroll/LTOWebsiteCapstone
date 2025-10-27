#!/bin/bash

# Migration script to populate renewal history for existing vehicles
# This script will run the migration to add existing dateOfRenewal values to renewal history

echo "🚀 Starting Renewal History Migration..."
echo "This will populate renewal history for all existing vehicles with dateOfRenewal values."
echo ""

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the backend directory"
    exit 1
fi

# Run the migration script
echo "📊 Running migration script..."
node scripts/migrate-renewal-history.js

echo ""
echo "✅ Migration completed!"
echo ""
echo "Next steps:"
echo "1. Check your MongoDB database to verify the renewal history records"
echo "2. Test the new API endpoint: GET /api/renewal-history/vehicle/:vehicleId/dates"
echo "3. Update your frontend to use the new renewal history data"
