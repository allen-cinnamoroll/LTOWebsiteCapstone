import fs from 'fs';
import path from 'path';

const fixLicenseData = () => {
  try {
    console.log('🔧 Fixing license data inconsistencies...');
    
    // Read the restructured drivers file
    const driversFilePath = path.join(process.cwd(), 'json', 'restructured', 'drivers_collection.json');
    const driversData = JSON.parse(fs.readFileSync(driversFilePath, 'utf8'));
    
    console.log(`📊 Found ${driversData.length} drivers to process`);
    
    let fixedCount = 0;
    let totalYesCount = 0;
    let totalNoCount = 0;
    
    // Process each driver record
    for (const driver of driversData) {
      // Count original values
      if (driver.hasDriversLicense === "YES") {
        totalYesCount++;
      } else if (driver.hasDriversLicense === "NO") {
        totalNoCount++;
      }
      
      // Fix the inconsistency: if driversLicenseNumber is null/empty, set hasDriversLicense to "NO"
      if (driver.hasDriversLicense === "YES" && (!driver.driversLicenseNumber || driver.driversLicenseNumber === null)) {
        driver.hasDriversLicense = "NO";
        driver.driversLicenseNumber = null;
        fixedCount++;
        console.log(`  Fixed: ${driver.fullName} - Changed hasDriversLicense from YES to NO (no license number)`);
      }
    }
    
    // Write the fixed data back to file
    fs.writeFileSync(driversFilePath, JSON.stringify(driversData, null, 2));
    
    console.log(`\n✅ License data fixed!`);
    console.log(`📊 Summary:`);
    console.log(`  - Total drivers processed: ${driversData.length}`);
    console.log(`  - Drivers with YES (before fix): ${totalYesCount}`);
    console.log(`  - Drivers with NO (before fix): ${totalNoCount}`);
    console.log(`  - Records fixed: ${fixedCount}`);
    
    // Verify the fix
    const updatedData = JSON.parse(fs.readFileSync(driversFilePath, 'utf8'));
    const yesWithLicense = updatedData.filter(d => d.hasDriversLicense === "YES" && d.driversLicenseNumber);
    const yesWithoutLicense = updatedData.filter(d => d.hasDriversLicense === "YES" && !d.driversLicenseNumber);
    
    console.log(`\n🔍 Verification:`);
    console.log(`  - Drivers with YES and valid license: ${yesWithLicense.length}`);
    console.log(`  - Drivers with YES but no license: ${yesWithoutLicense.length} (should be 0)`);
    
    if (yesWithoutLicense.length === 0) {
      console.log(`✅ All license data is now consistent!`);
    } else {
      console.log(`❌ Still have ${yesWithoutLicense.length} inconsistent records`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing license data:', error);
  }
};

// Run the fix
fixLicenseData();
