// API functions for vehicle registration predictions
// Get Flask API URL from environment variable or use relative path in production
// In production, use relative path through nginx proxy (same origin = no CORS issues)
// In development, use explicit localhost URL or env variable
const getMVPredictionAPIBase = () => {
  // If environment variable is explicitly set, use it (highest priority)
  if (import.meta.env.VITE_MV_PREDICTION_API_URL) {
    return import.meta.env.VITE_MV_PREDICTION_API_URL;
  }
  
  // In development mode, use localhost
  if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
    return 'http://localhost:5002';
  }
  
  // In production, use relative path through nginx proxy
  // This avoids CORS issues and works with the nginx reverse proxy
  return '/mv-prediction-api';
};

const MV_PREDICTION_API_BASE = getMVPredictionAPIBase();

// Export the API base URL for use in components
export const getMVPredictionAPIBaseURL = () => MV_PREDICTION_API_BASE;

/**
 * Fetch weekly vehicle registration predictions
 * @param {number} weeks - Number of weeks to predict (default: 12, max: 52)
 * @param {string} municipality - Optional municipality filter
 * @returns {Promise} Prediction data with weekly_predictions array
 */
export const getWeeklyPredictions = async (weeks = 12, municipality = null) => {
  try {
    const params = new URLSearchParams();
    params.append('weeks', weeks.toString());
    if (municipality) {
      params.append('municipality', municipality);
    }
    
    const url = `${MV_PREDICTION_API_BASE}/api/predict/registrations?${params.toString()}`;
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      const contentType = response.headers.get('content-type') || '';

      let friendlyMessage = '';

      // Prefer structured JSON error messages when available
      if (contentType.includes('application/json')) {
        try {
          const errorData = JSON.parse(errorText);
          friendlyMessage = errorData.error || JSON.stringify(errorData);
        } catch {
          friendlyMessage = errorText || `HTTP ${response.status}`;
        }
      } else if (contentType.includes('text/html')) {
        // Avoid dumping raw HTML (e.g., nginx 502 pages) into the UI
        const statusText = response.statusText || 'Server Error';
        friendlyMessage = `${response.status} ${statusText} (HTML error page from server)`;
      } else {
        friendlyMessage = errorText || `HTTP ${response.status}`;
      }

      throw new Error(`HTTP error! status: ${response.status}, message: ${friendlyMessage}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    // Re-throw with more context if it's a network error
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      throw new Error('Request timed out. The server may be slow or unreachable.');
    } else if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      throw new Error(`Failed to fetch: Cannot connect to ${MV_PREDICTION_API_BASE}. Please check if the server is running.`);
    }
    
    throw error;
  }
};

/**
 * Get model accuracy metrics
 * @param {string} municipality - Optional municipality filter
 * @returns {Promise} Accuracy data with MAPE, MAE, RMSE
 */
export const getModelAccuracy = async (municipality = null) => {
  try {
    const params = new URLSearchParams();
    if (municipality) {
      params.append('municipality', municipality);
    }
    
    const url = municipality 
      ? `${MV_PREDICTION_API_BASE}/api/model/accuracy?${params.toString()}`
      : `${MV_PREDICTION_API_BASE}/api/model/accuracy`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

