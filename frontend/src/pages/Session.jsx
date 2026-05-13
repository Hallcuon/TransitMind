import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import Map from '../components/Map';
import RouteInsightsPanel from '../components/RouteInsightsPanel';
import RouteInsightsDrawer from '../components/RouteInsightsDrawer';
import { useI18n } from '../i18n/I18nContext';
import './Session.css';

const haversineDistanceKm = (a, b) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const interpolateAlongPath = (path, progress) => {
  if (!Array.isArray(path) || path.length === 0) {
    return null;
  }

  if (path.length === 1) {
    return { lat: path[0].lat, lng: path[0].lng };
  }

  const clampedProgress = Math.max(0, Math.min(progress, 1));
  if (clampedProgress === 0) {
    return { lat: path[0].lat, lng: path[0].lng };
  }
  if (clampedProgress === 1) {
    const last = path[path.length - 1];
    return { lat: last.lat, lng: last.lng };
  }

  const segmentLengths = [];
  let totalLength = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const len = haversineDistanceKm(from, to);
    segmentLengths.push(len);
    totalLength += len;
  }

  if (totalLength <= 0) {
    return { lat: path[0].lat, lng: path[0].lng };
  }

  const targetDistance = totalLength * clampedProgress;
  let traversed = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (traversed + segLen >= targetDistance) {
      const localProgress = segLen === 0 ? 0 : (targetDistance - traversed) / segLen;
      const from = path[i];
      const to = path[i + 1];
      return {
        lat: from.lat + (to.lat - from.lat) * localProgress,
        lng: from.lng + (to.lng - from.lng) * localProgress,
      };
    }
    traversed += segLen;
  }

  const last = path[path.length - 1];
  return { lat: last.lat, lng: last.lng };
};

const Session = () => {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [currentUserPosition, setCurrentUserPosition] = useState(null);
  const [routeInfo, setRouteInfo] = useState(location.state?.routeInfo || {});
  const [showTimezoneOverlay, setShowTimezoneOverlay] = useState(true);
  const [showWeatherOverlay, setShowWeatherOverlay] = useState(true);
  const [routeContext, setRouteContext] = useState([]);
  const [enrichment, setEnrichment] = useState(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [enrichmentError, setEnrichmentError] = useState(null);
  const [insightsOpen, setInsightsOpen] = useState(false);

  const statistics = location.state?.statistics;
  const routeSummary = useMemo(() => {
    if (!statistics) return null;
    return {
      distanceKm:
        statistics.totalDistance != null ? Math.round(Number(statistics.totalDistance) * 10) / 10 : null,
      timeMin: statistics.totalTime != null ? Number(statistics.totalTime) : null,
    };
  }, [statistics]);

  useEffect(() => {
    const stats = location.state?.statistics;
    const path = routeInfo?.pathCoordinates;
    if (!stats || !Array.isArray(path) || path.length < 2) return undefined;

    let cancelled = false;
    setEnrichment(null);
    setEnrichmentLoading(true);
    setEnrichmentError(null);

    apiClient
      .post('/context/route-enrichment', {
        pathCoordinates: path,
        statistics: stats,
      })
      .then(({ data }) => {
        if (!cancelled) setEnrichment(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setEnrichmentError(err.response?.data?.error || t('routes.insightsError'));
        }
      })
      .finally(() => {
        if (!cancelled) setEnrichmentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [routeInfo.pathCoordinates, location.state?.statistics, t]);

  // Debug: Log route info when it changes
  useEffect(() => {
    console.log('📍 Route Info:', {
      routeName: routeInfo.routeName,
      startLat: routeInfo.startLat,
      startLng: routeInfo.startLng,
      endLat: routeInfo.endLat,
      endLng: routeInfo.endLng,
      pathCoordinates: routeInfo.pathCoordinates ? `${routeInfo.pathCoordinates.length} points` : 'none',
      transportType: routeInfo.transportType,
    });
  }, [routeInfo]);

  useEffect(() => {
    fetchSessionData();
  }, [sessionId]);

  // Timer effect - countdown to start, elapsed time, and remaining time
  useEffect(() => {
    if (!sessionData) return;

    const interval = setInterval(() => {
      const now = new Date();
      const startTime = new Date(sessionData.start_time);
      const endTime = new Date(startTime.getTime() + (sessionData.duration_minutes || 60) * 60 * 1000);
      
      const timeToStartMs = startTime - now;
      const timeToEndMs = endTime - now;

      if (timeToStartMs > 0) {
        setIsSessionActive(false);
        setElapsedTime(0);
        setRemainingTime(0);
      } else if (timeToEndMs > 0) {
        setIsSessionActive(true);
        setElapsedTime(Math.floor(-timeToStartMs / 1000));
        setRemainingTime(Math.floor(timeToEndMs / 1000));
      } else {
        setIsSessionActive(false);
        setElapsedTime(Math.floor((endTime - startTime) / 1000));
        setRemainingTime(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionData]);

  // Set initial user position immediately when routeInfo is available (for instant map focus)
  useEffect(() => {
    if (!routeInfo.startLat || !routeInfo.startLng) {
      console.log('⏳ Waiting for route info...');
      return;
    }

    const startLat = Number(routeInfo.startLat);
    const startLng = Number(routeInfo.startLng);

    if (isFinite(startLat) && isFinite(startLng)) {
      setCurrentUserPosition({
        lat: startLat,
        lng: startLng,
      });
      console.log('📍 Initial user position set on Session load:', { lat: startLat, lng: startLng });
    }
  }, [routeInfo.startLat, routeInfo.startLng, sessionData]);

  // Live tracking effect - single-player simulation (no WebSocket)
  useEffect(() => {
    if (!isSessionActive || !sessionData) return;

    const pathCoordinates = Array.isArray(routeInfo.pathCoordinates)
      ? routeInfo.pathCoordinates
          .map((point) => ({
            lat: Number(point.lat),
            lng: Number(point.lng),
          }))
          .filter((point) => isFinite(point.lat) && isFinite(point.lng))
      : [];

    // Fallback for legacy route payloads without detailed path.
    if (pathCoordinates.length < 2) {
      const startLat = Number(routeInfo.startLat);
      const startLng = Number(routeInfo.startLng);
      const endLat = Number(routeInfo.endLat);
      const endLng = Number(routeInfo.endLng);
      if (isFinite(startLat) && isFinite(startLng) && isFinite(endLat) && isFinite(endLng)) {
        pathCoordinates.push(
          { lat: startLat, lng: startLng },
          { lat: endLat, lng: endLng }
        );
      }
    }

    if (pathCoordinates.length < 2) {
      console.warn('❌ Invalid or insufficient route path coordinates');
      return;
    }

    console.log('🎬 Live tracking started (single-player simulation)');

    const interval = setInterval(() => {
      const now = new Date();
      const startTime = new Date(sessionData.start_time);
      const duration = (sessionData.duration_minutes || 60) * 60 * 1000; // Convert to ms
      
      // Calculate progress (0 to 1)
      const elapsedMs = now - startTime;
      const progress = Math.min(elapsedMs / duration, 1);

      // Move marker along the real route geometry, not a straight line.
      const currentPoint = interpolateAlongPath(pathCoordinates, progress);

      if (currentPoint && isFinite(currentPoint.lat) && isFinite(currentPoint.lng)) {
        setCurrentUserPosition({
          lat: currentPoint.lat,
          lng: currentPoint.lng,
        });

        console.log(`📍 Position updated on route: ${currentPoint.lat.toFixed(3)}, ${currentPoint.lng.toFixed(3)} (progress: ${(progress * 100).toFixed(1)}%)`);
      }
    }, 2000); // Update every 2 seconds (can be reduced to 500ms for real-time feel)

    return () => clearInterval(interval);
  }, [isSessionActive, sessionData, routeInfo, sessionId]);

  useEffect(() => {
    const pathCoordinates = Array.isArray(routeInfo.pathCoordinates)
      ? routeInfo.pathCoordinates
          .map((point) => ({ lat: Number(point.lat), lng: Number(point.lng) }))
          .filter((point) => isFinite(point.lat) && isFinite(point.lng))
      : [];

    if (pathCoordinates.length < 2) {
      return;
    }

    const startTime = sessionData?.start_time ? new Date(sessionData.start_time) : new Date();
    const durationMs = (sessionData?.duration_minutes || 60) * 60 * 1000;
    const endTime = new Date(startTime.getTime() + durationMs);
    const pointsPayload = [
      {
        label: 'Start',
        lat: pathCoordinates[0].lat,
        lng: pathCoordinates[0].lng,
        atTime: startTime.toISOString(),
      },
      {
        label: 'End',
        lat: pathCoordinates[pathCoordinates.length - 1].lat,
        lng: pathCoordinates[pathCoordinates.length - 1].lng,
        atTime: endTime.toISOString(),
      },
    ];

    let cancelled = false;

    const fetchRouteContext = async () => {
      try {
        const response = await apiClient.post('/context/route-points', { points: pointsPayload });
        if (!cancelled) {
          setRouteContext(response.data.points || []);
        }
      } catch (contextErr) {
        console.warn('⚠️ Failed to load timezone/weather context:', contextErr.message);
      }
    };

    fetchRouteContext();
    const interval = setInterval(fetchRouteContext, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [routeInfo.pathCoordinates, sessionData?.start_time, sessionData?.duration_minutes]);

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      // Fetch real session data from API
      const response = await apiClient.get(`/sessions/${sessionId}`);
      const data = response.data;
      
      console.log('🎯 Full session response from API:', data);
      console.log('🎯 Participants array:', data.participants);
      
      // Ensure start_time is a Date object
      const startTime = typeof data.start_time === 'string' 
        ? new Date(data.start_time) 
        : data.start_time;
      
      setSessionData({
        ...data,
        start_time: startTime,
      });

      // Get all cities to find coordinates
      try {
        const citiesResponse = await apiClient.get('/dijkstra/cities');
        const cities = citiesResponse.data;
        
        console.log('🏙️ Cities loaded, count:', cities.length);
        
        // Find start and end cities
        const startCity = cities.find(c => c.name === data.start_city);
        const endCity = cities.find(c => c.name === data.end_city);
        
        if (startCity && endCity) {
          // KEEP pathCoordinates from location.state if it already has 3+ points (from find-route)
          let pathCoordinates = routeInfo.pathCoordinates;
          
          console.log('📊 Current pathCoordinates from state:', {
            exists: !!pathCoordinates,
            length: pathCoordinates ? pathCoordinates.length : 0,
          });

          // Try to get detailed route line from OSRM backend
          try {
            const routeLineResponse = await apiClient.get('/dijkstra/route-line', {
              params: {
                startLat: startCity.lat,
                startLng: startCity.lng,
                endLat: endCity.lat,
                endLng: endCity.lng,
              }
            });

            if (routeLineResponse.data.coordinates && routeLineResponse.data.coordinates.length > 2) {
              pathCoordinates = routeLineResponse.data.coordinates;
              console.log(`✅ Got detailed route from OSRM: ${pathCoordinates.length} points`);
            } else {
              console.warn('⚠️ OSRM returned fallback or insufficient points');
            }
          } catch (routeErr) {
            console.warn('⚠️ Could not fetch OSRM route line:', routeErr.message);
          }
          
          // Fallback: use waypoints from database if OSRM didn't work
          if (!pathCoordinates || pathCoordinates.length < 3) {
            console.log('⚠️ PathCoordinates insufficient, trying to rebuild from waypoints...');
            
            let newPathCoordinates = [
              { lat: startCity.lat, lng: startCity.lng },
              { lat: endCity.lat, lng: endCity.lng },
            ];

            // If waypoints JSON exists, parse and use it
            if (data.waypoints) {
              try {
                const waypoints = typeof data.waypoints === 'string' 
                  ? JSON.parse(data.waypoints) 
                  : data.waypoints;
                
                console.log('📍 Parsed waypoints:', waypoints);
                
                if (Array.isArray(waypoints) && waypoints.length > 0) {
                  // waypoints is array of city NAMES (strings), not objects
                  // Convert city names to coordinates
                  newPathCoordinates = waypoints
                    .map(waypointName => {
                      const city = cities.find(c => c.name === waypointName);
                      console.log(`  Looking for city "${waypointName}" -> ${city ? 'found' : 'NOT FOUND'}`);
                      return city ? { lat: city.lat, lng: city.lng } : null;
                    })
                    .filter(coord => coord !== null); // Remove any null entries
                  
                  console.log(`🛣️ Converted ${waypoints.length} waypoint names to ${newPathCoordinates.length} coordinates`);
                }
              } catch (parseErr) {
                console.warn('⚠️ Could not parse waypoints:', parseErr.message);
              }
            }
            
            pathCoordinates = newPathCoordinates;
          }
          
          // Update routeInfo with real coordinates and waypoints
          const updatedRouteInfo = {
            ...routeInfo,
            routeName: data.route_name || `${data.start_city} → ${data.end_city}`,
            startCity: data.start_city,
            endCity: data.end_city,
            startLat: startCity.lat,
            startLng: startCity.lng,
            endLat: endCity.lat,
            endLng: endCity.lng,
            transportType: data.transport_type || 'car',
            pathCoordinates: pathCoordinates,
            sessionType: 'single',
          };
          
          console.log('📍 Route info set:', updatedRouteInfo);
          console.log(`✅ Final pathCoordinates has ${pathCoordinates.length} points`);
          // Update state
          setRouteInfo(updatedRouteInfo);
        }
      } catch (citiesErr) {
        console.warn('⚠️ Could not fetch cities:', citiesErr.message);
      }

      setError(null);
    } catch (err) {
      setError('Failed to load session');
      console.error('❌ Error fetching session:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveSession = async () => {
    if (!window.confirm('Are you sure you want to leave this session?')) {
      return;
    }

    try {
      await apiClient.post(`/sessions/${sessionId}/leave`);
      console.log('✅ Left session');
      navigate('/routes');
    } catch (err) {
      console.error('Failed to leave session:', err);
      alert('Failed to leave session');
    }
  };

  const formatTime = (seconds) => {
    if (seconds <= 0) return '00:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="session-page">
        <div className="loading">Loading session...</div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="session-page">
        <div className="error">{error || 'Session not found'}</div>
      </div>
    );
  }

  console.log('🗺️ Session render - routeInfo:', {
    pathCoordinatesLength: routeInfo.pathCoordinates ? routeInfo.pathCoordinates.length : 0,
    startLat: routeInfo.startLat,
    startLng: routeInfo.startLng,
    endLat: routeInfo.endLat,
    endLng: routeInfo.endLng,
    pathCoordinatesFirst: routeInfo.pathCoordinates ? routeInfo.pathCoordinates[0] : null,
  });

  return (
    <div className="session-page fullscreen">
      {/* Fullscreen Map */}
      <div className="map-fullscreen">
        <Map
          routePath={
            routeInfo.pathCoordinates && routeInfo.pathCoordinates.length > 2
              ? routeInfo.pathCoordinates
              : [
                  { lat: routeInfo.startLat, lng: routeInfo.startLng },
                  { lat: routeInfo.endLat, lng: routeInfo.endLng },
                ]
          }
          currentPosition={
            isFinite(Number(routeInfo.startLat)) && isFinite(Number(routeInfo.startLng))
              ? [routeInfo.startLat, routeInfo.startLng]
              : [50.45, 30.52]
          }
          transportType={routeInfo.transportType || 'train'}
          userPosition={currentUserPosition}
          otherUserPositions={{}}
          disableAutoPan={false}
          disableDrag={isSessionActive}
          zoom={7}
        />
      </div>

      <RouteInsightsDrawer
        open={insightsOpen}
        onOpenChange={setInsightsOpen}
        drawerId="session-insights-drawer"
        t={t}
      >
        <RouteInsightsPanel
          t={t}
          enrichmentLoading={enrichmentLoading}
          enrichmentError={enrichmentError}
          enrichment={enrichment}
          routeSummary={routeSummary}
        />
      </RouteInsightsDrawer>

      {/* Top Center Overlay - Compact flight-style widget */}
      <div className="ui-overlay top-center-overlay">
        {/* Timer Section */}
        <div className="timer-section">
          <div className="timer-item">
            <span className="timer-label">{isSessionActive ? '⏱️ Elapsed:' : '⏳ Waiting'}</span>
            <span className="timer-value">{formatTime(elapsedTime)}</span>
          </div>
          <div className="timer-item">
            <span className="timer-label">⏳ Remaining:</span>
            <span className="timer-value">{formatTime(remainingTime)}</span>
          </div>
        </div>

        <div className="session-widget-footer">
          <div className="context-toggles">
            <button
              type="button"
              className={`context-toggle ${showTimezoneOverlay ? 'active' : ''}`}
              onClick={() => setShowTimezoneOverlay((prev) => !prev)}
            >
              🕒 Time
            </button>
            <button
              type="button"
              className={`context-toggle ${showWeatherOverlay ? 'active' : ''}`}
              onClick={() => setShowWeatherOverlay((prev) => !prev)}
            >
              🌤️ Weather
            </button>
          </div>
          <button className="btn-leave compact" onClick={handleLeaveSession}>
            🚪 Leave
          </button>
        </div>
      </div>

      {(showTimezoneOverlay || showWeatherOverlay) && routeContext.length > 0 && (
        <div className="ui-overlay route-context-overlay">
          {routeContext.map((point, idx) => (
            <div key={`${point.label}-${idx}`} className="context-card">
              <div className="context-title">{point.label}</div>
              {showTimezoneOverlay && (
                <div className="context-line">🕒 {point.localTime} ({point.timezone})</div>
              )}
              {showWeatherOverlay && (
                <div className="context-line">
                  🌤️ {point.weather?.description}, {point.weather?.temperature ?? '--'}°C, 💨 {point.weather?.windSpeed ?? '--'} km/h
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Session;
