const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function exportIncidentsToCSV() {
  const client = new MongoClient('mongodb://lto_user:jessa_allen_kent@72.60.198.244:27017/lto_website?authSource=lto_website');
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('lto_website');
    const accidentsCollection = db.collection('accidents');

    // Fetch all incidents
    const incidents = await accidentsCollection.find({}).toArray();
    console.log(`📊 Found ${incidents.length} incidents`);

    if (incidents.length === 0) {
      console.log('⚠️  No incidents found in database');
      return;
    }

    // Define CSV headers based on new incident structure
    const headers = [
      'blotterNo',
      'vehiclePlateNo',
      'vehicleMCPlateNo',
      'vehicleChassisNo',
      'suspect',
      'stageOfFelony',
      'offense',
      'offenseType',
      'narrative',
      'caseStatus',
      'incidentType',
      'region',
      'province',
      'municipality',
      'barangay',
      'street',
      'lat',
      'lng',
      'dateEncoded',
      'dateReported',
      'timeReported',
      'dateCommited',
      'timeCommited'
    ];

    // Convert incidents to CSV format
    const csvRows = [headers.join(',')];

    for (const incident of incidents) {
      const row = headers.map(header => {
        let value = incident[header];
        
        // Handle null/undefined values
        if (value === null || value === undefined) {
          return '';
        }
        
        // Handle dates
        if (value instanceof Date) {
          return value.toISOString();
        }
        
        // Handle strings with commas or quotes
        if (typeof value === 'string') {
          // Escape quotes and wrap in quotes if contains comma
          value = value.replace(/"/g, '""');
          if (value.includes(',') || value.includes('\n') || value.includes('"')) {
            return `"${value}"`;
          }
        }
        
        return value;
      });
      
      csvRows.push(row.join(','));
    }

    // Write to CSV file
    const outputPath = path.join(__dirname, '../data/raw/accidents_data.csv');
    const outputDir = path.dirname(outputPath);
    
    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, csvRows.join('\n'), 'utf8');
    
    console.log(`✅ Exported ${incidents.length} incidents to ${outputPath}`);
    console.log(`📁 File size: ${fs.statSync(outputPath).size} bytes`);
    
    // Show summary statistics
    const caseStatusCounts = {};
    const incidentTypeCounts = {};
    
    incidents.forEach(incident => {
      caseStatusCounts[incident.caseStatus || 'Unknown'] = (caseStatusCounts[incident.caseStatus || 'Unknown'] || 0) + 1;
      incidentTypeCounts[incident.incidentType || 'Unknown'] = (incidentTypeCounts[incident.incidentType || 'Unknown'] || 0) + 1;
    });
    
    console.log('\n📊 Summary Statistics:');
    console.log('\nCase Status Distribution:');
    Object.entries(caseStatusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    console.log('\nIncident Type Distribution:');
    Object.entries(incidentTypeCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

exportIncidentsToCSV().catch(console.error);

