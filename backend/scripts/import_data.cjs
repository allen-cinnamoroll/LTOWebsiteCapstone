const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function importData() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  
  // Replace 'your_database_name' with your actual database name from Compass
  const db = client.db('lto_db');
  const collection = db.collection('accidents');
  
  // Read JSON file from the same directory
  const dataPath = path.join(__dirname, 'accidents_2024_2025_davao_oriental_150.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  // Transform data to convert date strings to Date objects
  const transformedData = data.map(item => ({
    ...item,
    accident_date: new Date(item.accident_date)
  }));
  
  // Insert or update data (handle duplicates gracefully)
  const bulkOps = transformedData.map(item => ({
    updateOne: {
      filter: { accident_id: item.accident_id },
      update: { $set: item },
      upsert: true
    }
  }));
  
  await collection.bulkWrite(bulkOps);
  
  console.log('Data imported successfully!');
  await client.close();
}

importData().catch(console.error);