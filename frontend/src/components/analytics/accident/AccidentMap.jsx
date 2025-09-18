import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const AccidentMap = ({ accidents, className = "" }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

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

    // Add markers for each accident
    accidents.forEach((accident, index) => {
      if (accident.coordinates && accident.coordinates.lat && accident.coordinates.lng) {
        // Create marker element
        const markerEl = document.createElement('div');
        markerEl.className = 'accident-marker';
        markerEl.style.cssText = `
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: ${getSeverityColor(accident.severity)};
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: white;
          font-weight: bold;
        `;
        markerEl.textContent = '!';

        // Create popup content
        const popupContent = `
          <div style="padding: 12px; min-width: 220px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px;">
              ${accident.accident_id || 'Unknown ID'}
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
            </div>
          </div>
        `;

        // Create popup
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: true,
          closeOnClick: false,
          className: 'accident-popup'
        }).setHTML(popupContent);

        // Create marker
        new mapboxgl.Marker(markerEl)
          .setLngLat([accident.coordinates.lng, accident.coordinates.lat])
          .setPopup(popup)
          .addTo(map.current);
      }
    });

    // Fit map to show all markers
    if (accidents.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      accidents.forEach(accident => {
        if (accident.coordinates && accident.coordinates.lat && accident.coordinates.lng) {
          bounds.extend([accident.coordinates.lng, accident.coordinates.lat]);
        }
      });
      
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
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          padding: 0;
        }
        :global(.accident-popup .mapboxgl-popup-tip) {
          border-top-color: white;
        }
        :global(.accident-popup .mapboxgl-popup-close-button) {
          color: #6b7280;
          font-size: 18px;
          padding: 4px;
        }
        :global(.accident-popup .mapboxgl-popup-close-button:hover) {
          color: #374151;
          background-color: #f3f4f6;
          border-radius: 4px;
        }
      `}</style>
      
      <div 
        ref={mapContainer} 
        className="w-full h-96 rounded-lg"
        style={{ minHeight: '400px' }}
      />
      
      {/* Legend */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs">
        <div className="font-semibold mb-2">Accident Severity</div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-600"></div>
            <span>Fatal</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-600"></div>
            <span>Severe</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span>Moderate</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-600"></div>
            <span>Minor</span>
          </div>
        </div>
      </div>

      {/* Map info */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-2 text-xs">
        <div className="text-gray-600">
          {accidents.length} accident{accidents.length !== 1 ? 's' : ''} shown
        </div>
      </div>
    </div>
  );
};

export default AccidentMap;
