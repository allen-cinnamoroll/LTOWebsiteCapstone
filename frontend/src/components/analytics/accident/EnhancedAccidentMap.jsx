import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getLocationCoordinates, isValidDavaoOrientalCoordinate } from '@/util/geocoding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Eye,
  EyeOff,
  Target,
  AlertTriangle
} from 'lucide-react';

const EnhancedAccidentMap = ({ accidents, className = "" }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showClusters, setShowClusters] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [mapStyle, setMapStyle] = useState('streets');
  const [isChangingStyle, setIsChangingStyle] = useState(false);

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

  // Function to get correct Mapbox style URL
  const getMapboxStyle = (styleName) => {
    const styleMap = {
      'streets': 'mapbox://styles/mapbox/streets-v12',
      'satellite': 'mapbox://styles/mapbox/satellite-v9',
      'outdoors': 'mapbox://styles/mapbox/outdoors-v12',
      'light': 'mapbox://styles/mapbox/light-v11',
      'dark': 'mapbox://styles/mapbox/dark-v11'
    };
    return styleMap[styleName] || styleMap['streets'];
  };

  useEffect(() => {
    if (!accidents || accidents.length === 0) return;

    // Set Mapbox access token
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
    mapboxgl.accessToken = mapboxToken;

    // Initialize map only once
    if (!map.current) {
      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: getMapboxStyle(mapStyle),
          center: [125.971907, 6.90543], // Default center for Davao Oriental
          zoom: 12 // Increased zoom to better show streets
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.current.on('load', () => {
          setMapLoaded(true);
          setupMapLayers();
        });

        map.current.on('error', (e) => {
          console.error('Map error:', e);
          setMapError(true);
        });

      } catch (error) {
        console.error('Map initialization error:', error);
        setMapError(true);
        return;
      }
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [accidents]);

  // Handle style changes separately
  useEffect(() => {
    if (map.current && mapLoaded && !isChangingStyle && map.current.loaded()) {
      setIsChangingStyle(true);
      try {
        // Remove all existing layers and sources before style change
        if (map.current.getLayer('clusters')) map.current.removeLayer('clusters');
        if (map.current.getLayer('cluster-count')) map.current.removeLayer('cluster-count');
        if (map.current.getLayer('unclustered-point')) map.current.removeLayer('unclustered-point');
        if (map.current.getLayer('heatmap')) map.current.removeLayer('heatmap');
        if (map.current.getSource('accidents')) map.current.removeSource('accidents');
        
        map.current.setStyle(getMapboxStyle(mapStyle));
        
        // Wait for style to fully load before adding layers
        // Use 'styledata' event which fires when style is loaded
        map.current.once('styledata', () => {
          // Wait for map to be fully loaded
          if (map.current.loaded()) {
            setupMapLayers();
            setIsChangingStyle(false);
          } else {
            map.current.once('load', () => {
              setupMapLayers();
              setIsChangingStyle(false);
            });
          }
        });
        
        // Fallback timeout in case events don't fire
        setTimeout(() => {
          if (map.current && map.current.loaded()) {
            setupMapLayers();
          }
          setIsChangingStyle(false);
        }, 3000);
      } catch (error) {
        console.error('Style change error:', error);
        setMapError(true);
        setIsChangingStyle(false);
      }
    }
  }, [mapStyle, mapLoaded]);

  // Update map layers when clustering or heatmap changes
  useEffect(() => {
    if (mapLoaded && map.current && map.current.loaded() && !isChangingStyle) {
      setupMapLayers();
    }
  }, [mapLoaded, showClusters, showHeatmap, isChangingStyle]);

  const setupMapLayers = () => {
    if (!map.current || !mapLoaded || !map.current.loaded() || isChangingStyle) return;

    // Prepare data for map layers
    const geojsonData = prepareGeojsonData();
    
    // Remove existing layers and source safely
    try {
      if (map.current.getLayer('clusters')) map.current.removeLayer('clusters');
      if (map.current.getLayer('cluster-count')) map.current.removeLayer('cluster-count');
      if (map.current.getLayer('unclustered-point')) map.current.removeLayer('unclustered-point');
      if (map.current.getLayer('heatmap')) map.current.removeLayer('heatmap');
      if (map.current.getSource('accidents')) map.current.removeSource('accidents');
    } catch (e) {
      // Ignore errors if layers/sources don't exist
    }
    
    // Add source
    try {
      map.current.addSource('accidents', {
      type: 'geojson',
      data: geojsonData,
      cluster: showClusters,
      clusterMaxZoom: 14,
      clusterRadius: 50
      });
    } catch (e) {
      console.error('Error adding source:', e);
      return;
    }

    // Add cluster circles
    if (showClusters) {
      try {
        map.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'accidents',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#51bbd6',
            10, '#f1f075',
            30, '#f28cb1'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            15,
            10, 20,
            30, 25
          ]
        }
        });
      } catch (e) {
        console.error('Error adding cluster layer:', e);
      }

      // Add cluster count labels
      try {
        map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'accidents',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        }
        });
      } catch (e) {
        console.error('Error adding cluster count layer:', e);
      }
    }

    // Add individual accident markers
    try {
      map.current.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'accidents',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#dc2626',
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
      });
    } catch (e) {
      console.error('Error adding unclustered point layer:', e);
    }

    // Add heatmap layer
    if (showHeatmap) {
      try {
        map.current.addLayer({
        id: 'heatmap',
        type: 'heatmap',
        source: 'accidents',
        maxzoom: 15,
        paint: {
          'heatmap-weight': 1,
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,
            15, 3
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(33,102,172,0)',
            0.2, 'rgb(103,169,207)',
            0.4, 'rgb(209,229,240)',
            0.6, 'rgb(253,219,199)',
            0.8, 'rgb(239,138,98)',
            1, 'rgb(178,24,43)'
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 2,
            15, 20
          ],
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 1,
            15, 0
          ]
        }
        });
      } catch (e) {
        console.error('Error adding heatmap layer:', e);
      }
    }

    // Remove existing event listeners to prevent duplicates
    try {
      map.current.off('click', 'clusters');
      map.current.off('click', 'unclustered-point');
      map.current.off('mouseenter', 'clusters');
      map.current.off('mouseleave', 'clusters');
      map.current.off('mouseenter', 'unclustered-point');
      map.current.off('mouseleave', 'unclustered-point');
    } catch (e) {
      // Ignore errors
    }

    // Add click handlers
    try {
      map.current.on('click', 'clusters', (e) => {
      const features = map.current.queryRenderedFeatures(e.point, {
        layers: ['clusters']
      });
      const clusterId = features[0].properties.cluster_id;
      
      map.current.getSource('accidents').getClusterExpansionZoom(
        clusterId,
        (err, zoom) => {
          if (err) return;
          
          map.current.easeTo({
            center: features[0].geometry.coordinates,
            zoom: zoom
          });
        }
      );
      });

      map.current.on('click', 'unclustered-point', (e) => {
      const coordinates = e.features[0].geometry.coordinates.slice();
      const properties = e.features[0].properties;
      
      // Create popup
      const popup = new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(createPopupContent(properties))
        .addTo(map.current);
      });

      // Change cursor on hover
      map.current.on('mouseenter', 'clusters', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'clusters', () => {
        map.current.getCanvas().style.cursor = '';
      });

      map.current.on('mouseenter', 'unclustered-point', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'unclustered-point', () => {
        map.current.getCanvas().style.cursor = '';
      });
    } catch (e) {
      console.error('Error adding event handlers:', e);
    }
  };

  const prepareGeojsonData = () => {
    const features = accidents
      .map(accident => {
        let coordinates = null;
        
        // First, check if accident has stored lat/lng coordinates (preferred, but validate)
        if (accident.lat && accident.lng && 
            typeof accident.lat === 'number' && typeof accident.lng === 'number' &&
            !isNaN(accident.lat) && !isNaN(accident.lng)) {
          // Only use stored coordinates if they're valid for Davao Oriental
          if (isValidDavaoOrientalCoordinate(accident.lat, accident.lng)) {
            coordinates = [accident.lng, accident.lat];
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
            coordinates = [geocodedCoords.lng, geocodedCoords.lat];
          } else {
            console.warn(`Geocoding failed for: ${accident.municipality}, ${accident.barangay}`);
          }
        }
        
        if (coordinates) {
          return {
            type: 'Feature',
            properties: {
              blotterNo: accident.blotterNo,
              vehiclePlateNo: accident.vehiclePlateNo,
              vehicleMCPlateNo: accident.vehicleMCPlateNo,
              vehicleChassisNo: accident.vehicleChassisNo,
              incidentType: accident.incidentType,
              caseStatus: accident.caseStatus,
              municipality: accident.municipality,
              barangay: accident.barangay,
              street: accident.street,
              dateCommited: accident.dateCommited,
              suspect: accident.suspect,
              offense: accident.offense
            },
            geometry: {
              type: 'Point',
              coordinates: coordinates
            }
          };
        }
        return null;
      })
      .filter(feature => feature !== null);

    return {
      type: 'FeatureCollection',
      features: features
    };
  };

  const createPopupContent = (properties) => {
    const formatDate = (date) => {
      if (!date) return 'N/A';
      try {
        return new Date(date).toLocaleDateString();
      } catch {
        return 'N/A';
      }
    };

    const getVehiclePlate = (props) => {
      if (props.vehiclePlateNo) return props.vehiclePlateNo;
      if (props.vehicleMCPlateNo) return props.vehicleMCPlateNo;
      return 'N/A';
    };

    return `
      <div style="padding: 12px; min-width: 220px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px;">
          Blotter No: ${properties.blotterNo || 'N/A'}
        </h3>
        <div style="font-size: 13px; line-height: 1.5; color: #374151;">
          ${getVehiclePlate(properties) !== 'N/A' ? `<p style="margin: 4px 0; color: #1f2937;"><strong style="color: #111827;">Vehicle Plate:</strong> ${getVehiclePlate(properties)}</p>` : ''}
          ${properties.incidentType ? `<p style="margin: 4px 0; color: #1f2937;"><strong style="color: #111827;">Incident Type:</strong> ${properties.incidentType}</p>` : ''}
          ${properties.caseStatus ? `<p style="margin: 4px 0; color: #1f2937;"><strong style="color: #111827;">Case Status:</strong> ${properties.caseStatus}</p>` : ''}
          <p style="margin: 4px 0; color: #1f2937;"><strong style="color: #111827;">Location:</strong> ${properties.municipality || 'N/A'}, ${properties.barangay || 'N/A'}</p>
          ${properties.street ? `<p style="margin: 4px 0; color: #1f2937;"><strong style="color: #111827;">Street:</strong> ${properties.street}</p>` : ''}
          <p style="margin: 4px 0; color: #1f2937;"><strong style="color: #111827;">Date Committed:</strong> ${formatDate(properties.dateCommited)}</p>
          <p style="margin: 4px 0; color: #f59e0b; font-size: 11px;"><em>📍 Location based on municipality</em></p>
        </div>
      </div>
    `;
  };


  const resetMapView = () => {
    if (map.current && map.current.loaded()) {
      map.current.flyTo({
        center: [125.971907, 6.90543],
        zoom: 12, // Increased zoom to better show streets
        duration: 1000
      });
    }
  };

  const toggleMapStyle = () => {
    const styles = ['streets', 'satellite', 'outdoors', 'light', 'dark'];
    const currentIndex = styles.indexOf(mapStyle);
    const nextIndex = (currentIndex + 1) % styles.length;
    
    // Reset error state when changing styles
    setMapError(false);
    setMapStyle(styles[nextIndex]);
  };

  if (mapError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Map Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <div className="text-center text-gray-500">
              <div className="text-lg font-medium">Map unavailable</div>
              <div className="text-sm mb-4">Unable to load map. This might be due to:</div>
              <ul className="text-xs text-left space-y-1 mb-4">
                <li>• Internet connection issues</li>
                <li>• Mapbox token configuration</li>
                <li>• Style loading problems</li>
              </ul>
              <button
                onClick={() => {
                  setMapError(false);
                  setMapLoaded(false);
                  // Force re-initialization
                  if (map.current) {
                    map.current.remove();
                    map.current = null;
                  }
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!accidents || accidents.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-500" />
            Accident Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <div className="text-center text-gray-500">
              <div className="text-lg font-medium">No location data available</div>
              <div className="text-sm">Accidents in this period don't have coordinate information</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`group hover:shadow-lg transition-all duration-300 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              Accident Map
            </CardTitle>
            <CardDescription>
              Interactive map with clustering, heat layers, and advanced filtering
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {accidents.length} Accidents
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Map Controls */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Button
                variant={showClusters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowClusters(!showClusters)}
                className="flex items-center gap-1"
              >
                <Target className="h-4 w-4" />
                Clusters
              </Button>
              <Button
                variant={showHeatmap ? "default" : "outline"}
                size="sm"
                onClick={() => setShowHeatmap(!showHeatmap)}
                className="flex items-center gap-1"
              >
                <Layers className="h-4 w-4" />
                Heatmap
              </Button>
            </div>
            

            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleMapStyle}
                disabled={isChangingStyle}
                className="flex items-center gap-1"
              >
                <Layers className="h-4 w-4" />
                {isChangingStyle ? 'Loading...' : 'Style'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetMapView}
                className="flex items-center gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>

          {/* Map Container */}
          <div className="relative">
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
                  <div className="w-3 h-3 rounded-full bg-red-600 border-2 border-white"></div>
                  <span>Accident Location</span>
                </div>
              </div>
              {showClusters && (
                <div className="mt-3 pt-2 border-t border-gray-300">
                  <div className="font-semibold mb-1">Clusters</div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                      <span>Small</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-yellow-400"></div>
                      <span>Medium</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded-full bg-pink-400"></div>
                      <span>Large</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedAccidentMap;
