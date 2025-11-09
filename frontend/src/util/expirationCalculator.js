/**
 * Utility functions for calculating vehicle expiration date based on plate number
 * This is a frontend version of the backend plateStatusCalculator logic
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
const extractLastTwoDigits = (plateNo) => {
  if (!plateNo || typeof plateNo !== 'string') {
    return null;
  }
  
  // Remove all non-digit characters and get the last two digits
  const digits = plateNo.replace(/\D/g, '');
  return digits.length >= 2 ? digits.slice(-2) : null;
};

/**
 * Get the week of the month based on the second to last digit
 * @param {string} secondToLastDigit - The second to last digit
 * @returns {string} - The week description
 */
const getWeekFromDigit = (secondToLastDigit) => {
  return WEEK_LOOKUP[secondToLastDigit] || null;
};

/**
 * Get the month number (0-11) based on the last digit
 * @param {string} lastDigit - The last digit
 * @returns {number} - The month number (0-11, where 0 = January)
 */
const getMonthFromDigit = (lastDigit) => {
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
  
  return expirationDate;
};

/**
 * Check if a renewal date is within the allowed renewal window (2 months before expiration)
 * @param {string} plateNo - The plate number
 * @param {Date|string} currentRenewalDate - The current/latest renewal date
 * @param {Date|string} newRenewalDate - The proposed new renewal date
 * @param {string} vehicleStatusType - The vehicle status type ("New" or "Old")
 * @returns {object} - { isValid: boolean, message: string, earliestRenewalDate: Date|null }
 */
export const validateRenewalWindow = (plateNo, currentRenewalDate, newRenewalDate, vehicleStatusType = "Old") => {
  if (!plateNo || !currentRenewalDate || !newRenewalDate) {
    return {
      isValid: false,
      message: "Missing required information for renewal validation",
      earliestRenewalDate: null
    };
  }

  // Calculate expiration date based on current renewal date
  const expirationDate = calculateExpirationDate(plateNo, currentRenewalDate, vehicleStatusType);
  
  if (!expirationDate) {
    return {
      isValid: false,
      message: "Could not calculate expiration date. Please check the plate number format.",
      earliestRenewalDate: null
    };
  }

  // Calculate the earliest allowed renewal date (2 months before expiration month)
  // Example: If expiration is January, earliest renewal is November (2 months before)
  const expirationMonth = expirationDate.getMonth();
  const expirationYear = expirationDate.getFullYear();
  
  // Calculate the earliest renewal month (2 months before expiration month)
  let earliestRenewalMonth = expirationMonth - 2;
  let earliestRenewalYear = expirationYear;
  
  // Handle year rollover (e.g., if expiration is January (month 0), earliest is November (month 10) of previous year)
  if (earliestRenewalMonth < 0) {
    earliestRenewalMonth += 12;
    earliestRenewalYear -= 1;
  }
  
  // Set to first day of the earliest renewal month
  const earliestRenewalDate = new Date(earliestRenewalYear, earliestRenewalMonth, 1);
  earliestRenewalDate.setHours(0, 0, 0, 0);

  const newDate = new Date(newRenewalDate);
  newDate.setHours(0, 0, 0, 0);

  // Check if new renewal date is more than 2 months before expiration
  // Cannot renew 3 months or more in advance
  if (newDate < earliestRenewalDate) {
    const expirationMonthName = expirationDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const earliestMonthName = earliestRenewalDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    return {
      isValid: false,
      message: `Vehicles can only be renewed 2 months in advance of their expiration date. The vehicle expires in ${expirationMonthName}, so renewal can start in ${earliestMonthName}. Please select a date on or after ${earliestRenewalDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`,
      earliestRenewalDate
    };
  }

  return {
    isValid: true,
    message: "",
    earliestRenewalDate
  };
};

