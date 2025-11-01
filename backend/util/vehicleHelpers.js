/**
 * Helper utilities for working with vehicle dateOfRenewal arrays
 */

/**
 * Get the latest renewal date from a dateOfRenewal array
 * @param {Array|Date|Object} dateOfRenewal - The dateOfRenewal field (can be array, single date, or null)
 * @returns {Date|null} - The most recent renewal date, or null if none
 */
export const getLatestRenewalDate = (dateOfRenewal) => {
  if (!dateOfRenewal) return null;
  
  // If it's already a Date, return it
  if (dateOfRenewal instanceof Date) {
    return dateOfRenewal;
  }
  
  // If it's an array
  if (Array.isArray(dateOfRenewal)) {
    if (dateOfRenewal.length === 0) return null;
    
    // Get all dates from the array
    const dates = dateOfRenewal
      .map(item => {
        // Handle {date: Date} objects
        if (item && typeof item === 'object' && item.date) {
          return new Date(item.date);
        }
        // Handle plain Date objects or date strings
        return item ? new Date(item) : null;
      })
      .filter(date => date && !isNaN(date.getTime()));
    
    if (dates.length === 0) return null;
    
    // Return the latest date
    return new Date(Math.max(...dates.map(d => d.getTime())));
  }
  
  // Try to parse as a single date
  try {
    const date = new Date(dateOfRenewal);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

/**
 * Get all renewal dates from a dateOfRenewal array
 * @param {Array|Date|Object} dateOfRenewal - The dateOfRenewal field
 * @returns {Array<Date>} - Array of all renewal dates, sorted chronologically
 */
export const getAllRenewalDates = (dateOfRenewal) => {
  if (!dateOfRenewal) return [];
  
  // If it's a single Date, return array with one date
  if (dateOfRenewal instanceof Date) {
    return [dateOfRenewal];
  }
  
  // If it's an array
  if (Array.isArray(dateOfRenewal)) {
    const dates = dateOfRenewal
      .map(item => {
        if (item && typeof item === 'object' && item.date) {
          return new Date(item.date);
        }
        return item ? new Date(item) : null;
      })
      .filter(date => date && !isNaN(date.getTime()))
      .map(date => new Date(date));
    
    // Sort chronologically
    return dates.sort((a, b) => a.getTime() - b.getTime());
  }
  
  // Try to parse as a single date
  try {
    const date = new Date(dateOfRenewal);
    return isNaN(date.getTime()) ? [] : [date];
  } catch {
    return [];
  }
};

/**
 * Extract renewal date for status calculation
 * Always returns a single Date or null, suitable for getVehicleStatus()
 * @param {Array|Date|Object} dateOfRenewal - The dateOfRenewal field
 * @returns {Date|null} - The latest renewal date for status calculation
 */
export const extractRenewalDateForStatus = (dateOfRenewal) => {
  return getLatestRenewalDate(dateOfRenewal);
};

