/**
 * Utility functions for form data persistence in localStorage
 * Handles serialization/deserialization of form data including Date objects
 */

/**
 * Serialize form data for localStorage (handles Date objects)
 * @param {Object} formData - Form data object
 * @returns {string} - JSON string with dates converted to ISO strings
 */
export const serializeFormData = (formData) => {
  const serialized = { ...formData };
  
  // Convert Date objects to ISO strings
  Object.keys(serialized).forEach(key => {
    if (serialized[key] instanceof Date) {
      serialized[key] = serialized[key].toISOString();
    } else if (serialized[key] === null || serialized[key] === undefined) {
      // Keep null/undefined as is
      serialized[key] = serialized[key];
    }
  });
  
  return JSON.stringify(serialized);
};

/**
 * Deserialize form data from localStorage (converts ISO strings back to Date objects)
 * @param {string} jsonString - JSON string from localStorage
 * @returns {Object|null} - Form data object with dates restored, or null if invalid
 */
export const deserializeFormData = (jsonString) => {
  if (!jsonString) return null;
  
  try {
    const parsed = JSON.parse(jsonString);
    const deserialized = { ...parsed };
    
    // Convert ISO strings back to Date objects for date fields
    const dateFields = [
      'dateOfApprehension', 'dateOfRenewal', 'birthDate',
      'dateEncoded', 'dateReported', 'dateCommited'
    ];
    
    dateFields.forEach(field => {
      if (deserialized[field] && typeof deserialized[field] === 'string') {
        const date = new Date(deserialized[field]);
        if (!isNaN(date.getTime())) {
          deserialized[field] = date;
        }
      }
    });
    
    return deserialized;
  } catch (error) {
    console.error('Error deserializing form data:', error);
    return null;
  }
};

/**
 * Save form data to localStorage with connection status
 * @param {string} key - localStorage key
 * @param {Object} formData - Form data object
 * @param {boolean} isOffline - Whether the internet is currently disconnected
 */
export const saveFormData = (key, formData, isOffline = false) => {
  try {
    const serialized = serializeFormData(formData);
    // Store form data with metadata about connection status
    const dataWithMetadata = {
      formData: serialized,
      wasOffline: isOffline || !navigator.onLine,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(dataWithMetadata));
  } catch (error) {
    console.error(`Error saving form data to ${key}:`, error);
  }
};

/**
 * Load form data from localStorage
 * @param {string} key - localStorage key
 * @returns {Object|null} - Form data object or null if not found
 */
export const loadFormData = (key) => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    // Check if it's the new format with metadata
    try {
      const parsed = JSON.parse(stored);
      if (parsed.formData && parsed.wasOffline !== undefined) {
        // New format with metadata
        return deserializeFormData(parsed.formData);
      }
    } catch (e) {
      // Old format, try to parse directly
    }
    
    // Old format or direct serialization
    return deserializeFormData(stored);
  } catch (error) {
    console.error(`Error loading form data from ${key}:`, error);
    return null;
  }
};

/**
 * Check if form data was saved while offline
 * @param {string} key - localStorage key
 * @returns {boolean} - True if form was saved while offline
 */
export const wasFormSavedOffline = (key) => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return false;
    
    try {
      const parsed = JSON.parse(stored);
      if (parsed.wasOffline !== undefined) {
        return parsed.wasOffline === true;
      }
    } catch (e) {
      // Old format, assume it was saved online
    }
    
    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Clear form data from localStorage
 * @param {string} key - localStorage key
 * @param {boolean} force - If true, clear even if form was saved offline
 */
export const clearFormData = (key, force = false) => {
  try {
    // If force is false, check if form was saved while offline
    if (!force) {
      const wasOffline = wasFormSavedOffline(key);
      // If form was saved while offline, preserve it (don't clear)
      // This ensures data is preserved even after connection returns
      if (wasOffline) {
        return; // Don't clear if it was saved offline
      }
    }
    
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error clearing form data from ${key}:`, error);
  }
};

