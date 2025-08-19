import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BASE_URL;
// Create an Axios instance with custom headers
const apiClient = axios.create({
  baseURL: API_BASE_URL,
//   withCredentials: true
});

export default apiClient;