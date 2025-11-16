const mongoose = require('mongoose');
const VehicleModel = require('./model/VehicleModel.js');

async function testMonthFilter() {
  try {
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/lto_database', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to database');
    
    // Test month-only filter for June (month = 6)
    const month = 6;
    
    const dateFilter = {
      $expr: {
        $and: [
          { $eq: [{ $month: "$dateOfRenewal" }, month] },
          { $ne: ["$dateOfRenewal", null] }
        ]
      }
    };
    
    console.log('Testing month-only filter for June across all years...');
    console.log('Date filter:', JSON.stringify(dateFilter, null, 2));
    
    // Test the aggregation
    const result = await VehicleModel.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, vehicleCount: { $sum: 1 } } }
    ]);
    
    console.log('Total vehicles found for June across all years:', result[0]?.vehicleCount || 0);
    
    // Test municipality aggregation
    const municipalityResult = await VehicleModel.aggregate([
      { $match: dateFilter },
      {
        $lookup: {
          from: 'owners',
          localField: 'driverId',
          foreignField: '_id',
          as: 'driverInfo'
        }
      },
      {
        $unwind: {
          path: '$driverInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          municipality: {
            $cond: {
              if: { $ne: ['$driverInfo.address.municipality', null] },
              then: { $toUpper: { $trim: { input: '$driverInfo.address.municipality' } } },
              else: null
            }
          }
        }
      },
      {
        $match: {
          municipality: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$municipality',
          vehicleCount: { $sum: 1 }
        }
      },
      { $sort: { vehicleCount: -1 } }
    ]);
    
    console.log('Municipality results for June:');
    municipalityResult.forEach(item => {
      console.log(`  ${item._id}: ${item.vehicleCount} vehicles`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
  }
}

testMonthFilter();
