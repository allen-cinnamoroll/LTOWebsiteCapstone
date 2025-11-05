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

  await client.close();
}

importData().catch(console.error);
