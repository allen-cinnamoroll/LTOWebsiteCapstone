/**
 * Utility functions for determining renewal status
 * Calculates whether a renewal is Early, On-Time, or Late based on plate number
 */

import { calculateExpirationDate, extractLastTwoDigits, getWeekFromDigit, getMonthFromDigit } from './plateStatusCalculator.js';

/**
 * Calculate the scheduled renewal week for a vehicle based on plate number
 * @param {string} plateNo - The plate number
 * @param {string} vehicleStatusType - The vehicle status type ("New" or "Old")
 * @returns {object|null} - Object with week start and end dates, or null if calculation fails
 */
export const calculateScheduledRenewalWeek = (plateNo, vehicleStatusType = "Old") => {
  try {
    if (!plateNo || typeof plateNo !== 'string') {
      console.error("Invalid plate number provided:", plateNo);
      return null;
    }

    const lastTwoDigits = extractLastTwoDigits(plateNo);
    if (!lastTwoDigits || lastTwoDigits.length !== 2) {
      console.error(`Invalid plate number format: ${plateNo}`);
      return null;
    }

    const secondToLastDigit = lastTwoDigits[0];
    const lastDigit = lastTwoDigits[1];
    
    const week = getWeekFromDigit(secondToLastDigit);
    const monthIndex = getMonthFromDigit(lastDigit);
    
    if (!week || monthIndex === null) {
      console.error(`Invalid week or month calculation for plate ${plateNo}: week=${week}, monthIndex=${monthIndex}`);
      return null;
    }

    // Get current year for calculation
    const currentYear = new Date().getFullYear();
    
    // Calculate the year and month for the scheduled renewal
    let renewalYear, renewalMonth;
    
    if (vehicleStatusType === "New") {
      // New vehicles: 3-year cycle
      renewalYear = currentYear + 3;
      renewalMonth = monthIndex;
    } else {
      // Old vehicles: yearly cycle
      renewalYear = currentYear;
      renewalMonth = monthIndex;
      
      // If the month has passed this year, use next year
      const currentMonth = new Date().getMonth();
      if (currentMonth > monthIndex) {
        renewalYear = currentYear + 1;
      }
    }

    // Calculate the start and end of the scheduled week
    let weekStart, weekEnd;
    
    switch (week) {
      case 'first':
        weekStart = new Date(renewalYear, renewalMonth, 1);
        weekEnd = new Date(renewalYear, renewalMonth, 7);
        break;
      case 'second':
        weekStart = new Date(renewalYear, renewalMonth, 8);
        weekEnd = new Date(renewalYear, renewalMonth, 14);
        break;
      case 'third':
        weekStart = new Date(renewalYear, renewalMonth, 15);
        weekEnd = new Date(renewalYear, renewalMonth, 21);
        break;
      case 'last':
        weekStart = new Date(renewalYear, renewalMonth, 22);
        weekEnd = new Date(renewalYear, renewalMonth + 1, 0); // Last day of month
        break;
      default:
        console.error(`Invalid week calculation: ${week}`);
        return null;
    }

    return {
      weekStart,
      weekEnd,
      week,
      month: renewalMonth,
      year: renewalYear
    };
  } catch (error) {
    console.error("Error calculating scheduled renewal week:", error);
    return null;
  }
};

/**
 * Determine the renewal status based on renewal date and scheduled week
 * @param {string} plateNo - The plate number
 * @param {Date|string} renewalDate - The actual renewal date
 * @param {string} vehicleStatusType - The vehicle status type ("New" or "Old")
 * @returns {object} - Object with status and metadata
 */
export const determineRenewalStatus = (plateNo, renewalDate, vehicleStatusType = "Old") => {
  try {
    if (!plateNo || !renewalDate) {
      throw new Error("Plate number and renewal date are required");
    }

    const renewalDateObj = new Date(renewalDate);
    if (isNaN(renewalDateObj.getTime())) {
      throw new Error("Invalid renewal date format");
    }

    const scheduledWeek = calculateScheduledRenewalWeek(plateNo, vehicleStatusType);
    if (!scheduledWeek) {
      throw new Error("Could not calculate scheduled renewal week");
    }

    const { weekStart, weekEnd } = scheduledWeek;
    
    // Calculate days difference from the start of the scheduled week
    const daysDifference = Math.floor((renewalDateObj - weekStart) / (1000 * 60 * 60 * 24));
    
    let status;
    let statusDescription;
    
    if (daysDifference < -7) {
      // More than 7 days before scheduled week
      status = "Early Renewal";
      statusDescription = `Renewed ${Math.abs(daysDifference)} days before scheduled week`;
    } else if (renewalDateObj >= weekStart && renewalDateObj <= weekEnd) {
      // Within the scheduled week
      status = "On-Time Renewal";
      statusDescription = "Renewed within the scheduled week";
    } else {
      // After the scheduled week
      status = "Late Renewal";
      const daysLate = Math.floor((renewalDateObj - weekEnd) / (1000 * 60 * 60 * 24));
      statusDescription = `Renewed ${daysLate} days after scheduled week`;
    }

    return {
      status,
      statusDescription,
      renewalDate: renewalDateObj,
      scheduledWeekStart: weekStart,
      scheduledWeekEnd: weekEnd,
      daysDifference,
      plateNumber: plateNo,
      vehicleStatusType
    };
  } catch (error) {
    console.error("Error determining renewal status:", error);
    // Return a safe default status
    return {
      status: "On-Time Renewal",
      statusDescription: "Status could not be determined",
      renewalDate: new Date(renewalDate),
      scheduledWeekStart: null,
      scheduledWeekEnd: null,
      daysDifference: 0,
      plateNumber: plateNo,
      vehicleStatusType,
      error: error.message
    };
  }
};

/**
 * Create a renewal history record with proper status determination
 * @param {object} vehicleData - The vehicle data
 * @param {Date|string} renewalDate - The renewal date
 * @param {string} processedBy - User ID who processed the renewal
 * @returns {object} - The renewal status data
 */
export const createRenewalStatusRecord = (vehicleData, renewalDate, processedBy = null) => {
  try {
    if (!vehicleData) {
      throw new Error("Vehicle data is required");
    }

    if (!vehicleData.plateNo) {
      throw new Error("Vehicle plate number is required");
    }

    const statusData = determineRenewalStatus(
      vehicleData.plateNo,
      renewalDate,
      vehicleData.vehicleStatusType || "Old"
    );

    return {
      vehicleId: vehicleData._id,
      renewalDate: new Date(renewalDate),
      status: statusData.status,
      processedBy: processedBy,
      plateNumber: vehicleData.plateNo,
      scheduledWeekStart: statusData.scheduledWeekStart,
      scheduledWeekEnd: statusData.scheduledWeekEnd,
      daysDifference: statusData.daysDifference,
      statusDescription: statusData.statusDescription,
      error: statusData.error || null
    };
  } catch (error) {
    console.error("Error creating renewal status record:", error);
    throw error;
  }
};

/**
 * Validate renewal data before processing
 * @param {object} renewalData - The renewal data to validate
 * @returns {object} - Validation result with isValid and errors
 */
export const validateRenewalData = (renewalData) => {
  const errors = [];
  
  try {
    if (!renewalData) {
      errors.push("Renewal data is required");
      return { isValid: false, errors };
    }

    if (!renewalData.vehicleId) {
      errors.push("Vehicle ID is required");
    }

    if (!renewalData.renewalDate) {
      errors.push("Renewal date is required");
    } else {
      const renewalDate = new Date(renewalData.renewalDate);
      if (isNaN(renewalDate.getTime())) {
        errors.push("Invalid renewal date format");
      } else if (renewalDate > new Date()) {
        errors.push("Renewal date cannot be in the future");
      }
    }

    if (!renewalData.plateNumber) {
      errors.push("Plate number is required");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error("Error validating renewal data:", error);
    return {
      isValid: false,
      errors: ["Validation error occurred"]
    };
  }
};
