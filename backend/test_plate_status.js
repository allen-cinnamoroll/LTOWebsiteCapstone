import { getVehicleStatus, calculateExpirationDate, getExpirationInfo } from './util/plateStatusCalculator.js';

// Test the plate "250LNV" with renewal date 6/5/2025
const plateNo = "250LNV";
const renewalDate = "2025-06-05"; // June 5, 2025
const vehicleStatusType = "Old";

console.log('=== Testing Plate Status Calculation ===');
console.log(`Plate: ${plateNo}`);
console.log(`Renewal Date: ${renewalDate}`);
console.log(`Vehicle Status Type: ${vehicleStatusType}`);
console.log('');

// Test expiration date calculation
const expirationDate = calculateExpirationDate(plateNo, renewalDate, vehicleStatusType);
console.log(`Calculated Expiration Date: ${expirationDate ? expirationDate.toISOString().split('T')[0] : 'null'}`);

// Test status calculation
const status = getVehicleStatus(plateNo, renewalDate, vehicleStatusType);
console.log(`Vehicle Status: ${status} (${status === '1' ? 'ACTIVE' : 'EXPIRED'})`);

// Test detailed expiration info
const expirationInfo = getExpirationInfo(plateNo, renewalDate);
if (expirationInfo) {
  console.log('');
  console.log('=== Detailed Expiration Info ===');
  console.log(`Last Two Digits: ${expirationInfo.lastTwoDigits}`);
  console.log(`Week: ${expirationInfo.week}`);
  console.log(`Month: ${expirationInfo.month}`);
  console.log(`Expiration Date: ${expirationInfo.expirationDate.toISOString().split('T')[0]}`);
  console.log(`Is Expired: ${expirationInfo.isExpired}`);
  console.log(`Status: ${expirationInfo.status} (${expirationInfo.status === '1' ? 'ACTIVE' : 'EXPIRED'})`);
}

console.log('');
console.log('=== Expected Results ===');
console.log('Plate "250LNV" should:');
console.log('- Last digit "0" → October (month 9)');
console.log('- Second to last digit "5" → Second week (ends on 14th)');
console.log('- Renewed on 6/5/2025 → Should expire on October 15, 2025 (second week of October 2025)');
console.log('- Since we are in 2025 and October 15, 2025 has not passed, status should be ACTIVE');
