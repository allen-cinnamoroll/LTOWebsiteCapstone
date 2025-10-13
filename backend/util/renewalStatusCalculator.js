/**
 * Utility functions for calculating renewal status
 */

/**
 * Calculate the scheduled renewal week based on plate number
 * @param {string} plateNo - The plate number
 * @returns {Date} - The scheduled renewal week start date
 */
export const getScheduledRenewalWeek = (plateNo) => {
  // Extract the last digit of the plate number
  const lastDigit = parseInt(plateNo.slice(-1));
  
  // Get current year
  const currentYear = new Date().getFullYear();
  
  // Calculate the scheduled week based on the last digit
  // Each digit corresponds to a specific week in the year
  const weeksPerDigit = 52 / 10; // 5.2 weeks per digit
  const weekNumber = Math.floor(lastDigit * weeksPerDigit);
  
  // Create date for the scheduled week (Monday of that week)
  const scheduledDate = new Date(currentYear, 0, 1 + (weekNumber * 7));
  
  return scheduledDate;
};

/**
 * Calculate the due date (end of the scheduled week)
 * @param {string} plateNo - The plate number
 * @returns {Date} - The due date (Sunday of the scheduled week)
 */
export const getDueDate = (plateNo) => {
  const scheduledWeek = getScheduledRenewalWeek(plateNo);
  const dueDate = new Date(scheduledWeek);
  dueDate.setDate(scheduledWeek.getDate() + 6); // Add 6 days to get Sunday
  return dueDate;
};

/**
 * Determine renewal status based on renewal date and plate number
 * @param {string} plateNo - The plate number
 * @param {Date} renewalDate - The actual renewal date
 * @returns {Object} - Object containing status, scheduledWeek, and dueDate
 */
export const calculateRenewalStatus = (plateNo, renewalDate) => {
  const scheduledWeek = getScheduledRenewalWeek(plateNo);
  const dueDate = getDueDate(plateNo);
  
  // Create dates for comparison (ignore time)
  const renewal = new Date(renewalDate);
  renewal.setHours(0, 0, 0, 0);
  
  const scheduled = new Date(scheduledWeek);
  scheduled.setHours(0, 0, 0, 0);
  
  const due = new Date(dueDate);
  due.setHours(23, 59, 59, 999); // End of day
  
  let status;
  
  if (renewal < scheduled) {
    status = "Early Renewal";
  } else if (renewal >= scheduled && renewal <= due) {
    status = "On-Time Renewal";
  } else {
    status = "Late Renewal";
  }
  
  return {
    status,
    scheduledWeek,
    dueDate
  };
};

/**
 * Get renewal status for display
 * @param {string} status - The renewal status
 * @returns {Object} - Object with display properties
 */
export const getRenewalStatusDisplay = (status) => {
  const statusConfig = {
    "Early Renewal": {
      color: "text-green-600",
      bgColor: "bg-green-100",
      icon: "✓"
    },
    "On-Time Renewal": {
      color: "text-blue-600", 
      bgColor: "bg-blue-100",
      icon: "✓"
    },
    "Late Renewal": {
      color: "text-red-600",
      bgColor: "bg-red-100", 
      icon: "⚠"
    }
  };
  
  return statusConfig[status] || {
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    icon: "?"
  };
};
