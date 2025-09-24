import apiClient from './axios.js';

// Get registration analytics data
export const getRegistrationAnalytics = async (month = null, year = null) => {
  try {
    const params = {};
    if (month) params.month = month;
    if (year) params.year = year;
    
    const response = await apiClient.get('/dashboard/registration-analytics', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching registration analytics:', error);
    throw error;
  }
};

// Get month name from month number
export const getMonthName = (monthNumber) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber - 1] || '';
};

// Get month number from month name
export const getMonthNumber = (monthName) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months.indexOf(monthName) + 1;
};

// Get municipality analytics data
export const getMunicipalityAnalytics = async (month = null, year = null) => {
  try {
    const params = {};
    if (month) params.month = month;
    if (year) params.year = year;
    
    const response = await apiClient.get('/dashboard/municipality-analytics', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching municipality analytics:', error);
    throw error;
  }
};

// Get municipality registration totals for bar chart
export const getMunicipalityRegistrationTotals = async (month = null, year = null) => {
  try {
    const params = {};
    if (month) params.month = month;
    if (year) params.year = year;
    
    const response = await apiClient.get('/dashboard/municipality-registration-totals', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching municipality registration totals:', error);
    throw error;
  }
};

// Get barangay registration totals for a specific municipality
export const getBarangayRegistrationTotals = async (municipality, month = null, year = null) => {
  try {
    const params = { municipality };
    if (month) params.month = month;
    if (year) params.year = year;
    
    const response = await apiClient.get('/dashboard/barangay-registration-totals', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching barangay registration totals:', error);
    throw error;
  }
};



