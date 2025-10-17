/**
 * Utility functions for calculating vehicle status based on plate number
 * Uses the last two digits lookup table system
 */

// Lookup table for week calculation (second to last digit)
const WEEK_LOOKUP = {
  '1': 'first',
  '2': 'first', 
  '3': 'first',
  '4': 'second',
  '5': 'second',
  '6': 'second',
  '7': 'third',
  '8': 'third',
  '9': 'last',
  '0': 'last'
};

// Lookup table for month calculation (last digit)
const MONTH_LOOKUP = {
  '1': 0,  // January
  '2': 1,  // February
  '3': 2,  // March
  '4': 3,  // April
  '5': 4,  // May
  '6': 5,  // June
  '7': 6,  // July
  '8': 7,  // August
  '9': 8,  // September
  '0': 9   // October
};

/**
 * Extract the last two digits from a plate number
 * @param {string} plateNo - The plate number (e.g., "382LMS", "ABC123")
 * @returns {string} - The last two digits (e.g., "82", "23")
 */
export const extractLastTwoDigits = (plateNo) => {
  if (!plateNo || typeof plateNo !== 'string') {
    return null;
  }
  
  // Remove all non-digit characters and get the last two digits
  const digits = plateNo.replace(/\D/g, '');
  return digits.length >= 2 ? digits.slice(-2) : null;
};

/**
 * Extract the last digit from a plate number
 * @param {string} plateNo - The plate number (e.g., "382LMS", "ABC123")
 * @returns {string} - The last digit (e.g., "2", "3")
 */
export const extractLastDigit = (plateNo) => {
  if (!plateNo || typeof plateNo !== 'string') {
    return null;
  }
  
  // Remove all non-digit characters and get the last digit
  const digits = plateNo.replace(/\D/g, '');
  return digits.length >= 1 ? digits.slice(-1) : null;
};

/**
 * Get the week of the month based on the second to last digit
 * @param {string} secondToLastDigit - The second to last digit
 * @returns {string} - The week description
 */
export const getWeekFromDigit = (secondToLastDigit) => {
  return WEEK_LOOKUP[secondToLastDigit] || null;
};

/**
 * Get the month number (0-11) based on the last digit
 * @param {string} lastDigit - The last digit
 * @returns {number} - The month number (0-11, where 0 = January)
 */
export const getMonthFromDigit = (lastDigit) => {
  return MONTH_LOOKUP[lastDigit] !== undefined ? MONTH_LOOKUP[lastDigit] : null;
};

/**
 * Calculate the expiration date based on plate number, renewal date, and vehicle status type
 * @param {string} plateNo - The plate number
 * @param {Date|string} dateOfRenewal - The date of renewal (optional)
 * @param {string} vehicleStatusType - The vehicle status type ("New" or "Old")
 * @returns {Date|null} - The expiration date
 */
export const calculateExpirationDate = (plateNo, dateOfRenewal = null, vehicleStatusType = "Old") => {
  const lastTwoDigits = extractLastTwoDigits(plateNo);
  if (!lastTwoDigits || lastTwoDigits.length !== 2) {
    console.log(`Invalid plate number format: ${plateNo}`);
    return null;
  }
  
  const secondToLastDigit = lastTwoDigits[0];
  const lastDigit = lastTwoDigits[1];
  
  const week = getWeekFromDigit(secondToLastDigit);
  const monthIndex = getMonthFromDigit(lastDigit);
  
  if (!week || monthIndex === null) {
    console.log(`Invalid week or month calculation for plate ${plateNo}: week=${week}, monthIndex=${monthIndex}`);
    return null;
  }
  
  // Parse renewal date if provided
  let renewalDate = null;
  if (dateOfRenewal) {
    renewalDate = new Date(dateOfRenewal);
    if (isNaN(renewalDate.getTime())) {
      console.log(`Invalid renewal date: ${dateOfRenewal}`);
      renewalDate = null;
    }
  }
  
  // Get current date
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Calculate expiration year and month based on renewal logic
  let expirationYear, expirationMonth;
  
  if (vehicleStatusType === "New") {
    // New vehicles: initial registration is valid for 3 years from renewal date
    if (renewalDate) {
      expirationYear = renewalDate.getFullYear() + 3;
      expirationMonth = monthIndex;
    } else {
      // If no renewal date, use current year + 3
      expirationYear = currentYear + 3;
      expirationMonth = monthIndex;
    }
  } else {
    // Old vehicles: registration expires yearly based on plate number
    if (renewalDate) {
      // If renewed within current year, expires next year
      const renewalYear = renewalDate.getFullYear();
      if (renewalYear === currentYear) {
        expirationYear = currentYear + 1;
        expirationMonth = monthIndex;
      } else {
        // If renewed in previous year, check if it's past the renewal period
        expirationYear = currentYear;
        expirationMonth = monthIndex;
      }
    } else {
      // If no renewal date, use current year
      expirationYear = currentYear;
      expirationMonth = monthIndex;
    }
  }
  
  // Calculate the end date of the specified week in the expiration month/year
  let weekEndDate;
  
  switch (week) {
    case 'first':
      // First week ends on the 7th
      weekEndDate = new Date(expirationYear, expirationMonth, 7);
      break;
    case 'second':
      // Second week ends on the 14th
      weekEndDate = new Date(expirationYear, expirationMonth, 14);
      break;
    case 'third':
      // Third week ends on the 21st
      weekEndDate = new Date(expirationYear, expirationMonth, 21);
      break;
    case 'last':
      // Last week ends on the last day of the month
      weekEndDate = new Date(expirationYear, expirationMonth + 1, 0);
      break;
    default:
      console.log(`Invalid week calculation: ${week}`);
      return null;
  }
  
  // Set expiration to midnight of the next day after the week ends
  const expirationDate = new Date(weekEndDate);
  expirationDate.setDate(expirationDate.getDate() + 1);
  expirationDate.setHours(0, 0, 0, 0);
  
  // Debug logging
  console.log(`Plate: ${plateNo}, Renewal: ${renewalDate ? renewalDate.toISOString() : 'None'}, Expiration: ${expirationDate.toISOString()}, Status: ${vehicleStatusType}, Year: ${expirationYear}, Month: ${expirationMonth}`);
  
  return expirationDate;
};

/**
 * Check if a vehicle is expired based on plate number and date of renewal
 * @param {string} plateNo - The plate number
 * @param {Date|string} dateOfRenewal - The date of renewal (optional)
 * @param {string} vehicleStatusType - The vehicle status type ("New" or "Old")
 * @returns {boolean} - True if expired, false if active
 */
export const isVehicleExpired = (plateNo, dateOfRenewal = null, vehicleStatusType = "Old") => {
  const expirationDate = calculateExpirationDate(plateNo, dateOfRenewal, vehicleStatusType);
  if (!expirationDate) {
    console.log(`Could not calculate expiration date for plate ${plateNo}`);
    return false; // If we can't calculate, assume active
  }
  
  const now = new Date();
  const isExpired = now >= expirationDate;
  
  console.log(`Status check for plate ${plateNo}: Current=${now.toISOString()}, Expiration=${expirationDate.toISOString()}, Expired=${isExpired}`);
  
  return isExpired;
};

/**
 * Get vehicle status based on plate number and date of renewal
 * @param {string} plateNo - The plate number
 * @param {Date|string} dateOfRenewal - The date of renewal (optional)
 * @param {string} vehicleStatusType - The vehicle status type ("New" or "Old")
 * @returns {string} - "1" for active, "0" for expired
 */
export const getVehicleStatus = (plateNo, dateOfRenewal = null, vehicleStatusType = "Old") => {
  const expirationDate = calculateExpirationDate(plateNo, dateOfRenewal, vehicleStatusType);
  if (!expirationDate) {
    console.log(`Could not calculate expiration date for plate ${plateNo}, assuming active`);
    return "1"; // If we can't calculate, assume active
  }
  
  const now = new Date();
  const isExpired = now >= expirationDate;
  const status = isExpired ? "0" : "1";
  
  console.log(`Final status for plate ${plateNo}: ${status} (${isExpired ? 'EXPIRED' : 'ACTIVE'})`);
  
  return status;
};

/**
 * Get human-readable status description
 * @param {string} plateNo - The plate number
 * @param {Date|string} dateOfRenewal - The date of renewal (optional)
 * @param {string} vehicleStatusType - The vehicle status type ("New" or "Old")
 * @returns {string} - "Active" or "Expired"
 */
export const getVehicleStatusDescription = (plateNo, dateOfRenewal = null, vehicleStatusType = "Old") => {
  return isVehicleExpired(plateNo, dateOfRenewal, vehicleStatusType) ? "Expired" : "Active";
};

/**
 * Get expiration information for a plate number
 * @param {string} plateNo - The plate number
 * @param {Date|string} dateOfRenewal - The date of renewal (optional)
 * @param {string} vehicleStatusType - The vehicle status type ("New" or "Old")
 * @returns {object|null} - Object with expiration details
 */
export const getExpirationInfo = (plateNo, dateOfRenewal = null, vehicleStatusType = "Old") => {
  const lastTwoDigits = extractLastTwoDigits(plateNo);
  if (!lastTwoDigits || lastTwoDigits.length !== 2) {
    return null;
  }
  
  const secondToLastDigit = lastTwoDigits[0];
  const lastDigit = lastTwoDigits[1];
  
  const week = getWeekFromDigit(secondToLastDigit);
  const monthIndex = getMonthFromDigit(lastDigit);
  
  if (!week || monthIndex === null) {
    return null;
  }
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const expirationDate = calculateExpirationDate(plateNo, dateOfRenewal, vehicleStatusType);
  
  return {
    lastTwoDigits,
    week,
    month: monthNames[monthIndex],
    expirationDate,
    isExpired: isVehicleExpired(plateNo, dateOfRenewal, vehicleStatusType),
    status: getVehicleStatus(plateNo, dateOfRenewal, vehicleStatusType)
  };
};
