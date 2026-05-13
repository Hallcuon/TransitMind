import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import Map from '../components/Map';
import RouteInsightsPanel from '../components/RouteInsightsPanel';
import RouteInsightsDrawer from '../components/RouteInsightsDrawer';
import { useI18n } from '../i18n/I18nContext';
import './Routes.css';

const Routes = () => {
  const { t } = useI18n();
  const [cities, setCities] = useState([]);
  const [roads, setRoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStops, setSelectedStops] = useState([]);
  const [pendingCustomPoint, setPendingCustomPoint] = useState(null);
  const [pendingCustomName, setPendingCustomName] = useState('');
  const [buildingRoute, setBuildingRoute] = useState(false);
  const [startingJourney, setStartingJourney] = useState(false);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [enrichment, setEnrichment] = useState(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [enrichmentError, setEnrichmentError] = useState(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const navigate = useNavigate();

  const fetchGraphData = useCallback(async () => {
    try {
      setLoading(true);
      const [citiesRes, roadsRes] = await Promise.all([
        apiClient.get('/dijkstra/cities'),
        apiClient.get('/dijkstra/roads'),
      ]);

      setCities(citiesRes.data);
      setRoads(roadsRes.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching graph data:', err);
      setError(t('routes.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  const clearRouteOutput = () => {
    setCurrentRoute(null);
    setEnrichment(null);
    setEnrichmentError(null);
  };

  const handleCitySelect = (city) => {
    setSelectedStops((prev) => {
      const alreadyExists = prev.some((s) => s.type === 'city' && s.city.id === city.id);
      if (alreadyExists) {
        return prev.filter((s) => !(s.type === 'city' && s.city.id === city.id));
      }
      return [...prev, { type: 'city', city }];
    });
    clearRouteOutput();
  };

  const handleMapClick = (point) => {
    setPendingCustomPoint(point);
    setPendingCustomName('');
  };

  const getPointsPayload = () =>
    selectedStops.map((stop, idx) => {
      if (stop.type === 'city') {
        return { lat: stop.city.lat, lng: stop.city.lng, label: stop.city.name };
      }
      return {
        lat: stop.point.lat,
        lng: stop.point.lng,
        label: stop.label || `Point ${idx + 1}`,
      };
    });

  const addPendingCustomPoint = () => {
    if (!pendingCustomPoint) return;
    const name = pendingCustomName.trim();
    if (!name) {
      alert(t('routes.needPointName'));
      return;
    }
    setSelectedStops((prev) => [
      ...prev,
      { type: 'custom', point: { lat: pendingCustomPoint.lat, lng: pendingCustomPoint.lng }, label: name },
    ]);
    setPendingCustomPoint(null);
    setPendingCustomName('');
    clearRouteOutput();
  };

  const cancelPendingCustomPoint = () => {
    setPendingCustomPoint(null);
    setPendingCustomName('');
  };

  const estimateDurationMinutes = () => {
    if (!currentRoute?.statistics?.totalTime) return null;
    return Math.round(currentRoute.statistics.totalTime);
  };

  const isLongRoute = () => {
    const minutes = estimateDurationMinutes();
    if (!minutes) return false;
    return minutes > 60;
  };

  const getRouteWarning = () => {
    const minutes = estimateDurationMinutes();
    if (!minutes) return '';
    if (minutes <= 60) return t('routes.warnPomodoro');
    if (selectedStops.length > 2) {
      return t('routes.warnMultiStops');
    }
    return t('routes.warnLong');
  };

  const fetchRouteEnrichment = async (pathCoordinates, statistics) => {
    setEnrichmentLoading(true);
    setEnrichmentError(null);
    setEnrichment(null);
    try {
      const { data } = await apiClient.post('/context/route-enrichment', {
        pathCoordinates,
        statistics,
      });
      setEnrichment(data);
    } catch (err) {
      console.error('Route enrichment:', err);
      setEnrichmentError(err.response?.data?.error || t('routes.insightsError'));
    } finally {
      setEnrichmentLoading(false);
    }
  };

  const handleRouteDetails = async () => {
    if (selectedStops.length < 2) {
      alert(t('routes.needTwoPoints'));
      return;
    }

    try {
      setBuildingRoute(true);
      const response = await apiClient.post('/dijkstra/find-route-osrm', {
        points: getPointsPayload(),
        dryRun: true,
      });

      const { route, statistics } = response.data;

      const built = {
        startCity: route.startCity,
        endCity: route.endCity,
        waypoints: route.waypoints,
        pathCoordinates: route.pathCoordinates,
        statistics,
      };
      setCurrentRoute(built);

      if (route.pathCoordinates?.length >= 2) {
        await fetchRouteEnrichment(route.pathCoordinates, statistics);
      }
    } catch (err) {
      console.error('Error building route:', err);
      const errorMsg = err.response?.data?.error || t('routes.routeError');
      alert(`❌ ${errorMsg}`);
    } finally {
      setBuildingRoute(false);
    }
  };

  const handleStartJourney = async () => {
    if (!currentRoute) {
      alert(t('routes.buildFirst'));
      return;
    }

    try {
      setStartingJourney(true);
      const pointsPayload = getPointsPayload();
      const response = await apiClient.post('/dijkstra/find-route-osrm', { points: pointsPayload, dryRun: false });

      const { session, route, statistics } = response.data;
      if (!route?.pathCoordinates || route.pathCoordinates.length < 2) {
        throw new Error('Route geometry missing');
      }

      navigate(`/session/${session.id}`, {
        state: {
          sessionId: session.id,
          routeInfo: {
            routeName: pointsPayload.map((p) => p.label).join(' → '),
            startCity: route.startCity,
            endCity: route.endCity,
            waypoints: route.waypoints,
            pathCoordinates: route.pathCoordinates,
            startLat: pointsPayload[0].lat,
            startLng: pointsPayload[0].lng,
            endLat: pointsPayload[pointsPayload.length - 1].lat,
            endLng: pointsPayload[pointsPayload.length - 1].lng,
            transportType: 'car',
          },
          statistics,
          sessionType: 'single',
        },
      });
    } catch (err) {
      console.error('Error starting journey:', err);
      const errorMsg = err.response?.data?.error || t('routes.sessionError');
      alert(`❌ ${errorMsg}`);
    } finally {
      setStartingJourney(false);
    }
  };

  const routeSummary =
    currentRoute?.statistics != null
      ? {
          distanceKm:
            currentRoute.statistics.totalDistance != null
              ? Math.round(Number(currentRoute.statistics.totalDistance) * 10) / 10
              : null,
          timeMin: currentRoute.statistics.totalTime != null ? Number(currentRoute.statistics.totalTime) : null,
        }
      : null;

  if (loading) {
    return (
      <div className="routes-page fullscreen">
        <div className="loading-overlay">
          <p>{t('routes.loadingMap')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="routes-page fullscreen">
        <div className="error-overlay">
          <p>❌ {error}</p>
          <button type="button" onClick={fetchGraphData}>
            {t('routes.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="routes-page routes-page--split">
      <div className="routes-workspace">
        <div className="routes-map-wrap">
          <div className="map-fullscreen">
            <Map
              routePath={
                currentRoute ? currentRoute.pathCoordinates.map((c) => ({ lat: c.lat, lng: c.lng })) : []
              }
              currentPosition={cities[0] ? [cities[0].lat, cities[0].lng] : [50.45, 30.52]}
              transportType="car"
              zoom={6}
              cities={cities}
              roads={roads}
              stops={getPointsPayload()}
              selectedCityA={selectedStops.find((s) => s.type === 'city')?.city || null}
              selectedCityB={[...selectedStops].reverse().find((s) => s.type === 'city')?.city || null}
              onCitySelect={handleCitySelect}
              onMapClick={handleMapClick}
            />
          </div>

          {pendingCustomPoint && (
            <div
              className="custom-point-popover"
              style={{
                left: pendingCustomPoint.screenX ? `${pendingCustomPoint.screenX}px` : '50%',
                top: pendingCustomPoint.screenY ? `${pendingCustomPoint.screenY}px` : '50%',
              }}
            >
              <div className="custom-point-title">{t('routes.addPointTitle')}</div>
              <input
                className="custom-point-input"
                value={pendingCustomName}
                onChange={(e) => setPendingCustomName(e.target.value)}
                placeholder={t('routes.pointNamePlaceholder')}
                autoFocus
              />
              <div className="custom-point-actions">
                <button type="button" className="custom-point-btn secondary" onClick={cancelPendingCustomPoint}>
                  {t('routes.cancel')}
                </button>
                <button type="button" className="custom-point-btn primary" onClick={addPendingCustomPoint}>
                  {t('routes.add')}
                </button>
              </div>
            </div>
          )}

          <div className="ui-overlay routes-bottom-dock">
            <button
              type="button"
              className="btn-start-journey routes-build-main"
              onClick={handleRouteDetails}
              disabled={selectedStops.length < 2 || buildingRoute}
            >
              {buildingRoute ? t('routes.routeDetailsLoading') : t('routes.routeDetails')}
            </button>

            {currentRoute && (
              <p className={`route-hint ${isLongRoute() ? 'warn' : 'ok'}`}>{getRouteWarning()}</p>
            )}

            {currentRoute && (
              <button
                type="button"
                className="btn-start-journey routes-start-btn"
                onClick={handleStartJourney}
                disabled={startingJourney}
              >
                {startingJourney ? t('routes.starting') : t('routes.start')}
              </button>
            )}
          </div>

          <RouteInsightsDrawer
            open={insightsOpen}
            onOpenChange={setInsightsOpen}
            drawerId="routes-insights-drawer"
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
        </div>
      </div>
    </div>
  );
};

export default Routes;
