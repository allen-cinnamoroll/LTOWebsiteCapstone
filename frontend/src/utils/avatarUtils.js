/**
 * Utility functions for avatar URL handling
 */

/**
 * Get the backend base URL from environment or default
 * @returns {string} Backend base URL without /api suffix
 */
export const getBackendBaseURL = () => {
  const apiBaseURL = import.meta.env.VITE_BASE_URL || 'https://ltodatamanager.com/api';
  return apiBaseURL.replace('/api', '');
};

/**
 * Construct full avatar URL from relative path
 * @param {string} avatarPath - Relative path like 'uploads/avatars/avatar-123.jpg'
 * @param {boolean} addCacheBusting - Whether to add cache-busting query parameter
 * @returns {string} Full avatar URL
 */
export const getAvatarURL = (avatarPath, addCacheBusting = false) => {
  if (!avatarPath) return '';
  
  // If already a full URL, return as-is (but remove old cache-busting if present)
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    const urlWithoutQuery = avatarPath.split('?')[0];
    return addCacheBusting ? `${urlWithoutQuery}?t=${Date.now()}` : urlWithoutQuery;
  }
  
  // Construct full URL from relative path
  const backendURL = getBackendBaseURL();
  const fullURL = `${backendURL}/${avatarPath}`;
  
  return addCacheBusting ? `${fullURL}?t=${Date.now()}` : fullURL;
};

/**
 * Extract relative path from avatar URL
 * @param {string} avatarURL - Full or relative avatar URL
 * @returns {string} Relative path like 'uploads/avatars/avatar-123.jpg'
 */
export const getRelativeAvatarPath = (avatarURL) => {
  if (!avatarURL) return '';
  
  // If already a relative path, return as-is
  if (!avatarURL.startsWith('http://') && !avatarURL.startsWith('https://')) {
    return avatarURL.split('?')[0]; // Remove any query parameters
  }
  
  // Extract path from full URL
  try {
    const url = new URL(avatarURL);
    // Remove leading slash and query parameters
    return url.pathname.substring(1).split('?')[0];
  } catch (error) {
    console.error('Error parsing avatar URL:', error);
    return '';
  }
};

