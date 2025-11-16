const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function importData() {
  const client = new MongoClient('mongodb://lto_user:jessa_allen_kent@72.60.198.244:27017/lto_website?authSource=lto_website');
  await client.connect();

  const db = client.db('lto_website');

  // =====================
  // 🚗 Import Incidents (Accidents)
  // =====================
  const accidentsCollection = db.collection('accidents');
  
  // Drop old/unused indexes that might cause conflicts
  try {
    await accidentsCollection.dropIndex('blotterNo_1');
    console.log('✅ Dropped old blotterNo_1 index');
  } catch (error) {
    if (error.code === 27) {
      console.log('ℹ️  blotterNo_1 index does not exist (already removed)');
    } else {
      console.log('⚠️  Error dropping blotterNo_1 index:', error.message);
    }
  }
  
  const accidentsPath = path.join(__dirname, 'accidents data.json');
  const accidentsData = JSON.parse(fs.readFileSync(accidentsPath, 'utf8'));

  // Get superadmin ID for default createdBy
  const usersCollection = db.collection('users');
  const superadmin = await usersCollection.findOne({ role: "0" });
  const superadminId = superadmin ? superadmin._id : null;

  // Drop old indexes before importing
  try {
    console.log('🗑️  Dropping old indexes...');
    await accidentsCollection.dropIndex('accident_id_1').catch(() => {});
    await accidentsCollection.dropIndex('accident_date_1').catch(() => {});
    await accidentsCollection.dropIndex('vehicle_type_1').catch(() => {});
    await accidentsCollection.dropIndex('severity_1').catch(() => {});
    console.log('✅ Old indexes dropped');
  } catch (error) {
    console.log('⚠️  Some indexes may not exist (this is okay)');
  }

  const now = new Date();
  
  // Helper function to parse date strings (handles various formats)
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    // Handle MM/DD/YYYY format
    if (typeof dateStr === 'string' && dateStr.includes('/')) {
      const [month, day, year] = dateStr.split('/').map(part => {
        // Handle cases like "1/9/2023 13:41" - extract just the date part
        return part.trim().split(' ')[0];
      });
      return new Date(year, month - 1, day);
    }
    return new Date(dateStr);
  };

  // Transform and deduplicate by blotterNo (keep the first occurrence)
  const seenBlotterNos = new Set();
  const transformedAccidents = [];
  let duplicateCount = 0;

  for (const item of accidentsData) {
    if (seenBlotterNos.has(item.blotterNo)) {
      duplicateCount++;
      console.log(`⚠️  Skipping duplicate blotterNo: ${item.blotterNo}`);
      continue;
    }
    
    seenBlotterNos.add(item.blotterNo);
    
    transformedAccidents.push({
      blotterNo: item.blotterNo,
      vehiclePlateNo: item.vehiclePlateNo || null,
      vehicleMCPlateNo: item.vehicleMCPlateNo || null,
      vehicleChassisNo: item.vehicleChassisNo || null,
      suspect: item.suspect || null,
      stageOfFelony: item.stageOfFelony || null,
      offense: item.offense || null,
      offenseType: item.offenseType || null,
      narrative: item.narrative || null,
      caseStatus: item.caseStatus || null,
      incidentType: item.incidentType || null,
      region: item.region || null,
      province: item.province || null,
      municipality: item.municipality,
      barangay: item.barangay,
      street: item.street || null,
      lat: item.lat || null,
      lng: item.lng || null,
      dateEncoded: parseDate(item.dateEncoded),
      dateReported: parseDate(item.dateReported),
      timeReported: item.timeReported || null,
      dateCommited: parseDate(item.dateCommited),
      timeCommited: item.timeCommited || null,
      createdBy: superadminId,
      updatedBy: null,
      createdAt: now,
      // Don't set updatedAt for new imports
    });
  }

  if (duplicateCount > 0) {
    console.log(`⚠️  Found and skipped ${duplicateCount} duplicate record(s)`);
  }

  // Clear collection before re-import
  await accidentsCollection.deleteMany({});
  await accidentsCollection.insertMany(transformedAccidents);
  console.log(`✅ ${transformedAccidents.length} incidents imported successfully!`);

  // Create new index on blotterNo for uniqueness
  try {
    console.log('📋 Creating index on blotterNo...');
    await accidentsCollection.createIndex({ blotterNo: 1 }, { unique: true });
    console.log('✅ Index created on blotterNo');
  } catch (error) {
    console.log('⚠️  Index may already exist:', error.message);
  }
}
