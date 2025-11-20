import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'https://ltodatamanager.com/api';
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