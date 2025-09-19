// Geocoding utility for Davao Oriental municipalities
// This provides approximate coordinates for municipalities when precise coordinates are not available

const DAVAO_ORIENTAL_COORDINATES = {
  // Major municipalities in Davao Oriental with approximate center coordinates
  'Mati': { lat: 6.90543, lng: 126.198137 },
  'Baganga': { lat: 7.138566, lng: 126.19839 },
  'Banaybanay': { lat: 7.052637, lng: 126.271871 },
  'Caraga': { lat: 7.040689, lng: 126.405736 },
  'Cateel': { lat: 7.03907, lng: 126.073971 },
  'Governor Generoso': { lat: 7.023682, lng: 126.135764 },
  'Lupon': { lat: 6.996579, lng: 126.157647 },
  'Manay': { lat: 6.910817, lng: 125.976873 },
  'San Isidro': { lat: 7.026718, lng: 126.399461 },
  'Tarragona': { lat: 7.090034, lng: 126.217449 },
  'Boston': { lat: 6.969014, lng: 126.235561 },
  'Maco': { lat: 7.036735, lng: 126.414316 },
  'Mabini': { lat: 7.012285, lng: 125.970299 },
  'Pantukan': { lat: 7.008709, lng: 125.964125 },
  'Mawab': { lat: 7.002258, lng: 126.393666 },
  'Monkayo': { lat: 6.950413, lng: 126.203313 },
  'New Bataan': { lat: 7.037214, lng: 125.949183 },
  'Compostela': { lat: 7.0845, lng: 126.9761 },
  'Laak': { lat: 6.9046, lng: 126.5307 },
  'Maragusan': { lat: 7.1389, lng: 126.2254 }
};

/**
 * Get coordinates for a location based on municipality and barangay
 * @param {string} municipality - The municipality name
 * @param {string} barangay - The barangay name (optional)
 * @param {string} street - The street name (optional)
 * @returns {Object|null} - Object with lat and lng, or null if not found
 */
export function getLocationCoordinates(municipality, barangay = '', street = '') {
  if (!municipality) return null;
  
  // Clean municipality name (remove extra spaces, convert to title case)
  const cleanMunicipality = municipality.trim().replace(/\s+/g, ' ');
  
  // Try to find exact match first
  if (DAVAO_ORIENTAL_COORDINATES[cleanMunicipality]) {
    return DAVAO_ORIENTAL_COORDINATES[cleanMunicipality];
  }
  
  // Try to find partial match (case insensitive)
  const municipalityLower = cleanMunicipality.toLowerCase();
  for (const [key, coords] of Object.entries(DAVAO_ORIENTAL_COORDINATES)) {
    if (key.toLowerCase().includes(municipalityLower) || municipalityLower.includes(key.toLowerCase())) {
      return coords;
    }
  }
  
  // If no match found, return null
  console.warn(`No coordinates found for municipality: ${municipality}`);
  return null;
}

/**
 * Check if coordinates are valid for Davao Oriental
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} - True if coordinates are valid
 */
export function isValidDavaoOrientalCoordinate(lat, lng) {
  return lat >= 6.5 && lat <= 7.5 && lng >= 126.0 && lng <= 126.4;
}

/**
 * Get all available municipalities
 * @returns {Array} - Array of municipality names
 */
export function getAvailableMunicipalities() {
  return Object.keys(DAVAO_ORIENTAL_COORDINATES);
}
