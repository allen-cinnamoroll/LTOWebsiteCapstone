const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function importData() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  
  // Replace 'your_database_name' with your actual database name from Compass
  const db = client.db('lto_db');
  const collection = db.collection('violations');
  
  // Read JSON file from the same directory
  const dataPath = path.join(__dirname, 'data_with_violation_impoundment.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  // Transform data to convert date strings to Date objects
  const transformedData = data.map(item => ({
    ...item,
    dateOfApprehension: new Date(item.dateOfApprehension)
  }));
  
  // Insert data
  await collection.insertMany(transformedData);
  
  console.log('Data imported successfully!');
  await client.close();
}

importData().catch(console.error);