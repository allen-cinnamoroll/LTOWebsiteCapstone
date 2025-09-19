import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getLocationCoordinates } from '@/util/geocoding';

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

    // Initialize map
    if (!map.current) {
      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [125.971907, 6.90543], // Default center for Davao Oriental
          zoom: 9
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
      });
    }

    // Clean up existing markers
    const existingMarkers = document.querySelectorAll('.accident-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Add markers for each accident using geocoding
    accidents.forEach((accident, index) => {
      let coordinates = null;
      
      // Get coordinates from municipality/barangay/street using geocoding
      if (accident.municipality) {
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
        // Create marker element
        const markerEl = document.createElement('div');
        markerEl.className = 'accident-marker';
        markerEl.style.cssText = `
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: ${getSeverityColor(accident.severity)};
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
        const popupContent = `
          <div style="padding: 12px; min-width: 220px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px;">
              ${accident.accident_id || 'Accident ID: N/A'}
            </h3>
            <div style="font-size: 13px; line-height: 1.5; color: #374151;">
              <p style="margin: 4px 0; color: #1f2937;"><strong style="color: #111827;">Plate:</strong> ${accident.plateNo || 'N/A'}</p>
              <p style="margin: 4px 0; color: #1f2937;"><strong style="color: #111827;">Severity:</strong> 
                <span style="color: ${getSeverityColor(accident.severity)}; font-weight: bold; text-transform: uppercase;">
                  ${accident.severity || 'Unknown'}
                </span>
              </p>
              <p style="margin: 4px 0; color: #1f2937;"><strong style="color: #111827;">Vehicle:</strong> ${accident.vehicle_type || 'N/A'}</p>
              <p style="margin: 4px 0; color: #1f2937;"><strong style="color: #111827;">Location:</strong> ${accident.municipality || 'N/A'}, ${accident.barangay || 'N/A'}</p>
              <p style="margin: 4px 0; color: #1f2937;"><strong style="color: #111827;">Street:</strong> ${accident.street || 'N/A'}</p>
              <p style="margin: 4px 0; color: #1f2937;"><strong style="color: #111827;">Date:</strong> ${accident.accident_date ? new Date(accident.accident_date).toLocaleDateString() : 'N/A'}</p>
              <p style="margin: 4px 0; color: #f59e0b; font-size: 11px;"><em>📍 Location based on municipality</em></p>
              ${accident.notes ? `<p style="margin: 4px 0; color: #1f2937;"><strong style="color: #111827;">Notes:</strong> ${accident.notes}</p>` : ''}
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
        
        // Get coordinates from municipality using geocoding
        if (accident.municipality) {
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
        } else {
          console.warn('No valid coordinates for accident:', {
            id: accident.accident_id,
            municipality: accident.municipality,
            reason: 'Municipality not found in geocoding database'
          });
        }
      });
      
      console.log(`Valid accidents with geocoded coordinates: ${validAccidentCount} out of ${accidents.length}`);
      
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 12
        });
      }
    }

    return () => {
      // Cleanup function
      if (map.current) {
        const existingMarkers = document.querySelectorAll('.accident-marker');
        existingMarkers.forEach(marker => marker.remove());
      }
    };
  }, [accidents, mapLoaded]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'fatal':
        return '#dc2626'; // red-600
      case 'severe':
        return '#ea580c'; // orange-600
      case 'moderate':
        return '#f59e0b'; // amber-500 (more distinct from orange)
      case 'minor':
        return '#16a34a'; // green-600
      default:
        return '#6b7280'; // gray-500
    }
  };

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
        <div className="font-semibold mb-2">Accident Severity</div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-600 border-2 border-white"></div>
            <span>Fatal</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-600 border-2 border-white"></div>
            <span>Severe</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-white"></div>
            <span>Moderate</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-600 border-2 border-white"></div>
            <span>Minor</span>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-gray-300">
          <div className="font-semibold mb-1">Location Type</div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-gray-500 border-2 border-yellow-400"></div>
              <span>Municipality-based</span>
            </div>
          </div>
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
