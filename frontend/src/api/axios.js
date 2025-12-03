import axios from 'axios';

// Get API base URL with smart detection for production
const getAPIBaseURL = () => {
  // Get the environment variable
  let apiURL = import.meta.env.VITE_BASE_URL;
  
  // If no env var, use fallback
  if (!apiURL) {
    // In production (served from https://ltodatamanager.com), use relative path to avoid CORS
    if (typeof window !== 'undefined' && window.location.origin.includes('ltodatamanager.com')) {
      return '/api';
    }
    // Development fallback
    return 'https://ltodatamanager.com/api';
  }
  
  // If env var contains localhost and we're in production, fix it
  if (typeof window !== 'undefined' && window.location.origin.includes('ltodatamanager.com')) {
    // We're in production, but env var might be localhost (from old build)
    if (apiURL.includes('localhost') || apiURL.includes('127.0.0.1')) {
      // Use relative path in production (same origin = no CORS issues)
      return '/api';
    }
    // If it's already a production URL, use it
    if (apiURL.includes('ltodatamanager.com')) {
      return apiURL;
    }
    // Otherwise use relative path
    return '/api';
  }
  
  // Development: use the env var as-is
  return apiURL;
};

const API_BASE_URL = getAPIBaseURL();

// Create an Axios instance with custom headers
const apiClient = axios.create({
  baseURL: API_BASE_URL,
//   withCredentials: true
});

// Add a request interceptor to include the auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle auth errors and network restrictions
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle IP whitelist / network restriction errors (403)
    if (error.response?.status === 403 && error.response?.data?.error === 'IP_NOT_WHITELISTED') {
      // Redirect to network restriction page
      window.location.href = '/network-restricted';
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401) {
      // Check if this is a login request - don't redirect on login failures
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      
      if (!isLoginRequest) {
        // Only clear tokens if it's not a login request (token expired on other requests)
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        // Let the AuthContext handle the navigation to prevent state issues
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;