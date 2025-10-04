/**
 * Test script to verify the status calculation fix
 * Tests the specific case: Plate "AL3127", Renewal: October 3, 2025, Status: "Old"
 */

import { getVehicleStatus, calculateExpirationDate, getExpirationInfo } from './util/plateStatusCalculator.js';

console.log('=== Testing Status Calculation Fix ===\n');

// Test case from the user's data
const testPlate = "AL3127";
const testRenewalDate = "2025-10-03T05:09:15.607+00:00";
const testVehicleStatusType = "Old";

console.log(`Test Case:`);
console.log(`- Plate Number: ${testPlate}`);
console.log(`- Renewal Date: ${testRenewalDate}`);
console.log(`- Vehicle Status Type: ${testVehicleStatusType}`);
console.log(`- Current Date: ${new Date().toISOString()}\n`);

// Test the calculation
console.log('=== Calculation Results ===');

try {
  const expirationInfo = getExpirationInfo(testPlate, testRenewalDate);
  console.log('Expiration Info:', expirationInfo);
  
  const status = getVehicleStatus(testPlate, testRenewalDate, testVehicleStatusType);
  console.log(`\nFinal Status: ${status} (${status === "1" ? "ACTIVE" : "EXPIRED"})`);
  
  // Expected result
  console.log('\n=== Expected Result ===');
  console.log('Last two digits: 27');
  console.log('Second-to-last digit (2): First week');
  console.log('Last digit (7): July');
  console.log('Expiration: First week of July 2026 (July 8th, 2026)');
  console.log('Status should be: ACTIVE (1)');
  
} catch (error) {
  console.error('Error in calculation:', error);
}

console.log('\n=== Test Complete ===');
