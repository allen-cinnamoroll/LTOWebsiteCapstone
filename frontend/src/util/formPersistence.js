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
 * Save form data to localStorage
 * @param {string} key - localStorage key
 * @param {Object} formData - Form data object
 * @param {Object} metadata - Optional metadata (e.g., savedWhileOffline, timestamp)
 */
export const saveFormData = (key, formData, metadata = {}) => {
  try {
    const serialized = serializeFormData(formData);
    localStorage.setItem(key, serialized);
    
    // Save metadata separately
    if (Object.keys(metadata).length > 0) {
      const metadataKey = `${key}_metadata`;
      localStorage.setItem(metadataKey, JSON.stringify({
        ...metadata,
        timestamp: new Date().toISOString()
      }));
    }
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
    return deserializeFormData(stored);
  } catch (error) {
    console.error(`Error loading form data from ${key}:`, error);
    return null;
  }
};

/**
 * Load form metadata from localStorage
 * @param {string} key - localStorage key
 * @returns {Object|null} - Metadata object or null if not found
 */
export const loadFormMetadata = (key) => {
  try {
    const metadataKey = `${key}_metadata`;
    const stored = localStorage.getItem(metadataKey);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error(`Error loading form metadata from ${key}:`, error);
    return null;
  }
};

/**
 * Clear form data from localStorage
 * @param {string} key - localStorage key
 */
export const clearFormData = (key) => {
  try {
    localStorage.removeItem(key);
    // Also clear metadata
    const metadataKey = `${key}_metadata`;
    localStorage.removeItem(metadataKey);
  } catch (error) {
    console.error(`Error clearing form data from ${key}:`, error);
  }
};

