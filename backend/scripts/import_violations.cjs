const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function importViolations() {
  const client = new MongoClient('mongodb://lto_user:jessa_allen_kent@72.60.198.244:27017/lto_website?authSource=lto_website');
  await client.connect();

  const db = client.db('lto_website');

  // =====================
  // 🚨 Import Violations
  // =====================
  const violationsCollection = db.collection('violations');
  const violationsPath = path.join(__dirname, 'violations_impounded.json');
  const violationsData = JSON.parse(fs.readFileSync(violationsPath, 'utf8'));

  // Get superadmin ID for default createdBy
  const usersCollection = db.collection('users');
  const superadmin = await usersCollection.findOne({ role: "0" });
  const superadminId = superadmin ? superadmin._id : null;

  // Clear collection before re-import
  await violationsCollection.deleteMany({});
  const now = new Date();
  const transformedViolations = violationsData.map(item => ({
    ...item,
    // Ensure impounded type is set; the frontend may default missing values to 'confiscated'
    violationType: item.violationType || "impounded",
    createdAt: item.createdAt ? new Date(item.createdAt) : now,
    // Don't set updatedAt or updatedBy for new imports (they weren't updated yet)
    createdBy: item.createdBy || superadminId,
    updatedBy: null,
  }));
  await violationsCollection.insertMany(transformedViolations);
  console.log('✅ Violations data imported successfully!');

  await client.close();
}

importViolations().catch(console.error);
