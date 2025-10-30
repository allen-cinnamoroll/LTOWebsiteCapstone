const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function importData() {
  const client = new MongoClient('mongodb://lto_user:jessa_allen_kent@72.60.198.244:27017/lto_website?authSource=lto_website');
  await client.connect();

  const db = client.db('lto_website');

  // =====================
  // 🚗 Import Accidents
  // =====================
  const accidentsCollection = db.collection('accidents');
  const accidentsPath = path.join(__dirname, 'accidents_2024_2025_clean.json');
  const accidentsData = JSON.parse(fs.readFileSync(accidentsPath, 'utf8'));

  const transformedAccidents = accidentsData.map(item => ({
    ...item,
    accident_date: new Date(item.accident_date)
  }));

  // Clear collection before re-import
  await accidentsCollection.deleteMany({});
  await accidentsCollection.insertMany(transformedAccidents);
  console.log('✅ Accidents data imported successfully!');

  // =====================
  // 🚨 Import Violations
  // =====================
  const violationsCollection = db.collection('violations');
  const violationsPath = path.join(__dirname, 'violations_confiscated.json');
  const violationsData = JSON.parse(fs.readFileSync(violationsPath, 'utf8'));

  // Clear collection before re-import
  await violationsCollection.deleteMany({});
  const now = new Date();
  const transformedViolations = violationsData.map(item => ({
    ...item,
    createdAt: item.createdAt ? new Date(item.createdAt) : now,
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : now,
    createdBy: item.createdBy || null,
    updatedBy: item.updatedBy || null,
  }));
  await violationsCollection.insertMany(transformedViolations);
  console.log('✅ Violations data imported successfully!');

  await client.close();
}

importData().catch(console.error);
