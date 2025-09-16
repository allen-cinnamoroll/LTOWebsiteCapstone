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
 * Calculate the expiration date based on plate number and date of renewal
 * @param {string} plateNo - The plate number
 * @param {Date|string} dateOfRenewal - The date of renewal (optional)
 * @returns {Date|null} - The expiration date
 */
export const calculateExpirationDate = (plateNo, dateOfRenewal = null) => {
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
  
  // If date of renewal is provided, use it as the base date
  let baseDate;
  if (dateOfRenewal) {
    baseDate = new Date(dateOfRenewal);
    if (isNaN(baseDate.getTime())) {
      return null;
    }
  } else {
    // If no date of renewal, use current date
    baseDate = new Date();
  }
  
  const renewalYear = baseDate.getFullYear();
  const renewalMonth = baseDate.getMonth();
  
  // Calculate expiration year and month
  // The vehicle always expires in the next year from the renewal date
  let expirationYear = renewalYear + 1;
  let expirationMonth = monthIndex;
  
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
      return null;
  }
  
  // Set expiration to midnight of the next day after the week ends
  const expirationDate = new Date(weekEndDate);
  expirationDate.setDate(expirationDate.getDate() + 1);
  expirationDate.setHours(0, 0, 0, 0);
  
  return expirationDate;
};

/**
 * Check if a vehicle is expired based on plate number and date of renewal
 * @param {string} plateNo - The plate number
 * @param {Date|string} dateOfRenewal - The date of renewal (optional)
 * @returns {boolean} - True if expired, false if active
 */
export const isVehicleExpired = (plateNo, dateOfRenewal = null) => {
  const expirationDate = calculateExpirationDate(plateNo, dateOfRenewal);
  if (!expirationDate) {
    return false; // If we can't calculate, assume active
  }
  
  const now = new Date();
  return now >= expirationDate;
};

/**
 * Get vehicle status based on plate number and date of renewal
 * @param {string} plateNo - The plate number
 * @param {Date|string} dateOfRenewal - The date of renewal (optional)
 * @returns {string} - "1" for active, "0" for expired
 */
export const getVehicleStatus = (plateNo, dateOfRenewal = null) => {
  return isVehicleExpired(plateNo, dateOfRenewal) ? "0" : "1";
};

/**
 * Get human-readable status description
 * @param {string} plateNo - The plate number
 * @param {Date|string} dateOfRenewal - The date of renewal (optional)
 * @returns {string} - "Active" or "Expired"
 */
export const getVehicleStatusDescription = (plateNo, dateOfRenewal = null) => {
  return isVehicleExpired(plateNo, dateOfRenewal) ? "Expired" : "Active";
};

/**
 * Get expiration information for a plate number
 * @param {string} plateNo - The plate number
 * @param {Date|string} dateOfRenewal - The date of renewal (optional)
 * @returns {object|null} - Object with expiration details
 */
export const getExpirationInfo = (plateNo, dateOfRenewal = null) => {
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
  
  const expirationDate = calculateExpirationDate(plateNo, dateOfRenewal);
  
  return {
    lastTwoDigits,
    week,
    month: monthNames[monthIndex],
    expirationDate,
    isExpired: isVehicleExpired(plateNo, dateOfRenewal),
    status: getVehicleStatus(plateNo, dateOfRenewal)
  };
};
