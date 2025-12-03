/**
 * Utility functions for URL construction
 * Ensures proper HTTPS URLs in production and no mixed content warnings
 */

/**
 * Get backend base URL for static assets (avatars, uploads, etc.)
 * Uses VITE_BASE_URL or falls back to window.location.origin
 * Removes the /api suffix from VITE_BASE_URL if present
 * Prioritizes current window.location.origin in production to avoid localhost URLs
 * 
 * @returns {string} Backend base URL (e.g., https://ltodatamanager.com)
 */
export const getBackendBaseURL = () => {
  // If in browser, check current origin first (prioritize production domain)
  if (typeof window !== 'undefined') {
    const currentOrigin = window.location.origin;
    
    // If we're on production domain, always use it (even if VITE_BASE_URL has localhost)
    if (currentOrigin.includes('ltodatamanager.com') || 
        (!currentOrigin.includes('localhost') && !currentOrigin.includes('127.0.0.1'))) {
      return currentOrigin;
    }
    
    // In development (localhost), try VITE_BASE_URL first, then fallback to current origin
    const envURL = import.meta.env.VITE_BASE_URL;
    if (envURL) {
      // Remove /api suffix if present
      const cleanURL = envURL.replace(/\/api$/, '');
      // Only use env URL if it's not localhost (when we're in production)
      if (!cleanURL.includes('localhost') && !cleanURL.includes('127.0.0.1')) {
        return cleanURL;
      }
      // If env URL is localhost but we're in production, ignore it
      if (!currentOrigin.includes('localhost')) {
        return currentOrigin;
      }
      return cleanURL;
    }
    
    return currentOrigin;
  }
  
  // Server-side rendering fallback
  const envURL = import.meta.env.VITE_BASE_URL;
  if (envURL) {
    return envURL.replace(/\/api$/, '');
  }
  
  // Final fallback
  return 'https://ltodatamanager.com';
};

/**
 * Construct a full URL for an avatar image
 * Normalizes paths to ensure proper URL construction
 * Always uses HTTPS in production to prevent mixed content warnings
 * 
 * @param {string} avatarPath - Relative path from backend root (e.g., 'uploads/avatars/avatar-123.jpg' or '/uploads/avatars/avatar-123.jpg')
 * @param {boolean} addCacheBuster - Whether to add a cache-busting query parameter
 * @returns {string} Full URL to the avatar image, or empty string if path is invalid
 */
export const getAvatarURL = (avatarPath, addCacheBuster = false) => {
  if (!avatarPath || typeof avatarPath !== 'string') {
    return '';
  }
  
  // If already a full URL, normalize it to HTTPS and replace localhost
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    let normalizedURL = avatarPath;
    
    // Convert HTTP to HTTPS to prevent mixed content warnings
    if (normalizedURL.startsWith('http://')) {
      normalizedURL = normalizedURL.replace('http://', 'https://');
    }
    
    // Replace localhost URLs with production URL
    if (normalizedURL.includes('localhost:5000') || normalizedURL.includes('localhost:')) {
      const backendURL = getBackendBaseURL();
      // Extract the path and query from the localhost URL
      try {
        const urlObj = new URL(normalizedURL);
        const path = urlObj.pathname;
        const query = urlObj.search; // Preserve existing query params
        normalizedURL = `${backendURL}${path}${query}`;
      } catch (e) {
        // If URL parsing fails, try simple string replacement
        console.warn('Failed to parse URL, using string replacement:', e);
        const pathMatch = normalizedURL.match(/https?:\/\/[^\/]+(\/[^?]*)/);
        if (pathMatch) {
          normalizedURL = `${backendURL}${pathMatch[1]}`;
        }
      }
    }
    
    if (addCacheBuster) {
      // Remove existing query params and add new cache-buster
      const urlWithoutQuery = normalizedURL.split('?')[0];
      return `${urlWithoutQuery}?t=${Date.now()}`;
    }
    return normalizedURL;
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

