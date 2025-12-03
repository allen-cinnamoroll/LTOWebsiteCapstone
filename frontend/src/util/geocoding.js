// Geocoding utility for Davao Oriental municipalities
// This provides approximate coordinates for municipalities when precise coordinates are not available

const DAVAO_ORIENTAL_COORDINATES = {
  // Major municipalities in Davao Oriental with approximate center coordinates
  'Mati': { lat: 6.9577, lng: 126.2071 },
  'CITY OF MATI': { lat: 6.9577, lng: 126.2071 },
  'MATI (CAPITAL)': { lat: 6.9577, lng: 126.2071 },
  'Baganga': { lat: 7.138566, lng: 126.19839 },
  'Banaybanay': { lat: 7.052637, lng: 126.271871 },
  'Caraga': { lat: 7.040689, lng: 126.405736 },
  'Cateel': { lat: 7.03907, lng: 126.073971 },
  'Governor Generoso': { lat: 7.023682, lng: 126.135764 },
  'Lupon': { lat: 6.996579, lng: 126.157647 },
  'Manay': { lat: 7.2155, lng: 126.2298 },
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

// Barangay-specific coordinates for more accurate mapping
// Coordinates are relative to municipality centers, ensuring they're on land and properly positioned
const BARANGAY_COORDINATES = {
  'BANAYBANAY': {
    'POBLACION': { lat: 7.052637, lng: 126.271871 },
    'CENTRAL': { lat: 7.052637, lng: 126.271871 },
    'CABANGCALAN': { lat: 7.060000, lng: 126.275000 },
    'CAGANGANAN': { lat: 7.055000, lng: 126.280000 },
    'CALUBIHAN': { lat: 7.050000, lng: 126.270000 },
    'CAUSWAGAN': { lat: 7.045000, lng: 126.265000 },
    'MAHAYAG': { lat: 7.058000, lng: 126.268000 },
    'MAPUTI': { lat: 7.048000, lng: 126.273000 },
    'MOGBONGCOGON': { lat: 7.062000, lng: 126.278000 },
    'PANIKIAN': { lat: 7.040000, lng: 126.272000 },
    'PINTATAGAN': { lat: 7.055000, lng: 126.266000 },
    'PISO PROPER': { lat: 7.050000, lng: 126.275000 },
    'PUNTA LINAO': { lat: 7.045000, lng: 126.279000 },
    'RANG-AY': { lat: 7.060000, lng: 126.265000 },
    'SAN VICENTE': { lat: 7.053000, lng: 126.277000 }
  },
  'BOSTON': {
    'POBLACION': { lat: 6.969014, lng: 126.235561 },
    'CENTRAL': { lat: 6.969014, lng: 126.235561 },
    'CAATIHAN': { lat: 6.972000, lng: 126.238000 },
    'CABASAGAN': { lat: 6.966000, lng: 126.232000 },
    'CARMEN': { lat: 6.968000, lng: 126.240000 },
    'CAWAYANAN': { lat: 6.965000, lng: 126.233000 },
    'SAN JOSE': { lat: 6.971000, lng: 126.237000 },
    'SIBAJAY': { lat: 6.967000, lng: 126.234000 },
    'SIMULAO': { lat: 6.970000, lng: 126.239000 }
  },
  'BAGANGA': {
    'CENTRAL': { lat: 7.138566, lng: 126.19839 },
    'POBLACION': { lat: 7.138566, lng: 126.19839 },
    'BACULIN': { lat: 7.145000, lng: 126.202000 },
    'BANAO': { lat: 7.135000, lng: 126.195000 },
    'BATAWAN': { lat: 7.142000, lng: 126.201000 },
    'BATIANO': { lat: 7.133000, lng: 126.193000 },
    'BINONDO': { lat: 7.140000, lng: 126.199000 },
    'BOBONAO': { lat: 7.137000, lng: 126.196000 },
    'CAMPAWAN': { lat: 7.141000, lng: 126.197000 },
    'DAPNAN': { lat: 7.132000, lng: 126.194000 },
    'KINABLANGAN': { lat: 7.144000, lng: 126.203000 },
    'LAMBAJON': { lat: 7.136000, lng: 126.192000 },
    'LUCOD': { lat: 7.143000, lng: 126.204000 },
    'MAHANUB': { lat: 7.134000, lng: 126.191000 },
    'MIKIT': { lat: 7.139000, lng: 126.200000 },
    'SALINGCOMOT': { lat: 7.131000, lng: 126.190000 },
    'SAN ISIDRO': { lat: 7.138000, lng: 126.198000 },
    'SAN VICTOR': { lat: 7.137000, lng: 126.195000 },
    'SAOQUEGUE': { lat: 7.141000, lng: 126.202000 }
  },
  'CARAGA': {
    'POBLACION': { lat: 7.040689, lng: 126.405736 },
    'CENTRAL': { lat: 7.040689, lng: 126.405736 },
    'ALVAR': { lat: 7.045000, lng: 126.408000 },
    'CANINGAG': { lat: 7.038000, lng: 126.403000 },
    'DON LEON BALANTE': { lat: 7.042000, lng: 126.407000 },
    'LAMIAWAN': { lat: 7.036000, lng: 126.402000 },
    'MANORIGAO': { lat: 7.044000, lng: 126.409000 },
    'MERCEDES': { lat: 7.039000, lng: 126.404000 },
    'PALMA GIL': { lat: 7.043000, lng: 126.406000 },
    'PICHON': { lat: 7.037000, lng: 126.401000 },
    'SAN ANTONIO': { lat: 7.041000, lng: 126.405000 },
    'SAN JOSE': { lat: 7.040000, lng: 126.406000 },
    'SAN LUIS': { lat: 7.038000, lng: 126.404000 },
    'SAN MIGUEL': { lat: 7.039000, lng: 126.407000 },
    'SAN PEDRO': { lat: 7.037000, lng: 126.403000 },
    'SANTA FE': { lat: 7.042000, lng: 126.408000 },
    'SANTIAGO': { lat: 7.041000, lng: 126.404000 },
    'SOBRECAREY': { lat: 7.043000, lng: 126.410000 }
  },
  'CATEEL': {
    'POBLACION': { lat: 7.03907, lng: 126.073971 },
    'CENTRAL': { lat: 7.03907, lng: 126.073971 },
    'ABIJOD': { lat: 7.042000, lng: 126.076000 },
    'ALEGRIA': { lat: 7.036000, lng: 126.071000 },
    'ALIWAGWAG': { lat: 7.041000, lng: 126.075000 },
    'ARAGON': { lat: 7.038000, lng: 126.072000 },
    'BAYBAY': { lat: 7.040000, lng: 126.074000 },
    'MAGLAHUS': { lat: 7.037000, lng: 126.070000 },
    'MAINIT': { lat: 7.043000, lng: 126.077000 },
    'MALIBAGO': { lat: 7.035000, lng: 126.069000 },
    'SAN ALFONSO': { lat: 7.039000, lng: 126.073000 },
    'SAN ANTONIO': { lat: 7.038000, lng: 126.074000 },
    'SAN MIGUEL': { lat: 7.040000, lng: 126.075000 },
    'SAN RAFAEL': { lat: 7.037000, lng: 126.072000 },
    'SAN VICENTE': { lat: 7.041000, lng: 126.076000 },
    'SANTA FILOMENA': { lat: 7.036000, lng: 126.070000 },
    'TAYTAYAN': { lat: 7.042000, lng: 126.078000 }
  },
  'GOVERNOR GENEROSO': {
    'POBLACION': { lat: 7.023682, lng: 126.135764 },
    'CENTRAL': { lat: 7.023682, lng: 126.135764 },
    'ANITAP': { lat: 7.028000, lng: 126.138000 },
    'CRISPIN DELA CRUZ': { lat: 7.020000, lng: 126.133000 },
    'DON AURELIO CHICOTE': { lat: 7.025000, lng: 126.137000 },
    'LAVIGAN': { lat: 7.019000, lng: 126.132000 },
    'LUZON': { lat: 7.027000, lng: 126.139000 },
    'MAGDUG': { lat: 7.021000, lng: 126.134000 },
    'MANUEL ROXAS': { lat: 7.024000, lng: 126.136000 },
    'MONTSERRAT': { lat: 7.022000, lng: 126.135000 },
    'NANGAN': { lat: 7.026000, lng: 126.138000 },
    'OREGON': { lat: 7.018000, lng: 126.131000 },
    'PUNDAGUITAN': { lat: 7.029000, lng: 126.140000 },
    'SERGIO OSMEÑA': { lat: 7.025000, lng: 126.137000 },
    'SUROP': { lat: 7.023000, lng: 126.136000 },
    'TAGABEBE': { lat: 7.027000, lng: 126.139000 },
    'TAMBAN': { lat: 7.020000, lng: 126.134000 },
    'TANDANG SORA': { lat: 7.024000, lng: 126.138000 },
    'TIBANBAN': { lat: 7.021000, lng: 126.135000 },
    'TIBLAWAN': { lat: 7.026000, lng: 126.140000 },
    'UPPER TIBANBAN': { lat: 7.022000, lng: 126.137000 }
  },
  'LUPON': {
    'POBLACION': { lat: 6.996579, lng: 126.157647 },
    'CENTRAL': { lat: 6.996579, lng: 126.157647 },
    'BAGUMBAYAN': { lat: 7.000000, lng: 126.160000 },
    'CABADIANGAN': { lat: 6.993000, lng: 126.155000 },
    'CALAPAGAN': { lat: 6.999000, lng: 126.159000 },
    'COCORNON': { lat: 6.994000, lng: 126.156000 },
    'CORPORACION': { lat: 6.998000, lng: 126.158000 },
    'DON MARIANO MARCOS': { lat: 6.995000, lng: 126.157000 },
    'ILANGAY': { lat: 7.001000, lng: 126.161000 },
    'LANGKA': { lat: 6.992000, lng: 126.154000 },
    'LANTAWAN': { lat: 6.997000, lng: 126.158000 },
    'LIMBAHAN': { lat: 6.991000, lng: 126.153000 },
    'MACANGAO': { lat: 7.002000, lng: 126.162000 },
    'MAGSAYSAY': { lat: 6.995000, lng: 126.156000 },
    'MAHAYAHAY': { lat: 7.000000, lng: 126.159000 },
    'MARAGATAS': { lat: 6.994000, lng: 126.155000 },
    'MARAYAG': { lat: 6.996000, lng: 126.157000 },
    'NEW VISAYAS': { lat: 7.001000, lng: 126.160000 },
    'SAN ISIDRO': { lat: 6.997000, lng: 126.159000 },
    'SAN JOSE': { lat: 6.998000, lng: 126.160000 },
    'TAGBOA': { lat: 7.000000, lng: 126.161000 },
    'TAGUGPO': { lat: 6.999000, lng: 126.158000 }
  },
  'MANAY': {
    'CENTRAL': { lat: 7.2097, lng: 126.2298 },
    'CENTRAL (POB.)': { lat: 7.2097, lng: 126.2298 },
    'POBLACION': { lat: 7.2097, lng: 126.2298 },
    'CAPASNAN': { lat: 7.215000, lng: 126.235000 },
    'CAYAWAN': { lat: 7.213000, lng: 126.232000 },
    'CONCEPCION': { lat: 7.207000, lng: 126.228000 },
    'DEL PILAR': { lat: 7.208000, lng: 126.227000 },
    'GUZA': { lat: 7.205000, lng: 126.225000 },
    'HOLY CROSS': { lat: 7.212000, lng: 126.231000 },
    'LAMBOG': { lat: 7.204000, lng: 126.224000 },
    'MABINI': { lat: 7.203000, lng: 126.223000 },
    'MANREZA': { lat: 7.214000, lng: 126.233000 },
    'NEW TAOKANGA': { lat: 7.216000, lng: 126.236000 },
    'OLD MACOPA': { lat: 7.217000, lng: 126.237000 },
    'RIZAL': { lat: 7.211000, lng: 126.230000 },
    'SAN FERMIN': { lat: 7.206000, lng: 126.226000 },
    'SAN IGNACIO': { lat: 7.210000, lng: 126.229000 },
    'SAN ISIDRO': { lat: 7.208000, lng: 126.228000 },
    'ZARAGOSA': { lat: 7.213000, lng: 126.234000 }
  },
  'CITY OF MATI': {
    'CENTRAL': { lat: 6.9577, lng: 126.2071 }, // Actual Poblacion - town center (more inland)
    'CENTRAL (POB.)': { lat: 6.9577, lng: 126.2071 },
    'POBLACION': { lat: 6.9577, lng: 126.2071 },
    'BADAS': { lat: 6.945000, lng: 126.215000 },
    'BOBON': { lat: 6.948000, lng: 126.218000 },
    'BUSO': { lat: 6.952000, lng: 126.222000 },
    'CABUAYA': { lat: 6.946000, lng: 126.216000 },
    'CULIAN': { lat: 6.954000, lng: 126.224000 },
    'DAHICAN': { lat: 6.947000, lng: 126.217000 },
    'DANAO': { lat: 6.953000, lng: 126.223000 },
    'DAWAN': { lat: 6.949000, lng: 126.219000 },
    'DON ENRIQUE LOPEZ': { lat: 6.951000, lng: 126.221000 },
    'DON MARTIN MARUNDAN': { lat: 6.948000, lng: 126.217000 },
    'DON SALVADOR LOPEZ, SR.': { lat: 6.947000, lng: 126.218000 },
    'LANGKA': { lat: 6.952000, lng: 126.220000 },
    'LAWIGAN': { lat: 6.946000, lng: 126.215000 },
    'LIBUDON': { lat: 6.951000, lng: 126.222000 },
    'LUBAN': { lat: 6.949000, lng: 126.218000 },
    'MACAMBOL': { lat: 6.954000, lng: 126.225000 },
    'MAMALI': { lat: 6.945000, lng: 126.214000 },
    'MATIAO': { lat: 6.955000, lng: 126.226000 },
    'MAYO': { lat: 6.948000, lng: 126.219000 },
    'SAINZ': { lat: 6.952000, lng: 126.221000 },
    'SANGHAY': { lat: 6.946000, lng: 126.216000 },
    'TAGABAKID': { lat: 6.953000, lng: 126.224000 },
    'TAGBINONGA': { lat: 6.947000, lng: 126.220000 },
    'TAGUIBO': { lat: 6.951000, lng: 126.223000 },
    'TAMISAN': { lat: 6.950000, lng: 126.218000 }
  },
  'MATI (CAPITAL)': {
    'CENTRAL': { lat: 6.9577, lng: 126.2071 }, // Actual Poblacion - town center (more inland)
    'CENTRAL (POB.)': { lat: 6.9577, lng: 126.2071 },
    'POBLACION': { lat: 6.9577, lng: 126.2071 },
    'BADAS': { lat: 6.945000, lng: 126.215000 },
    'BOBON': { lat: 6.948000, lng: 126.218000 },
    'BUSO': { lat: 6.952000, lng: 126.222000 },
    'CABUAYA': { lat: 6.946000, lng: 126.216000 },
    'CULIAN': { lat: 6.954000, lng: 126.224000 },
    'DAHICAN': { lat: 6.947000, lng: 126.217000 },
    'DANAO': { lat: 6.953000, lng: 126.223000 },
    'DAWAN': { lat: 6.949000, lng: 126.219000 },
    'DON ENRIQUE LOPEZ': { lat: 6.951000, lng: 126.221000 },
    'DON MARTIN MARUNDAN': { lat: 6.948000, lng: 126.217000 },
    'DON SALVADOR LOPEZ, SR.': { lat: 6.947000, lng: 126.218000 },
    'LANGKA': { lat: 6.952000, lng: 126.220000 },
    'LAWIGAN': { lat: 6.946000, lng: 126.215000 },
    'LIBUDON': { lat: 6.951000, lng: 126.222000 },
    'LUBAN': { lat: 6.949000, lng: 126.218000 },
    'MACAMBOL': { lat: 6.954000, lng: 126.225000 },
    'MAMALI': { lat: 6.945000, lng: 126.214000 },
    'MATIAO': { lat: 6.955000, lng: 126.226000 },
    'MAYO': { lat: 6.948000, lng: 126.219000 },
    'SAINZ': { lat: 6.952000, lng: 126.221000 },
    'SANGHAY': { lat: 6.946000, lng: 126.216000 },
    'TAGABAKID': { lat: 6.953000, lng: 126.224000 },
    'TAGBINONGA': { lat: 6.947000, lng: 126.220000 },
    'TAGUIBO': { lat: 6.951000, lng: 126.223000 },
    'TAMISAN': { lat: 6.950000, lng: 126.218000 }
  },
  'Mati': {
    'CENTRAL': { lat: 6.9577, lng: 126.2071 }, // Actual Poblacion - town center (more inland)
    'CENTRAL (POB.)': { lat: 6.9577, lng: 126.2071 },
    'POBLACION': { lat: 6.9577, lng: 126.2071 },
    'BADAS': { lat: 6.945000, lng: 126.215000 },
    'BOBON': { lat: 6.948000, lng: 126.218000 },
    'BUSO': { lat: 6.952000, lng: 126.222000 },
    'CABUAYA': { lat: 6.946000, lng: 126.216000 },
    'CULIAN': { lat: 6.954000, lng: 126.224000 },
    'DAHICAN': { lat: 6.947000, lng: 126.217000 },
    'DANAO': { lat: 6.953000, lng: 126.223000 },
    'DAWAN': { lat: 6.949000, lng: 126.219000 },
    'DON ENRIQUE LOPEZ': { lat: 6.951000, lng: 126.221000 },
    'DON MARTIN MARUNDAN': { lat: 6.948000, lng: 126.217000 },
    'DON SALVADOR LOPEZ, SR.': { lat: 6.947000, lng: 126.218000 },
    'LANGKA': { lat: 6.952000, lng: 126.220000 },
    'LAWIGAN': { lat: 6.946000, lng: 126.215000 },
    'LIBUDON': { lat: 6.951000, lng: 126.222000 },
    'LUBAN': { lat: 6.949000, lng: 126.218000 },
    'MACAMBOL': { lat: 6.954000, lng: 126.225000 },
    'MAMALI': { lat: 6.945000, lng: 126.214000 },
    'MATIAO': { lat: 6.955000, lng: 126.226000 },
    'MAYO': { lat: 6.948000, lng: 126.219000 },
    'SAINZ': { lat: 6.952000, lng: 126.221000 },
    'SANGHAY': { lat: 6.946000, lng: 126.216000 },
    'TAGABAKID': { lat: 6.953000, lng: 126.224000 },
    'TAGBINONGA': { lat: 6.947000, lng: 126.220000 },
    'TAGUIBO': { lat: 6.951000, lng: 126.223000 },
    'TAMISAN': { lat: 6.950000, lng: 126.218000 }
  },
  'SAN ISIDRO': {
    'POBLACION': { lat: 7.026718, lng: 126.399461 },
    'CENTRAL': { lat: 7.026718, lng: 126.399461 },
    'BAON': { lat: 7.030000, lng: 126.402000 },
    'BATOBATO': { lat: 7.024000, lng: 126.397000 },
    'BITAOGAN': { lat: 7.028000, lng: 126.401000 },
    'CAMBALEON': { lat: 7.025000, lng: 126.398000 },
    'DUGMANON': { lat: 7.027000, lng: 126.400000 },
    'IBA': { lat: 7.029000, lng: 126.403000 },
    'LA UNION': { lat: 7.023000, lng: 126.396000 },
    'LAPU-LAPU': { lat: 7.031000, lng: 126.404000 },
    'MAAG': { lat: 7.022000, lng: 126.395000 },
    'MANIKLING': { lat: 7.026000, lng: 126.399000 },
    'MAPUTI': { lat: 7.027000, lng: 126.401000 },
    'SAN MIGUEL': { lat: 7.028000, lng: 126.402000 },
    'SAN ROQUE': { lat: 7.025000, lng: 126.398000 },
    'SANTO ROSARIO': { lat: 7.024000, lng: 126.397000 },
    'SUDLON': { lat: 7.029000, lng: 126.404000 },
    'TALISAY': { lat: 7.030000, lng: 126.403000 }
  },
  'TARRAGONA': {
    'CENTRAL': { lat: 7.090034, lng: 126.217449 },
    'POBLACION': { lat: 7.090034, lng: 126.217449 },
    'CABAGAYAN': { lat: 7.093000, lng: 126.220000 },
    'DADONG': { lat: 7.088000, lng: 126.215000 },
    'JOVELLAR': { lat: 7.091000, lng: 126.218000 },
    'LIMOT': { lat: 7.087000, lng: 126.214000 },
    'LUCATAN': { lat: 7.092000, lng: 126.219000 },
    'MAGANDA': { lat: 7.089000, lng: 126.216000 },
    'OMPAO': { lat: 7.094000, lng: 126.221000 },
    'TOMOAONG': { lat: 7.086000, lng: 126.213000 },
    'TUBAON': { lat: 7.093000, lng: 126.222000 }
  }
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
  
  // Clean municipality name (remove extra spaces, handle variations)
  const cleanMunicipality = municipality.trim().replace(/\s+/g, ' ');
  const cleanBarangay = barangay ? barangay.trim().replace(/\s+/g, ' ').toUpperCase() : '';
  
  // Normalize variations
  let normalizedName = cleanMunicipality;
  const municipalityUpper = cleanMunicipality.toUpperCase();
  if (municipalityUpper.includes('CITY OF MATI') || municipalityUpper === 'MATI' || municipalityUpper.includes('MATI (CAPITAL)') || municipalityUpper === 'MATI (CAPITAL)') {
    // Handle "MATI (CAPITAL)" or "MATI" variations
    if (municipalityUpper.includes('(CAPITAL)')) {
      normalizedName = 'MATI (CAPITAL)';
    } else if (municipalityUpper.includes('CITY OF')) {
      normalizedName = 'CITY OF MATI';
    } else {
      normalizedName = 'CITY OF MATI';
    }
  }
  
  // Normalize municipality name to uppercase for consistent matching
  const normalizedUpper = normalizedName.toUpperCase();
  
  // First, try to find barangay-specific coordinates
  if (cleanBarangay) {
    // Try exact municipality match first (case insensitive)
    for (const [munKey, barangayCoords] of Object.entries(BARANGAY_COORDINATES)) {
      const munKeyUpper = munKey.toUpperCase();
      
      // Improved matching: exact match or contains check
      if (munKeyUpper === normalizedUpper || 
          normalizedUpper.includes(munKeyUpper) || 
          munKeyUpper.includes(normalizedUpper)) {
        
        // Try exact barangay match
        if (barangayCoords[cleanBarangay]) {
          console.log(`Found exact barangay match: ${munKey} -> ${cleanBarangay}`);
          return barangayCoords[cleanBarangay];
        }
        
        // Try matching with variations (remove POB., etc.)
        const barangayNormalized = cleanBarangay.replace(/\s*\(POB\.?\)\s*/gi, '').trim();
        if (barangayNormalized && barangayCoords[barangayNormalized]) {
          console.log(`Found normalized barangay match: ${munKey} -> ${barangayNormalized}`);
          return barangayCoords[barangayNormalized];
        }
        
        // Try case-insensitive partial match for barangay
        for (const [barangayKey, coords] of Object.entries(barangayCoords)) {
          const barangayKeyUpper = barangayKey.toUpperCase();
          if (barangayKeyUpper === cleanBarangay || 
              barangayKeyUpper === barangayNormalized ||
              barangayKeyUpper.includes(cleanBarangay) || 
              cleanBarangay.includes(barangayKeyUpper) ||
              (barangayNormalized && (barangayKeyUpper.includes(barangayNormalized) || barangayNormalized.includes(barangayKeyUpper)))) {
            console.log(`Found partial barangay match: ${munKey} -> ${barangayKey}`);
            return coords;
          }
        }
      }
    }
  }
  
  // If no barangay-specific coordinates found, fall back to municipality coordinates
  // Try to find exact match first (case insensitive)
  for (const [key, coords] of Object.entries(DAVAO_ORIENTAL_COORDINATES)) {
    const keyUpper = key.toUpperCase();
    if (keyUpper === normalizedUpper || normalizedName === key) {
      console.log(`Found municipality match: ${key} for ${normalizedName}`);
      return coords;
    }
  }
  
  // Try to find partial match (case insensitive)
  for (const [key, coords] of Object.entries(DAVAO_ORIENTAL_COORDINATES)) {
    const keyUpper = key.toUpperCase();
    if (keyUpper.includes(normalizedUpper) || normalizedUpper.includes(keyUpper)) {
      console.log(`Found partial municipality match: ${key} for ${normalizedName}`);
      return coords;
    }
  }
  
  // If no match found, return null
  console.warn(`No coordinates found for municipality: ${municipality}, barangay: ${barangay}`);
  console.warn(`Normalized name: ${normalizedName}, Clean municipality: ${cleanMunicipality}`);
  console.warn(`Available municipalities:`, Object.keys(DAVAO_ORIENTAL_COORDINATES));
  console.warn(`Available barangay municipalities:`, Object.keys(BARANGAY_COORDINATES));
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
