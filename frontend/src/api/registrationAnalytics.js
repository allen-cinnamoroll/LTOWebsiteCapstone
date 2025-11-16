import apiClient from './axios.js';

const getFilenameFromHeaders = (headers, fallback) => {
  const disposition = headers['content-disposition'] || headers['Content-Disposition'];
  if (!disposition) return fallback;
  const match = disposition.match(/filename="?(?<filename>[^"]+)"?/);
  return match?.groups?.filename || fallback;
};

// Get registration analytics data
export const getRegistrationAnalytics = async (month = null, year = null) => {
  try {
    const params = {};
    if (month) params.month = month;
    if (year) params.year = year;
    
    const response = await apiClient.get('/dashboard/registration-analytics', { params });
    return response.data;
  } catch (error) {
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
    // The backend returns the data directly, not wrapped in a data property
    return response.data;
  } catch (error) {
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
    throw error;
  }
};

// Get yearly vehicle registration trends
export const getYearlyVehicleTrends = async (startYear = null, endYear = null, municipality = null) => {
  try {
    const params = {};
    if (startYear) params.startYear = startYear;
    if (endYear) params.endYear = endYear;
    if (municipality) params.municipality = municipality;
    
    const response = await apiClient.get('/dashboard/yearly-vehicle-trends', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get monthly vehicle registration trends
export const getMonthlyVehicleTrends = async (year, municipality = null) => {
  try {
    const params = { year };
    if (municipality) params.municipality = municipality;
    
    const response = await apiClient.get('/dashboard/monthly-vehicle-trends', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get owner data by municipality with license status breakdown
export const getOwnerMunicipalityData = async (month = null, year = null) => {
  try {
    const params = {};
    if (month) params.month = month;
    if (year) params.year = year;
    
    const response = await apiClient.get('/dashboard/owner-municipality-data', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get vehicle classification data
export const getVehicleClassificationData = async (month = null, year = null) => {
  try {
    const params = {};
    if (month) params.month = month;
    if (year) params.year = year;
    
    const response = await apiClient.get('/dashboard/vehicle-classification-data', { params });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const exportRegistrationReportPdf = async (payload) => {
  const response = await apiClient.post('/reports/registration/pdf', payload, {
    responseType: 'blob'
  });
  const filename = getFilenameFromHeaders(
    response.headers,
    `registration-report-${payload.scope || 'monthly'}.pdf`
  );
  return { blob: response.data, filename };
};

export const exportRegistrationReportCsv = async (payload) => {
  const response = await apiClient.post('/reports/registration/csv', payload, {
    responseType: 'blob'
  });
  const filename = getFilenameFromHeaders(
    response.headers,
    `registration-data-${payload.scope || 'monthly'}.csv`
  );
  return { blob: response.data, filename };
};
