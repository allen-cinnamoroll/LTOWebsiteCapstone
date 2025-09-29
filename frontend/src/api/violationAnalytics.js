import apiClient from './axios.js';

// Get violation count statistics
export const getViolationCount = async () => {
  try {
    const response = await apiClient.get('/violations/count');
    return response.data;
  } catch (error) {
    console.error('Error fetching violation count:', error);
    throw error;
  }
};

// Get all violations
export const getViolations = async () => {
  try {
    const response = await apiClient.get('/violations');
    return response.data;
  } catch (error) {
    console.error('Error fetching violations:', error);
    throw error;
  }
};

// Get comprehensive violation analytics
export const getViolationAnalytics = async (filters = {}, year = null) => {
  try {
    const params = new URLSearchParams();
    
    if (year) {
      params.append('year', year);
    }
    
    // Add other filters if needed - ensure filters is an object
    if (filters && typeof filters === 'object') {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined) {
          params.append(key, filters[key]);
        }
      });
    }
    
    const queryString = params.toString();
    const url = `/violations/analytics${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching violation analytics:', error);
    throw error;
  }
};

// Helper function to get month name from number
export const getMonthName = (monthNumber) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthNumber - 1] || 'Unknown';
};

// Helper function to get month number from name
export const getMonthNumber = (monthName) => {
  const months = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12
  };
  return months[monthName] || 0;
};