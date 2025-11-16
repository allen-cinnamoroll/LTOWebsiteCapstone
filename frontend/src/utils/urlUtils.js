/**
 * Utility functions for URL construction
 * Ensures proper HTTPS URLs in production and no mixed content warnings
 */

/**
 * Get backend base URL for static assets (avatars, uploads, etc.)
 * Removes the /api suffix from VITE_BASE_URL to get the backend root
 * 
 * @returns {string} Backend base URL (e.g., https://ltodatamanager.com)
 */
export const getBackendBaseURL = () => {
  const apiBaseURL = import.meta.env.VITE_BASE_URL || 'https://ltodatamanager.com/api';
  // Remove /api suffix to get the backend base URL
  return apiBaseURL.replace(/\/api$/, '');
};

/**
 * Construct a full URL for an avatar image
 * 
 * @param {string} avatarPath - Relative path from backend root (e.g., 'uploads/avatars/avatar-123.jpg')
 * @param {boolean} addCacheBuster - Whether to add a cache-busting query parameter
 * @returns {string} Full URL to the avatar image
 */
export const getAvatarURL = (avatarPath, addCacheBuster = false) => {
  if (!avatarPath) return '';
  
  // If already a full URL, return as is
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }
  
  const backendURL = getBackendBaseURL();
  const url = `${backendURL}/${avatarPath}`;
  
  if (addCacheBuster) {
    return `${url}?t=${Date.now()}`;
  }
  
  return url;
};

