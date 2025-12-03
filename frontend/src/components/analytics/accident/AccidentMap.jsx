import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getLocationCoordinates, isValidDavaoOrientalCoordinate } from '@/util/geocoding';

const AccidentMap = ({ accidents, className = "" }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect theme
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || 
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    };
    
    checkTheme();
    
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);
    
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkTheme);
    };
  }, []);

  useEffect(() => {
    if (!accidents || accidents.length === 0) return;

    // Set Mapbox access token (you can get a free token from mapbox.com)
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
    mapboxgl.accessToken = mapboxToken;

    // Function to add markers - called only after map loads
    const addAccidentMarkers = () => {
      if (!map.current || !map.current.loaded()) return;

      // Clean up existing markers
      const existingMarkers = document.querySelectorAll('.accident-marker');
      existingMarkers.forEach(marker => marker.remove());

      // Add markers for each accident using geocoding
      accidents.forEach((accident, index) => {
      let coordinates = null;
      
      // First, check if accident has stored lat/lng coordinates (preferred, but validate)
      if (accident.lat && accident.lng && 
          typeof accident.lat === 'number' && typeof accident.lng === 'number' &&
          !isNaN(accident.lat) && !isNaN(accident.lng)) {
        // Only use stored coordinates if they're valid for Davao Oriental
        if (isValidDavaoOrientalCoordinate(accident.lat, accident.lng)) {
          coordinates = { lat: accident.lat, lng: accident.lng };
        } else {
          console.warn(`Stored coordinates invalid for Davao Oriental: ${accident.lat}, ${accident.lng}. Using geocoding for ${accident.municipality}`);
        }
      }
      
      // If no valid stored coordinates, use geocoding based on municipality/barangay
      if (!coordinates && accident.municipality) {
        const geocodedCoords = getLocationCoordinates(
          accident.municipality, 
          accident.barangay, 
          accident.street
        );
        if (geocodedCoords) {
          coordinates = geocodedCoords;
        } else {
          console.warn(`Geocoding failed for: ${accident.municipality}, ${accident.barangay}`);
        }
      }
      
      if (coordinates) {
        // Create marker element
        const markerEl = document.createElement('div');
        markerEl.className = 'accident-marker';
        markerEl.style.cssText = `
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: #dc2626;
          border: 2px solid #ffd700;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: white;
          font-weight: bold;
          opacity: 0.9;
        `;
        markerEl.textContent = '!';

        // Create popup content
        const formatDate = (date) => {
          if (!date) return 'N/A';
          try {
            return new Date(date).toLocaleDateString();
          } catch {
            return 'N/A';
          }
        };

        const getVehiclePlate = (accident) => {
          if (accident.vehiclePlateNo) return accident.vehiclePlateNo;
          if (accident.vehicleMCPlateNo) return accident.vehicleMCPlateNo;
          return 'N/A';
        };

        const popupContent = `
          <div style="padding: 12px; min-width: 220px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px;">
              Blotter No: ${accident.blotterNo || 'N/A'}
            </h3>
            <div style="font-size: 13px; line-height: 1.5; color: #374151;">
              ${getVehiclePlate(accident) !== 'N/A' ? `<p style="margin: 4px 0; color: #1f2937;"><strong style="color: #111827;">Vehicle Plate:</strong> ${getVehiclePlate(accident)}</p>` : ''}
              ${accident.incidentType ? `<p style="margin: 4px 0; color: #1f2937;"><strong style="color: #111827;">Incident Type:</strong> ${accident.incidentType}</p>` : ''}
              ${accident.caseStatus ? `<p style="margin: 4px 0; color: #1f2937;"><strong style="color: #111827;">Case Status:</strong> ${accident.caseStatus}</p>` : ''}
              <p style="margin: 4px 0; color: #1f2937;"><strong style="color: #111827;">Location:</strong> ${accident.municipality || 'N/A'}, ${accident.barangay || 'N/A'}</p>
              ${accident.street ? `<p style="margin: 4px 0; color: #1f2937;"><strong style="color: #111827;">Street:</strong> ${accident.street}</p>` : ''}
              <p style="margin: 4px 0; color: #1f2937;"><strong style="color: #111827;">Date Committed:</strong> ${formatDate(accident.dateCommited)}</p>
              <p style="margin: 4px 0; color: #f59e0b; font-size: 11px;"><em>📍 Location based on municipality</em></p>
            </div>
          </div>
        `;

        // Create popup
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          closeOnClick: false,
          closeOnMove: false,
          className: 'accident-popup'
        }).setHTML(popupContent);

        // Create marker
        new mapboxgl.Marker(markerEl)
          .setLngLat([coordinates.lng, coordinates.lat])
          .setPopup(popup)
          .addTo(map.current);
      }
      });

      // Fit map to show all valid markers
      if (accidents.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        let validAccidentCount = 0;
        
        accidents.forEach(accident => {
          let coordinates = null;
          
          // First, check if accident has stored lat/lng coordinates (preferred, but validate)
          if (accident.lat && accident.lng && 
              typeof accident.lat === 'number' && typeof accident.lng === 'number' &&
              !isNaN(accident.lat) && !isNaN(accident.lng)) {
            // Only use stored coordinates if they're valid for Davao Oriental
            if (isValidDavaoOrientalCoordinate(accident.lat, accident.lng)) {
              coordinates = { lat: accident.lat, lng: accident.lng };
            }
          }
          
          // If no valid stored coordinates, use geocoding based on municipality/barangay
          if (!coordinates && accident.municipality) {
            const geocodedCoords = getLocationCoordinates(
              accident.municipality, 
              accident.barangay, 
              accident.street
            );
            if (geocodedCoords) {
              coordinates = geocodedCoords;
            }
          }
            
          if (coordinates) {
            bounds.extend([coordinates.lng, coordinates.lat]);
            validAccidentCount++;
          }
        });
        
        if (!bounds.isEmpty()) {
          map.current.fitBounds(bounds, {
            padding: 50,
            maxZoom: 12
          });
        }
      }
    };

    // Initialize map
    if (!map.current) {
      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [125.971907, 6.90543], // Default center for Davao Oriental
          zoom: 12 // Increased zoom to better show streets
        });
      } catch (error) {
        console.error('Map initialization error:', error);
        setMapError(true);
        return;
      }

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        setMapLoaded(true);
        // All map operations must happen inside the load event
        addAccidentMarkers();
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setMapError(true);
      });
    } else if (map.current.loaded()) {
      // If map is already loaded, add markers immediately
      addAccidentMarkers();
    }

    return () => {
      // Cleanup function
      if (map.current) {
        const existingMarkers = document.querySelectorAll('.accident-marker');
        existingMarkers.forEach(marker => marker.remove());
      }
    };
  }, [accidents]);


  if (mapError) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-50 rounded-lg ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium">Map unavailable</div>
          <div className="text-sm">Unable to load map. Please check your internet connection.</div>
        </div>
      </div>
    );
  }

  if (!accidents || accidents.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-50 rounded-lg ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium">No location data available</div>
          <div className="text-sm">Accidents in this period don't have coordinate information</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Custom styles for popup */}
      <style jsx>{`
        :global(.accident-popup .mapboxgl-popup-content) {
          background: ${isDarkMode ? '#1f2937' : '#ffffff'};
          border: 1px solid ${isDarkMode ? '#374151' : '#e5e7eb'};
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          padding: 0;
          color: ${isDarkMode ? '#f9fafb' : '#111827'};
        }
        :global(.accident-popup .mapboxgl-popup-tip) {
          border-top-color: ${isDarkMode ? '#1f2937' : '#ffffff'};
        }
        :global(.accident-popup .mapboxgl-popup-close-button) {
          display: none !important;
        }
      `}</style>
      
      <div 
        ref={mapContainer} 
        className="w-full h-96 rounded-lg"
        style={{ minHeight: '400px' }}
      />
      
      {/* Legend */}
      <div className={`absolute top-4 left-4 rounded-lg shadow-lg p-3 text-xs ${
        isDarkMode 
          ? 'bg-gray-800 border border-gray-700 text-gray-100' 
          : 'bg-white border border-gray-200 text-gray-900'
      }`}>
        <div className="font-semibold mb-1">Accident Markers</div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-600 border-2 border-yellow-400"></div>
            <span>Accident Location</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-300">
          <div className="text-xs text-gray-500">Location based on municipality</div>
        </div>
      </div>

      {/* Map info */}
      <div className={`absolute bottom-4 right-4 rounded-lg shadow-lg p-2 text-xs ${
        isDarkMode 
          ? 'bg-gray-800 border border-gray-700 text-gray-300' 
          : 'bg-white border border-gray-200 text-gray-600'
      }`}>
        <div>
          {accidents.length} accident{accidents.length !== 1 ? 's' : ''} shown
        </div>
      </div>
    </div>
  );
};

export default AccidentMap;
