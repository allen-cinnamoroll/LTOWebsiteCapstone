/**
 * Utility functions for URL construction
 * Ensures proper HTTPS URLs in production and no mixed content warnings
 */

/**
 * Get backend base URL for static assets (avatars, uploads, etc.)
 * Uses VITE_BASE_URL or falls back to window.location.origin
 * Removes the /api suffix from VITE_BASE_URL if present
 * 
 * @returns {string} Backend base URL (e.g., https://ltodatamanager.com)
 */
export const getBackendBaseURL = () => {
  // First try environment variable
  const envURL = import.meta.env.VITE_BASE_URL;
  if (envURL) {
    // Remove /api suffix if present
    return envURL.replace(/\/api$/, '');
  }
  
  // Fallback to current origin (works in dev and prod)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Final fallback
  return 'https://ltodatamanager.com';
};

/**
 * Construct a full URL for an avatar image
 * Normalizes paths to ensure proper URL construction
 * 
 * @param {string} avatarPath - Relative path from backend root (e.g., 'uploads/avatars/avatar-123.jpg' or '/uploads/avatars/avatar-123.jpg')
 * @param {boolean} addCacheBuster - Whether to add a cache-busting query parameter
 * @returns {string} Full URL to the avatar image, or empty string if path is invalid
 */
export const getAvatarURL = (avatarPath, addCacheBuster = false) => {
  if (!avatarPath || typeof avatarPath !== 'string') {
    return '';
  }
  
  // If already a full URL, handle cache-busting if needed
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    if (addCacheBuster) {
      // Remove existing query params and add new cache-buster
      const urlWithoutQuery = avatarPath.split('?')[0];
      return `${urlWithoutQuery}?t=${Date.now()}`;
    }
    return avatarPath;
  }
  
  // Get backend base URL
  const backendURL = getBackendBaseURL();
  
  // Normalize path: remove leading slash, ensure it starts with 'uploads/'
  let cleanPath = avatarPath.replace(/^\/+/, ''); // Remove leading slashes
  if (!cleanPath.startsWith('uploads/')) {
    // If path doesn't start with uploads/, assume it's relative to uploads/
    cleanPath = `uploads/${cleanPath}`;
  }
  
  // Construct URL
  const url = `${backendURL}/${cleanPath}`;
  
  if (addCacheBuster) {
    // Remove existing query params if any, then add cache-buster
    const urlWithoutQuery = url.split('?')[0];
    return `${urlWithoutQuery}?t=${Date.now()}`;
  }
  
  return url;
};

