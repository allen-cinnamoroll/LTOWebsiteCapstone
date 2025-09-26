// Debug script to test June filtering
const mongoose = require('mongoose');

// Simple test without requiring the full model
async function testJuneFilter() {
  try {
    // Connect to MongoDB - adjust connection string as needed
    await mongoose.connect('mongodb://localhost:27017/ltowebsite', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Test the month-only filter for June (month = 6)
    const monthFilter = {
      $expr: {
        $and: [
          { $eq: [{ $month: "$dateOfRenewal" }, 6] },
          { $ne: ["$dateOfRenewal", null] }
        ]
      }
    };
    
    console.log('Testing month filter for June:', JSON.stringify(monthFilter, null, 2));
    
    // Count vehicles with June renewals
    const juneCount = await mongoose.connection.db.collection('vehicles').countDocuments(monthFilter);
    console.log('Vehicles with June renewals:', juneCount);
    
    // Get a sample of vehicles with June renewals
    const juneVehicles = await mongoose.connection.db.collection('vehicles').find(monthFilter).limit(5).toArray();
    console.log('Sample June vehicles:', juneVehicles.map(v => ({ 
      plateNo: v.plateNo, 
      dateOfRenewal: v.dateOfRenewal,
      month: v.dateOfRenewal ? new Date(v.dateOfRenewal).getMonth() + 1 : null
    })));
    
    // Check total vehicles
    const totalVehicles = await mongoose.connection.db.collection('vehicles').countDocuments();
    console.log('Total vehicles:', totalVehicles);
    
    // Check vehicles with null dateOfRenewal
    const nullDateCount = await mongoose.connection.db.collection('vehicles').countDocuments({ dateOfRenewal: null });
    console.log('Vehicles with null dateOfRenewal:', nullDateCount);
    
    // Check vehicles with non-null dateOfRenewal
    const nonNullDateCount = await mongoose.connection.db.collection('vehicles').countDocuments({ 
      dateOfRenewal: { $ne: null } 
    });
    console.log('Vehicles with non-null dateOfRenewal:', nonNullDateCount);
    
    // Check what months we have data for
    const monthStats = await mongoose.connection.db.collection('vehicles').aggregate([
      { $match: { dateOfRenewal: { $ne: null } } },
      { $group: { 
        _id: { $month: "$dateOfRenewal" }, 
        count: { $sum: 1 } 
      }},
      { $sort: { _id: 1 } }
    ]).toArray();
    
    console.log('Month distribution:', monthStats);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

testJuneFilter();
