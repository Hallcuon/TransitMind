import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useI18n } from '../i18n/I18nContext';
import './Map.css';

// Fix leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const Map = ({ 
  routePath, 
  currentPosition, 
  transportType = 'train', 
  zoom = 8, 
  userPosition = null, 
  disableDrag = false,
  cities = [],
  selectedCityA = null,
  selectedCityB = null,
  onCitySelect = null,
  onMapClick = null,
  stops = [],
  otherUserPositions = {},
}) => {
  const { t } = useI18n();
  const [satelliteMode, setSatelliteMode] = useState(false);
  const mapRef = useRef(null);
  const routingControlRef = useRef(null);
  const tileLayerRef = useRef(null);
  const satelliteTileLayerRef = useRef(null);
  const polylineRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const boundsFitRef = useRef(false);
  const userIsDraggingRef = useRef(false);
  const sessionFollowInitializedRef = useRef(false);
  const cityMarkersRef = useRef({});
  const roadPolylineRef = useRef(null);
  const hoverContextCacheRef = useRef(new globalThis.Map());
  const hoverRequestIdRef = useRef(0);
  const stopMarkersRef = useRef([]);

  const defaultCenter = [51.505, -0.09]; // Europe center (center of Ukraine ~48.4, 31.2)
  
  // Filter and validate route coordinates
  const routeCoordinates = routePath
    ? routePath
        .map(p => [Number(p.lat), Number(p.lng)])
        .filter(([lat, lng]) => isFinite(lat) && isFinite(lng))
    : [];

  // City selection mode: render cities and roads instead of routing
  const isCitySelectionMode = cities && cities.length > 0;

  console.log('🗺️ Map Component Props:', {
    transportType,
    routePathLength: routePath ? routePath.length : 0,
    routeCoordinatesLength: routeCoordinates.length,
    routePath_first: routePath && routePath[0] ? routePath[0] : 'no path',
    routeCoordinates_first: routeCoordinates.length > 0 ? routeCoordinates[0] : 'no coords',
    routeCoordinates_all: routeCoordinates,
    isCitySelectionMode,
    userPositionSet: !!userPosition,
    disableDrag,
    currentPosition,
  });

  useEffect(() => {
    // Initialize map
    if (!mapRef.current) {
      const map = L.map('map-container').setView(defaultCenter, zoom);
      
      // Soft dark gray basemap (similar readability to Google Maps dark) — Esri World Dark Gray
      const esriDarkAttrib =
        'Tiles &copy; Esri &mdash; Sources: Esri, HERE, Garmin, OpenStreetMap contributors, GIS user community';
      const darkGrayOpts = {
        maxZoom: 19,
        maxNativeZoom: 16,
        attribution: esriDarkAttrib,
      };
      tileLayerRef.current = L.layerGroup([
        L.tileLayer(
          'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
          darkGrayOpts
        ),
        L.tileLayer(
          'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
          {
            ...darkGrayOpts,
            attribution: '',
          }
        ),
      ]).addTo(map);

      // Create satellite layer (not added by default)
      satelliteTileLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
      });

      // Detect when user manually drags/pans the map
      map.on('dragstart', () => {
        userIsDraggingRef.current = true;
      });
      map.on('dragend', () => {
        userIsDraggingRef.current = false;
      });

      mapRef.current = map;
    }

    const map = mapRef.current;

    // Control dragging based on disableDrag prop
    if (disableDrag) {
      map.dragging.disable();
    } else {
      map.dragging.enable();
    }

    // Reset bounds fitting for new route
    boundsFitRef.current = false;

    // Clear old routing - be extra careful
    if (routingControlRef.current) {
      try {
        if (map && routingControlRef.current._map) {
          map.removeControl(routingControlRef.current);
        }
      } catch (err) {
        console.warn('⚠️ Error removing routing control:', err);
      }
      routingControlRef.current = null;
    }

    // Clear old polyline
    if (polylineRef.current) {
      try {
        map.removeLayer(polylineRef.current);
      } catch (err) {
        console.warn('⚠️ Error removing polyline:', err);
      }
      polylineRef.current = null;
    }

    // Clear old markers
    if (startMarkerRef.current) {
      try {
        map.removeLayer(startMarkerRef.current);
      } catch (err) {
        console.warn('⚠️ Error removing start marker:', err);
      }
    }
    if (endMarkerRef.current) {
      try {
        map.removeLayer(endMarkerRef.current);
      } catch (err) {
        console.warn('⚠️ Error removing end marker:', err);
      }
    }

    // If we have route coordinates
    if (routeCoordinates.length >= 2) {
      const start = routeCoordinates[0];
      const end = routeCoordinates[routeCoordinates.length - 1];

      console.log('🛣️ Routing:', {
        start,
        end,
        transportType,
        mapReady: !!map,
      });

      // ВАЖЛИВО: Малюємо маршрут відразу
      if (transportType === 'flight') {
        // FLIGHT: straight dashed line
        if (polylineRef.current) {
          map.removeLayer(polylineRef.current);
        }
        polylineRef.current = L.polyline([start, end], {
          color: '#3b82f6',
          weight: 3,
          opacity: 0.8,
          dashArray: '5, 5',
        }).addTo(map);
        console.log('✅ Flight route (straight line)');
      } else if (routeCoordinates.length > 2) {
        // CAR/TRAIN with waypoints: draw curved line through all waypoints
        if (polylineRef.current) {
          map.removeLayer(polylineRef.current);
        }
        polylineRef.current = L.polyline(routeCoordinates, {
          color: '#10b981',
          weight: 5,
          opacity: 0.85,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
        console.log(`✅ Curved route through ${routeCoordinates.length} waypoints`);
      } else {
        // CAR / OTHER: direct line (only start/end)
        if (polylineRef.current) {
          map.removeLayer(polylineRef.current);
        }
        polylineRef.current = L.polyline([start, end], {
          color: '#10b981',
          weight: 4,
          opacity: 0.8,
        }).addTo(map);
        console.log(`✅ Direct line route`);
      }

      // Add markers
      startMarkerRef.current = L.circleMarker(start, {
        radius: 8,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.8,
        weight: 2,
      })
        .bindPopup('Departure')
        .addTo(map);

      endMarkerRef.current = L.circleMarker(end, {
        radius: 8,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.8,
        weight: 2,
      })
        .bindPopup('Arrival')
        .addTo(map);

      // Fit bounds ONLY if not in session mode
      if (!boundsFitRef.current && !userPosition) {
        const group = new L.featureGroup([startMarkerRef.current, endMarkerRef.current]);
        map.fitBounds(group.getBounds().pad(0.1));
        boundsFitRef.current = true;
      } else {
        console.log('⏭️ Skipping fitBounds (session mode or already fitted)');
      }
    }

    return () => {
      // Cleanup
    };
  }, [routeCoordinates, zoom, transportType]);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const handleClick = (e) => {
      if (!onMapClick) return;
      if (disableDrag) return;
      onMapClick({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        screenX: e.originalEvent?.clientX,
        screenY: e.originalEvent?.clientY,
      });
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [onMapClick, disableDrag]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear previous stop markers
    stopMarkersRef.current.forEach((m) => {
      try {
        map.removeLayer(m);
      } catch {
        // ignore
      }
    });
    stopMarkersRef.current = [];

    if (!Array.isArray(stops) || stops.length === 0) return;

    stops.forEach((stop, index) => {
      const lat = Number(stop.lat);
      const lng = Number(stop.lng);
      if (!isFinite(lat) || !isFinite(lng)) return;

      const isFirst = index === 0;
      const isLast = index === stops.length - 1;

      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'stop-marker',
          html: `<div class="stop-marker-badge ${isFirst ? 'start' : isLast ? 'end' : 'mid'}">${index + 1}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
        interactive: false,
      }).addTo(map);

      stopMarkersRef.current.push(marker);
    });
  }, [stops]);

  // City selection mode: Render cities and roads
  useEffect(() => {
    if (!mapRef.current || !isCitySelectionMode) return;

    const map = mapRef.current;

    // Clear old city markers
    Object.values(cityMarkersRef.current).forEach(marker => {
      map.removeLayer(marker);
    });
    cityMarkersRef.current = {};

    // Clear old road polylines (we no longer render graph connections visually)
    if (roadPolylineRef.current) {
      map.removeLayer(roadPolylineRef.current);
      roadPolylineRef.current = null;
    }

    // Render city markers
    cities.forEach(city => {
      const isSelectedA = selectedCityA && selectedCityA.id === city.id;
      const isSelectedB = selectedCityB && selectedCityB.id === city.id;
      
      const markerColor = isSelectedA ? '#10b981' : isSelectedB ? '#ef4444' : '#3b82f6';
      const fillColor = isSelectedA ? '#86efac' : isSelectedB ? '#fca5a5' : '#93c5fd';
      const radius = isSelectedA || isSelectedB ? 10 : 7;
      
      const marker = L.circleMarker([city.lat, city.lng], {
        radius: radius,
        color: markerColor,
        fillColor: fillColor,
        fillOpacity: 0.8,
        weight: 2,
        className: `city-marker ${isSelectedA ? 'selected-a' : ''} ${isSelectedB ? 'selected-b' : ''}`,
      })
        .bindTooltip(`<div class="city-hover-tooltip">🏙️ <strong>${city.name}</strong><br/>⏳ Loading…</div>`, {
          direction: 'top',
          offset: [0, -10],
          opacity: 1,
          sticky: true,
          className: 'city-hover-tooltip-container',
        })
        .addTo(map);

      // Add click handler for city selection
      marker.on('click', (e) => {
        if (e?.originalEvent) {
          L.DomEvent.stopPropagation(e.originalEvent);
        }
        if (onCitySelect) {
          onCitySelect(city);
        }
      });

      marker.on('mouseover', async () => {
        const cacheKey = `${Number(city.lat).toFixed(3)},${Number(city.lng).toFixed(3)}`;
        const cached = hoverContextCacheRef.current.get(cacheKey);
        if (cached) {
          marker.setTooltipContent(cached);
          return;
        }

        const requestId = ++hoverRequestIdRef.current;
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&current=temperature_2m,weather_code,wind_speed_10m,is_day&timezone=auto`;
          const response = await fetch(url);
          if (!response.ok) return;
          const data = await response.json();
          if (requestId !== hoverRequestIdRef.current) return;

          const timezone = data.timezone || 'UTC';
          const localTime = new Date().toLocaleTimeString('uk-UA', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
          });

          const temp = data.current?.temperature_2m ?? '--';
          const wind = data.current?.wind_speed_10m ?? '--';
          const code = data.current?.weather_code ?? '--';

          const html = `<div class="city-hover-tooltip">🏙️ <strong>${city.name}</strong><br/>🕒 ${localTime} (${timezone})<br/>🌤️ ${temp}°C · 💨 ${wind} km/h · code ${code}</div>`;
          hoverContextCacheRef.current.set(cacheKey, html);
          marker.setTooltipContent(html);
        } catch {
          // ignore hover errors
        }
      });

      cityMarkersRef.current[city.id] = marker;
    });

    // Fit bounds to show all cities on first load
    if (!boundsFitRef.current && cities.length > 0) {
      const group = new L.featureGroup(Object.values(cityMarkersRef.current));
      map.fitBounds(group.getBounds().pad(0.15));
      boundsFitRef.current = true;
    }
  }, [cities, selectedCityA, selectedCityB, onCitySelect, isCitySelectionMode]);

  // Update user position marker and auto-pan map when userPosition changes
  useEffect(() => {
    if (!mapRef.current || !userPosition) return;

    // Validate userPosition
    if (!isFinite(userPosition.lat) || !isFinite(userPosition.lng)) {
      console.warn('❌ Invalid user position:', userPosition);
      return;
    }

    const map = mapRef.current;
    console.log('📍 Updating user position to:', userPosition);

    // Remove old user marker
    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
    }

    try {
      // Add new user marker (blue pulse effect)
      userMarkerRef.current = L.circleMarker([userPosition.lat, userPosition.lng], {
        radius: 10,
        color: '#3b82f6',
        fillColor: '#93c5fd',
        fillOpacity: 1,
        weight: 2,
        className: 'user-position-marker',
      })
        .bindPopup('📍 Your Position')
        .addTo(map);

      // Always follow user position - check if we're in session mode by checking if userPosition prop exists continuously
      // In session, userPosition is always passed. In routes selection, it's null.
      // If disableDrag is true (session active), definitely follow
      // But also follow if userPosition just changed (new position update)
      if (disableDrag) {
        // Session mode: lock center to marker. Set a close zoom only once,
        // then keep the user's zoom level when they change it with the wheel.
        if (!sessionFollowInitializedRef.current) {
          map.setView([userPosition.lat, userPosition.lng], 13, { animate: true, duration: 0.5 });
          sessionFollowInitializedRef.current = true;
          console.log('🎯 Initial session focus set with close zoom');
        } else {
          map.panTo([userPosition.lat, userPosition.lng], { animate: true, duration: 0.5 });
          console.log('🎯 Session follow: center locked, zoom preserved');
        }
      } else if (!userIsDraggingRef.current) {
        // Routes mode but following available: pan if user is not manually dragging
        map.panTo([userPosition.lat, userPosition.lng]);
        console.log('🎯 Map panned to user position');
      }
    } catch (err) {
      console.error('❌ Error creating user marker:', err, userPosition);
    }
  }, [userPosition, disableDrag]);

  useEffect(() => {
    if (!disableDrag) {
      sessionFollowInitializedRef.current = false;
    }
  }, [disableDrag]);

  // Render other users' positions (from WebSocket)
  const otherMarkersRef = useRef({});

  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Update existing markers and add new ones
    Object.entries(otherUserPositions).forEach(([userId, position]) => {
      if (!position || !position.lat || !position.lng) return;

      if (otherMarkersRef.current[userId]) {
        // Update existing marker
        otherMarkersRef.current[userId].setLatLng([position.lat, position.lng]);
      } else {
        // Create new marker for this user
        otherMarkersRef.current[userId] = L.circleMarker([position.lat, position.lng], {
          radius: 8,
          color: '#f59e0b',
          fillColor: '#fcd34d',
          fillOpacity: 0.8,
          weight: 2,
          className: 'other-user-marker',
        })
          .bindPopup(`👥 Other User`)
          .addTo(map);
      }
    });

    // Remove markers for users no longer in the session
    Object.keys(otherMarkersRef.current).forEach((userId) => {
      if (!otherUserPositions[userId]) {
        map.removeLayer(otherMarkersRef.current[userId]);
        delete otherMarkersRef.current[userId];
      }
    });
  }, [otherUserPositions]);

  // Control map dragging independently from route rendering
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    if (disableDrag) {
      // During session: disable only dragging (panning), keep zoom and clicks
      map.dragging.disable();
    } else {
      // Normal mode: enable dragging
      map.dragging.enable();
    }
  }, [disableDrag]);

  // Toggle satellite/regular map mode
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current || !satelliteTileLayerRef.current) return;

    const map = mapRef.current;

    if (satelliteMode) {
      // Switch to satellite
      map.removeLayer(tileLayerRef.current);
      satelliteTileLayerRef.current.addTo(map);
    } else {
      // Switch back to regular
      map.removeLayer(satelliteTileLayerRef.current);
      tileLayerRef.current.addTo(map);
    }
  }, [satelliteMode]);

  return (
    <>
      <div
        id="map-container"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '500px',
          position: 'relative',
        }}
      />

      <button
        type="button"
        className={`map-layer-toggle ${satelliteMode ? 'map-layer-toggle--satellite-active' : ''}`}
        onClick={() => setSatelliteMode(!satelliteMode)}
        aria-label={t('map.toggleAria')}
        aria-pressed={satelliteMode}
      >
        {satelliteMode ? t('map.showMap') : t('map.showSatellite')}
      </button>
    </>
  );
};

export default Map;
